import { getDb } from './db.js';
import { tenantAuth, ensureTenantSchema, methodNotAllowed } from './tracking-tenant-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await tenantAuth(req,res); if(!user)return;
  if(req.method!=='POST')return methodNotAllowed(res);
  try {
    const sql=getDb(); await ensureTenantSchema(sql);
    const rows=await sql`UPDATE e365_tracking_members SET courier_uid=${user.uid},status='accepted',accepted_at=NOW(),display_name=${String(req.body?.displayName||user.displayName||'Motoboy').trim().slice(0,100)} WHERE courier_email=${user.email} AND status='invited' RETURNING establishment_id,courier_email,display_name,status,accepted_at`;
    return res.status(200).json({ok:true,memberships:rows,message:rows.length?'Vínculo confirmado.':'Não há convite pendente para este e-mail Google.'});
  } catch(error) {
    console.error('tracking courier accept:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
