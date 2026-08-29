import "./tools.js?v=118";
import "./entrega365-features.js?v=118";
import "./session-policy.js?v=118";
import "./entrega365-theme-v2.js?v=118";
import "./entrega365-pro.js?v=118";
import "./pro-sync.js?v=118";
import "./establishments.js?v=118";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig={
  apiKey:"AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU",
  authDomain:"www.entrega365.com.br",
  projectId:"entrega365",
  storageBucket:"entrega365.firebasestorage.app",
  messagingSenderId:"686578751112",
  appId:"1:686578751112:web:4c0f8e4b3a569e7297313d",
  measurementId:"G-RPRXBXXDJK"
};

const auth=getAuth(initializeApp(firebaseConfig));
const SESSION="dcv2:session";
const FULL_LOGO="./logo-entrega365.jpg?v=118";
const ICON_LOGO="./app-icon.svg?v=118";

let redirectProcessing=true;
let navigating=false;

function loadMobileCss(){
  if(document.querySelector('link[data-e365-mobile-css]'))return;
  const l=document.createElement('link');
  l.rel='stylesheet';
  l.href='./mobile-layout-fix.css?v=118';
  l.dataset.e365MobileCss='1';
  document.head.appendChild(l);
}

function improveLoginVisual(){
  if(document.getElementById("entrega365-login-v119"))return;
  const s=document.createElement("style");
  s.id="entrega365-login-v119";
  s.textContent=`
    .login{align-items:flex-start!important;padding:24px 14px 40px!important;overflow-y:auto}
    .loginbox{max-width:430px!important}
    .biglogo{width:min(94vw,520px)!important;height:300px!important;margin:0 auto 2px!important;border-radius:0!important;background:none!important;border:0!important;box-shadow:none!important}
    .biglogo img{display:block;width:100%;height:100%;object-fit:contain}
    .loginbox .card{padding:20px!important;border-radius:22px!important}
    .google-only{display:flex;flex-direction:column;gap:10px}
    .google-new{width:100%;border-radius:12px;padding:13px 14px;font-weight:900;border:1px solid #555;background:#1e1e1e;color:#ffd000}
    .google-new:hover{border-color:#ffd000}
  `;
  document.head.appendChild(s);
}

function fixLogo(){
  document.querySelectorAll(".biglogo").forEach(el=>{
    if(el.querySelector("img"))return;
    el.style.background="none";
    el.style.border="0";
    el.style.borderRadius="0";
    el.style.boxShadow="none";
    el.innerHTML="";
    const img=document.createElement("img");
    img.src=FULL_LOGO;
    img.alt="Entrega365";
    img.style.cssText="display:block;width:100%;height:100%;object-fit:contain";
    el.appendChild(img);
  });
  const icon=document.querySelector('link[rel="icon"]');
  if(icon)icon.href=ICON_LOGO;
}

function saveGoogleUser(u){
  if(!u)return;
  localStorage.setItem("entrega365:firebaseUid",u.uid);
  localStorage.setItem("entrega365:email",u.email||"");
  localStorage.setItem("entrega365:displayName",u.displayName||"");
  localStorage.setItem("entrega365:lastGoogleAccount",u.email||"");
  localStorage.setItem(SESSION,"google:"+u.uid);
}

function authError(e){
  console.error("Entrega365 Google auth:",e);
  const code=e?.code||"unknown";
  const map={
    "auth/unauthorized-domain":"O domínio de autenticação ainda não está autorizado no Firebase.",
    "auth/operation-not-allowed":"O login com Google não está habilitado no Firebase.",
    "auth/network-request-failed":"Falha de conexão. Verifique a internet.",
    "auth/invalid-api-key":"A configuração do Firebase está inválida.",
    "auth/web-storage-unsupported":"O navegador não permite o armazenamento necessário.",
    "auth/popup-blocked":"O navegador bloqueou a janela de autenticação.",
    "auth/internal-error":"O Google/Firebase não conseguiu concluir a sessão.",
    "auth/timeout":"O login demorou demais para concluir."
  };
  alert("Não foi possível entrar com Google.\n\n"+(map[code]||("Erro: "+code)));
}

function goToApp(){
  if(navigating)return;
  navigating=true;
  location.replace("/index.html?e365auth=119");
}

function legacyLoginVisible(){
  return !!document.querySelector("#u") ||
    (!!document.querySelector(".login") && !document.querySelector("[data-google-action]"));
}

async function finishRedirectLogin(){
  try{
    await setPersistence(auth,browserLocalPersistence);
    const result=await getRedirectResult(auth);
    if(result?.user){
      saveGoogleUser(result.user);
      goToApp();
      return true;
    }
  }catch(e){
    authError(e);
  }finally{
    redirectProcessing=false;
  }
  return false;
}

async function startGoogleLogin(){
  const b=document.querySelector("[data-google-action]");
  try{
    if(b){
      b.disabled=true;
      const t=b.querySelector(".google-label");
      if(t)t.textContent="CONECTANDO GOOGLE...";
    }
    await setPersistence(auth,browserLocalPersistence);
    const p=new GoogleAuthProvider();
    p.setCustomParameters({prompt:"select_account"});
    await signInWithRedirect(auth,p);
  }catch(e){
    if(b){
      b.disabled=false;
      const t=b.querySelector(".google-label");
      if(t)t.textContent="ENTRAR COM GOOGLE";
    }
    redirectProcessing=false;
    authError(e);
  }
}

function renderGoogleOnlyLogin(){
  const root=document.getElementById("app");
  if(!root)return;
  root.innerHTML=`
    <div class="login">
      <div class="loginbox">
        <div class="biglogo"></div>
        <h1>Entrega365</h1>
        <p>Entre com sua conta Google para continuar</p>
        <div class="card google-only">
          <button id="google-login" type="button" class="google-new" data-google-action="1">
            <span class="google-label">ENTRAR COM GOOGLE</span>
          </button>
        </div>
      </div>
    </div>`;
  root.querySelector("#google-login").onclick=startGoogleLogin;
  fixLogo();
}

function setupLogin(){
  loadMobileCss();
  improveLoginVisual();
  if(redirectProcessing)return;

  if(localStorage.getItem(SESSION)){
    if(legacyLoginVisible())goToApp();
    return;
  }

  renderGoogleOnlyLogin();
  fixLogo();
}

window.backup=window.backup||function(){};

const oldLogout=window.logout;
window.logout=async()=>{
  try{await signOut(auth)}catch(e){console.warn("Firebase signOut:",e)}
  localStorage.removeItem(SESSION);
  localStorage.removeItem("entrega365:firebaseUid");
  localStorage.removeItem("entrega365:email");
  localStorage.removeItem("entrega365:displayName");
  if(oldLogout)oldLogout();
  else location.replace("/");
};

onAuthStateChanged(auth,u=>{
  if(!u)return;
  saveGoogleUser(u);

  // Fallback importante: alguns navegadores podem não devolver getRedirectResult,
  // mas o observador já recebe o usuário autenticado.
  if(!redirectProcessing && (location.pathname.endsWith("login-google.html") || legacyLoginVisible())){
    goToApp();
  }
});

import("./drive-backup.js?v=118")
  .then(m=>m.initDriveBackup(auth))
  .catch(e=>console.warn("Drive backup indisponível",e));

const legacySession=localStorage.getItem(SESSION);
if(legacySession&&!legacySession.startsWith("google:")){
  localStorage.removeItem(SESSION);
}

(async()=>{
  const done=await finishRedirectLogin();
  if(!done)setupLogin();
})();