import { getDb } from './db.js';
import { authenticated, ensureLocationSchema, methodNotAllowed, isTrackingAdmin } from './location-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await authenticated(req,res); if(!user)return;
  if(req.method!=='POST')return methodNotAllowed(res);
  const action=String(req.body?.action||'');
  if(!['start','stop'].includes(action))return res.status(400).json({ok:false,error:'invalid_action'});
  try {
    const sql=getDb(); await ensureLocationSchema(sql);
    if(action==='start') {
      const memberships=await sql`SELECT m.establishment_id,e.subscription_status FROM e365_tracking_members m JOIN e365_tracking_establishments e ON e.id=m.establishment_id WHERE m.courier_email=${user.email} AND m.status='accepted' ORDER BY m.accepted_at DESC LIMIT 1`;
      const membership=memberships[0];
      if(!membership)return res.status(403).json({ok:false,error:'courier_not_linked',message:'Peça ao estabelecimento para cadastrar seu e-mail Google e confirme o convite antes de iniciar.'});
      if(membership.subscription_status!=='authorized')return res.status(402).json({ok:false,error:'subscription_required'});
      const displayName=String(req.body?.displayName||user.displayName||'Motoboy').trim().slice(0,100)||'Motoboy';
      const rows=await sql`INSERT INTO entrega365_courier_status(uid,email,display_name,active,started_at,ended_at,last_seen,updated_at,establishment_id)
        VALUES(${user.uid},${user.email||''},${displayName},TRUE,NOW(),NULL,NOW(),NOW(),${membership.establishment_id})
        ON CONFLICT(uid) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,active=TRUE,
        started_at=CASE WHEN entrega365_courier_status.active THEN entrega365_courier_status.started_at ELSE NOW() END,
        ended_at=NULL,last_seen=NOW(),updated_at=NOW(),establishment_id=EXCLUDED.establishment_id
        RETURNING uid,display_name,active,started_at,last_seen,establishment_id`;
      return res.status(200).json({ok:true,session:rows[0]});
    }
    const rows=await sql`UPDATE entrega365_courier_status SET active=FALSE,ended_at=NOW(),updated_at=NOW() WHERE uid=${user.uid} RETURNING uid,display_name,active,ended_at`;
    return res.status(200).json({ok:true,session:rows[0]||null});
  } catch(error) {
    console.error('Entrega365 location session:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
