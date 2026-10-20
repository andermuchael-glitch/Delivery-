import { getDb } from '../lib/db.js';
import { authenticated, ensureLocationSchema, methodNotAllowed } from '../lib/location-common.js';
function finiteNumber(value) {
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await authenticated(req,res);if(!user)return;
  if(req.method!=='POST')return methodNotAllowed(res);
  const latitude=finiteNumber(req.body?.latitude),longitude=finiteNumber(req.body?.longitude);
  if(latitude===null||longitude===null||latitude < -90||latitude > 90||longitude < -180||longitude > 180)return res.status(400).json({ok:false,error:'invalid_coordinates'});
  const accuracy=finiteNumber(req.body?.accuracy),altitude=finiteNumber(req.body?.altitude),speed=finiteNumber(req.body?.speed),heading=finiteNumber(req.body?.heading);
  try {
    const sql=getDb();await ensureLocationSchema(sql);
    const sessions=await sql`SELECT active,establishment_id FROM entrega365_courier_status WHERE uid=${user.uid} LIMIT 1`;
    const session=sessions[0];
    if(!session?.active||!session.establishment_id)return res.status(409).json({ok:false,error:'shift_not_active'});
    const member=await sql`SELECT 1 FROM e365_tracking_members WHERE establishment_id=${session.establishment_id} AND courier_email=${user.email} AND courier_uid=${user.uid} AND status='accepted' LIMIT 1`;
    if(!member.length)return res.status(403).json({ok:false,error:'courier_membership_invalid'});
    await sql`INSERT INTO entrega365_location_points(uid,email,establishment_id,latitude,longitude,accuracy,altitude,speed,heading,recorded_at)
      VALUES(${user.uid},${user.email||''},${session.establishment_id},${latitude},${longitude},${accuracy},${altitude},${speed},${heading},NOW())`;
    await sql`UPDATE entrega365_courier_status SET email=${user.email||''},latitude=${latitude},longitude=${longitude},accuracy=${accuracy},altitude=${altitude},speed=${speed},heading=${heading},last_seen=NOW(),updated_at=NOW() WHERE uid=${user.uid} AND active=TRUE AND establishment_id=${session.establishment_id}`;
    return res.status(200).json({ok:true,receivedAt:new Date().toISOString()});
  } catch(error) {
    console.error('Entrega365 location update:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
