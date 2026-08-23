import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaOay04d6JrL3PTKEdkHC3QOjiv8_ZySPYU",
  authDomain: "entrega365.firebaseapp.com",
  projectId: "entrega365",
  storageBucket: "entrega365.firebasestorage.app",
  messagingSenderId: "686578751112",
  appId: "1:686578751112:web:4c0f8e4b3a569e7297313d",
  measurementId: "G-RPRXBXXDJK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "pt-BR";
const K = "dcv2:";
let confirmationResult = null, recaptchaVerifier = null, currentPhone = "";

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11) return "+55" + digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return "+" + digits;
  return null;
}
function displayPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "").replace(/^55/, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function setFirebaseSession(user) {
  localStorage.setItem(K + "session", "phone:" + user.uid);
  localStorage.setItem("entrega365:firebaseUid", user.uid);
  localStorage.setItem("entrega365:phone", user.phoneNumber || currentPhone || "");
}
function injectStyles() {
  if (document.getElementById("phone-auth-style")) return;
  const s = document.createElement("style"); s.id = "phone-auth-style";
  s.textContent = `.phone-login .loginbox{max-width:410px}.phone-login .phone-title{font-size:15px;font-weight:800;margin:0 0 8px}.phone-login .phone-help{font-size:12px;color:#aaa;line-height:1.45;margin:0 0 14px}.phone-login .phone-input{font-size:18px}.phone-login .code-input{text-align:center;font-size:24px;letter-spacing:7px}.phone-login .recaptcha{display:flex;justify-content:center;margin:10px 0}.phone-login .back-btn{width:100%;margin-top:9px;padding:11px;border:1px dashed #666;background:#202020;color:#ffd000;border-radius:11px;font-weight:800}.phone-login .status{display:none;margin:10px 0;padding:10px;border-radius:10px;background:#302a10;border:1px solid #826c12;color:#ffe16a;font-size:12px;text-align:center}.phone-login .status.show{display:block}`;
  document.head.appendChild(s);
}
function renderPhoneLogin(mode="phone") {
  injectStyles(); const appEl = document.getElementById("app"); if (!appEl) return;
  appEl.innerHTML = `<div class="login phone-login"><div class="loginbox"><div class="biglogo"></div><h1>Entrega365</h1><p>${mode === "code" ? "Confirme seu acesso pelo código enviado por SMS" : "Acesse de forma rápida e segura pelo seu telefone"}</p><div class="card"><div id="phone-step" ${mode === "code" ? 'style="display:none"' : ''}><div class="phone-title">Número do celular</div><div class="phone-help">Digite seu celular com DDD. Enviaremos um código de verificação por SMS.</div><input id="phone-number" class="phone-input" type="tel" inputmode="tel" autocomplete="tel" placeholder="(47) 99999-9999" maxlength="15"><div id="recaptcha-container" class="recaptcha"></div><button class="primary" id="send-code">ENVIAR CÓDIGO</button></div><div id="code-step" ${mode === "code" ? '' : 'style="display:none"'}><div class="phone-title">Código de verificação</div><div class="phone-help">Digite o código de 6 números que enviamos para <b id="phone-display"></b>.</div><input id="sms-code" class="code-input" type="tel" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"><button class="primary" id="confirm-code">CONFIRMAR E ENTRAR</button><button class="back-btn" id="change-phone">ALTERAR NÚMERO</button></div><div id="phone-status" class="status"></div></div><div class="small">Seu número é usado somente para autenticação do Entrega365.</div></div></div>`;
  const phoneInput = document.getElementById("phone-number");
  if (phoneInput) { phoneInput.value = displayPhone(currentPhone); phoneInput.addEventListener("input", () => phoneInput.value = displayPhone(phoneInput.value)); }
  const status = document.getElementById("phone-status"), showStatus = msg => { status.textContent = msg; status.classList.add("show"); };
  if (mode === "code") {
    document.getElementById("phone-display").textContent = displayPhone(currentPhone);
    document.getElementById("confirm-code").onclick = confirmCode;
    document.getElementById("change-phone").onclick = () => { confirmationResult=null; try{recaptchaVerifier?.clear()}catch{} recaptchaVerifier=null; renderPhoneLogin("phone"); setTimeout(setupRecaptcha,100); };
  } else {
    document.getElementById("send-code").onclick = async () => {
      const normalized = normalizePhone(phoneInput.value);
      if (!normalized) return showStatus("Digite um celular válido com DDD. Ex.: (47) 99999-9999");
      currentPhone=normalized; const button=document.getElementById("send-code"); button.disabled=true; button.textContent="ENVIANDO...";
      try { if(!recaptchaVerifier) setupRecaptcha(); confirmationResult=await signInWithPhoneNumber(auth,normalized,recaptchaVerifier); renderPhoneLogin("code"); }
      catch(error){ console.error(error); button.disabled=false; button.textContent="ENVIAR CÓDIGO"; showStatus(firebaseError(error)); try{recaptchaVerifier?.clear()}catch{} recaptchaVerifier=null; setTimeout(setupRecaptcha,100); }
    };
  }
}
function firebaseError(error) {
  const map={"auth/invalid-phone-number":"Número de telefone inválido.","auth/too-many-requests":"Muitas tentativas. Aguarde um pouco antes de tentar novamente.","auth/quota-exceeded":"O limite de SMS do projeto foi atingido. Tente novamente mais tarde.","auth/captcha-check-failed":"A verificação de segurança falhou. Tente novamente.","auth/invalid-verification-code":"Código inválido. Confira o SMS e tente novamente.","auth/code-expired":"O código expirou. Solicite um novo código.","auth/missing-phone-number":"Informe o número do telefone."};
  return map[error?.code] || "Não foi possível concluir a autenticação. Tente novamente.";
}
async function confirmCode() {
  const input=document.getElementById("sms-code"), status=document.getElementById("phone-status"), button=document.getElementById("confirm-code"), code=input?.value.replace(/\D/g,"");
  if(!confirmationResult) return renderPhoneLogin("phone");
  if(code.length!==6){status.textContent="Digite o código de 6 números.";status.classList.add("show");return;}
  button.disabled=true;button.textContent="ENTRANDO...";
  try{const result=await confirmationResult.confirm(code);setFirebaseSession(result.user);location.reload();}
  catch(error){console.error(error);button.disabled=false;button.textContent="CONFIRMAR E ENTRAR";status.textContent=firebaseError(error);status.classList.add("show");}
}
function setupRecaptcha(){
  if(!document.getElementById("recaptcha-container")||recaptchaVerifier)return;
  recaptchaVerifier=new RecaptchaVerifier(auth,"recaptcha-container",{size:"normal",callback:()=>{},"expired-callback":()=>{try{recaptchaVerifier?.clear()}catch{}recaptchaVerifier=null;setTimeout(setupRecaptcha,100);}});
  recaptchaVerifier.render().catch(err=>console.error("reCAPTCHA",err));
}
onAuthStateChanged(auth,firebaseUser=>{
  const hasSession=localStorage.getItem(K+"session");
  if(firebaseUser){if(!hasSession||!hasSession.startsWith("phone:")){setFirebaseSession(firebaseUser);location.reload();}return;}
  if(!hasSession){renderPhoneLogin("phone");setTimeout(setupRecaptcha,100);}
});
window.entrega365Logout=async()=>{try{await signOut(auth)}catch(e){console.error(e)}localStorage.removeItem(K+"session");localStorage.removeItem("entrega365:firebaseUid");localStorage.removeItem("entrega365:phone");location.reload()};
setTimeout(()=>{if(typeof window.logout==="function")window.logout=window.entrega365Logout},50);
