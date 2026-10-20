import { getDb } from './db.js';
import { tenantAuth, ensureTenantSchema, getEstablishmentForOwner, methodNotAllowed } from './tracking-tenant-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await tenantAuth(req,res);if(!user)return;
  if(!['GET','POST'].includes(req.method))return methodNotAllowed(res);
  try {
    const sql=getDb();await ensureTenantSchema(sql);
    const est=await getEstablishmentForOwner(sql,user);
    if(req.method==='GET') {
      if(est) {
        if(est.subscription_status!=='authorized')return res.status(402).json({ok:false,error:'subscription_required'});
        const rows=await sql`SELECT id,courier_email,destination_label,destination_address,latitude,longitude,notes,status,created_at FROM e365_tracking_routes WHERE establishment_id=${est.id} ORDER BY created_at DESC LIMIT 100`;
        return res.status(200).json({ok:true,routes:rows,role:'owner'});
      }
      const memberships=await sql`SELECT establishment_id FROM e365_tracking_members WHERE courier_email=${user.email} AND courier_uid=${user.uid} AND status='accepted' ORDER BY accepted_at DESC LIMIT 1`;
      if(!memberships.length)return res.status(403).json({ok:false,error:'courier_not_linked'});
      const rows=await sql`SELECT r.id,r.courier_email,r.destination_label,r.destination_address,r.latitude,r.longitude,r.notes,r.status,r.created_at,e.name AS establishment_name FROM e365_tracking_routes r JOIN e365_tracking_establishments e ON e.id=r.establishment_id WHERE r.establishment_id=${memberships[0].establishment_id} AND r.courier_email=${user.email} ORDER BY r.created_at DESC LIMIT 100`;
      return res.status(200).json({ok:true,routes:rows,role:'courier'});
    }
    if(!est)return res.status(403).json({ok:false,error:'establishment_owner_only'});
    if(est.subscription_status!=='authorized')return res.status(402).json({ok:false,error:'subscription_required'});
    const courierEmail=String(req.body?.courierEmail||'').trim().toLowerCase();
    const label=String(req.body?.destinationLabel||'').trim().slice(0,120);
    const address=String(req.body?.destinationAddress||'').trim().slice(0,500);
    const notes=String(req.body?.notes||'').trim().slice(0,500);
    const latitude=req.body?.latitude==null||req.body.latitude===''?null:Number(req.body.latitude);
    const longitude=req.body?.longitude==null||req.body.longitude===''?null:Number(req.body.longitude);
    if(!courierEmail||!label||!address)return res.status(400).json({ok:false,error:'courier_destination_required'});
    if((latitude!==null&&(!Number.isFinite(latitude)||latitude < -90||latitude > 90))||(longitude!==null&&(!Number.isFinite(longitude)||longitude < -180||longitude > 180)))return res.status(400).json({ok:false,error:'invalid_coordinates'});
    const member=await sql`SELECT courier_email FROM e365_tracking_members WHERE establishment_id=${est.id} AND courier_email=${courierEmail} AND status='accepted' LIMIT 1`;
    if(!member.length)return res.status(403).json({ok:false,error:'courier_not_accepted'});
    const id=globalThis.crypto?.randomUUID?.()||('route-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));
    const rows=await sql`INSERT INTO e365_tracking_routes(id,establishment_id,created_by_uid,courier_email,destination_label,destination_address,latitude,longitude,notes) VALUES(${id},${est.id},${user.uid},${courierEmail},${label},${address},${latitude},${longitude},${notes}) RETURNING id,courier_email,destination_label,destination_address,latitude,longitude,notes,status,created_at`;
    const route=rows[0],destination=latitude!==null&&longitude!==null?latitude+','+longitude:address;
    return res.status(201).json({ok:true,route,navigationUrl:'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination)+'&travelmode=driving'});
  } catch(error) {
    console.error('tracking routes:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
