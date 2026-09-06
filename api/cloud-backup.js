import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

async function ensure(sql){
  await sql`CREATE TABLE IF NOT EXISTS entrega365_backups (
    uid TEXT PRIMARY KEY,
    email TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export default async function handler(req,res){
  const user=await requireFirebaseUser(req);
  if(!user)return unauthorized(res);
  try{
    const sql=getDb();
    await ensure(sql);
    if(req.method==='GET'){
      const rows=await sql`SELECT uid,email,payload,updated_at FROM entrega365_backups WHERE uid=${user.uid} LIMIT 1`;
      if(!rows[0])return res.status(200).json({ok:true,exists:false});
      const row=rows[0];
      return res.status(200).json({ok:true,exists:true,uid:row.uid,email:row.email,payload:row.payload,updatedAt:new Date(row.updated_at).getTime()});
    }
    if(req.method==='PUT' || req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const payload=body.payload;
      if(!payload || payload.format!=='Entrega365Backup' || !payload.localStorage) return res.status(400).json({ok:false,error:'backup_invalido'});
      if(payload.uid && String(payload.uid)!==String(user.uid)) return res.status(403).json({ok:false,error:'backup_account_mismatch'});
      const email=String(user.email||payload.email||'').trim().toLowerCase();
      const clientAt=Number(body.clientAt||payload.exportedAt&&Date.parse(payload.exportedAt)||0);
      const rows=await sql`SELECT updated_at FROM entrega365_backups WHERE uid=${user.uid} LIMIT 1`;
      const remoteAt=rows[0]?new Date(rows[0].updated_at).getTime():0;
      if(remoteAt && clientAt && clientAt < remoteAt-2000) return res.status(409).json({ok:false,error:'remote_newer',updatedAt:remoteAt});
      const out=await sql`INSERT INTO entrega365_backups(uid,email,payload,updated_at) VALUES(${user.uid},${email},${payload},NOW()) ON CONFLICT(uid) DO UPDATE SET email=EXCLUDED.email,payload=EXCLUDED.payload,updated_at=NOW() RETURNING updated_at`;
      return res.status(200).json({ok:true,savedAt:new Date(out[0].updated_at).getTime()});
    }
    res.setHeader('Allow','GET,PUT,POST');
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }catch(error){
    console.error('Entrega365 secondary backup:',error);
    return res.status(500).json({ok:false,error:'backup_server_error'});
  }
}
