import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS entrega365_user_data (
    uid TEXT PRIMARY KEY,
    email TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function cleanData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireFirebaseUser(req);
  if (!user) return unauthorized(res);
  const sql = getDb();

  try {
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const rows = await sql`SELECT uid, email, data, version, updated_at FROM entrega365_user_data WHERE uid = ${user.uid} LIMIT 1`;
      const row = rows[0] || null;
      return res.status(200).json({
        ok: true,
        exists: Boolean(row),
        data: row?.data || {},
        version: Number(row?.version || 0),
        updatedAt: row?.updated_at || null
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const incoming = cleanData(body.data);
      const clientVersion = Number(body.version ?? 0);

      if (!Number.isSafeInteger(clientVersion) || clientVersion < 0) {
        return res.status(400).json({ ok: false, error: 'invalid_version' });
      }

      // Atomic compare-and-swap: only one device can advance a given version.
      // First save is also atomic: concurrent first writers cannot overwrite one another.
      if (clientVersion === 0) {
        const inserted = await sql`
          INSERT INTO entrega365_user_data (uid, email, data, version, updated_at)
          VALUES (${user.uid}, ${user.email || ''}, ${JSON.stringify(incoming)}::jsonb, 1, NOW())
          ON CONFLICT (uid) DO NOTHING
          RETURNING version, updated_at
        `;
        if (inserted.length) {
          return res.status(200).json({
            ok: true,
            version: Number(inserted[0].version || 1),
            updatedAt: inserted[0].updated_at || null
          });
        }
      } else {
        const updated = await sql`
          UPDATE entrega365_user_data
          SET email = ${user.email || ''},
              data = ${JSON.stringify(incoming)}::jsonb,
              version = version + 1,
              updated_at = NOW()
          WHERE uid = ${user.uid} AND version = ${clientVersion}
          RETURNING version, updated_at
        `;
        if (updated.length) {
          return res.status(200).json({
            ok: true,
            version: Number(updated[0].version || clientVersion + 1),
            updatedAt: updated[0].updated_at || null
          });
        }
      }

      const latest = await sql`SELECT version, updated_at FROM entrega365_user_data WHERE uid = ${user.uid} LIMIT 1`;
      return res.status(409).json({
        ok: false,
        error: 'version_conflict',
        version: Number(latest[0]?.version || 0),
        updatedAt: latest[0]?.updated_at || null
      });
    }

    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (error) {
    console.error('Entrega365 data API:', error);
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
}
