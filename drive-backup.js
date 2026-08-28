import { GoogleAuthProvider, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file",DRIVE_API="https://www.googleapis.com/drive/v3/files",DRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3/files",FOLDER_NAME="Entrega365",BACKUP_NAME="entrega365-backup.json",ENABLED="entrega365:driveAutoBackup",LAST="entrega365:driveLastBackup",TOKEN_KEY="entrega365:driveAccessToken",TOKEN_EXP_KEY="entrega365:driveAccessTokenExp";

export function initDriveBackup(auth){
  if(!auth||window.__e365Drive)return;
  window.__e365Drive=true;
  let token=null,exp=0,fileId=null,busy=false;
  const userKey=()=>localStorage.getItem("dcv2:session")||"";
  const email=()=>localStorage.getItem("entrega365:email")||"";

  function loadToken(){try{const t=localStorage.getItem(TOKEN_KEY),e=Number(localStorage.getItem(TOKEN_EXP_KEY)||0);if(t&&e>Date.now()+60000){token=t;exp=e;return true}}catch{}return false}
  function clearToken(){token=null;exp=0;try{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(TOKEN_EXP_KEY)}catch{}}
  function storeToken(t,e){token=t;exp=e;try{localStorage.setItem(TOKEN_KEY,t);localStorage.setItem(TOKEN_EXP_KEY,String(e))}catch{}}

  async function authDrive(force=false){
    if(!force&&token&&Date.now()<exp-60000)return token;
    if(!force&&loadToken())return token;
    const user=auth.currentUser;
    if(!user)throw Error("login_required");
    const p=new GoogleAuthProvider();
    p.addScope(DRIVE_SCOPE);
    p.setCustomParameters({login_hint:email()||undefined,prompt:"consent"});
    let r;
    try{r=await reauthenticateWithPopup(user,p)}
    catch(e){
      if(e?.code==="auth/popup-closed-by-user")throw Error("google_popup_closed");
      if(e?.code==="auth/popup-blocked")throw Error("google_popup_blocked");
      throw e;
    }
    const c=GoogleAuthProvider.credentialFromResult(r);
    if(!c?.accessToken)throw Error("drive_token");
    storeToken(c.accessToken,Date.now()+3500000);
    return token;
  }

  async function api(url,opt={}){
    let t=await authDrive(false);
    let r=await fetch(url,{...opt,cache:"no-store",headers:{Authorization:`Bearer ${t}`,...(opt.headers||{})}});
    if((r.status===401||r.status===403)){
      clearToken();
      t=await authDrive(true);
      r=await fetch(url,{...opt,cache:"no-store",headers:{Authorization:`Bearer ${t}`,...(opt.headers||{})}});
    }
    if(!r.ok){const e=Error("drive_"+r.status);try{e.detail=await r.text()}catch{}throw e}
    return r.status===204?null:r.json();
  }

  async function folder(){
    const q=`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const x=await api(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)&pageSize=10`);
    if(x.files?.[0])return x.files[0].id;
    return (await api(`${DRIVE_API}?fields=id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:FOLDER_NAME,mimeType:"application/vnd.google-apps.folder",appProperties:{entrega365:"backup-folder"}})})).id;
  }

  async function findFile(f){
    const q=`'${f}' in parents and name='${BACKUP_NAME}' and trashed=false`;
    const x=await api(`${DRIVE_API}?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name,modifiedTime)&pageSize=10`);
    return x.files?.[0]||null;
  }

  function snapshot(){
    const prefix="dcv2:",out={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(prefix))out[k]=localStorage.getItem(k)}
    return {backupVersion:11,format:"Entrega365Backup",app:"Entrega365",session:userKey(),email:email(),localStorage:out,exportedAt:new Date().toISOString()};
  }

  async function upload(meta,blob,id){
    const b="----E365"+Date.now();
    const body=new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(meta),`\r\n--${b}\r\nContent-Type: application/json\r\n\r\n`,blob,`\r\n--${b}--`]);
    return api(id?`${DRIVE_UPLOAD}/${id}?uploadType=multipart&fields=id,name,parents,modifiedTime`:`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,parents,modifiedTime`,{method:id?"PATCH":"POST",headers:{"Content-Type":`multipart/related; boundary=${b}`},body});
  }

  async function save(interactive=false){
    if(busy)return;
    if(!userKey())throw Error("login_required");
    busy=true;
    try{
      await authDrive(interactive);
      const f=await folder(),old=fileId?{id:fileId}:await findFile(f);
      const data=JSON.stringify(snapshot(),null,2);
      const r=await upload(old?{name:BACKUP_NAME,mimeType:"application/json"}:{name:BACKUP_NAME,mimeType:"application/json",parents:[f],appProperties:{entrega365:"backup"}},new Blob([data],{type:"application/json"}),old?.id);
      fileId=r.id;
      localStorage.setItem(ENABLED,"1");localStorage.setItem(LAST,r.modifiedTime||new Date().toISOString());
      if(interactive)alert(`Backup salvo corretamente no Google Drive.\n\nArquivo: ${BACKUP_NAME}\nPasta: ${FOLDER_NAME}`);
      return r;
    }finally{busy=false}
  }

  async function restore(){
    try{
      await authDrive(true);
      const f=await folder(),old=await findFile(f);
      if(!old)throw Error("no_backup");
      const t=await authDrive(false);
      const r=await fetch(`${DRIVE_API}/${old.id}?alt=media`,{cache:"no-store",headers:{Authorization:`Bearer ${t}`}});
      if(!r.ok)throw Error("drive_"+r.status);
      const d=await r.json();
      if(d.format!=="Entrega365Backup"||!d.localStorage)throw Error("invalid_backup");
      const keys=Object.keys(d.localStorage),ok=confirm(`Backup encontrado.\n\nDados: ${keys.length} registros.\nData: ${new Date(d.exportedAt).toLocaleString("pt-BR")}\n\nRestaurar todos os dados?`);
      if(!ok)return;
      for(const k of keys)localStorage.setItem(k,d.localStorage[k]);
      if(d.session)localStorage.setItem("dcv2:session",d.session);
      if(d.email)localStorage.setItem("entrega365:email",d.email);
      alert(`Backup restaurado com sucesso.\n\n${keys.length} registros recuperados.`);
      location.reload();
    }catch(e){
      console.error(e);
      const msg=e?.message||"unknown";
      alert(msg==="no_backup"?`Não encontrei ${BACKUP_NAME} na pasta ${FOLDER_NAME}.`:msg==="invalid_backup"?"O arquivo do Drive não é um backup completo do Entrega365.":msg==="login_required"?"Entre com Google antes de usar o Drive.":"Não foi possível restaurar o backup: "+msg);
    }
  }

  function add(){
    const a=document.querySelector(".actions");if(!a)return;
    if(!a.querySelector("[data-drive-backup]")){const b=document.createElement("button");b.className="ico";b.dataset.driveBackup="1";b.title="Salvar backup no Google Drive";b.textContent="☁️";b.onclick=()=>save(true).catch(e=>{const m=e?.message||"unknown";alert(m==="google_popup_closed"?"A janela do Google foi fechada antes da autorização. Tente novamente e conclua a autorização.":m==="google_popup_blocked"?"Permita pop-ups para entrega365.com.br e tente novamente.":"Drive: "+m)});a.prepend(b)}
    if(!a.querySelector("[data-drive-restore]")){const b=document.createElement("button");b.className="ico";b.dataset.driveRestore="1";b.title="Restaurar backup do Google Drive";b.textContent="↩️";b.onclick=restore;a.prepend(b)}
  }
  let attempts=0;const iv=setInterval(()=>{add();if(++attempts>=40)clearInterval(iv)},250);
  new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
  window.entrega365SaveBackupToDrive=()=>save(true);
  window.entrega365RestoreBackupFromDrive=restore;
}
