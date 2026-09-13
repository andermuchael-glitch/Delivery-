import { getDb } from './db.js';
import { ensureSchema } from './ensure-schema.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

const ADMIN_EMAILS=['entrega365.suporte@gmail.com','andermuchael@gmail.com'];
function cleanUrl(value){if(typeof value!=='string')return '';const raw=value.trim().slice(0,2000);if(!raw)return '';try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.toString():''}catch{return ''}}
function cleanImage(value){
  if(typeof value!=='string')return '';
  const raw=value.trim();
  if(/^https?:\/\//i.test(raw))return cleanUrl(raw);
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
function stripTags(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function decodeHtml(s){return String(s||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)))}
function meta(html,key){
  const re=new RegExp('<meta[^>]+(?:property|name)=["\\\']'+key.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'["\\\'][^>]+content=["\\\']([^"\\\']*)["\\\'][^>]*>','i');
  const re2=new RegExp('<meta[^>]+content=["\\\']([^"\\\']*)["\\\'][^>]+(?:property|name)=["\\\']'+key.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'["\\\'][^>]*>','i');
  return decodeHtml((html.match(re)||html.match(re2))?.[1]||'');
}
function safeRemoteUrl(raw){
  try{
    const u=new URL(raw);
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h.endsWith('.localhost')||h==='127.0.0.1'||h==='0.0.0.0'||h==='::1'||h==='[::1]')return null;
    if(/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h))return null;
    return u;
  }catch{return null}
}
async function linkPreview(url){
  const u=safeRemoteUrl(url);if(!u)throw new Error('Link não permitido.');
  const r=await fetch(u.href,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0 (compatible; Entrega365Bot/1.0; +https://entrega365.com.br)'},signal:AbortSignal.timeout(8000)});
  if(r.status>=300&&r.status<400)throw new Error('O site bloqueou a prévia automática.');
  const type=r.headers.get('content-type')||'';
  if(!type.includes('text/html'))return {url:u.href,title:u.hostname.replace(/^www\./,''),description:'',imageUrl:'',ok:false,message:'Este link não fornece uma página HTML para prévia.'};
  const html=(await r.text()).slice(0,1200000);
  let title=meta(html,'og:title')||meta(html,'twitter:title');
  if(!title)title=decodeHtml(stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''));
  let description=meta(html,'og:description')||meta(html,'twitter:description')||meta(html,'description');
  let image=meta(html,'og:image')||meta(html,'twitter:image')||meta(html,'twitter:image:src');
  try{if(image)image=new URL(image,u.href).href}catch{image=''}
  return {ok:true,url:u.href,title:title.slice(0,120),description:description.slice(0,300),imageUrl:cleanUrl(image),site:u.hostname.replace(/^www\./,'')};
}
export default async function handler(req,res){
  try{
    const user=await requireFirebaseUser(req);if(!user)return unauthorized(res);
    if(req.method==='POST'){
      if(!ADMIN_EMAILS.includes((user.email||'').toLowerCase()))return res.status(403).json({ok:false,error:'Apenas o administrador pode gerar prévias.'});
      const url=cleanUrl(req.body?.url);if(!url)return res.status(400).json({ok:false,error:'Informe um link válido.'});
      try{return res.status(200).json(await linkPreview(url))}catch(e){return res.status(200).json({ok:false,url,title:new URL(url).hostname.replace(/^www\./,''),description:'',imageUrl:'',message:e?.message||'Não foi possível gerar a prévia.'})}
    }
    const sql=getDb();await ensureSchema(sql);
    if(req.method==='GET'){
      const [setting]=await sql`SELECT affiliate_url,items_json,updated_at FROM marketplace_settings WHERE id=1 LIMIT 1`;
      let items=[];try{items=JSON.parse(setting?.items_json||'[]')}catch{}
      return res.status(200).json({ok:true,affiliateUrl:setting?.affiliate_url||'',items:Array.isArray(items)?items:[],updatedAt:setting?.updated_at||null});
    }
    if(req.method==='PUT'){
      if(!ADMIN_EMAILS.includes((user.email||'').toLowerCase()))return res.status(403).json({ok:false,error:'Apenas o administrador pode alterar a loja.'});
      const body=req.body||{};const items=cleanItems(body.items);let affiliateUrl=cleanUrl(body.affiliateUrl);
      if(!affiliateUrl&&items[0]?.link)affiliateUrl=items[0].link;
      if(!affiliateUrl&&items.length===0)return res.status(400).json({ok:false,error:'Adicione pelo menos um produto com link válido.'});
      const [setting]=await sql`INSERT INTO marketplace_settings(id,affiliate_url,items_json,updated_at,updated_by_uid) VALUES(1,${affiliateUrl},${JSON.stringify(items)},NOW(),${user.uid}) ON CONFLICT(id) DO UPDATE SET affiliate_url=EXCLUDED.affiliate_url,items_json=EXCLUDED.items_json,updated_at=NOW(),updated_by_uid=EXCLUDED.updated_by_uid RETURNING affiliate_url,items_json,updated_at`;
      return res.status(200).json({ok:true,affiliateUrl:setting.affiliate_url,items:JSON.parse(setting.items_json||'[]'),updatedAt:setting.updated_at});
    }
    res.setHeader('Allow','GET, POST, PUT');return res.status(405).json({ok:false,error:'Método não permitido'});
  }catch(error){console.error('Marketplace API:',error);return res.status(500).json({ok:false,error:'Erro interno da API.'})}
}
