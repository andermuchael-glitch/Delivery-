/* Entrega365 — segunda camada de backup/sincronização (servidor próprio) */
const API='/api/cloud-backup';

export function initSecondaryBackup(auth){
  if(!auth||window.__e365SecondaryBackup)return;
  window.__e365SecondaryBackup=true;
  let busy=false,timer=0,syncing=false;
  const session=()=>localStorage.getItem('dcv2:session')||'';
  const uid=()=>session().replace(/^google:/,'');
  const mail=()=>String(localStorage.getItem('entrega365:email')||auth.currentUser?.email||'').trim().toLowerCase();
  const stateKey=()=>`entrega365:secondaryState:${session()}`;
  const state=()=>{try{return JSON.parse(localStorage.getItem(stateKey())||'{}')}catch{return{}}};
  const setState=x=>localStorage.setItem(stateKey(),JSON.stringify({...state(),...x}));
  const included=k=>{const s=session(),pre='dcv2:'+s+':';return !!k&&(k.startsWith(pre)||k===`entrega365:establishments:${s}`||k===`entrega365:currentEstablishment:${s}`||['entrega365:agenda','entrega365:settings','e365month'].includes(k));};
  const keys=()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&included(k))o[k]=localStorage.getItem(k)}return o};
  const meaningful=()=>Object.keys(keys()).length>0;
  async function token(){const u=auth.currentUser;if(!u)throw Error('login_required');return u.getIdToken(true);}
  async function call(method,body){const t=await token();const r=await fetch(API,{method,cache:'no-store',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'backup_error'),{data:d,status:r.status});return d;}
  const snapshot=()=>({format:'Entrega365Backup',version:201,uid:uid(),email:mail(),release:document.querySelector('meta[name="entrega365-release"]')?.content||'unknown',localStorage:keys(),exportedAt:new Date().toISOString()});
  function safety(){if(!meaningful())return;try{localStorage.setItem(`entrega365:secondarySafety:${uid()}`,JSON.stringify(snapshot()))}catch{}}
  function apply(p){safety();for(const k of Object.keys(keys()))localStorage.removeItem(k);for(const[k,v]of Object.entries(p.localStorage||{}))if(included(k))localStorage.setItem(k,v);localStorage.setItem('dcv2:session',session());window.dispatchEvent(new Event('e365-secondary-restored'));window.render?.();}
  async function save(){if(busy||syncing||!session()||!auth.currentUser||!meaningful())return false;busy=true;try{const p=snapshot(),r=await call('PUT',{payload:p,clientAt:Date.parse(p.exportedAt)});setState({initialized:true,lastSyncedAt:r.savedAt||Date.now(),dirty:false});return true}catch(e){if(e.status===409)setState({remoteNewer:true});console.warn('Backup secundário:',e);return false}finally{busy=false}}
  async function sync(){if(syncing||!session()||!auth.currentUser)return false;syncing=true;try{const r=await call('GET');if(!r.exists){if(meaningful())await save();else setState({initialized:true,lastSyncedAt:0});return false;}const remoteAt=Number(r.updatedAt||0),st=state(),localChanged=Number(st.changedAt||0);if(localChanged&&localChanged>remoteAt){await save();return false;}if(!st.initialized){apply(r.payload);setState({initialized:true,lastSyncedAt:remoteAt,dirty:false});return true;}if(remoteAt>Number(st.lastSyncedAt||0)&&!localChanged){apply(r.payload);setState({initialized:true,lastSyncedAt:remoteAt,dirty:false});return true;}return false;}catch(e){console.warn('Sincronização secundária:',e);return false}finally{syncing=false;}}
  const queue=()=>{if(!session()||syncing)return;setState({dirty:true,changedAt:Date.now()});clearTimeout(timer);timer=setTimeout(()=>save().catch(()=>{}),1500)};
  window.entrega365SecondaryBackupSave=save;
  window.entrega365SecondaryBackupSync=sync;
  window.entrega365SecondaryBackupStatus=()=>({busy,syncing,state:state()});
  window.entrega365SecondaryBackupRestore=async()=>{const r=await call('GET');if(!r.exists)return false;apply(r.payload);setState({initialized:true,lastSyncedAt:Number(r.updatedAt||Date.now()),dirty:false,changedAt:0});return true;};
  window.addEventListener('e365-data-changed',queue);
  window.addEventListener('online',()=>sync().catch(()=>{}));
  window.addEventListener('e365-drive-restored',()=>setTimeout(()=>save().catch(()=>{}),1200));
  setTimeout(()=>sync().catch(()=>{}),1800);
  setInterval(()=>{if(state().dirty)save().catch(()=>{})},12000);
}
