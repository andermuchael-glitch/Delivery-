import { GoogleAuthProvider, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE_API="https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_NAME="Entrega365";
const BACKUP_NAME="entrega365-backup.json";

export function initDriveBackup(auth){
  if(!auth || window.__entrega365DriveReady)return;
  window.__entrega365DriveReady=true;

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

  async function saveToDrive(){
    const token=await getDriveToken();
    const folderId=await getOrCreateFolder(token);
    const payload=JSON.stringify(makeBackup(),null,2);
    const blob=new Blob([payload],{type:"application/json"});
    const existing=await findBackup(token,folderId);
    const metadata=existing?{name:BACKUP_NAME,mimeType:"application/json"}:{name:BACKUP_NAME,mimeType:"application/json",parents:[folderId],appProperties:{entrega365:"backup"}};
    const file=await uploadMultipart(token,metadata,blob,existing?.id||null);
    if(!file?.id)throw new Error("upload");
    return {...file,folderId};
  }

  async function downloadBackup(token,fileId){
    const res=await fetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok){const e=new Error(`drive_${res.status}`);throw e;}
    return res.json();
  }

  function restoreBackup(data){
    if(!data||data.format!=="Entrega365Backup"||!data.user)throw new Error("invalid_backup");
    const current=localStorage.getItem("dcv2:session");
    if(current&&data.user!==current)throw new Error("different_account");
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
      const file=await saveToDrive();
      alert(`Backup salvo no Google Drive.\n\nPasta: ${FOLDER_NAME}\nArquivo: ${BACKUP_NAME}`);
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

  window.entrega365RestoreBackupFromDrive=async()=>{
    try{
      const token=await getDriveToken();
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
      if(e.message==="google")msg="A restauração exige login com uma Conta Google.";
      else if(e.message==="login")msg="Faça login no Entrega365 antes de restaurar o backup.";
      else if(e.message==="token")msg="O Google não retornou a autorização do Drive. Tente novamente.";
      else if(e.message==="no_folder")msg=`A pasta ${FOLDER_NAME} não foi encontrada no Google Drive.`;
      else if(e.message==="no_backup")msg=`Não encontrei ${BACKUP_NAME} dentro da pasta ${FOLDER_NAME}.`;
      else if(e.message==="invalid_backup")msg="O arquivo encontrado não é um backup válido do Entrega365.";
      else if(e.message==="different_account")msg="Este backup pertence a outra conta do Entrega365. Entre com a conta correta antes de restaurar.";
      else if(e.message==="drive_403")msg="O Google recusou o acesso ao backup. Autorize novamente o Google Drive.";
      alert(msg);
      throw e;
    }
  };

  function addButton(text,title,handler,attribute){
    const actions=document.querySelector(".actions");
    if(!actions||actions.querySelector(`[${attribute}]`))return;
    const b=document.createElement("button");
    b.className="ico";b.setAttribute(attribute,"1");b.title=title;b.setAttribute("aria-label",title);b.textContent=text;
    b.onclick=handler;
    actions.insertBefore(b,actions.firstChild);
  }

  function addButtons(){
    addButton("☁️","Salvar backup no Google Drive",()=>window.entrega365SaveBackupToDrive(),"data-drive-backup");
    addButton("↩️","Restaurar backup do Google Drive",()=>window.entrega365RestoreBackupFromDrive(),"data-drive-restore");
  }
  addButtons();
  new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});
}
