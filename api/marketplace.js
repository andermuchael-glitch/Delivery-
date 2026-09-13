import { getDb } from './db.js';
import { ensureSchema } from './ensure-schema.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

const ADMIN_EMAILS=['entrega365.suporte@gmail.com','andermuchael@gmail.com'];
function cleanUrl(value){if(typeof value!=='string')return '';const raw=value.trim().slice(0,2000);if(!raw)return '';try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.toString():''}catch{return ''}}
function cleanImage(value){
  if(typeof value!=='string')return '';
  const raw=value.trim();
  if(/^https?:\/\//i.test(raw))return cleanUrl(raw);
  // Permite foto enviada pelo administrador diretamente do celular/computador.
  // Limite aproximado de 2 MB por imagem para não inflar o banco/payload.
  if(/^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=\r\n]+$/i.test(raw) && raw.length<=2_800_000)return raw;
  return '';
}
function cleanItems(value){
  if(!Array.isArray(value)) return [];
  return value.slice(0,100).map((x,i)=>({
    id:String(x?.id||`${Date.now()}-${i}`).slice(0,80),
    title:String(x?.title||'Produto').trim().slice(0,120),
    description:String(x?.description||'').trim().slice(0,300),
    imageUrl:cleanImage(x?.imageUrl),
    link:cleanUrl(x?.link)
  })).filter(x=>x.title&&x.link);
}
export default async function handler(req,res){
  try{
    const user=await requireFirebaseUser(req);if(!user)return unauthorized(res);
    const sql=getDb();await ensureSchema(sql);
    if(req.method==='GET'){
      const [setting]=await sql`SELECT affiliate_url,items_json,updated_at FROM marketplace_settings WHERE id=1 LIMIT 1`;
      let items=[];try{items=JSON.parse(setting?.items_json||'[]')}catch{}
      return res.status(200).json({ok:true,affiliateUrl:setting?.affiliate_url||'',items:Array.isArray(items)?items:[],updatedAt:setting?.updated_at||null});
    }
    if(req.method==='PUT'){
      if(!ADMIN_EMAILS.includes((user.email||'').toLowerCase()))return res.status(403).json({ok:false,error:'Apenas o administrador pode alterar a loja.'});
      const body=req.body||{};const items=cleanItems(body.items);
      let affiliateUrl=cleanUrl(body.affiliateUrl);
      if(!affiliateUrl&&items[0]?.link)affiliateUrl=items[0].link;
      if(!affiliateUrl&&items.length===0)return res.status(400).json({ok:false,error:'Adicione pelo menos um produto com link válido.'});
      const [setting]=await sql`INSERT INTO marketplace_settings(id,affiliate_url,items_json,updated_at,updated_by_uid) VALUES(1,${affiliateUrl},${JSON.stringify(items)},NOW(),${user.uid}) ON CONFLICT(id) DO UPDATE SET affiliate_url=EXCLUDED.affiliate_url,items_json=EXCLUDED.items_json,updated_at=NOW(),updated_by_uid=EXCLUDED.updated_by_uid RETURNING affiliate_url,items_json,updated_at`;
      return res.status(200).json({ok:true,affiliateUrl:setting.affiliate_url,items:JSON.parse(setting.items_json||'[]'),updatedAt:setting.updated_at});
    }
    res.setHeader('Allow','GET, PUT');return res.status(405).json({ok:false,error:'Método não permitido'});
  }catch(error){console.error('Marketplace API:',error);return res.status(500).json({ok:false,error:'Erro interno da API.'})}
}
