import { GoogleAuthProvider, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

export function initDriveBackup(auth){
  if(!auth)return;
  const makeBackup=()=>{
    const user=localStorage.getItem("dcv2:session");if(!user)throw new Error("login");
    const p="dcv2:"+user+":",days={},expenses={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith(p))continue;const r=k.slice(p.length);try{if(r.startsWith("day:"))days[r.slice(4)]=JSON.parse(localStorage.getItem(k));else if(r.startsWith("exp:"))expenses[r.slice(4)]=JSON.parse(localStorage.getItem(k))}catch{}}
    let mechanica={};try{mechanica=JSON.parse(localStorage.getItem(p+"mechanica"))||{}}catch{}
    return {backupVersion:3,format:"Entrega365Backup",app:"Entrega365",user,days,expenses,mechanica,exportedAt:new Date().toISOString()};
  };
  const upload=async()=>{
    const current=auth.currentUser;
    if(!current)throw new Error("login");
    const isGoogle=current.providerData?.some(p=>p.providerId==="google.com");
    if(!isGoogle)throw new Error("google");
    const provider=new GoogleAuthProvider();provider.addScope("https://www.googleapis.com/auth/drive.file");provider.setCustomParameters({prompt:"consent"});
    const result=await reauthenticateWithPopup(current,provider),cred=GoogleAuthProvider.credentialFromResult(result),token=cred?.accessToken;
    if(!token)throw new Error("token");
    const data=JSON.stringify(makeBackup(),null,2),file=new Blob([data],{type:"application/json"}),name=`entrega365-backup-${new Date().toISOString().slice(0,10)}.json`,boundary="----Entrega365Boundary";
    const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify({name,mimeType:"application/json"}),`\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,file,`\r\n--${boundary}--`]);
    const res=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":`multipart/related; boundary=${boundary}`},body});
    if(!res.ok)throw new Error("upload");return res.json();
  };
  window.entrega365SaveBackupToDrive=async()=>{try{const f=await upload();alert(`Backup salvo no Google Drive: ${f.name||"arquivo criado"}`);return f}catch(e){const msg=e.message==="google"?"O backup no Google Drive exige que você esteja conectado com uma Conta Google no Entrega365.":e.message==="token"?"Não foi possível obter a autorização do Google Drive.":"Não foi possível salvar o backup no Google Drive. Verifique se a API Google Drive está ativada no projeto Google Cloud.";alert(msg);throw e}};
  const add=()=>{const a=document.querySelector('.actions');if(!a||a.querySelector('[data-drive-backup]'))return;const b=document.createElement('button');b.className='ico';b.dataset.driveBackup='1';b.title='Salvar backup no Google Drive';b.textContent='☁️';b.onclick=()=>window.entrega365SaveBackupToDrive();a.insertBefore(b,a.firstChild)};
  add();new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
}
