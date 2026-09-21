import { GoogleAuthProvider, reauthenticateWithPopup, reauthenticateWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const API="https://www.googleapis.com/drive/v3/files";
const UP="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_NAME="Entrega365";
const NAME="entrega365-backup.json";
const OLD_NAMES=["entrega365-sync-v158.json","entrega365-backup-v155.json","entrega365-backup-v154.json"];
const TK="entrega365:driveAccessToken";
const TE="entrega365:driveAccessTokenExp";
const RP="entrega365:driveAuthPending";

export function initDriveBackup(auth){
  if(!auth||window.__e365Drive)return;
  window.__e365Drive=true;
  let token="",exp=0,fileId="",folderId="",busy=false,restoring=false,timer=0,syncing=false;
  const session=()=>localStorage.getItem("dcv2:session")||"";
  const mail=()=>String(localStorage.getItem("entrega365:email")||"").trim().toLowerCase();
  const uid=()=>session().replace(/^google:/,"");
  const stateKey=()=>"entrega365:driveState:"+session();
  const state=()=>{try{return JSON.parse(localStorage.getItem(stateKey())||"{}")}catch{return{}}};
  const setState=x=>localStorage.setItem(stateKey(),JSON.stringify({...state(),...x}));
  const release=()=>document.querySelector('meta[name="entrega365-release"]')?.content||"unknown";
  const loadToken=()=>{const t=localStorage.getItem(TK)||"",e=Number(localStorage.getItem(TE)||0);if(t&&e>Date.now()+60000){token=t;exp=e;return true}return false};
  const putToken=(t,e)=>{token=t;exp=e;localStorage.setItem(TK,t);localStorage.setItem(TE,String(e))};
  async function tok(interactive=false){
    if(token&&Date.now()<exp-60000)return token;
    if(loadToken())return token;
    if(window.entrega365NativeDriveAuthorize){
      try{
        const nativeToken=await window.entrega365NativeDriveAuthorize();
        if(nativeToken){token=nativeToken;exp=Date.now()+3500000;window.dispatchEvent(new Event("e365-drive-token"));return token;}
      }catch(e){
        if(!interactive)throw Object.assign(Error("drive_authorization_required"),{cause:e});
      }
    }
    if(!interactive)throw Error("drive_authorization_required");
    const u=auth.currentUser;
    if(!u)throw Error("login_required");
    const p=new GoogleAuthProvider();
    p.addScope("https://www.googleapis.com/auth/drive.file");
    p.addScope("https://www.googleapis.com/auth/drive.appdata");
    p.setCustomParameters({login_hint:mail()||u.email||"",prompt:"consent",include_granted_scopes:"true"});
    try{
      const z=await reauthenticateWithPopup(u,p);
      const q=GoogleAuthProvider.credentialFromResult(z);
      if(!q?.accessToken)throw Error("drive_token_missing");
      putToken(q.accessToken,Date.now()+3500000);
      window.dispatchEvent(new Event("e365-drive-token"));
      return token;
    }catch(e){
      if(e?.code!=="auth/popup-blocked"&&e?.code!=="auth/cancelled-popup-request")throw e;
      localStorage.setItem(RP,"1");
      setState({manualSaveError:"drive_authorization_redirect",manualSaveOk:false});
      await reauthenticateWithRedirect(u,p);
      throw Error("drive_authorization_redirect_started");
    }
  }
  async function finishRedirectAuth(){
    if(localStorage.getItem(RP)!=="1")return false;
    localStorage.removeItem(RP);
    try{
      const r=await getRedirectResult(auth);
      const q=r&&GoogleAuthProvider.credentialFromResult(r);
      if(!q?.accessToken)throw Error("drive_token_missing");
      putToken(q.accessToken,Date.now()+3500000);
      setState({manualSaveError:"",manualSaveOk:false});
      const ok=await save();
      if(ok)setState({manualSavedAt:Date.now(),manualSaveOk:true});
      else setState({manualSaveOk:false});
      return ok;
    }catch(e){
      console.warn("Drive redirect authorization:",e);
      setState({manualSaveOk:false,manualSaveError:String(e?.code||e?.message||e),manualSaveStatus:e?.status||0});
      return false;
    }
  }
  async function api(url,opt={}){const t=await tok(false);const res=await fetch(url,{...opt,cache:"no-store",headers:{Authorization:"Bearer "+t,...(opt.headers||{})}});if(!res.ok){let detail="";try{detail=await res.text()}catch{}const e=Error("drive_"+res.status);e.status=res.status;e.detail=detail;throw e}return res.status===204?null:res.json()}
  async function findFolder(){if(folderId)return folderId;const q="name='"+FOLDER_NAME+"' and mimeType='application/vnd.google-apps.folder' and trashed=false";const x=await api(API+"?q="+encodeURIComponent(q)+"&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=10");if(x.files?.[0]){folderId=x.files[0].id;return folderId}const z=await api(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:FOLDER_NAME,mimeType:"application/vnd.google-apps.folder"})});folderId=z.id;return folderId}
  async function findFile(){const folder=await findFolder();const q="name='"+NAME+"' and '"+folder+"' in parents and trashed=false";const x=await api(API+"?q="+encodeURIComponent(q)+"&spaces=drive&fields=files(id,modifiedTime,name)&orderBy=modifiedTime%20desc&pageSize=10");if(x.files?.[0])return x.files[0];for(const name of OLD_NAMES){const aq="name='"+name+"' and 'appDataFolder' in parents and trashed=false";const y=await api(API+"?q="+encodeURIComponent(aq)+"&spaces=appDataFolder&fields=files(id,modifiedTime,name)&orderBy=modifiedTime%20desc&pageSize=10");if(y.files?.[0])return y.files[0]}return null}
  async function read(id){const t=await tok(false);const res=await fetch(API+"/"+id+"?alt=media",{cache:"no-store",headers:{Authorization:"Bearer "+t}});if(!res.ok)throw Error("drive_"+res.status);return res.json()}
  function includedKey(k){const s=session(),pre="dcv2:"+s+":";return !!k&&(k.startsWith(pre)||k==="entrega365:establishments:"+s||k==="entrega365:currentEstablishment:"+s||["entrega365:agenda","entrega365:settings","e365month"].includes(k))}
  function keys(){const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k!==TK&&k!==TE&&k!==RP&&k!==stateKey()&&includedKey(k))o[k]=localStorage.getItem(k)}return o}
  function hasLocalData(){return Object.keys(keys()).length>0}
  function safetyKey(){return "entrega365:safetySnapshot:"+uid()}
  function saveLocalSafety(){if(!hasLocalData())return;try{localStorage.setItem(safetyKey(),JSON.stringify({format:"Entrega365LocalSafety",version:1,uid:uid(),email:mail(),release:release(),exportedAt:new Date().toISOString(),localStorage:keys()}))}catch(e){console.warn("Local safety snapshot:",e)}}
  function snap(){return {format:"Entrega365Backup",version:200,uid:uid(),email:mail(),release:release(),localStorage:keys(),exportedAt:new Date().toISOString()}}
  async function save(){if(busy||restoring||!session()||(!loadToken()&&!token))return false;busy=true;try{const old=await findFile();const boundary="----E365"+Date.now();const meta=old?.name===NAME?{name:NAME,mimeType:"application/json"}:{name:NAME,mimeType:"application/json",parents:[await findFolder()]};const body=new Blob(["--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",JSON.stringify(meta),"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n",JSON.stringify(snap()),"\r\n--"+boundary+"--"]);const z=await api((old?.name===NAME?UP+"/"+old.id:UP)+"?uploadType=multipart&fields=id,modifiedTime",{method:old?.name===NAME?"PATCH":"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body});fileId=z.id;setState({initialized:true,dirty:false,remoteAt:Date.parse(z.modifiedTime||"")||Date.now(),savedAt:Date.now(),changedAt:0,release:release(),manualSaveOk:true,manualSaveError:""});return true}catch(e){console.warn("Drive save:",e);setState({manualSaveOk:false,manualSaveError:String(e?.message||e),manualSaveStatus:e?.status||0});return false}finally{busy=false}}
  async function manualBackup(){if(restoring||busy)return false;try{const u=auth.currentUser;if(!u)throw Error("login_required");await tok(true);const ok=await save();if(ok){setState({manualSavedAt:Date.now(),manualSaveOk:true});return true}return false}catch(e){console.warn("Backup manual:",e);setState({manualSaveOk:false,manualSaveError:String(e?.code||e?.message||e),manualSaveStatus:e?.status||0});return false}}
  function clearData(){const rm=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(includedKey(k))rm.push(k)}rm.forEach(k=>localStorage.removeItem(k))}
  function applySnapshot(d){saveLocalSafety();clearData();for(const[k,v]of Object.entries(d.localStorage||{}))if(includedKey(k))localStorage.setItem(k,v);localStorage.setItem("dcv2:session",session())}
  async function restoreFrom(file){restoring=true;try{const d=await read(file.id);if(d.format!=="Entrega365Backup"||!d.localStorage)throw Error("invalid_backup");if((d.email&&mail()&&String(d.email).toLowerCase()!==mail())||(d.uid&&String(d.uid)!==uid()))throw Error("backup_account_mismatch");applySnapshot(d);fileId=file.id;const remoteAt=Date.parse(file.modifiedTime||d.exportedAt||"")||Date.now();setState({initialized:true,dirty:false,remoteAt,restoredAt:Date.now(),changedAt:0,release:release()});window.dispatchEvent(new Event("e365-drive-restored"));return true}catch(e){console.warn("Drive restore:",e);return false}finally{restoring=false}}
  const queue=()=>{if(!session()||restoring)return;setState({dirty:true,changedAt:Date.now()});clearTimeout(timer);timer=setTimeout(()=>save().catch(()=>{}),900)};
  async function sync(){
    if(syncing||!session())return false;
    if(!token&&!loadToken()){
      const st0=state(),lastAttempt=Number(st0.nativeDriveAuthAttemptedAt||0);
      if(window.entrega365NativeDriveAuthorize && Date.now()-lastAttempt>10*60*1000){
        setState({nativeDriveAuthAttemptedAt:Date.now(),driveNeedsAuthorization:true});
        try{await tok(false);}catch(e){return false;}
      }
    }
    if(!loadToken()&&!token)return false;
    syncing=true;try{const remote=await findFile(),st=state(),local=hasLocalData(),remoteAt=remote?Date.parse(remote.modifiedTime||"")||0:0;if(!remote){if(local||st.dirty)await save();else setState({initialized:true,dirty:false,remoteAt:0,release:release()});return false}fileId=remote.id;if(st.initialized&&st.release&&st.release!==release()&&local){saveLocalSafety();await save();return false}if(!st.initialized){if(st.dirty&&Number(st.changedAt||0)>remoteAt){await save();return false}const restored=await restoreFrom(remote);if(restored)window.render?.();return restored}if(st.dirty){await save();return false}if(remoteAt&&remoteAt>Number(st.remoteAt||0)){const restored=await restoreFrom(remote);if(restored)window.render?.();return restored}return false}catch(e){console.warn("Drive sync:",e);return false}finally{syncing=false}}
  window.entrega365DriveAutoSync=sync;window.entrega365DriveSave=save;window.entrega365DriveManualBackup=manualBackup;window.entrega365DriveManualBackupStatus=()=>state();window.entrega365DriveStatus=()=>({authorized:!!(token||loadToken()),busy,restoring,syncing,fileId,folderId,state:state()});
  window.entrega365DriveLocalSafetyRestore=()=>{try{const d=JSON.parse(localStorage.getItem(safetyKey())||"null");if(!d?.localStorage)return false;if(d.email&&mail()&&String(d.email).toLowerCase()!==mail())return false;clearData();for(const[k,v]of Object.entries(d.localStorage))if(includedKey(k))localStorage.setItem(k,v);window.dispatchEvent(new Event("e365-data-changed"));window.render?.();return true}catch{return false}};
  window.addEventListener("e365-data-changed",queue);window.addEventListener("e365-drive-token",()=>sync().catch(()=>{}));window.addEventListener("online",()=>sync().catch(()=>{}));window.addEventListener("e365-drive-restored",()=>setTimeout(()=>window.render?.(),0));setInterval(()=>{if(session()&&state().dirty)save().catch(()=>{})},10000);setTimeout(()=>sync().catch(()=>{}),700);
  setTimeout(()=>finishRedirectAuth().catch(()=>{}),0);
}