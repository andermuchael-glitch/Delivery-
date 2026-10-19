/* Entrega365 — sincronização automática offline-first com PostgreSQL.
   Alterações locais são enfileiradas e enviadas após debounce; conflitos mesclam por chave. */
(function(){
  'use strict';
  if(window.__e365PostgresSyncLoaded)return;
  window.__e365PostgresSyncLoaded=true;
  const SESSION_KEY='dcv2:session', META_KEY='entrega365:postgresSync';
  let timer=0,running=false,suppress=false,hooked=false,loginUid='';
  const session=()=>localStorage.getItem(SESSION_KEY)||'';
  const uid=()=>{const s=session();return s.startsWith('google:')?s.slice(7):''};
  const userPrefix=()=> 'dcv2:'+session()+':';
  const allowed=k=>{const u=uid();if(!u||!k||k===SESSION_KEY)return false;
    if(k.startsWith('entrega365:drive')||k.startsWith('entrega365:cloudState')||k.startsWith('entrega365:syncBridge')||k.startsWith('entrega365:runtime')||k===META_KEY)return false;
    return k.startsWith(userPrefix())||k==='entrega365:establishments:'+session()||k==='entrega365:currentEstablishment:'+session()||['entrega365:locale','entrega365:location','entrega365:locationTracking','entrega365:agenda','entrega365:settings','e365month'].includes(k);
  };
  const meta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')||{}}catch{return {}}};
  const setMeta=x=>{try{localStorage.setItem(META_KEY,JSON.stringify({...meta(),...x}))}catch(e){console.warn('PostgreSQL sync state:',e)}};
  function snapshot(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(allowed(k))out[k]=localStorage.getItem(k)}return out}
  const hasData=o=>Object.keys(o||{}).some(k=>k.startsWith(userPrefix()));
  async function token(){const u=window.e365GetCurrentUser?.();if(!u?.getIdToken)throw Error('auth_required');return u.getIdToken(false)}
  async function request(method='GET',body){const idToken=await token();const options={method,cache:'no-store',headers:{Authorization:'Bearer '+idToken,'Content-Type':'application/json'}};if(body)options.body=JSON.stringify(body);const res=await fetch('/api/data',options);const json=await res.json().catch(()=>({}));if(!res.ok){const e=Error(json.error||('http_'+res.status));e.status=res.status;e.payload=json;throw e}return json}
  function markDirty(key,removed=false){if(suppress||!uid())return;const m=meta(),changes={...(m.changes||{})};if(!key){for(const[k,v]of Object.entries(snapshot()))changes[k]=v;}else{if(!allowed(key))return;changes[key]=removed?null:localStorage.getItem(key)}setMeta({dirty:true,changes,changedAt:Date.now()});clearTimeout(timer);if(navigator.onLine)timer=setTimeout(()=>sync().catch(()=>{}),900)}
  function installStorageHook(){if(hooked)return;hooked=true;const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear;
    Storage.prototype.setItem=function(k,v){const old=this.getItem(k),out=set.call(this,k,v);if(this===localStorage&&old!==String(v))markDirty(String(k),false);return out};
    Storage.prototype.removeItem=function(k){const existed=this.getItem(k)!==null,out=remove.call(this,k);if(this===localStorage&&existed)markDirty(String(k),true);return out};
    Storage.prototype.clear=function(){if(this===localStorage){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(allowed(k))keys.push(k)}const out=clear.call(this);keys.forEach(k=>markDirty(k,true));return out}return clear.call(this)};
    window.addEventListener('storage',e=>{if(e.key&&allowed(e.key))markDirty(e.key,e.newValue===null)});
  }
  function applyMerged(data){suppress=true;try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(allowed(k)&&!(k in data))localStorage.removeItem(k)}for(const[k,v]of Object.entries(data||{}))if(allowed(k))localStorage.setItem(k,String(v));}finally{suppress=false}}
  function mergeRemote(remote,changes){const merged={...(remote||{})};for(const[k,v]of Object.entries(changes||{})){if(v===null)delete merged[k];else merged[k]=String(v)}return merged}
  function currentChanges(){return {...(meta().changes||{})}}
  function clearSyncedChanges(sentChanges,localSent){const remain={...(meta().changes||{})};for(const[k,v]of Object.entries(sentChanges||{})){const current=localStorage.getItem(k);if(v===null?current===null:current===v)delete remain[k]}for(const k of Object.keys(remain)){if(!(k in localSent)&&localStorage.getItem(k)===null)delete remain[k]}setMeta({changes:remain,dirty:Object.keys(remain).length>0,changedAt:Object.keys(remain).length?Date.now():0})}
  async function sync(){if(running||!navigator.onLine||!uid())return false;running=true;try{
    const m=meta(),changes=currentChanges(),local=snapshot(),localHas=hasData(local);
    let server=await request('GET');
    if(!server.exists||!server.data||!Object.keys(server.data).length){
      if(!localHas)return false;
      const result=await request('POST',{data:local,version:Number(server.version||0),force:false});
      setMeta({serverVersion:Number(result.version||0),updatedAt:result.updatedAt||null,lastSyncAt:new Date().toISOString(),changes:{},dirty:false,changedAt:0,error:''});return true;
    }
    const serverVersion=Number(server.version||0);
    if(Object.keys(changes).length){
      const merged=mergeRemote(server.data,changes);
      applyMerged(merged);
      const sentChanges={...changes},localSent={...merged};
      try{
        const result=await request('POST',{data:merged,version:serverVersion,force:false});
        clearSyncedChanges(sentChanges,localSent);
        setMeta({serverVersion:Number(result.version||0),updatedAt:result.updatedAt||null,lastSyncAt:new Date().toISOString(),error:''});
        return true;
      }catch(e){
        if(e.status!==409)throw e;
        // A different device saved first: merge this device's changed keys into the latest server copy.
        server=await request('GET');
        const latest=mergeRemote(server.data||{},currentChanges());
        applyMerged(latest);
        const sentAgain=currentChanges(),localAgain={...latest};
        const result=await request('POST',{data:latest,version:Number(server.version||0),force:false});
        clearSyncedChanges(sentAgain,localAgain);
        setMeta({serverVersion:Number(result.version||0),updatedAt:result.updatedAt||null,lastSyncAt:new Date().toISOString(),error:''});
        return true;
      }
    }
    if(Number(m.serverVersion||0)===serverVersion&&localHas){setMeta({updatedAt:server.updatedAt||null,lastSyncAt:new Date().toISOString(),error:''});return true}
    // Recheck local edits immediately before applying the remote snapshot.
    // A comanda may be launched while the PostgreSQL GET is still in flight.
    const lateChanges=currentChanges();
    if(Object.keys(lateChanges).length){
      setMeta({serverVersion,dirty:true,error:'',changedAt:Date.now()});
      clearTimeout(timer);
      timer=setTimeout(()=>sync().catch(()=>{}),250);
      return false;
    }
    // No local edits are pending, so it is safe to apply the latest PostgreSQL copy.
    applyMerged(server.data||{});
    setMeta({serverVersion,updatedAt:server.updatedAt||null,lastSyncAt:new Date().toISOString(),changes:{},dirty:false,changedAt:0,error:''});
    window.__e365SetUser?.('google:'+uid());window.dispatchEvent(new Event('e365-data-changed'));window.render?.();
    return true;
  }catch(e){console.warn('Entrega365 PostgreSQL sync:',e);setMeta({error:String(e?.message||e),lastAttemptAt:new Date().toISOString()});return false}
  finally{running=false}}
  async function onLogin(){const u=uid();if(!u)return false;loginUid=u;installStorageHook();if(!navigator.onLine)return false;await new Promise(r=>setTimeout(r,500));return sync()}
  window.entrega365DataSync={sync,pull:sync,markDirty:()=>markDirty(),onLogin,status:()=>({...meta(),online:navigator.onLine,running,uid:loginUid})};
  installStorageHook();
  window.addEventListener('e365-data-changed',()=>{const u=uid();if(!u)return;clearTimeout(timer);if(navigator.onLine)timer=setTimeout(()=>sync().catch(()=>{}),900)});
  window.addEventListener('online',()=>setTimeout(()=>sync().catch(()=>{}),300));
  window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)sync().catch(()=>{})});
  window.addEventListener('focus',()=>{if(navigator.onLine)sync().catch(()=>{})});
  setInterval(()=>{if(navigator.onLine)sync().catch(()=>{})},30000);
  let checks=0;const poll=setInterval(()=>{const u=window.e365GetCurrentUser?.();if(u?.uid){clearInterval(poll);onLogin().catch(()=>{})}if(++checks>120)clearInterval(poll)},500);
})();