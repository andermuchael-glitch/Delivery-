import { GoogleAuthProvider, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const API="https://www.googleapis.com/drive/v3/files";
const UP="https://www.googleapis.com/upload/drive/v3/files";
const NAME="entrega365-backup-v155.json";
const OLD_NAMES=["entrega365-backup-v154.json","entrega365-backup.json"];
const TK="entrega365:driveAccessToken";
const TE="entrega365:driveAccessTokenExp";

export function initDriveBackup(auth){
  if(!auth||window.__e365Drive)return;
  window.__e365Drive=true;

  let token="",exp=0,fileId="",busy=false,restoring=false,timer=0;

  const session=()=>localStorage.getItem("dcv2:session")||"";
  const mail=()=>String(localStorage.getItem("entrega365:email")||"").trim().toLowerCase();
  const uid=()=>session().replace(/^google:/,"");
  const stateKey=()=> "entrega365:driveState:"+session();

  const state=()=>{try{return JSON.parse(localStorage.getItem(stateKey())||"{}")}catch{return{}}};
  const setState=x=>localStorage.setItem(stateKey(),JSON.stringify({...state(),...x}));

  const load=()=>{
    const t=localStorage.getItem(TK)||"",e=+localStorage.getItem(TE)||0;
    if(t&&e>Date.now()+60000){token=t;exp=e;return true}
    return false;
  };

  const put=(t,e)=>{
    token=t;exp=e;
    localStorage.setItem(TK,t);
    localStorage.setItem(TE,String(e));
  };

  async function tok(interactive=false){
    if(token&&Date.now()<exp-60000)return token;
    if(load())return token;
    if(!interactive)throw Error("drive_authorization_required");
    const u=auth.currentUser;
    if(!u)throw Error("login_required");
    const p=new GoogleAuthProvider();
    p.addScope("https://www.googleapis.com/auth/drive.appdata");
    p.addScope("https://www.googleapis.com/auth/drive.file");
    p.setCustomParameters({login_hint:mail()||undefined,prompt:"select_account",include_granted_scopes:"true"});
    const z=await reauthenticateWithPopup(u,p);
    const q=GoogleAuthProvider.credentialFromResult(z);
    if(!q?.accessToken)throw Error("drive_token");
    put(q.accessToken,Date.now()+3500000);
    return token;
  }

  async function api(url,opt={}){
    const t=await tok(false);
    const res=await fetch(url,{
      ...opt,
      cache:"no-store",
      headers:{Authorization:"Bearer "+t,...(opt.headers||{})}
    });
    if(!res.ok)throw Error("drive_"+res.status);
    return res.status===204?null:res.json();
  }

  async function findFile(names){
    for(const name of names){
      const q="name='"+name+"' and 'appDataFolder' in parents and trashed=false";
      const x=await api(API+"?spaces=appDataFolder&q="+encodeURIComponent(q)+"&fields=files(id,modifiedTime,name)&orderBy=modifiedTime%20desc&pageSize=10");
      if(x.files?.[0])return x.files[0];
    }
    return null;
  }

  async function read(id){
    const t=await tok(false);
    const res=await fetch(API+"/"+id+"?alt=media",{cache:"no-store",headers:{Authorization:"Bearer "+t}});
    if(!res.ok)throw Error("drive_"+res.status);
    return res.json();
  }

  function keys(){
    const s=session(),pre="dcv2:"+s+":";
    const list="entrega365:establishments:"+s;
    const cur="entrega365:currentEstablishment:"+s;
    const o={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||k===TK||k===TE||k===stateKey())continue;
      if(k.startsWith(pre)||k===list||k===cur||["entrega365:agenda","entrega365:settings","e365month","entrega365:plan"].includes(k)){
        o[k]=localStorage.getItem(k);
      }
    }
    return o;
  }

  function hasLocalData(){
    const s=session(),pre="dcv2:"+s+":";
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||"";
      if(k.startsWith(pre))return true;
    }
    const listKey="entrega365:establishments:"+s;
    try{
      const list=JSON.parse(localStorage.getItem(listKey)||"[]");
      if(Array.isArray(list)&&list.some(x=>x?.id&&x.id!=="principal"))return true;
    }catch{}
    return false;
  }

  function snap(){
    return {
      format:"Entrega365Backup",
      version:155,
      uid:uid(),
      email:mail(),
      localStorage:keys(),
      exportedAt:new Date().toISOString()
    };
  }

  async function save(){
    if(busy||restoring||!session()||(!load()&&!token))return false;
    busy=true;
    try{
      const old=fileId?{id:fileId}:await findFile([NAME,...OLD_NAMES]);
      const boundary="----E365"+Date.now();
      const meta=old
        ? {name:NAME,mimeType:"application/json"}
        : {name:NAME,mimeType:"application/json",parents:["appDataFolder"]};

      const body=new Blob([
        "--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(meta),
        "\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n",
        JSON.stringify(snap()),
        "\r\n--"+boundary+"--"
      ]);

      const z=await api(
        (old?UP+"/"+old.id:UP)+"?uploadType=multipart&fields=id,modifiedTime",
        {method:old?"PATCH":"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body}
      );
      fileId=z.id;
      setState({dirty:false,remoteAt:Date.parse(z.modifiedTime||"")||Date.now(),savedAt:Date.now()});
      return true;
    }catch(e){
      console.warn("Drive save:",e);
      return false;
    }finally{
      busy=false;
    }
  }

  function clear(){
    const s=session(),pre="dcv2:"+s+":";
    const list="entrega365:establishments:"+s;
    const cur="entrega365:currentEstablishment:"+s;
    const rm=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&(k.startsWith(pre)||k===list||k===cur||["entrega365:agenda","entrega365:settings","e365month"].includes(k)))rm.push(k);
    }
    rm.forEach(k=>localStorage.removeItem(k));
  }

  async function restore(){
    if(!session()||restoring||(!load()&&!token))return false;
    restoring=true;
    try{
      const f=await findFile([NAME,...OLD_NAMES]);
      if(!f)return false;

      const remoteAt=Date.parse(f.modifiedTime||"")||0;
      const st=state();
      const local=hasLocalData();

      // Nunca deixe uma restauração tardia apagar dados recém-criados.
      if(local&&st.dirty)return false;
      // Depois de sincronizado, só restaura quando o Drive estiver realmente mais novo.
      if(local&&st.remoteAt&&remoteAt&&remoteAt<=st.remoteAt)return false;
      // Dados locais antigos, ainda sem estado de sincronização, têm prioridade.
      if(local&&!st.remoteAt)return false;

      const d=await read(f.id);
      if(d.format!=="Entrega365Backup"||!d.localStorage)throw Error("invalid_backup");
      if((d.email&&mail()&&String(d.email).toLowerCase()!==mail())||(d.uid&&String(d.uid)!==uid())){
        throw Error("backup_account_mismatch");
      }

      clear();
      for(const [k,v] of Object.entries(d.localStorage)){
        if(k!=="dcv2:session"&&k!==TK&&k!==TE)localStorage.setItem(k,v);
      }
      localStorage.setItem("dcv2:session",session());
      fileId=f.id;
      setState({dirty:false,remoteAt:remoteAt||Date.now(),restoredAt:Date.now()});
      return true;
    }catch(e){
      console.warn("Drive restore:",e);
      return false;
    }finally{
      restoring=false;
    }
  }

  const queue=()=>{
    if(!session())return;
    setState({dirty:true,changedAt:Date.now()});
    clearTimeout(timer);
    timer=setTimeout(save,700);
  };

  async function sync(){
    if(!session()||(!load()&&!token))return false;
    const restored=await restore();
    if(restored)window.render?.();
    await save();
    return restored;
  }

  window.entrega365DriveAutoSync=sync;
  window.entrega365DriveSave=save;
  window.entrega365DriveStatus=()=>({authorized:!!(token||load()),busy,restoring,fileId,state:state()});

  window.addEventListener("e365-data-changed",queue);
  window.addEventListener("e365-drive-token",()=>sync().catch(e=>console.warn("Drive sync:",e)));
  setInterval(()=>{if(session())save()},15000);
  setTimeout(()=>sync().catch(e=>console.warn("Drive initial sync:",e)),500);
}