/* Entrega365 — sincronização offline-first com PostgreSQL */
(function(){
  'use strict';
  const SESSION_KEY='dcv2:session';
  const META_KEY='entrega365:postgresSync';
  let dirty=false, timer=null, running=false;

  function uid(){
    const s=localStorage.getItem(SESSION_KEY)||'';
    return s.startsWith('google:')?s.slice(7):'';
  }
  function allowed(k){
    const u=uid();
    if(!u||!k)return false;
    if(k===SESSION_KEY)return false;
    if(k.startsWith('entrega365:drive')||k.startsWith('entrega365:cloudState')||k.startsWith('entrega365:syncBridge')||k.startsWith('entrega365:runtime'))return false;
    return k.startsWith('dcv2:'+u+':') ||
      k==='entrega365:establishments:'+u ||
      k==='entrega365:currentEstablishment:'+u ||
      k==='entrega365:locale' ||
      k==='entrega365:agenda' ||
      k==='e365month';
  }
  function snapshot(){
    const storage={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(allowed(k))storage[k]=localStorage.getItem(k);
    }
    return storage;
  }
  function hasLocalData(s){
    return Object.keys(s).some(k=>k.startsWith('dcv2:'+uid()+':'));
  }
  function meta(){
    try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')||{}}catch{return {}}
  }
  function setMeta(v){localStorage.setItem(META_KEY,JSON.stringify(v));}

  async function token(){
    const u=window.e365GetCurrentUser?.();
    if(!u?.getIdToken)throw new Error('auth_required');
    return u.getIdToken(false);
  }
  async function request(url,options={}){
    const idToken=await token();
    const headers={...(options.headers||{}),Authorization:'Bearer '+idToken,'Content-Type':'application/json'};
    return fetch(url,{...options,headers,cache:'no-store'});
  }

  async function sync(){
    if(running||!navigator.onLine||!uid())return;
    running=true;
    try{
      const local=snapshot();
      const m=meta();
      const localHas=hasLocalData(local);

      // A browser/device with local data is authoritative on its first sync.
      // A clean device is allowed to download the existing server copy.
      if(localHas){
        const response=await request('/api/data',{method:'POST',body:JSON.stringify({
          data:local,
          version:Number(m.serverVersion||0),
          force:false
        })});
        if(response.status===409){
          const conflict=await response.json().catch(()=>({}));
          if(conflict.error==='version_conflict'&&!dirty){
            await pull();
            dirty=false;
            return;
          }
          console.warn('Entrega365 PostgreSQL conflito:',conflict);
          return;
        }
        if(!response.ok)throw new Error('push_'+response.status);
        const result=await response.json();
        setMeta({serverVersion:Number(result.version||0),updatedAt:result.updatedAt||new Date().toISOString(),lastSyncAt:new Date().toISOString()});
        dirty=false;
      }else{
        await pull();
      }
    }catch(e){
      console.warn('Entrega365 PostgreSQL sync:',e);
    }finally{
      running=false;
    }
  }

  async function pull(){
    const response=await request('/api/data');
    if(!response.ok)throw new Error('pull_'+response.status);
    const result=await response.json();
    if(!result.exists||!result.data||typeof result.data!=='object')return false;
    const current=snapshot();
    // Never erase local data during a pull.
    if(hasLocalData(current))return false;
    const incoming=result.data;
    for(const [k,v] of Object.entries(incoming)){
      if(allowed(k))localStorage.setItem(k,String(v));
    }
    setMeta({serverVersion:Number(result.version||0),updatedAt:result.updatedAt||null,lastSyncAt:new Date().toISOString()});
    window.__e365SetUser?.('google:'+uid());
    window.render?.();
    return true;
  }

  function markDirty(){
    dirty=true;
    clearTimeout(timer);
    if(navigator.onLine)timer=setTimeout(sync,1200);
  }

  async function onLogin(){
    if(!navigator.onLine)return;
    // Give Firebase a moment to expose getIdToken after native/web login.
    setTimeout(sync,700);
  }

  window.entrega365DataSync={sync,pull,markDirty,onLogin,status:()=>({...meta(),online:navigator.onLine,dirty})};
  window.addEventListener('online',()=>setTimeout(sync,500));
  window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)setTimeout(sync,500)});
  setInterval(()=>{if(navigator.onLine)sync()},300000);

  let checks=0;
  const authPoll=setInterval(()=>{
    checks++;
    const u=window.e365GetCurrentUser?.();
    if(u?.uid){clearInterval(authPoll);onLogin();}
    if(checks>120)clearInterval(authPoll);
  },1000);
})();
