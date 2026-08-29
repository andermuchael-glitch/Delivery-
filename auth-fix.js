import "./tools.js?v=141";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  browserPopupRedirectResolver,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig={
  apiKey:"AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU",
  // O app é hospedado na Vercel, não no Firebase Hosting. Por isso o domínio
  // de autenticação precisa ser único e estável, enquanto o Vercel faz o proxy
  // transparente de /__/auth e /__/firebase para entrega365.firebaseapp.com.
  // Não usar location.hostname aqui: alternar entre www/apex cria fluxos OAuth
  // diferentes e fazia o retorno do login ficar preso em alguns browsers.
  authDomain:(location.hostname==="localhost"||location.hostname==="127.0.0.1")?"entrega365.firebaseapp.com":"www.entrega365.com.br",
  projectId:"entrega365",
  storageBucket:"entrega365.firebasestorage.app",
  messagingSenderId:"686578751112",
  appId:"1:686578751112:web:4c0f8e4b3a569e7297313d",
  measurementId:"G-RPRXBXXDJK"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const SESSION="dcv2:session";
const LOGIN_PENDING="entrega365:googleLoginPending";
const FULL_LOGO="./logo-entrega365.jpg?v=141";

let currentUser=null;
let loginInProgress=false;
let appUserUid=null;
let initialAuthResolved=false;

function setLoading(){
  const root=document.getElementById("app");
  if(root)root.innerHTML='<div class="login"><div class="loginbox"><div class="card" style="text-align:center"><b>Carregando Entrega365…</b><div class="small" style="margin-top:8px">Verificando sua sessão com segurança.</div></div></div></div>';
}

function loadLoginStyle(){
  if(document.getElementById("entrega365-login-v141"))return;
  const s=document.createElement("style");
  s.id="entrega365-login-v141";
  s.textContent='.login{align-items:flex-start!important;padding:24px 14px 40px!important;overflow-y:auto}.loginbox{max-width:430px!important}.biglogo{width:min(94vw,520px)!important;height:300px!important;margin:0 auto 2px!important;border-radius:0!important;background:none!important;border:0!important;box-shadow:none!important}.biglogo img{display:block;width:100%;height:100%;object-fit:contain}.loginbox .card{padding:20px!important;border-radius:22px!important}.google-only{display:flex;flex-direction:column;gap:10px}.google-new{width:100%;border-radius:12px;padding:13px 14px;font-weight:900;border:1px solid #555;background:#1e1e1e;color:#ffd000}.google-new:disabled{opacity:.65}';
  document.head.appendChild(s);
}

function showLogin(){
  if(currentUser)return;
  appUserUid=null;
  loadLoginStyle();
  const root=document.getElementById("app");
  if(!root)return;
  root.innerHTML='<div class="login"><div class="loginbox"><div class="biglogo"><img src="'+FULL_LOGO+'" alt="Entrega365"></div><h1>Entrega365</h1><p>Entre com sua conta Google para continuar</p><div class="card google-only"><button id="google-login" type="button" class="google-new"><span class="google-label">ENTRAR COM GOOGLE</span></button></div></div></div>';
  root.querySelector("#google-login").onclick=startGoogleLogin;
}

function persistUser(u){
  localStorage.setItem("entrega365:firebaseUid",u.uid);
  localStorage.setItem("entrega365:email",u.email||"");
  localStorage.setItem("entrega365:displayName",u.displayName||"");
  localStorage.setItem("entrega365:lastGoogleAccount",u.email||"");
  localStorage.setItem(SESSION,"google:"+u.uid);
}

function clearSession(){
  localStorage.removeItem(SESSION);
  localStorage.removeItem("entrega365:firebaseUid");
  localStorage.removeItem("entrega365:email");
  localStorage.removeItem("entrega365:displayName");
  localStorage.removeItem("entrega365:driveAccessToken");
  localStorage.removeItem("entrega365:driveAccessTokenExp");
  sessionStorage.removeItem(LOGIN_PENDING);
}

function openApp(u){
  if(!u)return;
  currentUser=u;
  persistUser(u);
  loginInProgress=false;
  sessionStorage.removeItem(LOGIN_PENDING);

  // Não renderize novamente para o mesmo usuário: isso elimina o ciclo de
  // renderização que causava "Maximum call stack size exceeded".
  if(appUserUid===u.uid)return;
  appUserUid=u.uid;

  window.__e365SetUser?.("google:"+u.uid);
  if(typeof window.render==="function")window.render();
}

function authError(e){
  console.error("Entrega365 Google auth:",e);
  const code=e?.code||"unknown";
  const detail=[e?.name,e?.message].filter(Boolean).join(": ")||"sem detalhes";
  const map={
    "auth/unauthorized-domain":"O domínio ainda não está autorizado no Firebase.",
    "auth/operation-not-allowed":"O login com Google não está habilitado no Firebase.",
    "auth/network-request-failed":"Falha de conexão. Verifique sua internet.",
    "auth/web-storage-unsupported":"O navegador não permite o armazenamento necessário.",
    "auth/invalid-api-key":"A configuração do Firebase está inválida."
  };
  alert("Não foi possível entrar com Google.\n\n"+(map[code]||"Tente novamente.")+"\n\nCódigo: "+code+"\nDetalhe: "+detail);
}

async function startGoogleLogin(){
  if(loginInProgress)return;
  loginInProgress=true;
  const b=document.querySelector("#google-login");
  if(b){b.disabled=true;b.querySelector(".google-label").textContent="ABRINDO GOOGLE...";}
  try{
    await setPersistence(auth,browserLocalPersistence);
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    sessionStorage.setItem(LOGIN_PENDING,"1");
    await signInWithRedirect(auth,provider,browserPopupRedirectResolver);
  }catch(e){
    loginInProgress=false;
    sessionStorage.removeItem(LOGIN_PENDING);
    if(b){b.disabled=false;b.querySelector(".google-label").textContent="ENTRAR COM GOOGLE";}
    authError(e);
  }
}

window.entrega365SignOut=async()=>{
  try{await signOut(auth);}
  catch(e){console.warn("Firebase signOut:",e);}
  finally{
    currentUser=null;
    appUserUid=null;
    clearSession();
    window.__e365SetUser?.(null);
    location.replace(location.pathname||"/");
  }
};

window.entrega365Auth={auth};

let redirectSettled=false;
let authObserverResolved=false;
let startupTimer=null;
let authPoll=null;

function stopStartupWait(){
  if(startupTimer){clearTimeout(startupTimer);startupTimer=null;}
  if(authPoll){clearInterval(authPoll);authPoll=null;}
}

function finishWithoutUser(){
  if(currentUser)return;
  loginInProgress=false;
  sessionStorage.removeItem(LOGIN_PENDING);
  showLogin();
}

function completeAuthenticatedUser(u){
  if(!u)return false;
  stopStartupWait();
  redirectSettled=true;
  currentUser=u;
  openApp(u);
  return true;
}

onAuthStateChanged(auth,u=>{
  authObserverResolved=true;
  initialAuthResolved=true;

  if(u){
    completeAuthenticatedUser(u);
    return;
  }

  currentUser=null;

  // Em alguns Chromium o retorno do redirect pode entregar primeiro um
  // estado nulo e só depois restaurar auth.currentUser. Enquanto houver
  // login pendente, mantenha a tela de carregamento e deixe o polling abaixo
  // concluir a sessão sem depender de getRedirectResult().
  if(sessionStorage.getItem(LOGIN_PENDING)==="1" && !redirectSettled){
    setLoading();
    return;
  }

  if(redirectSettled)finishWithoutUser();
});

(function startAuthRecovery(){
  setLoading();

  // Não aguarde setPersistence para começar a recuperar a sessão. Em alguns
  // navegadores Chromium esse await pode atrasar a conclusão do redirect.
  Promise.resolve(setPersistence(auth,browserLocalPersistence))
    .catch(e=>console.warn("Persistence setup:",e))
    .finally(()=>{
      if(auth.currentUser)completeAuthenticatedUser(auth.currentUser);
    });

  // getRedirectResult() pode ficar pendente em determinados navegadores móveis
  // após OAuth. O app não precisa do objeto de resultado: basta recuperar o
  // usuário persistido pelo próprio Firebase.
  authPoll=setInterval(()=>{
    if(auth.currentUser)completeAuthenticatedUser(auth.currentUser);
  },250);

  startupTimer=setTimeout(()=>{
    stopStartupWait();

    if(auth.currentUser){
      completeAuthenticatedUser(auth.currentUser);
      return;
    }

    // Se não existe usuário autenticado, nunca deixe o navegador preso na
    // tela de carregamento.
    redirectSettled=true;
    finishWithoutUser();
  },15000);
})();
import("./drive-backup.js?v=141")
  .then(m=>m.initDriveBackup(auth))
  .catch(e=>console.warn("Drive backup indisponível",e));
