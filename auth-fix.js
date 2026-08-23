import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU",authDomain:"entrega365.firebaseapp.com",projectId:"entrega365",storageBucket:"entrega365.firebasestorage.app",messagingSenderId:"686578751112",appId:"1:686578751112:web:4c0f8e4b3a569e7297313d",measurementId:"G-RPRXBXXDJK"};
const auth=getAuth(initializeApp(firebaseConfig));
const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:"select_account"});
const SESSION="dcv2:session";

function improveLoginVisual(){
 if(document.getElementById("entrega365-login-v10"))return;
 const s=document.createElement("style");s.id="entrega365-login-v10";s.textContent=`
 .login{align-items:flex-start!important;padding:28px 14px 40px!important;overflow-y:auto}.loginbox{max-width:430px!important}
 .biglogo{width:min(94vw,380px)!important;height:245px!important;margin:0 auto 2px!important;border-radius:0!important;background:none!important;border:0!important;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35))}
 .biglogo img{display:block;width:100%;height:100%;object-fit:contain}.loginbox h1{font-size:27px!important;margin-top:0!important}.loginbox>p{font-size:15px!important;margin:5px 0 20px!important}
 .loginbox .card{padding:20px!important;border-radius:22px!important;background:linear-gradient(145deg,#292929,#202020)!important;box-shadow:0 14px 40px rgba(0,0,0,.42)!important}.loginbox label{font-size:14px!important;font-weight:650}.loginbox input{min-height:52px;font-size:16px}.loginbox .primary{min-height:54px;font-size:16px;margin-top:15px!important}.loginbox .add{min-height:54px;border-color:#ffd000!important;color:#ffd000!important;font-size:15px}#google-login{min-height:54px!important;font-size:15px!important;border-radius:13px!important;margin-top:12px!important}.loginbox .small{margin-top:16px;font-size:12px}`;document.head.appendChild(s);
}

function fixLogo(){
 document.querySelectorAll(".biglogo,.logo").forEach(el=>{
  el.style.background="none";el.style.border="0";el.style.borderRadius="0";el.style.overflow="visible";
  if(el.classList.contains("biglogo")){
   el.innerHTML="";
   const img=document.createElement("img");img.src="./logo-entrega365.jpg?v=10";img.alt="Entrega365";img.decoding="async";img.loading="eager";el.appendChild(img);
  }else{
   el.style.backgroundImage='url("./logo-entrega365.jpg?v=10")';el.style.backgroundSize="contain";el.style.backgroundPosition="center";el.style.backgroundRepeat="no-repeat";
  }
 });
 const big=document.querySelector(".biglogo");if(big){big.style.width="min(94vw,380px)";big.style.height="245px";big.style.margin="0 auto 2px"}
}

function addGoogleButton(){
 const card=document.querySelector(".loginbox .card");if(!card||document.getElementById("google-login"))return;
 const b=document.createElement("button");b.id="google-login";b.type="button";b.textContent="CONTINUAR COM GOOGLE";b.style.cssText="width:100%;border:1px solid #666;border-radius:12px;background:#fff;color:#222;font-weight:900;padding:13px;margin-top:10px;box-shadow:none";
 b.onclick=async()=>{b.disabled=true;b.textContent="CONECTANDO...";try{const result=await signInWithPopup(auth,provider),u=result.user;localStorage.setItem(SESSION,"google:"+u.uid);localStorage.setItem("entrega365:firebaseUid",u.uid);localStorage.setItem("entrega365:email",u.email||"");localStorage.setItem("entrega365:displayName",u.displayName||"");location.reload()}catch(e){console.error(e);b.disabled=false;b.textContent="CONTINUAR COM GOOGLE";const msg=e?.code==="auth/unauthorized-domain"?"Este domínio ainda não está autorizado no Firebase.":e?.code==="auth/popup-blocked"?"O navegador bloqueou a janela do Google. Tente novamente.":e?.code==="auth/operation-not-allowed"?"O login com Google ainda não está ativado no Firebase.":`Não foi possível entrar com Google (${e?.code||"erro"}).`;alert(msg)}};card.appendChild(b)
}

function showProfessionalLogin(){improveLoginVisual();fixLogo();if(localStorage.getItem(SESSION))return;if(typeof window.showLogin==="function")window.showLogin();improveLoginVisual();fixLogo();addGoogleButton()}
onAuthStateChanged(auth,u=>{if(u&&!localStorage.getItem(SESSION)){localStorage.setItem(SESSION,"google:"+u.uid);localStorage.setItem("entrega365:firebaseUid",u.uid);localStorage.setItem("entrega365:email",u.email||"");localStorage.setItem("entrega365:displayName",u.displayName||"");location.reload()}});
const originalLogout=window.logout;window.logout=async()=>{try{await signOut(auth)}catch{}if(typeof originalLogout==="function")originalLogout();else{localStorage.removeItem(SESSION);location.reload()}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(showProfessionalLogin,50));else setTimeout(showProfessionalLogin,50);
