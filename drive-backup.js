import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE_API="https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_NAME="Entrega365";
const BACKUP_NAME="entrega365-backup.json";
const DRIVE_ENABLED_KEY="entrega365:driveAutoBackup";
const DRIVE_LAST_KEY="entrega365:driveLastBackup";

export function initDriveBackup(auth){
  if(!auth || window.__entrega365DriveReady)return;
  window.__entrega365DriveReady=true;

  let driveAuth=null;
  try{
    const driveApp=initializeApp(auth.app.options,"entrega365-drive");
    driveAuth=getAuth(driveApp);
    setPersistence(driveAuth,browserLocalPersistence).catch(()=>{});
  }catch(e){console.warn("Entrega365 Drive auth init",e)}

  let accessToken=null;
  let accessTokenExpiresAt=0;
  let saving=false;
  let saveTimer=null;
  let driveFileId=null;
  let driveGoogleUser=null;

  function installMobileLayout(){
    if(document.getElementById("entrega365-mobile-layout-fix"))return;
    const s=document.createElement("style");
    s.id="entrega365-mobile-layout-fix";
    s.textContent=`
      html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
      #app{width:100%!important;min-width:0!important;max-width:100%!important;padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
      header{width:100%!important;max-width:100%!important;min-width:0!important;padding-left:12px!important;padding-right:8px!important}
      header .head{min-width:0!important;flex:0 1 auto!important}
      header .brand{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:150px!important}
      header .actions{min-width:0!important;max-width:calc(100vw - 165px)!important;overflow-x:auto!important;overflow-y:hidden!important;justify-content:flex-end!important;flex:1 1 auto!important;scrollbar-width:none!important}
      header .actions::-webkit-scrollbar{display:none!important}
      main{width:100%!important;max-width:600px!important;min-width:0!important;margin-left:auto!important;margin-right:auto!important;padding-left:10px!important;padding-right:10px!important}
      main>*{max-width:100%!important;min-width:0!important}
      .tabs{position:fixed!important;display:flex!important;visibility:visible!important;opacity:1!important;z-index:9999!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;max-width:100vw!important;height:76px!important;margin:0!important;transform:none!important}
      .tab{min-width:0!important;overflow:hidden!important}
      .grid,.kmgrid{width:100%!important;min-width:0!important}
      @media(max-width:600px){.card{width:100%!important;min-width:0!important}.tablehead,.entry{min-width:0!important}.ico{flex:0 0 40px!important}.actions [data-drive-status]{flex:0 0 auto!important}}
    `;
    document.head.appendChild(s);
  }

  function makeBackup(){
    const user=localStorage.getItem("dcv2:session");
    if(!user)throw new Error("login");
    const prefix="dcv2:"+user+":",days={},expenses={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(!k?.startsWith(prefix))continue;
      const r=k.slice(prefix.length);
      try{
        if(r.startsWith("day:"))days[r.slice(4)]=JSON.parse(localStorage.getItem(k));
        else if(r.startsWith("exp:"))expenses[r.slice(4)]=JSON.parse(localStorage.getItem(k));
      }catch{}
    }
    let mechanica={};try{mechanica=JSON.parse(localStorage.getItem(prefix+"mechanica"))||{}}catch{}
    return {backupVersion:7,format:"Entrega365Backup",app:"Entrega365",user,days,expenses,mechanica,exportedAt:new Date().toISOString()};
  }

  async function getDriveToken(force=false){
    if(!driveAuth)throw new Error("drive_auth_init");
    if(!force && accessToken && Date.now()<accessTokenExpiresAt-60000)return accessToken;
    const provider=new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.setCustomParameters({prompt:"consent"});
    let result;
    if(driveAuth.currentUser){
      result=await reauthenticateWithPopup(driveAuth.currentUser,provider);
    }else{
      result=await signInWithPopup(driveAuth,provider);
    }
    driveGoogleUser=result.user;
    const credential=GoogleAuthProvider.credentialFromResult(result);
    if(!credential?.accessToken)throw new Error("token");
    accessToken=credential.accessToken;
    accessTokenExpiresAt=Date.now()+3500*1000;
    return accessToken;
  }

  async function driveFetch(url,token,options={}){
    const res=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})}});
    if(!res.ok){let detail="";try{detail=await res.text()}catch{}const e=new Error(`drive_${res.status}`);e.detail=detail;throw e;}
    return res.status===204?null:res.json();
  }

  async function getOrCreateFolder(token){
    const q=`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='entrega365' and value='backup-folder' }`;
    const list=await driveFetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)&pageSize=10`,token);
    if(list.files?.length)return list.files[0].id;
    const folder=await driveFetch(`${DRIVE_API}?fields=id,name`,token,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:FOLDER_NAME,mimeType:"application/vnd.google-apps.folder",appProperties:{entrega365:"backup-folder"}})});
    if(!folder?.id)throw new Error("folder");
    return folder.id;
  }

  async function findFolder(token){
    const q=`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='entrega365' and value='backup-folder' }`;
    const list=await driveFetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)&pageSize=10`,token);
    return list.files?.[0]||null;
  }

  async function findBackup(token,folderId){
    const q=`'${folderId}' in parents and name='${BACKUP_NAME}' and trashed=false`;
    const list=await driveFetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name,parents,webViewLink,modifiedTime,size)&pageSize=10`,token);
    return list.files?.[0]||null;
  }

  async function uploadMultipart(token,metadata,blob,fileId=null){
    const boundary="----Entrega365Boundary";
    const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),`\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,blob,`\r\n--${boundary}--`]);
    const url=fileId?`${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,parents,webViewLink,modifiedTime`:`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,parents,webViewLink,modifiedTime`;
    return driveFetch(url,token,{method:fileId?"PATCH":"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body});
  }

  async function saveToDrive({interactive=false}={}){
    if(saving)return null;
    if(!localStorage.getItem("dcv2:session"))throw new Error("login");
    saving=true;
    try{
      const token=await getDriveToken(false);
      const folderId=await getOrCreateFolder(token);
      const payload=JSON.stringify(makeBackup(),null,2);
      const blob=new Blob([payload],{type:"application/json"});
      const existing=driveFileId?{id:driveFileId}:await findBackup(token,folderId);
      const metadata=existing?{name:BACKUP_NAME,mimeType:"application/json"}:{name:BACKUP_NAME,mimeType:"application/json",parents:[folderId],appProperties:{entrega365:"backup"}};
      const file=await uploadMultipart(token,metadata,blob,existing?.id||null);
      if(!file?.id)throw new Error("upload");
      driveFileId=file.id;
      localStorage.setItem(DRIVE_LAST_KEY,file.modifiedTime||new Date().toISOString());
      localStorage.setItem(DRIVE_ENABLED_KEY,"1");
      if(interactive)alert(`Backup salvo no Google Drive.\n\nConta Google: ${driveGoogleUser?.email||"autorizada"}\nPasta: ${FOLDER_NAME}\nArquivo: ${BACKUP_NAME}`);
      return {...file,folderId};
    }catch(e){
      if(e.message==="drive_401"||e.message==="drive_403")accessToken=null;
      throw e;
    }finally{saving=false;}
  }

  function scheduleAutoSave(){
    if(localStorage.getItem(DRIVE_ENABLED_KEY)!=="1")return;
    if(!localStorage.getItem("dcv2:session"))return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      try{
        await saveToDrive();
        setDriveStatus("☁️ Backup salvo agora");
      }catch(e){
        console.warn("Entrega365 Drive auto backup",e);
        if(e.message==="drive_401"||e.message==="drive_403"){
          accessToken=null;
          setDriveStatus("☁️ Toque para reconectar");
        }
      }
    },900);
  }

  function setDriveStatus(text){
    const el=document.querySelector("[data-drive-status]");
    if(el)el.textContent=text;
  }

  function addStatus(){
    const actions=document.querySelector(".actions");
    if(!actions||actions.querySelector("[data-drive-status]"))return;
    const el=document.createElement("button");
    el.type="button";
    el.setAttribute("data-drive-status","1");
    el.title="Conectar ou verificar backup do Google Drive";
    el.style.cssText="display:inline-flex;align-items:center;justify-content:center;max-width:155px;min-width:0;height:40px;padding:0 10px;border:1px solid #333;border-radius:10px;background:#1e1e1e;color:#a0a0a0;font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto";
    el.textContent=localStorage.getItem(DRIVE_ENABLED_KEY)==="1"?"☁️ Backup automático ativo":"☁️ Drive não conectado";
    el.onclick=()=>document.querySelector("[data-drive-backup]")?.click();
    actions.insertBefore(el,actions.firstChild);
  }

  function addButton(text,title,handler,attribute){
    const actions=document.querySelector(".actions");
    if(!actions||actions.querySelector(`[${attribute}]`))return;
    const b=document.createElement("button");
    b.className="ico";b.setAttribute(attribute,"1");b.title=title;b.setAttribute("aria-label",title);b.textContent=text;b.onclick=handler;
    actions.insertBefore(b,actions.firstChild);
  }

  function addButtons(){
    addButton("☁️","Conectar Google Drive e ativar backup automático",async()=>{
      try{
        setDriveStatus("☁️ Conectando Google...");
        await saveToDrive({interactive:true});
        setDriveStatus("☁️ Backup automático ativo");
      }catch(e){
        console.error("Entrega365 Drive backup",e);
        let msg="Não foi possível conectar o Google Drive.";
        if(e.message==="login")msg="Faça login no Entrega365 antes de conectar o Google Drive.";
        else if(e.message==="token")msg="O Google não retornou a autorização do Drive. Tente novamente e aceite a permissão.";
        else if(e.message==="drive_403")msg="O Google recusou o acesso. Verifique se o Google Drive API está habilitado no projeto Entrega365.";
        else if(e.message==="drive_401")msg="A autorização do Google Drive expirou. Toque no botão novamente para autorizar.";
        else if(e.message==="drive_auth_init")msg="Não foi possível inicializar a conexão segura com o Google Drive. Atualize a página e tente novamente.";
        alert(msg);
        setDriveStatus("☁️ Drive não conectado");
      }
    },"data-drive-backup");
    addButton("↩️","Restaurar último backup do Google Drive",()=>window.entrega365RestoreBackupFromDrive(),"data-drive-restore");
    addStatus();
  }

  async function downloadBackup(token,fileId){
    const res=await fetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok){const e=new Error(`drive_${res.status}`);throw e;}
    return res.json();
  }

  function restoreBackup(data){
    if(!data||data.format!=="Entrega365Backup"||!data.user)throw new Error("invalid_backup");
    const current=localStorage.getItem("dcv2:session");
    if(current&&data.user!==current&&current.startsWith("google:")===false)throw new Error("different_account");
    const prefix="dcv2:"+data.user+":";
    Object.keys(localStorage).forEach(k=>{if(k.startsWith(prefix+"day:")||k.startsWith(prefix+"exp:"))localStorage.removeItem(k)});
    Object.entries(data.days||{}).forEach(([k,v])=>localStorage.setItem(prefix+"day:"+k,JSON.stringify(v)));
    Object.entries(data.expenses||{}).forEach(([k,v])=>localStorage.setItem(prefix+"exp:"+k,JSON.stringify(v)));
    if(data.mechanica)localStorage.setItem(prefix+"mechanica",JSON.stringify(data.mechanica));
    localStorage.setItem("dcv2:session",data.user);
    localStorage.setItem("entrega365:driveRestoredAt",new Date().toISOString());
  }

  window.entrega365SaveBackupToDrive=async()=>{
    try{
      const file=await saveToDrive({interactive:true});
      setDriveStatus("☁️ Backup automático ativo");
      return file;
    }catch(e){throw e;}
  };

  window.entrega365RestoreBackupFromDrive=async()=>{
    try{
      const token=await getDriveToken(true);
      const folder=await findFolder(token);
      if(!folder)throw new Error("no_folder");
      const file=await findBackup(token,folder.id);
      if(!file)throw new Error("no_backup");
      const data=await downloadBackup(token,file.id);
      const when=file.modifiedTime?new Date(file.modifiedTime).toLocaleString("pt-BR"):"desconhecida";
      const exported=data.exportedAt?new Date(data.exportedAt).toLocaleString("pt-BR"):when;
      const ok=confirm(`Backup encontrado no Google Drive.\n\nPasta: ${FOLDER_NAME}\nArquivo: ${BACKUP_NAME}\nÚltima alteração: ${when}\nBackup realizado: ${exported}\n\nRestaurar agora?\n\nOs dados atuais deste usuário serão substituídos pelos dados do backup.`);
      if(!ok)return null;
      restoreBackup(data);
      alert("Backup restaurado com sucesso!\n\nO Entrega365 será recarregado.");
      location.reload();
      return data;
    }catch(e){
      console.error("Entrega365 Drive restore",e);
      let msg="Não foi possível restaurar o backup do Google Drive.";
      if(e.message==="no_folder")msg=`A pasta ${FOLDER_NAME} não foi encontrada no Google Drive.`;
      else if(e.message==="no_backup")msg=`Não encontrei ${BACKUP_NAME} dentro da pasta ${FOLDER_NAME}.`;
      else if(e.message==="invalid_backup")msg="O arquivo encontrado não é um backup válido do Entrega365.";
      else if(e.message==="different_account")msg="Este backup pertence a outra conta do Entrega365.";
      else if(e.message==="drive_403")msg="O Google recusou o acesso ao backup. Autorize novamente o Google Drive.";
      else if(e.message==="drive_401")msg="A autorização do Google Drive expirou. Tente novamente.";
      else if(e.message==="token")msg="O Google não retornou a autorização do Drive. Tente novamente.";
      alert(msg);
      throw e;
    }
  };

  function installAutoSaveHook(){
    if(window.__entrega365DriveHook)return;
    window.__entrega365DriveHook=true;
    const originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      const result=originalSetItem.call(this,key,value);
      if(this===localStorage&&typeof key==="string"){
        const session=localStorage.getItem("dcv2:session");
        if(session&&(key.startsWith("dcv2:"+session+":day:")||key.startsWith("dcv2:"+session+":exp:")||key==="dcv2:"+session+":mechanica"))scheduleAutoSave();
      }
      return result;
    };
  }

  function handleDriveAuth(u){
    driveGoogleUser=u||null;
    if(u){
      if(localStorage.getItem(DRIVE_ENABLED_KEY)==="1"){
        setDriveStatus(`☁️ Drive: ${u.email||"conectado"}`);
        scheduleAutoSave();
      }
    }
  }

  installMobileLayout();
  installAutoSaveHook();
  addButtons();
  new MutationObserver(()=>{installMobileLayout();addButtons()}).observe(document.body,{childList:true,subtree:true});
  if(driveAuth)onAuthStateChanged(driveAuth,handleDriveAuth);
}
