import { GoogleAuthProvider, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE_API="https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_NAME="Entrega365";

export function initDriveBackup(auth){
  if(!auth || window.__entrega365DriveReady)return;
  window.__entrega365DriveReady=true;

  function makeBackup(){
    const user=localStorage.getItem("dcv2:session");
    if(!user)throw new Error("login");
    const prefix="dcv2:"+user+":",days={},expenses={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i); if(!k?.startsWith(prefix))continue;
      const r=k.slice(prefix.length);
      try{
        if(r.startsWith("day:"))days[r.slice(4)]=JSON.parse(localStorage.getItem(k));
        else if(r.startsWith("exp:"))expenses[r.slice(4)]=JSON.parse(localStorage.getItem(k));
      }catch{}
    }
    let mechanica={}; try{mechanica=JSON.parse(localStorage.getItem(prefix+"mechanica"))||{}}catch{}
    return {backupVersion:5,format:"Entrega365Backup",app:"Entrega365",user,days,expenses,mechanica,exportedAt:new Date().toISOString()};
  }

  async function getDriveToken(){
    const current=auth.currentUser;
    if(!current)throw new Error("login");
    if(!current.providerData?.some(p=>p.providerId==="google.com"))throw new Error("google");
    const provider=new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.setCustomParameters({prompt:"consent"});
    const result=await reauthenticateWithPopup(current,provider);
    const credential=GoogleAuthProvider.credentialFromResult(result);
    if(!credential?.accessToken)throw new Error("token");
    return credential.accessToken;
  }

  async function driveFetch(url,token,options={}){
    const res=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})}});
    if(!res.ok){let detail="";try{detail=await res.text()}catch{}const e=new Error(`drive_${res.status}`);e.detail=detail;throw e;}
    return res.status===204?null:res.json();
  }

  async function getOrCreateFolder(token){
    // Search by both name and our private marker. With drive.file this finds folders created by this app.
    const q=`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='entrega365' and value='backup-folder' }`;
    const list=await driveFetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name,mimeType,parents)&pageSize=10`,token);
    if(list.files?.length)return list.files[0].id;

    const folder=await driveFetch(`${DRIVE_API}?fields=id,name,mimeType,parents`,token,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name:FOLDER_NAME,mimeType:"application/vnd.google-apps.folder",appProperties:{entrega365:"backup-folder"}})
    });
    if(!folder?.id)throw new Error("folder");
    return folder.id;
  }

  async function findBackup(token,folderId){
    const q=`'${folderId}' in parents and name='entrega365-backup.json' and trashed=false`;
    const list=await driveFetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name,parents,webViewLink,modifiedTime)&pageSize=10`,token);
    return list.files?.[0]||null;
  }

  async function uploadMultipart(token,metadata,blob,fileId=null){
    const boundary="----Entrega365Boundary";
    const body=new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`
    ]);
    const url=fileId?`${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,parents,webViewLink,modifiedTime`:`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,parents,webViewLink,modifiedTime`;
    return driveFetch(url,token,{method:fileId?"PATCH":"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body});
  }

  async function saveToDrive(){
    const token=await getDriveToken();
    const folderId=await getOrCreateFolder(token);
    const payload=JSON.stringify(makeBackup(),null,2);
    const blob=new Blob([payload],{type:"application/json"});
    const existing=await findBackup(token,folderId);
    const metadata=existing
      ? {name:"entrega365-backup.json",mimeType:"application/json"}
      : {name:"entrega365-backup.json",mimeType:"application/json",parents:[folderId],appProperties:{entrega365:"backup"}};
    const file=await uploadMultipart(token,metadata,blob,existing?.id||null);
    if(!file?.id)throw new Error("upload");
    return {...file,folderId};
  }

  window.entrega365SaveBackupToDrive=async()=>{
    try{
      const file=await saveToDrive();
      alert(`Backup salvo no Google Drive.\n\nPasta: ${FOLDER_NAME}\nArquivo: entrega365-backup.json`);
      return file;
    }catch(e){
      console.error("Entrega365 Drive backup",e);
      let msg="Não foi possível salvar o backup no Google Drive.";
      if(e.message==="google")msg="O backup no Google Drive exige login com uma Conta Google.";
      else if(e.message==="login")msg="Faça login no Entrega365 antes de salvar o backup.";
      else if(e.message==="token")msg="O Google não retornou a autorização do Drive. Tente novamente e aceite a permissão.";
      else if(e.message==="drive_403")msg="O Google recusou o acesso. Confirme a permissão drive.file.";
      else if(e.message==="drive_401")msg="A autorização do Google Drive expirou. Tente novamente.";
      else if(e.message==="folder")msg="Não foi possível criar a pasta Entrega365 no Google Drive.";
      alert(msg);
      throw e;
    }
  };

  function addButton(){
    const actions=document.querySelector(".actions");
    if(!actions||actions.querySelector("[data-drive-backup]"))return;
    const b=document.createElement("button");
    b.className="ico";b.dataset.driveBackup="1";b.title="Salvar backup no Google Drive";b.setAttribute("aria-label","Salvar backup no Google Drive");b.textContent="☁️";
    b.onclick=()=>window.entrega365SaveBackupToDrive();
    actions.insertBefore(b,actions.firstChild);
  }
  addButton();
  new MutationObserver(addButton).observe(document.body,{childList:true,subtree:true});
}
