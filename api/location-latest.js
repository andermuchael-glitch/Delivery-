import { getDb } from './db.js';
import { authenticated, ensureLocationSchema, isTrackingAdmin, methodNotAllowed } from './location-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await authenticated(req,res);if(!user)return;
  if(req.method!=='GET')return methodNotAllowed(res);
  try {
    const sql=getDb();await ensureLocationSchema(sql);
    let rows;
    if(isTrackingAdmin(user)) {
      rows=await sql`SELECT s.uid,s.email,s.display_name,s.active,s.started_at,s.ended_at,s.last_seen,s.latitude,s.longitude,s.accuracy,s.speed,s.heading,e.id AS establishment_id,e.name AS establishment_name,
        CASE WHEN s.latitude IS NULL OR s.longitude IS NULL OR s.last_seen IS NULL OR s.last_seen<NOW()-INTERVAL '90 seconds' THEN 'stale' ELSE 'online' END AS connection_status
        FROM entrega365_courier_status s JOIN e365_tracking_establishments e ON e.id=s.establishment_id
        WHERE s.active=TRUE ORDER BY e.name,s.display_name LIMIT 500`;
    } else {
      const owned=await sql`SELECT id,subscription_status FROM e365_tracking_establishments WHERE owner_uid=${user.uid} LIMIT 1`;
      if(!owned.length)return res.status(403).json({ok:false,error:'establishment_owner_only'});
      if(owned[0].subscription_status!=='authorized')return res.status(402).json({ok:false,error:'subscription_required'});
      rows=await sql`SELECT s.uid,s.email,s.display_name,s.active,s.started_at,s.ended_at,s.last_seen,s.latitude,s.longitude,s.accuracy,s.speed,s.heading,e.id AS establishment_id,e.name AS establishment_name,
        CASE WHEN s.latitude IS NULL OR s.longitude IS NULL OR s.last_seen IS NULL OR s.last_seen<NOW()-INTERVAL '90 seconds' THEN 'stale' ELSE 'online' END AS connection_status
        FROM entrega365_courier_status s JOIN e365_tracking_establishments e ON e.id=s.establishment_id
        WHERE s.active=TRUE AND s.establishment_id=${owned[0].id}
        AND EXISTS (SELECT 1 FROM e365_tracking_members m WHERE m.establishment_id=e.id AND m.courier_uid=s.uid AND m.status='accepted')
        ORDER BY s.display_name LIMIT 100`;
    }
    return res.status(200).json({ok:true,couriers:rows,serverTime:new Date().toISOString()});
  } catch(error) {
    console.error('Entrega365 location latest:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
