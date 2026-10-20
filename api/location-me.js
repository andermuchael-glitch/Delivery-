import { getDb } from './db.js';
import { authenticated, ensureLocationSchema, isTrackingAdmin, methodNotAllowed } from './location-common.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await authenticated(req, res);
  if (!user) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  try {
    const sql = getDb();
    await ensureLocationSchema(sql);
    const rows = await sql`SELECT uid,email,display_name,active,started_at,ended_at,last_seen FROM entrega365_courier_status WHERE uid=${user.uid} LIMIT 1`;
    return res.status(200).json({ ok: true, isAdmin: isTrackingAdmin(user), courier: rows[0] || null });
  } catch (error) {
    console.error('Entrega365 location me:', error);
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
}
