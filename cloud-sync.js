/* Entrega365 v160 — sincronização principal entre navegadores via Firebase */
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

const DB=getFirestore(getApp());
const ROOT="entrega365Sync";
let uid="", ref=null, ready=false, restoring=false, timer=0, unsubscribe=null;
const now=()=>Date.now();
const session=()=>localStorage.getItem("dcv2:session")||"";
const scoped=()=>session().startsWith("google:")?session().slice(7):"";

function stateKey(){return "entrega365:cloudState:"+uid}
function state(){try{return JSON.parse(localStorage.getItem(stateKey())||"{}")}catch{return{}}}
function setState(x){localStorage.setItem(stateKey(),JSON.stringify({...state(),...x}))}

function included(k){
  const s=session();
  const pre="dcv2:"+s+":";
  const list="entrega365:establishments:"+s;
  const cur="entrega365:currentEstablishment:"+s;
  return !!k&&(k.startsWith(pre)||k===list||k===cur||["entrega365:agenda","entrega365:settings","e365month"].includes(k));
}
function snapshot(){
  const localStorageData={};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&included(k))localStorageData[k]=localStorage.getItem(k);
  }
  return localStorageData;
}
function hasMeaningfulData(data){
  return Object.keys(data||{}).some(k=>{
    const v=data[k];
    if(k.includes(":day:")){try{const d=JSON.parse(v);return d?.entries?.length||d?.arrancada||d?.kmInicial||d?.kmFinal}catch{return true}}
    if(k.includes(":exp:")){try{return JSON.parse(v)?.items?.length}catch{return true}}
    if(k.includes("mechanica"))return !!v&&v!=="{}";
    if(k.includes("establishments")){try{return JSON.parse(v)?.length>1}catch{return true}}
    if(k==="entrega365:agenda"){try{return JSON.parse(v)?.length}catch{return true}}
    return false;
  });
}
function clear(){
  const rm=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(included(k))rm.push(k)}
  rm.forEach(k=>localStorage.removeItem(k));
}
function apply(data){
  clear();
  for(const [k,v] of Object.entries(data||{}))if(included(k))localStorage.setItem(k,v);
  if(session())localStorage.setItem("dcv2:session",session());
}
async function push(){
  if(!uid||restoring||!ready)return false;
  const data=snapshot();
  try{
    const updatedAt=now();
    await setDoc(ref,{version:160,uid,data,updatedAt},{merge:false});
    setState({initialized:true,remoteAt:updatedAt,savedAt:updatedAt,dirty:false});
    return true;
  }catch(e){console.warn("Cloud sync save:",e);return false}
}
function queue(){
  if(!uid||restoring)return;
  setState({dirty:true,changedAt:now()});
  clearTimeout(timer);
  timer=setTimeout(()=>push(),800);
}
async function start(){
  const next=scoped();
  if(!next)return false;
  if(uid===next&&ready)return true;
  if(unsubscribe){unsubscribe();unsubscribe=null}
  uid=next; ready=false; ref=doc(DB,ROOT,uid);
  const local=snapshot();
  try{
    const first=await getDoc(ref);
    if(first.exists()){
      const remote=first.data()||{};
      restoring=true;
      apply(remote.data||{});
      restoring=false;
      setState({initialized:true,remoteAt:Number(remote.updatedAt||0),restoredAt:now(),dirty:false});
      window.dispatchEvent(new Event("e365-cloud-restored"));
      window.dispatchEvent(new Event("e365-drive-restored"));
      setTimeout(()=>window.render?.(),0);
    }else if(hasMeaningfulData(local)){
      ready=true;
      await push();
    }else{
      setState({initialized:true,remoteAt:0,dirty:false});
    }
    ready=true;
    unsubscribe=onSnapshot(ref,snap=>{
      if(!ready||restoring||!snap.exists())return;
      const remote=snap.data()||{};
      const remoteAt=Number(remote.updatedAt||0);
      const st=state();
      if(remoteAt>Number(st.remoteAt||0)&&remoteAt>Number(st.savedAt||0)){
        restoring=true;
        apply(remote.data||{});
        restoring=false;
        setState({remoteAt,restoredAt:now(),dirty:false});
        window.dispatchEvent(new Event("e365-cloud-restored"));
        window.dispatchEvent(new Event("e365-drive-restored"));
        setTimeout(()=>window.render?.(),0);
      }
    },e=>console.warn("Cloud sync listener:",e));
    return true;
  }catch(e){
    restoring=false;
    ready=true;
    console.warn("Cloud sync unavailable:",e);
    return false;
  }
}
window.entrega365CloudSync=start;
window.entrega365CloudSave=push;
window.entrega365CloudStatus=()=>({uid,ready,restoring,state:state()});
window.addEventListener("e365-data-changed",queue);
window.addEventListener("e365-pro-updated",queue);
window.addEventListener("e365-cloud-restored",()=>setTimeout(()=>window.e365Establishments?.refresh?.(),0));
setInterval(()=>{if(uid&&ready&&state().dirty)push()},10000);
