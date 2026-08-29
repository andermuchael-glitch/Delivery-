import { GoogleAuthProvider, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const API="https://www.googleapis.com/drive/v3/files";
const UP="https://www.googleapis.com/upload/drive/v3/files";
const NAME="entrega365-sync-v158.json";
const OLD_NAMES=["entrega365-backup-v155.json","entrega365-backup-v154.json","entrega365-backup.json"];
const TK="entrega365:driveAccessToken";
const TE="entrega365:driveAccessTokenExp";

export function initDriveBackup(auth){
  if(!auth||window.__e365Drive)return;
  window.__e365Drive=true;

  let token="",exp=0,fileId="",busy=false,restoring=false,timer=0,syncing=false;

  const session=()=>localStorage.getItem("dcv2:session")||"";
  const mail=()=>String(localStorage.getItem("entrega365:email")||"").trim().toLowerCase();
  const uid=()=>session().replace(/^google:/,"");
  const stateKey=()=> "entrega365:driveState:"+session();
  const state=()=>{try{return JSON.parse(localStorage.getItem(stateKey())||"{}")}catch{return{}}};
  const setState=x=>localStorage.setItem(stateKey(),JSON.stringify({...state(),...x}));

  const loadToken=()=>{
    const t=localStorage.getItem(TK)||"",e=Number(localStorage.getItem(TE)||0);
    if(t&&e>Date.now()+60000){token=t;exp=e;return true}
    return false;
  };
  const putToken=(t,e)=>{
    token=t;exp=e;
    localStorage.setItem(TK,t);
    localStorage.setItem(TE,String(e));
  };

  async function tok(interactive=false){
    if(token&&Date.now()<exp-60000)return token;
    if(loadToken())return token;
    if(!interactive)throw Error("drive_authorization_required");
    const u=auth.currentUser;
    if(!u)throw Error("login_required");
    const p=new GoogleAuthProvider();
    p.addScope("https://www.googleapis.com/auth/drive.appdata");
    p.addScope("https://www.googleapis.com/auth/drive.file");
    p.setCustomParameters({
      login_hint:mail(),
      prompt:"select_account",
      include_granted_scopes:"true"
    });
    const z=await reauthenticateWithPopup(u,p);
    const q=GoogleAuthProvider.credentialFromResult(z);
    if(!q?.accessToken)throw Error("drive_token");
    putToken(q.accessToken,Date.now()+3500000);
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

  async function findFile(names=[NAME,...OLD_NAMES]){
    for(const name of names){
      const q="name='"+name+"' and 'appDataFolder' in parents and trashed=false";
      const x=await api(API+"?spaces=appDataFolder&q="+encodeURIComponent(q)+"&fields=files(id,modifiedTime,name)&orderBy=modifiedTime%20desc&pageSize=10");
      if(x.files?.[0])return x.files[0];
    }
    return null;
  }

  async function read(id){
    const t=await tok(false);
    const res=await fetch(API+"/"+id+"?alt=media",{
      cache:"no-store",
      headers:{Authorization:"Bearer "+t}
    });
    if(!res.ok)throw Error("drive_"+res.status);
    return res.json();
  }

  function includedKey(k){
    const s=session(),pre="dcv2:"+s+":";
    const list="entrega365:establishments:"+s;
    const cur="entrega365:currentEstablishment:"+s;
    return !!k&&(
      k.startsWith(pre)||
      k===list||
      k===cur||
      ["entrega365:agenda","entrega365:settings","e365month"].includes(k)
    );
  }

  function keys(){
    const o={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||k===TK||k===TE||k===stateKey())continue;
      if(includedKey(k))o[k]=localStorage.getItem(k);
    }
    return o;
  }

  function hasLocalData(){
    return Object.keys(keys()).some(k=>{
      if(k==="entrega365:agenda"||k==="entrega365:settings"||k==="e365month")return true;
      return true;
    });
  }

  function snap(){
    return {
      format:"Entrega365Backup",
      version:158,
      uid:uid(),
      email:mail(),
      localStorage:keys(),
      exportedAt:new Date().toISOString()
    };
  }

  async function save(){
    if(busy||restoring||!session()||(!loadToken()&&!token))return false;
    busy=true;
    try{
      const old=fileId?{id:fileId}:await findFile();
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
        {
          method:old?"PATCH":"POST",
          headers:{"Content-Type":"multipart/related; boundary="+boundary},
          body
        }
      );
      fileId=z.id;
      setState({
        initialized:true,
        dirty:false,
        remoteAt:Date.parse(z.modifiedTime||"")||Date.now(),
        savedAt:Date.now(),
        changedAt:0
      });
      return true;
    }catch(e){
      console.warn("Drive save:",e);
      return false;
    }finally{
      busy=false;
    }
  }

  function clearData(){
    const rm=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(includedKey(k))rm.push(k);
    }
    rm.forEach(k=>localStorage.removeItem(k));
  }

  function applySnapshot(d){
    clearData();
    for(const [k,v] of Object.entries(d.localStorage||{})){
      if(k!==TK&&k!==TE&&k!==stateKey())localStorage.setItem(k,v);
    }
    localStorage.setItem("dcv2:session",session());
  }

  async function restoreFrom(file){
    restoring=true;
    try{
      const d=await read(file.id);
      if(d.format!=="Entrega365Backup"||!d.localStorage)throw Error("invalid_backup");
      if(
        (d.email&&mail()&&String(d.email).toLowerCase()!==mail())||
        (d.uid&&String(d.uid)!==uid())
      )throw Error("backup_account_mismatch");

      applySnapshot(d);
      fileId=file.id;
      const remoteAt=Date.parse(file.modifiedTime||d.exportedAt||"")||Date.now();
      setState({
        initialized:true,
        dirty:false,
        remoteAt,
        restoredAt:Date.now(),
        changedAt:0
      });
      window.dispatchEvent(new Event("e365-drive-restored"));
      return true;
    }catch(e){
      console.warn("Drive restore:",e);
      return false;
    }finally{
      restoring=false;
    }
  }

  const queue=()=>{
    if(!session()||restoring)return;
    setState({dirty:true,changedAt:Date.now()});
    clearTimeout(timer);
    timer=setTimeout(()=>save().catch(()=>{}),900);
  };

  async function sync(){
    if(syncing||!session()||(!loadToken()&&!token))return false;
    syncing=true;
    try{
      const remote=await findFile();
      const st=state();
      const remoteAt=remote?Date.parse(remote.modifiedTime||"")||0:0;
      const local=hasLocalData();

      if(!remote){
        if(local||st.dirty)await save();
        else setState({initialized:true,dirty:false,remoteAt:0});
        return false;
      }

      fileId=remote.id;

      // Primeiro acesso deste navegador: o Drive é a fonte de restauração.
      // Se o usuário acabou de editar dados localmente antes da sincronização,
      // preservamos a alteração mais nova e a enviamos em vez de sobrescrevê-la.
      if(!st.initialized){
        const localChanged=Number(st.changedAt||0);
        if(st.dirty&&localChanged>remoteAt){
          await save();
          return false;
        }
        const restored=await restoreFrom(remote);
        if(restored)window.render?.();
        return restored;
      }

      // Alteração local pendente nunca é sobrescrita por um backup antigo.
      if(st.dirty){
        await save();
        return false;
      }

      // Outro navegador gravou uma versão mais nova: restaura automaticamente.
      if(remoteAt&&remoteAt>Number(st.remoteAt||0)){
        const restored=await restoreFrom(remote);
        if(restored)window.render?.();
        return restored;
      }

      return false;
    }catch(e){
      console.warn("Drive sync:",e);
      return false;
    }finally{
      syncing=false;
    }
  }

  window.entrega365DriveAutoSync=sync;
  window.entrega365DriveSave=save;
  window.entrega365DriveStatus=()=>({
    authorized:!!(token||loadToken()),
    busy,restoring,syncing,fileId,state:state()
  });

  window.addEventListener("e365-data-changed",queue);
  window.addEventListener("e365-drive-token",()=>sync().catch(()=>{}));
  window.addEventListener("online",()=>sync().catch(()=>{}));
  window.addEventListener("e365-drive-restored",()=>setTimeout(()=>window.render?.(),0));

  // Não sobrescreve o backup remoto a cada intervalo. Apenas envia mudanças pendentes.
  setInterval(()=>{
    if(session()&&state().dirty)save().catch(()=>{});
  },10000);

  // Dá tempo para a autenticação persistir a sessão e o token antes da primeira restauração.
  setTimeout(()=>sync().catch(()=>{}),700);
}