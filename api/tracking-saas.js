import { getDb } from '../lib/db.js';
import { tenantAuth, ensureTenantSchema, getEstablishmentForOwner, isSupport, methodNotAllowed } from '../lib/tracking-tenant-common.js';

const json = (res,code,body) => res.status(code).json(body);
const idValue = () => globalThis.crypto?.randomUUID?.() || ('e365-'+Date.now()+'-'+Math.random().toString(36).slice(2,10));

async function billingWebhook(req,res,sql) {
  if(!['GET','POST'].includes(req.method))return methodNotAllowed(res);
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN;
  if(!token)return json(res,503,{ok:false,error:'mercadopago_not_configured'});
  const id=String(req.query?.id||req.query?.['data.id']||req.body?.data?.id||req.body?.id||'').trim();
  if(!id)return json(res,200,{ok:true,ignored:true});
  const response=await fetch('https://api.mercadopago.com/preapproval/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.id)return json(res,200,{ok:true,ignored:true});
  const status=data.status==='authorized'?'authorized':(['paused','cancelled','cancelled_by_user','rejected'].includes(data.status)?'inactive':'pending');
  await sql`UPDATE e365_tracking_establishments SET subscription_status=${status},subscription_updated_at=NOW(),updated_at=NOW() WHERE id=${String(data.external_reference||'')} AND mp_preapproval_id=${String(data.id)}`;
  return json(res,200,{ok:true});
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const action=String(req.query?.action||req.body?.action||'');
  try {
    const sql=getDb();
    await ensureTenantSchema(sql);
    if(action==='billing-webhook')return await billingWebhook(req,res,sql);
    const user=await tenantAuth(req,res);if(!user)return;
    if(action==='establishment') {
      if(!['GET','POST'].includes(req.method))return methodNotAllowed(res);
      if(req.method==='GET') {
        const [establishment,memberships]=await Promise.all([
          getEstablishmentForOwner(sql,user),
          sql`SELECT m.establishment_id,e.name AS establishment_name,m.status,m.display_name,m.created_at FROM e365_tracking_members m JOIN e365_tracking_establishments e ON e.id=m.establishment_id WHERE m.courier_email=${user.email} ORDER BY m.created_at DESC LIMIT 10`
        ]);
        return json(res,200,{ok:true,establishment,memberships,isSupport:isSupport(user),price:19.90,currency:'BRL',billingPeriod:'monthly'});
      }
      const name=String(req.body?.name||'').trim().slice(0,120),phone=String(req.body?.phone||'').trim().slice(0,40);
      if(name.length<2)return json(res,400,{ok:false,error:'establishment_name_required'});
      const current=await getEstablishmentForOwner(sql,user);
      if(current) {
        const rows=await sql`UPDATE e365_tracking_establishments SET name=${name},phone=${phone},updated_at=NOW() WHERE id=${current.id} RETURNING id,owner_email,name,phone,subscription_status,created_at`;
        return json(res,200,{ok:true,establishment:rows[0]});
      }
      const rows=await sql`INSERT INTO e365_tracking_establishments(id,owner_uid,owner_email,name,phone) VALUES(${idValue()},${user.uid},${user.email},${name},${phone}) ON CONFLICT(owner_uid) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,updated_at=NOW() RETURNING id,owner_email,name,phone,subscription_status,created_at`;
      return json(res,201,{ok:true,establishment:rows[0]});
    }
    if(action==='couriers') {
      if(!['GET','POST','DELETE'].includes(req.method))return methodNotAllowed(res);
      const est=await getEstablishmentForOwner(sql,user);
      if(!est)return json(res,409,{ok:false,error:'create_establishment_first'});
      if(req.method==='GET') {
        const rows=await sql`SELECT courier_email,display_name,status,created_at,accepted_at FROM e365_tracking_members WHERE establishment_id=${est.id} ORDER BY created_at DESC`;
        return json(res,200,{ok:true,couriers:rows,unlimited:true});
      }
      if(est.subscription_status!=='authorized')return json(res,402,{ok:false,error:'subscription_required'});
      const email=String(req.body?.email||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{ok:false,error:'valid_google_email_required'});
      if(email===user.email)return json(res,400,{ok:false,error:'owner_cannot_be_courier'});
      if(req.method==='POST') {
        const name=String(req.body?.displayName||'').trim().slice(0,100);
        const rows=await sql`INSERT INTO e365_tracking_members(establishment_id,courier_email,display_name,status,invited_by_uid) VALUES(${est.id},${email},${name},'invited',${user.uid}) ON CONFLICT(establishment_id,courier_email) DO UPDATE SET display_name=EXCLUDED.display_name,status=CASE WHEN e365_tracking_members.status='accepted' THEN 'accepted' ELSE 'invited' END RETURNING courier_email,display_name,status,created_at,accepted_at`;
        return json(res,201,{ok:true,courier:rows[0],message:'Motoboy cadastrado. Ele precisa entrar com esse e-mail Google e aceitar o vínculo.'});
      }
      await sql`DELETE FROM e365_tracking_members WHERE establishment_id=${est.id} AND courier_email=${email}`;
      return json(res,200,{ok:true});
    }
    if(action==='accept') {
      if(req.method!=='POST')return methodNotAllowed(res);
      const rows=await sql`UPDATE e365_tracking_members SET courier_uid=${user.uid},status='accepted',accepted_at=NOW(),display_name=${String(req.body?.displayName||user.displayName||'Motoboy').trim().slice(0,100)}
        WHERE establishment_id=(SELECT establishment_id FROM e365_tracking_members WHERE courier_email=${user.email} AND status='invited' ORDER BY created_at ASC LIMIT 1)
        AND courier_email=${user.email} AND status='invited'
        RETURNING establishment_id,courier_email,display_name,status,accepted_at`;
      return json(res,200,{ok:true,memberships:rows,message:rows.length?'Vínculo confirmado. Você já pode consultar as rotas e iniciar o expediente.':'Não há convite pendente para este e-mail Google.'});
    }
    if(action==='checkout') {
      if(req.method!=='POST')return methodNotAllowed(res);
      const token=process.env.MERCADOPAGO_ACCESS_TOKEN,backUrl=process.env.TRACKING_SUBSCRIPTION_BACK_URL||process.env.APP_URL;
      if(!token||!backUrl)return json(res,503,{ok:false,error:'mercadopago_not_configured',required:['MERCADOPAGO_ACCESS_TOKEN','TRACKING_SUBSCRIPTION_BACK_URL']});
      const est=await getEstablishmentForOwner(sql,user);
      if(!est)return json(res,409,{ok:false,error:'create_establishment_first'});
      if(est.subscription_status==='authorized')return json(res,200,{ok:true,alreadySubscribed:true});
      const response=await fetch('https://api.mercadopago.com/preapproval',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({reason:'Entrega365 Rastreamento - '+est.name,external_reference:est.id,payer_email:user.email,auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:19.90,currency_id:'BRL'},back_url:backUrl,status:'pending'})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.id||!data.init_point){console.error('Mercado Pago preapproval create failed:',response.status,data);return json(res,502,{ok:false,error:'mercadopago_checkout_failed'});}
      await sql`UPDATE e365_tracking_establishments SET mp_preapproval_id=${String(data.id)},subscription_status='pending',updated_at=NOW() WHERE id=${est.id}`;
      return json(res,200,{ok:true,checkoutUrl:data.init_point,preapprovalId:String(data.id),price:19.90,currency:'BRL',period:'monthly'});
    }
    if(action==='routes') {
      if(!['GET','POST'].includes(req.method))return methodNotAllowed(res);
      const est=await getEstablishmentForOwner(sql,user);
      if(req.method==='GET') {
        if(est) {
          if(est.subscription_status!=='authorized')return json(res,402,{ok:false,error:'subscription_required'});
          const rows=await sql`SELECT id,courier_email,destination_label,destination_address,latitude,longitude,notes,status,created_at FROM e365_tracking_routes WHERE establishment_id=${est.id} ORDER BY created_at DESC LIMIT 100`;
          return json(res,200,{ok:true,routes:rows,role:'owner'});
        }
        const memberships=await sql`SELECT establishment_id FROM e365_tracking_members WHERE courier_email=${user.email} AND courier_uid=${user.uid} AND status='accepted' ORDER BY accepted_at DESC LIMIT 1`;
        if(!memberships.length)return json(res,403,{ok:false,error:'courier_not_linked'});
        const rows=await sql`SELECT r.id,r.courier_email,r.destination_label,r.destination_address,r.latitude,r.longitude,r.notes,r.status,r.created_at,e.name AS establishment_name FROM e365_tracking_routes r JOIN e365_tracking_establishments e ON e.id=r.establishment_id WHERE r.establishment_id=${memberships[0].establishment_id} AND r.courier_email=${user.email} ORDER BY r.created_at DESC LIMIT 100`;
        return json(res,200,{ok:true,routes:rows,role:'courier'});
      }
      if(!est)return json(res,403,{ok:false,error:'establishment_owner_only'});
      if(est.subscription_status!=='authorized')return json(res,402,{ok:false,error:'subscription_required'});
      const courierEmail=String(req.body?.courierEmail||'').trim().toLowerCase(),label=String(req.body?.destinationLabel||'').trim().slice(0,120),address=String(req.body?.destinationAddress||'').trim().slice(0,500),notes=String(req.body?.notes||'').trim().slice(0,500);
      const latitude=req.body?.latitude==null||req.body.latitude===''?null:Number(req.body.latitude),longitude=req.body?.longitude==null||req.body.longitude===''?null:Number(req.body.longitude);
      if(!courierEmail||!label||!address)return json(res,400,{ok:false,error:'courier_destination_required'});
      if((latitude!==null&&(!Number.isFinite(latitude)||latitude < -90||latitude > 90))||(longitude!==null&&(!Number.isFinite(longitude)||longitude < -180||longitude > 180)))return json(res,400,{ok:false,error:'invalid_coordinates'});
      const member=await sql`SELECT courier_email FROM e365_tracking_members WHERE establishment_id=${est.id} AND courier_email=${courierEmail} AND status='accepted' LIMIT 1`;
      if(!member.length)return json(res,403,{ok:false,error:'courier_not_accepted'});
      const rows=await sql`INSERT INTO e365_tracking_routes(id,establishment_id,created_by_uid,courier_email,destination_label,destination_address,latitude,longitude,notes) VALUES(${idValue()},${est.id},${user.uid},${courierEmail},${label},${address},${latitude},${longitude},${notes}) RETURNING id,courier_email,destination_label,destination_address,latitude,longitude,notes,status,created_at`;
      const route=rows[0],destination=latitude!==null&&longitude!==null?latitude+','+longitude:address;
      return json(res,201,{ok:true,route,navigationUrl:'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination)+'&travelmode=driving'});
    }
    return json(res,404,{ok:false,error:'unknown_tracking_action'});
  } catch(error) {
    console.error('Entrega365 tracking SaaS:',error);
    return json(res,500,{ok:false,error:'server_error'});
  }
}
