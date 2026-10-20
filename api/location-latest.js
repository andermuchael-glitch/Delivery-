import { getDb } from './db.js';
import { authenticated, ensureLocationSchema, isTrackingAdmin, methodNotAllowed } from './location-common.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await authenticated(req, res);
  if (!user) return;
  if (!isTrackingAdmin(user)) return res.status(403).json({ ok: false, error: 'admin_only' });
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const sql = getDb();
    await ensureLocationSchema(sql);
    const rows = await sql`
      SELECT uid,email,display_name,active,started_at,ended_at,last_seen,
        latitude,longitude,accuracy,speed,heading,
        CASE
          WHEN active=FALSE THEN 'offline'
          WHEN last_seen IS NULL OR last_seen < NOW() - INTERVAL '90 seconds' THEN 'stale'
          ELSE 'online'
        END AS connection_status
      FROM entrega365_courier_status
      WHERE active=TRUE
      ORDER BY display_name ASC
      LIMIT 100
    `;
    return res.status(200).json({ ok: true, couriers: rows, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error('Entrega365 location latest:', error);
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
}
