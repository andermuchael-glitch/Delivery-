import { getDb } from './db.js';
import { authenticated, ensureLocationSchema, isTrackingAdmin, methodNotAllowed } from './location-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await authenticated(req,res);if(!user)return;
  if(req.method!=='GET')return methodNotAllowed(res);
  try {
    const sql=getDb();await ensureLocationSchema(sql);
    const [status,owned,memberships]=await Promise.all([
      sql`SELECT uid,email,display_name,active,started_at,ended_at,last_seen,establishment_id FROM entrega365_courier_status WHERE uid=${user.uid} LIMIT 1`,
      sql`SELECT id,name,subscription_status FROM e365_tracking_establishments WHERE owner_uid=${user.uid} LIMIT 1`,
      sql`SELECT m.establishment_id,e.name AS establishment_name,e.subscription_status,m.display_name,m.status FROM e365_tracking_members m JOIN e365_tracking_establishments e ON e.id=m.establishment_id WHERE m.courier_email=${user.email} ORDER BY m.created_at DESC LIMIT 10`
    ]);
    return res.status(200).json({ok:true,isAdmin:isTrackingAdmin(user)||owned.length>0,establishment:owned[0]||null,memberships,courier:status[0]||null});
  } catch(error) {
    console.error('Entrega365 location me:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
