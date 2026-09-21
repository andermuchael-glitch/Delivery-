import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';
import { ensureSchema } from './ensure-schema.js';

const MAX_POINTS=200;
const MAX_ACCURACY_METERS=100;
const MIN_SEGMENT_METERS=5;
const MAX_SPEED_KMH=180;

function cleanPoint(p){
  const latitude=Number(p?.latitude), longitude=Number(p?.longitude);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<-90||latitude>90||longitude<-180||longitude>180)return null;
  const n=k=>{const v=Number(p?.[k]);return Number.isFinite(v)?v:null};
  const ts=Number(p?.timestamp);
  return {latitude,longitude,accuracy:n('accuracy'),altitude:n('altitude'),speed:n('speed'),heading:n('heading'),timestamp:Number.isFinite(ts)&&ts>0?ts:Date.now()};
}
function haversine(a,b){
  const R=6371000,rad=Math.PI/180;
  const dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;
  const x=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(x)));
}
function validSegment(a,b){
  if(!a||!b)return 0;
  if(a.accuracy!=null&&a.accuracy>MAX_ACCURACY_METERS)return 0;
  if(b.accuracy!=null&&b.accuracy>MAX_ACCURACY_METERS)return 0;
  const dt=Math.max(0,(b.timestamp-a.timestamp)/1000);
  if(dt<=0)return 0;
  const meters=haversine(a,b);
  if(meters<MIN_SEGMENT_METERS)return 0;
  const maxMeters=(MAX_SPEED_KMH/3.6)*dt;
  return meters<=Math.max(500,maxMeters)?meters:0;
}
function distanceMeters(points){
  let total=0;
  for(let i=1;i<points.length;i++)total+=validSegment(points[i-1],points[i]);
  return Math.round(total);
}
function uniquePoints(points){
  const out=[],seen=new Set();
  for(const p of points){
    const key=[p.timestamp,Number(p.latitude).toFixed(6),Number(p.longitude).toFixed(6)].join('|');
    if(seen.has(key))continue;
    seen.add(key);out.push(p);
  }
  return out;
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
      const points=uniquePoints(raw.map(cleanPoint).filter(Boolean)).slice(-MAX_POINTS);
      if(!points.length)return res.status(400).json({ok:false,error:'no_valid_points'});
      let saved=0;
      for(const p of points){
        const existing=await sql`SELECT id FROM entrega365_location_points
          WHERE uid=${user.uid}
            AND recorded_at=TO_TIMESTAMP(${p.timestamp/1000})
            AND ABS(latitude-${p.latitude})<0.00001
            AND ABS(longitude-${p.longitude})<0.00001
          LIMIT 1`;
        if(existing.length)continue;
        await sql`INSERT INTO entrega365_location_points
          (uid,email,latitude,longitude,accuracy,altitude,speed,heading,recorded_at)
          VALUES (${user.uid},${user.email||''},${p.latitude},${p.longitude},${p.accuracy},${p.altitude},${p.speed},${p.heading},TO_TIMESTAMP(${p.timestamp/1000}))`;
        saved++;
      }
      return res.status(200).json({ok:true,saved,received:points.length});
    }
    if(req.method==='GET'){
      const limitRaw=Number(req.query?.limit||1000);
      const limit=Math.min(1000,Math.max(1,Number.isFinite(limitRaw)?Math.floor(limitRaw):1000));
      const from=req.query?.from?new Date(req.query.from):new Date(Date.now()-86400000);
      const to=req.query?.to?new Date(req.query.to):new Date();
      if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime()))return res.status(400).json({ok:false,error:'invalid_date_range'});
      const rows=await sql`SELECT id,latitude,longitude,accuracy,altitude,speed,heading,recorded_at
        FROM entrega365_location_points
        WHERE uid=${user.uid} AND recorded_at>=${from.toISOString()} AND recorded_at<=${to.toISOString()}
        ORDER BY recorded_at ASC LIMIT ${limit}`;
      const points=uniquePoints(rows.map(r=>({
        id:Number(r.id),latitude:Number(r.latitude),longitude:Number(r.longitude),
        accuracy:r.accuracy==null?null:Number(r.accuracy),altitude:r.altitude==null?null:Number(r.altitude),
        speed:r.speed==null?null:Number(r.speed),heading:r.heading==null?null:Number(r.heading),
        timestamp:new Date(r.recorded_at).getTime()
      })));
      const distanceMetersToday=distanceMeters(points);
      return res.status(200).json({ok:true,points,latest:points.at(-1)||null,distanceMeters:distanceMetersToday,distanceKm:Number((distanceMetersToday/1000).toFixed(2))});
    }
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }catch(error){
    console.error('Entrega365 location API:',error);
    return res.status(500).json({ok:false,error:'database_error'});
  }
}