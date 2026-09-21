import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';
import { ensureSchema } from './ensure-schema.js';

const MAX_POINTS=200;
function cleanPoint(p){
  const latitude=Number(p?.latitude), longitude=Number(p?.longitude);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<-90||latitude>90||longitude<-180||longitude>180)return null;
  const n=k=>{const v=Number(p?.[k]);return Number.isFinite(v)?v:null};
  const ts=Number(p?.timestamp);
  return {latitude,longitude,accuracy:n('accuracy'),altitude:n('altitude'),speed:n('speed'),heading:n('heading'),timestamp:Number.isFinite(ts)&&ts>0?ts:Date.now()};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const user=await requireFirebaseUser(req);
  if(!user)return unauthorized(res);
  const sql=getDb();
  try{
    await ensureSchema(sql);
    if(req.method==='POST'){
      const body=req.body||{};
      const raw=Array.isArray(body.points)?body.points:[body.point||body];
      const points=raw.map(cleanPoint).filter(Boolean).slice(-MAX_POINTS);
      if(!points.length)return res.status(400).json({ok:false,error:'no_valid_points'});
      for(const p of points){
        await sql`INSERT INTO entrega365_location_points (uid,email,latitude,longitude,accuracy,altitude,speed,heading,recorded_at) VALUES (${user.uid},${user.email||''},${p.latitude},${p.longitude},${p.accuracy},${p.altitude},${p.speed},${p.heading},TO_TIMESTAMP(${p.timestamp/1000}))`;
      }
      return res.status(200).json({ok:true,saved:points.length});
    }
    if(req.method==='GET'){
      const limitRaw=Number(req.query?.limit||300);
      const limit=Math.min(1000,Math.max(1,Number.isFinite(limitRaw)?Math.floor(limitRaw):300));
      const from=req.query?.from?new Date(req.query.from):new Date(Date.now()-86400000);
      const to=req.query?.to?new Date(req.query.to):new Date();
      if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime()))return res.status(400).json({ok:false,error:'invalid_date_range'});
      const rows=await sql`SELECT id,latitude,longitude,accuracy,altitude,speed,heading,recorded_at FROM entrega365_location_points WHERE uid=${user.uid} AND recorded_at>=${from.toISOString()} AND recorded_at<=${to.toISOString()} ORDER BY recorded_at DESC LIMIT ${limit}`;
      const points=rows.reverse().map(r=>({id:Number(r.id),latitude:Number(r.latitude),longitude:Number(r.longitude),accuracy:r.accuracy==null?null:Number(r.accuracy),altitude:r.altitude==null?null:Number(r.altitude),speed:r.speed==null?null:Number(r.speed),heading:r.heading==null?null:Number(r.heading),timestamp:new Date(r.recorded_at).getTime()}));
      return res.status(200).json({ok:true,points,latest:points.at(-1)||null});
    }
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }catch(error){console.error('Entrega365 location API:',error);return res.status(500).json({ok:false,error:'database_error'});}
}