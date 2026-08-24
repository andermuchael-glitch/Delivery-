import "./tools.js?v=13";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU",authDomain:"entrega365.firebaseapp.com",projectId:"entrega365",storageBucket:"entrega365.firebasestorage.app",messagingSenderId:"686578751112",appId:"1:686578751112:web:4c0f8e4b3a569e7297313d",measurementId:"G-RPRXBXXDJK"};
const auth=getAuth(initializeApp(firebaseConfig));
const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:"select_account"});
const SESSION="dcv2:session";
const BACKUP_VERSION=2;
const BACKUP_MARK="Entrega365Backup";
const LOGO="./icon-72.svg?v=74";

function improveLoginVisual(){
 if(document.getElementById("entrega365-login-v11"))return;
 const s=document.createElement("style");s.id="entrega365-login-v11";s.textContent=`
 .login{align-items:flex-start!important;padding:28px 14px 40px!important;overflow-y:auto}.loginbox{max-width:430px!important}
 .biglogo{width:min(94vw,380px)!important;height:245px!important;margin:0 auto 2px!important;border-radius:0!important;background:none!important;border:0!important;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35))}
 .biglogo img{display:block;width:100%;height:100%;object-fit:contain}.loginbox h1{font-size:27px!important;margin-top:0!important}.loginbox>p{font-size:15px!important;margin:5px 0 20px!important}
 .loginbox .card{padding:20px!important;border-radius:22px!important;background:linear-gradient(145deg,#292929,#202020)!important;box-shadow:0 14px 40px rgba(0,0,0,.42)!important}.loginbox label{font-size:14px!important;font-weight:650}.loginbox input{min-height:52px;font-size:16px}.loginbox .primary{min-height:54px;font-size:16px;margin-top:15px!important}.loginbox .add{min-height:54px;border-color:#ffd000!important;color:#ffd000!important;font-size:15px}#google-login,#backup-login{min-height:54px!important;font-size:15px!important;border-radius:13px!important;margin-top:12px!important}.loginbox .small{margin-top:16px;font-size:12px}`;document.head.appendChild(s);
}

function fixLogo(){
 document.querySelectorAll(".biglogo,.logo").forEach(el=>{
  el.style.background="none";el.style.border="0";el.style.borderRadius="0";el.style.overflow="visible";
  if(el.classList.contains("biglogo")){
   el.innerHTML="";
   const img=document.createElement("img");img.src=LOGO;img.alt="Entrega365";img.decoding="async";img.loading="eager";el.appendChild(img);
  }else{
   el.style.backgroundImage=`url("${LOGO}")`;el.style.backgroundSize="contain";el.style.backgroundPosition="center";el.style.backgroundRepeat="no-repeat";
  }
 });
 const big=document.querySelector(".biglogo");if(big){big.style.width="min(94vw,380px)";big.style.height="245px";big.style.margin="0 auto 2px"}
}

function addGoogleButton(){
 const card=document.querySelector(".loginbox .card");if(!card||document.getElementById("google-login"))return;
 const b=document.createElement("button");b.id="google-login";b.type="button";b.textContent="CONTINUAR COM GOOGLE";b.style.cssText="width:100%;border:1px solid #666;border-radius:12px;background:#fff;color:#222;font-weight:900;padding:13px;margin-top:10px;box-shadow:none";
 b.onclick=async()=>{b.disabled=true;b.textContent="CONECTANDO...";try{const result=await signInWithPopup(auth,provider),u=result.user;localStorage.setItem(SESSION,"google:"+u.uid);localStorage.setItem("entrega365:firebaseUid",u.uid);localStorage.setItem("entrega365:email",u.email||"");localStorage.setItem("entrega365:displayName",u.displayName||"");location.reload()}catch(e){console.error(e);b.disabled=false;b.textContent="CONTINUAR COM GOOGLE";const msg=e?.code==="auth/unauthorized-domain"?"Este domínio ainda não está autorizado no Firebase.":e?.code==="auth/popup-blocked"?"O navegador bloqueou a janela do Google. Tente novamente.":e?.code==="auth/operation-not-allowed"?"O login com Google ainda não está ativado no Firebase.":`Não foi possível entrar com Google (${e?.code||"erro"}).`;alert(msg)}};card.appendChild(b)
}

function payloadForBackup(user){
 const prefix="dcv2:"+user+":";
 const days={},expenses={};
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i); if(!k||!k.startsWith(prefix))continue;
  const rest=k.slice(prefix.length);
  try{if(rest.startsWith("day:"))days[rest.slice(4)]=JSON.parse(localStorage.getItem(k));else if(rest.startsWith("exp:"))expenses[rest.slice(4)]=JSON.parse(localStorage.getItem(k));}catch(e){console.warn("Backup: registro ignorado",k,e)}
 }
 return {backupVersion:BACKUP_VERSION,format:BACKUP_MARK,app:"Entrega365",user,days,expenses,mechanica:loadMechanica(user),exportedAt:new Date().toISOString()};
}
function loadMechanica(user){try{return JSON.parse(localStorage.getItem("dcv2:"+user+":mechanica"))||{}}catch{return {}}}
async function digest(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}

async function enhancedBackup(){
 const user=localStorage.getItem(SESSION);if(!user){alert("Faça login antes de gerar o backup.");return}
 const payload=payloadForBackup(user);payload.integrity=await digest(payload);
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`entrega365-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function addBackupButton(){
 const card=document.querySelector(".loginbox .card");if(!card||document.getElementById("backup-login"))return;
 const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.id="backup-file";input.style.display="none";
 const b=document.createElement("button");b.id="backup-login";b.type="button";b.textContent="ENTRAR / RESTAURAR BACKUP";b.style.cssText="width:100%;border:1px solid #ffd000;border-radius:12px;background:#202020;color:#ffd000;font-weight:900;padding:13px;margin-top:10px";
 b.onclick=()=>input.click();input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const raw=await file.text(),data=JSON.parse(raw);await importBackup(data)}catch(e){console.error(e);alert("Backup inválido ou corrompido.")}};card.appendChild(input);card.appendChild(b);
}

async function importBackup(data){
 if(!data||typeof data!=="object"||!data.user||typeof data.days!=="object"||typeof data.expenses!=="object")throw new Error("estrutura inválida");
 if(data.app&&data.app!=="Entrega365")throw new Error("aplicativo incompatível");
 if(data.integrity){const copy={...data};delete copy.integrity;const expected=await digest(copy);if(expected!==data.integrity)throw new Error("integridade inválida")}
 const user=String(data.user);const prefix="dcv2:"+user+":";
 const existing=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(prefix))existing.push(k)}
 if(existing.length&&!confirm("Já existem dados deste usuário neste navegador. Restaurar o backup e substituir esses dados?"))return;
 try{await signOut(auth)}catch{}
 existing.forEach(k=>localStorage.removeItem(k));
 for(const [date,obj] of Object.entries(data.days||{}))localStorage.setItem(prefix+"day:"+date,JSON.stringify(obj));
 for(const [date,obj] of Object.entries(data.expenses||{}))localStorage.setItem(prefix+"exp:"+date,JSON.stringify(obj));
 if(data.mechanica)localStorage.setItem(prefix+"mechanica",JSON.stringify(data.mechanica));
 localStorage.setItem(SESSION,user);
 if(user.startsWith("google:")){localStorage.setItem("entrega365:firebaseUid",user.slice(7))}
 alert("Backup restaurado com sucesso. Entrando no Entrega365.");location.reload();
}

window.backup=enhancedBackup;
window.entrega365ImportBackup=importBackup;

function showProfessionalLogin(){improveLoginVisual();fixLogo();if(localStorage.getItem(SESSION))return;if(typeof window.showLogin==="function")window.showLogin();improveLoginVisual();fixLogo();addGoogleButton();addBackupButton()}
onAuthStateChanged(auth,u=>{if(u&&!localStorage.getItem(SESSION)){localStorage.setItem(SESSION,"google:"+u.uid);localStorage.setItem("entrega365:firebaseUid",u.uid);localStorage.setItem("entrega365:email",u.email||"");localStorage.setItem("entrega365:displayName",u.displayName||"");location.reload()}});
const originalLogout=window.logout;window.logout=async()=>{try{await signOut(auth)}catch{}if(typeof originalLogout==="function")originalLogout();else{localStorage.removeItem(SESSION);location.reload()}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(showProfessionalLogin,50));else setTimeout(showProfessionalLogin,50);
