import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

async function ensureSchema(sql) {
  await sql\x60CREATE TABLE IF NOT EXISTS entrega365_user_data (
    uid TEXT PRIMARY KEY,
    email TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )\x60;
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
      const rows = await sql\x60SELECT uid, email, data, version, updated_at FROM entrega365_user_data WHERE uid = ${user.uid} LIMIT 1\x60;
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
      const clientVersion = Number(body.version || 0);
      const force = body.force === true;
      const rows = await sql\x60SELECT uid, version, updated_at FROM entrega365_user_data WHERE uid = ${user.uid} LIMIT 1\x60;
      const current = rows[0] || null;
      const currentVersion = Number(current?.version || 0);

      if (current && !force && Object.keys(incoming).length === 0 && currentVersion > 0) {
        return res.status(409).json({ok:false,error:'server_data_exists',version:currentVersion,updatedAt:current.updated_at});
      }
      if (current && !force && clientVersion > 0 && clientVersion < currentVersion) {
        return res.status(409).json({ok:false,error:'version_conflict',version:currentVersion,updatedAt:current.updated_at});
      }

      const nextVersion = Math.max(currentVersion + 1, clientVersion + 1, 1);
      const saved = await sql\x60
        INSERT INTO entrega365_user_data (uid, email, data, version, updated_at)
        VALUES (${user.uid}, ${user.email || ''}, ${JSON.stringify(incoming)}::jsonb, ${nextVersion}, NOW())
        ON CONFLICT (uid) DO UPDATE SET
          email = EXCLUDED.email,
          data = EXCLUDED.data,
          version = EXCLUDED.version,
          updated_at = NOW()
        RETURNING version, updated_at
      \x60;

      return res.status(200).json({ok:true,version:Number(saved[0]?.version||nextVersion),updatedAt:saved[0]?.updated_at||null});
    }

    return res.status(405).json({ok:false,error:'method_not_allowed'});
  } catch (error) {
    console.error('Entrega365 data API:', error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
