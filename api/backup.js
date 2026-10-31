import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

function cleanData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function localDate(value) {
  const s = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const user = await requireFirebaseUser(req);
  if (!user) return unauthorized(res);

  try {
    const body = req.body || {};
    const backupDate = localDate(body.backupDate);
    const data = cleanData(body.data);
    if (!backupDate) return res.status(400).json({ ok: false, error: 'invalid_backup_date' });
    if (!Object.keys(data).length) return res.status(400).json({ ok: false, error: 'empty_backup' });

    const sql = getDb();
    await sql`CREATE TABLE IF NOT EXISTS entrega365_daily_backups (
      uid TEXT NOT NULL,
      backup_date DATE NOT NULL,
      email TEXT,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (uid, backup_date)
    )`;

    const rows = await sql`
      INSERT INTO entrega365_daily_backups (uid, backup_date, email, data)
      VALUES (${user.uid}, ${backupDate}::date, ${user.email || ''}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (uid, backup_date) DO NOTHING
      RETURNING backup_date, created_at
    `;
    if (rows.length) {
      return res.status(201).json({ ok: true, created: true, backupDate, createdAt: rows[0].created_at });
    }
    const existing = await sql`
      SELECT backup_date, created_at FROM entrega365_daily_backups
      WHERE uid = ${user.uid} AND backup_date = ${backupDate}::date LIMIT 1
    `;
    return res.status(200).json({ ok: true, created: false, alreadyExists: true, backupDate, createdAt: existing[0]?.created_at || null });
  } catch (error) {
    console.error('Entrega365 daily backup:', error);
    return res.status(500).json({ ok: false, error: 'backup_database_error' });
  }
}
