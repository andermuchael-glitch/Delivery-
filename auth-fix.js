import "./tools.js?v=123";

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

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const SESSION="dcv2:session";
const LOGIN_REDIRECT_KEY="entrega365:googleRedirectPending";
// O authDomain deve permanecer na mesma origem do aplicativo. O Vercel encaminha /__/auth para o handler do Firebase, evitando perda de estado do OAuth em Chrome Android.
const FULL_LOGO="./logo-entrega365.jpg?v=123";
const ICON_LOGO="./app-icon.svg?v=123";

let authStateSeen=false;
let authUser=null;
let redirectChecked=false;
let appRendered=false;

function setLoading(){
  const root=document.getElementById("app");
  if(root)root.innerHTML='<div class="login"><div class="loginbox"><div class="card" style="text-align:center"><b>Carregando Entrega365…</b><div class="small" style="margin-top:8px">Verificando sua sessão com segurança.</div></div></div></div>';
}

function loadMobileCss(){
  if(document.querySelector("link[data-e365-mobile-css]"))return;
  const l=document.createElement("link");
  l.rel="stylesheet"; l.href="./mobile-layout-fix.css?v=123"; l.dataset.e365MobileCss="1";
  document.head.appendChild(l);
}

function improveLoginVisual(){
  if(document.getElementById("entrega365-login-v123"))return;
  const s=document.createElement("style");
  s.id="entrega365-login-v123";
  s.textContent=`.login{align-items:flex-start!important;padding:24px 14px 40px!important;overflow-y:auto}.loginbox{max-width:430px!important}.biglogo{width:min(94vw,520px)!important;height:300px!important;margin:0 auto 2px!important;border-radius:0!important;background:none!important;border:0!important;box-shadow:none!important}.biglogo img{display:block;width:100%;height:100%;object-fit:contain}.loginbox .card{padding:20px!important;border-radius:22px!important}.google-only{display:flex;flex-direction:column;gap:10px}.google-new{width:100%;border-radius:12px;padding:13px 14px;font-weight:900;border:1px solid #555;background:#1e1e1e;color:#ffd000}.google-new:hover{border-color:#ffd000}.google-new:disabled{opacity:.65}`;
  document.head.appendChild(s);
}

function fixLogo(){
  document.querySelectorAll(".biglogo").forEach(el=>{
    if(el.querySelector("img"))return;
    el.style.background="none"; el.style.border="0"; el.style.borderRadius="0"; el.style.boxShadow="none"; el.innerHTML="";
    const img=document.createElement("img");
    img.src=FULL_LOGO; img.alt="Entrega365"; img.style.cssText="display:block;width:100%;height:100%;object-fit:contain";
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

function clearGoogleSession(){
  localStorage.removeItem(SESSION);
  localStorage.removeItem("entrega365:firebaseUid");
  localStorage.removeItem("entrega365:email");
  localStorage.removeItem("entrega365:displayName");
  localStorage.removeItem("entrega365:driveAccessToken");
  localStorage.removeItem("entrega365:driveAccessTokenExp");
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
    "auth/popup-blocked":"O navegador bloqueou a autenticação.",
    "auth/internal-error":"O Google/Firebase não conseguiu concluir a sessão.",
    "auth/timeout":"O login demorou demais para concluir."
  };
  alert("Não foi possível entrar com Google.\n\n"+(map[code]||"Tente novamente. Se continuar, verifique a conexão e a configuração do domínio.")+"\n\nCódigo: "+code);
}

async function startGoogleLogin(){
  const b=document.querySelector("[data-google-action]");
  try{
    if(b){b.disabled=true; const t=b.querySelector(".google-label"); if(t)t.textContent="CONECTANDO GOOGLE...";}
    await setPersistence(auth,browserLocalPersistence);
    const p=new GoogleAuthProvider();
    p.setCustomParameters({prompt:"select_account"});

    // Chrome Android apresenta falha no popup. Use redirect, com o domínio
    // padrão do Firebase como authDomain e estado explícito antes da navegação.
    sessionStorage.setItem(LOGIN_REDIRECT_KEY,"1");
    await signInWithRedirect(auth,p);
  }catch(e){
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
    if(b){b.disabled=false; const t=b.querySelector(".google-label"); if(t)t.textContent="ENTRAR COM GOOGLE";}
    authError(e);
  }
}

function renderGoogleOnlyLogin(){
  appRendered=false;
  loadMobileCss(); improveLoginVisual();
  const root=document.getElementById("app"); if(!root)return;
  root.innerHTML=`<div class="login"><div class="loginbox"><div class="biglogo"></div><h1>Entrega365</h1><p>Entre com sua conta Google para continuar</p><div class="card google-only"><button id="google-login" type="button" class="google-new" data-google-action="1"><span class="google-label">ENTRAR COM GOOGLE</span></button></div></div></div>`;
  root.querySelector("#google-login").onclick=startGoogleLogin;
  fixLogo();
}

function renderAppForUser(u){
  if(!u)return renderGoogleOnlyLogin();
  saveGoogleUser(u);
  // A página isolada de login não carrega o aplicativo principal.
  // Após autenticar, volte explicitamente para o index para concluir a sessão.
  if(location.pathname.endsWith("/login-google.html")){
    location.replace("/index.html");
    return;
  }
  window.__e365SetUser?.("google:"+u.uid);
  if(typeof window.render==="function")window.render();
  fixLogo();
  appRendered=true;
}

function settle(){
  if(!redirectChecked)return;
  if(authStateSeen){
    if(authUser)renderAppForUser(authUser); else renderGoogleOnlyLogin();
    return;
  }
  setLoading();
}

window.logout=async()=>{
  try{await signOut(auth)}catch(e){console.warn("Firebase signOut:",e)}
  finally{
    clearGoogleSession();
    window.__e365SetUser?.(null);
    renderGoogleOnlyLogin();
  }
};

window.entrega365Auth={auth};

onAuthStateChanged(auth,u=>{
  authStateSeen=true;
  authUser=u||null;
  if(redirectChecked)settle();
});

(async()=>{
  setLoading();
  const pendingLogin=sessionStorage.getItem(LOGIN_REDIRECT_KEY)==="1";
  try{
    await setPersistence(auth,browserLocalPersistence);
    const result=await getRedirectResult(auth);
    if(result?.user)saveGoogleUser(result.user);
    if(result?.user||pendingLogin)sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
  }catch(e){
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
    if(pendingLogin)authError(e);
    else console.warn("Redirect result ignored:",e);
  }finally{
    redirectChecked=true;
    settle();
    setTimeout(()=>{
      if(!authStateSeen){
        authStateSeen=true;
        authUser=auth.currentUser||null;
        settle();
      }
    },7000);
  }
})();

import("./drive-backup.js?v=123")
  .then(m=>m.initDriveBackup(auth))
  .catch(e=>console.warn("Drive backup indisponível",e));
