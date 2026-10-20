import { getDb } from './db.js';
import { ensureTenantSchema } from './tracking-tenant-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'method_not_allowed'});
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN;
  if(!token)return res.status(503).json({ok:false,error:'mercadopago_not_configured'});
  try {
    const id=String(req.query?.id||req.query?.['data.id']||req.body?.data?.id||req.body?.id||'').trim();
    if(!id)return res.status(200).json({ok:true,ignored:true});
    const response=await fetch('https://api.mercadopago.com/preapproval/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.id)return res.status(200).json({ok:true,ignored:true});
    const sql=getDb(); await ensureTenantSchema(sql);
    const status=data.status==='authorized'?'authorized':(['paused','cancelled','cancelled_by_user','rejected'].includes(data.status)?'inactive':'pending');
    await sql`UPDATE e365_tracking_establishments SET subscription_status=${status},subscription_updated_at=NOW(),updated_at=NOW() WHERE id=${String(data.external_reference||'')} AND mp_preapproval_id=${String(data.id)}`;
    return res.status(200).json({ok:true});
  } catch(error) {
    console.error('tracking billing webhook:',error);
    return res.status(500).json({ok:false,error:'webhook_error'});
  }
}
