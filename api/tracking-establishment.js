import { getDb } from './db.js';
import { tenantAuth, ensureTenantSchema, getEstablishmentForOwner, isSupport, methodNotAllowed } from './tracking-tenant-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await tenantAuth(req,res);if(!user)return;
  if(!['GET','POST'].includes(req.method))return methodNotAllowed(res);
  try {
    const sql=getDb();await ensureTenantSchema(sql);
    if(req.method==='GET') {
      const [establishment,memberships]=await Promise.all([
        getEstablishmentForOwner(sql,user),
        sql`SELECT m.establishment_id,e.name AS establishment_name,m.status,m.display_name,m.created_at FROM e365_tracking_members m JOIN e365_tracking_establishments e ON e.id=m.establishment_id WHERE m.courier_email=${user.email} ORDER BY m.created_at DESC LIMIT 10`
      ]);
      return res.status(200).json({ok:true,establishment,memberships,isSupport:isSupport(user),price:19.90,currency:'BRL',billingPeriod:'monthly'});
    }
    const name=String(req.body?.name||'').trim().slice(0,120);
    const phone=String(req.body?.phone||'').trim().slice(0,40);
    if(name.length<2)return res.status(400).json({ok:false,error:'establishment_name_required'});
    const current=await getEstablishmentForOwner(sql,user);
    if(current) {
      const rows=await sql`UPDATE e365_tracking_establishments SET name=${name},phone=${phone},updated_at=NOW() WHERE id=${current.id} RETURNING id,owner_email,name,phone,subscription_status,created_at`;
      return res.status(200).json({ok:true,establishment:rows[0]});
    }
    const id=globalThis.crypto?.randomUUID?.()||('e365-'+Date.now()+'-'+Math.random().toString(36).slice(2,10));
    const rows=await sql`INSERT INTO e365_tracking_establishments(id,owner_uid,owner_email,name,phone) VALUES(${id},${user.uid},${user.email},${name},${phone}) ON CONFLICT(owner_uid) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,updated_at=NOW() RETURNING id,owner_email,name,phone,subscription_status,created_at`;
    return res.status(201).json({ok:true,establishment:rows[0]});
  } catch(error) {
    console.error('tracking establishment:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}
