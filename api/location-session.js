import { getDb } from './db.js';
import { authenticated, ensureLocationSchema, methodNotAllowed } from './location-common.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await authenticated(req, res);
  if (!user) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  const action = String(req.body?.action || '');
  if (!['start', 'stop'].includes(action)) {
    return res.status(400).json({ ok: false, error: 'invalid_action' });
  }

  try {
    const sql = getDb();
    await ensureLocationSchema(sql);
    const displayName = String(req.body?.displayName || user.displayName || 'Motoboy').trim().slice(0, 100) || 'Motoboy';

    if (action === 'start') {
      const rows = await sql`
        INSERT INTO entrega365_courier_status (uid,email,display_name,active,started_at,ended_at,last_seen,updated_at)
        VALUES (${user.uid},${user.email || ''},${displayName},TRUE,NOW(),NULL,NOW(),NOW())
        ON CONFLICT (uid) DO UPDATE SET
          email=EXCLUDED.email,
          display_name=EXCLUDED.display_name,
          active=TRUE,
          started_at=CASE WHEN entrega365_courier_status.active THEN entrega365_courier_status.started_at ELSE NOW() END,
          ended_at=NULL,
          last_seen=NOW(),
          updated_at=NOW()
        RETURNING uid,display_name,active,started_at,last_seen
      `;
      return res.status(200).json({ ok: true, session: rows[0] });
    }

    const rows = await sql`
      UPDATE entrega365_courier_status SET active=FALSE,ended_at=NOW(),updated_at=NOW()
      WHERE uid=${user.uid}
      RETURNING uid,display_name,active,ended_at
    `;
    return res.status(200).json({ ok: true, session: rows[0] || null });
  } catch (error) {
    console.error('Entrega365 location session:', error);
    return res.status(500).json({ ok: false, error: 'database_error' });
  }
}
