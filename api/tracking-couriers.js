import { getDb } from './db.js';
import { tenantAuth, ensureTenantSchema, getEstablishmentForOwner, methodNotAllowed } from './tracking-tenant-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await tenantAuth(req,res); if(!user)return;
  if(!['GET','POST','DELETE'].includes(req.method))return methodNotAllowed(res);
  try {
    const sql=getDb(); await ensureTenantSchema(sql);
    const est=await getEstablishmentForOwner(sql,user);
    if(!est)return res.status(409).json({ok:false,error:'create_establishment_first'});
    if(req.method==='GET') {
      const rows=await sql`SELECT courier_email,display_name,status,created_at,accepted_at FROM e365_tracking_members WHERE establishment_id=${est.id} ORDER BY created_at DESC`;
      return res.status(200).json({ok:true,couriers:rows,unlimited:true});
    }
    if(est.subscription_status!=='authorized')return res.status(402).json({ok:false,error:'subscription_required'});
    const email=String(req.body?.email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({ok:false,error:'valid_google_email_required'});
    if(email===user.email)return res.status(400).json({ok:false,error:'owner_cannot_be_courier'});
    if(req.method==='POST') {
      const name=String(req.body?.displayName||'').trim().slice(0,100);
      const rows=await sql`INSERT INTO e365_tracking_members(establishment_id,courier_email,display_name,status,invited_by_uid) VALUES(${est.id},${email},${name},'invited',${user.uid}) ON CONFLICT(establishment_id,courier_email) DO UPDATE SET display_name=EXCLUDED.display_name,status=CASE WHEN e365_tracking_members.status='accepted' THEN 'accepted' ELSE 'invited' END RETURNING courier_email,display_name,status,created_at,accepted_at`;
      return res.status(201).json({ok:true,courier:rows[0],message:'Motoboy cadastrado. Ele precisa entrar com esse e-mail Google e aceitar o vínculo.'});
    }
    await sql`DELETE FROM e365_tracking_members WHERE establishment_id=${est.id} AND courier_email=${email}`;
    return res.status(200).json({ok:true});
  } catch(error) {
    console.error('tracking couriers:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
