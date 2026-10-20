import { getDb } from './db.js';
import { tenantAuth, ensureTenantSchema, getEstablishmentForOwner, methodNotAllowed } from './tracking-tenant-common.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const user=await tenantAuth(req,res); if(!user)return;
  if(req.method!=='POST')return methodNotAllowed(res);
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN;
  const backUrl=process.env.TRACKING_SUBSCRIPTION_BACK_URL || process.env.APP_URL;
  if(!token||!backUrl)return res.status(503).json({ok:false,error:'mercadopago_not_configured',required:['MERCADOPAGO_ACCESS_TOKEN','TRACKING_SUBSCRIPTION_BACK_URL']});
  try {
    const sql=getDb(); await ensureTenantSchema(sql);
    const est=await getEstablishmentForOwner(sql,user);
    if(!est)return res.status(409).json({ok:false,error:'create_establishment_first'});
    if(est.subscription_status==='authorized')return res.status(200).json({ok:true,alreadySubscribed:true});
    const response=await fetch('https://api.mercadopago.com/preapproval',{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({
        reason:'Entrega365 Rastreamento - '+est.name,
        external_reference:est.id,
        payer_email:user.email,
        auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:19.90,currency_id:'BRL'},
        back_url:backUrl,
        status:'pending'
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.id||!data.init_point) {
      console.error('Mercado Pago preapproval create failed:',response.status,data);
      return res.status(502).json({ok:false,error:'mercadopago_checkout_failed'});
    }
    await sql`UPDATE e365_tracking_establishments SET mp_preapproval_id=${String(data.id)},subscription_status='pending',updated_at=NOW() WHERE id=${est.id}`;
    return res.status(200).json({ok:true,checkoutUrl:data.init_point,preapprovalId:String(data.id),price:19.90,currency:'BRL',period:'monthly'});
  } catch(error) {
    console.error('tracking checkout:',error);
    return res.status(500).json({ok:false,error:'checkout_error'});
  }
}
