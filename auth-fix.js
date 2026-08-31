import "./tools.js?v=148";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const AUTH_DOMAIN="entrega365.firebaseapp.com";

const firebaseConfig={
  apiKey:"AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU",
  authDomain:AUTH_DOMAIN,
  projectId:"entrega365",
  storageBucket:"entrega365.firebasestorage.app",
  messagingSenderId:"686578751112",
  appId:"1:686578751112:web:4c0f8e4b3a569e7297313d",
  measurementId:"G-RPRXBXXDJK"
};

const app=initializeApp(firebaseConfig);

/*
 * Inicialização explícita:
 * evita o getAuth() padrão escolher IndexedDB primeiro e deixa a sessão
 * dependente de armazenamento que alguns Chromium móveis/Brave tratam de
 * forma diferente durante o retorno do popup.
 */
let auth;
try{
  /*
   * Este app usa signInWithPopup. Ao inicializar o Auth manualmente é
   * necessário disponibilizar explicitamente o resolvedor de popup/redirect;
   * sem ele alguns navegadores móveis acabam retornando auth/argument-error.
   */
  auth=initializeAuth(app,{
    persistence:browserLocalPersistence,
    popupRedirectResolver:browserPopupRedirectResolver
  });
}catch(e){
  console.warn("Firebase initializeAuth fallback:",e);
  auth=getAuth(app);
}
window.__e365AuthBooted=true;

const SESSION="dcv2:session";
const LOGIN_PENDING="entrega365:googleLoginPending";
const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE_APPDATA_SCOPE="https://www.googleapis.com/auth/drive.appdata";
const FULL_LOGO="./logo-entrega365.jpg?v=149";

let currentUser=null;
let loginInProgress=false;
let appUserUid=null;
let startupTimer=null;
let recoveryFinished=false;
let introSlide=0;
let loginStage="intro";

function setLoading(){
  const root=document.getElementById("app");
  if(root)root.innerHTML='<div class="login"><div class="loginbox"><div class="card" style="text-align:center"><b>Carregando Entrega365…</b><div class="small" style="margin-top:8px">Verificando sua sessão.</div></div></div></div>';
}

function loadLoginStyle(){
  if(document.getElementById("entrega365-login-v149"))return;
  const s=document.createElement("style");
  s.id="entrega365-login-v149";
  s.textContent='.login{align-items:flex-start!important;padding:24px 14px calc(40px + env(safe-area-inset-bottom))!important;overflow-y:auto}.loginbox{max-width:430px!important}.biglogo{width:min(94vw,520px)!important;height:min(58vw,300px)!important;min-height:180px!important;margin:0 auto 2px!important;border-radius:0!important;background:none!important;border:0!important;box-shadow:none!important}.biglogo img{display:block;width:100%;height:100%;object-fit:contain}.loginbox .card{padding:20px!important;border-radius:22px!important}.google-only{display:flex;flex-direction:column;gap:10px}.google-new{width:100%;min-height:54px;border-radius:12px;padding:13px 14px;font-weight:900;border:1px solid #555;background:#1e1e1e;color:#ffd000}.google-new:disabled{opacity:.65}';
  document.head.appendChild(s);
}

function showLogin(){
  if(currentUser||getSessionUid())return;
  appUserUid=null;
  loadLoginStyle();
  const root=document.getElementById("app");
  if(!root)return;
  const slides=[
    {i:"🏍️",h:"Controle seu <em>dia a dia</em>",p:"Registre entregas, taxas, arrancada e acompanhe quanto realmente entrou no dia.",m:[["ENTREGAS","4"],["GANHOS","R$ 100"],["CONFERIDAS","4"],["KM","120"]]},
    {i:"💸",h:"Saiba para onde <em>vai seu dinheiro</em>",p:"Acompanhe gastos, manutenção e organize melhor seus resultados.",m:[["GASTOS","R$ 32"],["LUCRO","R$ 68"],["MÊS","Resumo"],["MOTO","Em dia"]]},
    {i:"📊",h:"Veja seus <em>resultados</em>",p:"Tenha uma visão clara do mês e tome decisões melhores.",m:[["ENTREGAS","128"],["GANHOS","R$ 1.540"],["GASTOS","R$ 430"],["LUCRO","R$ 1.110"]]},
    {i:"⭐",h:"No PRO, ainda <em>mais controle</em>",p:"Organize diferentes estabelecimentos e tenha recursos avançados.",m:[["PRO","Ativo"],["CLIENTES","Vários"],["CONTROLE","Completo"],["ROTINA","Organizada"]]}
  ];
  if(loginStage==="intro"){
    const s=slides[introSlide];
    root.innerHTML='<div class="login-intro"><div class="introbox"><div class="introbrand"><div class="biglogo"><img src="'+FULL_LOGO+'" alt="Entrega365"></div></div><div class="introhero"><div class="intro-slide"><div class="intro-icon">'+s.i+'</div><h1>'+s.h+'</h1><p>'+s.p+'</p><div class="intro-mock">'+s.m.map(x=>'<div class="intro-mini"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div></div></div><div class="intro-dots">'+slides.map((_,i)=>'<span class="intro-dot '+(i===introSlide?'active':'')+'"></span>').join('')+'</div><div class="intro-actions"><button class="intro-nav" id="introPrev">‹</button><button class="intro-enter" id="introEnter">'+(introSlide===slides.length-1?'COMEÇAR AGORA':'ENTRAR NO ENTREGA365')+'</button><button class="intro-nav" id="introNext">›</button></div><div class="intro-skip">Aplicativo web para organizar sua rotina de entregas.</div></div></div>';
    root.querySelector("#introPrev").onclick=()=>{introSlide=(introSlide+slides.length-1)%slides.length;showLogin()};
    root.querySelector("#introNext").onclick=()=>{introSlide=(introSlide+1)%slides.length;showLogin()};
    root.querySelector("#introEnter").onclick=()=>{loginStage="google";showLogin()};
    return;
  }
  root.innerHTML='<div class="login"><div class="loginbox"><button class="add" id="backIntro" style="margin:0 0 14px">← Conheça o Entrega365</button><div class="biglogo"><img src="'+FULL_LOGO+'" alt="Entrega365"></div><h1>Entrega365</h1><p>Entre com sua conta Google para continuar</p><div class="card google-only"><button id="google-login" type="button" class="google-new"><span class="google-label">ENTRAR COM GOOGLE</span></button></div></div></div>';
  root.querySelector("#backIntro").onclick=()=>{loginStage="intro";showLogin()};
  root.querySelector("#google-login").onclick=startGoogleLogin;
}

function getSessionUid(){
  const value=localStorage.getItem(SESSION)||"";
  return value.startsWith("google:")?value.slice("google:".length):"";
}

function persistDriveCredential(result){try{const c=GoogleAuthProvider.credentialFromResult(result);if(c?.accessToken){localStorage.setItem("entrega365:driveAccessToken",c.accessToken);localStorage.setItem("entrega365:driveAccessTokenExp",String(Date.now()+3500000));window.dispatchEvent(new Event("e365-drive-token"));}}catch(e){console.warn("Drive credential:",e)}}

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
  localStorage.removeItem("entrega365:lastGoogleAccount");
  localStorage.removeItem("entrega365:driveAccessToken");
  localStorage.removeItem("entrega365:driveAccessTokenExp");
  sessionStorage.removeItem(LOGIN_PENDING);
}

function openApp(u,{persist=true}={}){
  if(!u||!u.uid)return;
  currentUser=u;
  if(persist)persistUser(u);
  loginInProgress=false;
  sessionStorage.removeItem(LOGIN_PENDING);
  recoveryFinished=true;
  if(startupTimer){clearTimeout(startupTimer);startupTimer=null;}

  if(appUserUid===u.uid)return;
  appUserUid=u.uid;
  window.__e365SetUser?.("google:"+u.uid);
  if(typeof window.render==="function")window.render();
  // Após cada login, consulta novamente a assinatura e restaura o Drive.
  // Os módulos podem terminar de carregar alguns instantes depois da autenticação.
  [250,1200,3000].forEach(ms=>setTimeout(()=>{
    window.e365SyncPro?.();
    window.entrega365DriveAutoSync?.().catch(e=>console.warn("Drive auto sync:",e));
    window.entrega365CloudSync?.().catch(e=>console.warn("Cloud auto sync:",e));
  },ms));
}

function openSavedSession(){
  const uid=getSessionUid();
  if(!uid)return false;
  openApp({
    uid,
    email:localStorage.getItem("entrega365:email")||"",
    displayName:localStorage.getItem("entrega365:displayName")||"",
  },{persist:false});
  return true;
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
    "auth/invalid-api-key":"A configuração do Firebase está inválida.",
    "auth/popup-blocked":"O navegador bloqueou a janela de login.",
    "auth/popup-closed-by-user":"A janela de login foi fechada antes da conclusão."
  };
  alert("Não foi possível entrar com Google.\n\n"+(map[code]||"Tente novamente.")+"\n\nCódigo: "+code+"\nDetalhe: "+detail);
}

async function startGoogleLogin(){
  if(loginInProgress)return;
  loginInProgress=true;
  sessionStorage.setItem(LOGIN_PENDING,"1");
  const b=document.querySelector("#google-login");
  if(b){b.disabled=true;b.querySelector(".google-label").textContent="ABRINDO GOOGLE...";}
  try{
    const provider=new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.addScope(DRIVE_APPDATA_SCOPE);
    provider.setCustomParameters({prompt:"select_account",include_granted_scopes:"true"});
    const result=await signInWithPopup(auth,provider);
    if(result?.user){
      persistDriveCredential(result);
      /*
       * O resultado do popup é uma autenticação concluída. Renderizamos o app
       * imediatamente e mantemos a sessão local mesmo que o SDK emita um
       * evento transitório null durante a hidratação no Chromium.
       */
      openApp(result.user,{persist:true});
      return;
    }
    throw Object.assign(new Error("Google não retornou um usuário."),{code:"auth/no-user"});
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
    recoveryFinished=true;
    clearSession();
    window.__e365SetUser?.(null);
    location.replace(location.pathname||"/");
  }
};

window.entrega365Auth={auth};

onAuthStateChanged(auth,u=>{
  if(u){
    openApp(u,{persist:true});
    return;
  }

  /*
   * Não transforme um null transitório do Firebase em logout. Em Chromium
   * móvel a persistência pode hidratar depois do popup e emitir null no meio
   * do ciclo. Se já existe uma sessão criada por um login bem-sucedido,
   * mantemos o app aberto e aguardamos o SDK estabilizar.
   */
  if(getSessionUid()){
    if(!currentUser)openSavedSession();
    return;
  }

  currentUser=null;
  if(recoveryFinished||loginInProgress)return;
});

(async function startAuthRecovery(){
  try{
    if(auth.currentUser){
      openApp(auth.currentUser,{persist:true});
      return;
    }

    // Primeiro recupera a sessão já confirmada localmente.
    if(openSavedSession())return;

    setLoading();
    // Nunca deixar a tela de carregamento presa indefinidamente. Alguns navegadores
    // móveis atrasam a hidratação do Firebase; após o limite, mostramos o login.
    startupTimer=setTimeout(()=>{
      if(auth.currentUser)openApp(auth.currentUser,{persist:true});
      else if(!openSavedSession()){
        recoveryFinished=true;
        loginInProgress=false;
        sessionStorage.removeItem(LOGIN_PENDING);
        showLogin();
      }
    },2500);
  }catch(e){
    console.error("Firebase startup:",e);
    if(!openSavedSession()){
      recoveryFinished=true;
      showLogin();
    }
  }
})();

import("./drive-backup.js?v=163")
  .then(m=>m.initDriveBackup(auth))
  .catch(e=>console.warn("Drive backup indisponível",e));

import("./cloud-sync.js?v=163")
  .then(()=>window.entrega365CloudSync?.().catch(e=>console.warn("Cloud backup indisponível",e)))
  .catch(e=>console.warn("Cloud sync indisponível",e));
