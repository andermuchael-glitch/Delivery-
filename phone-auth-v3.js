import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaOy04d6jLr3PTKEdkHC3OQjiv8_ZySPYU",
  authDomain: "entrega365.firebaseapp.com",
  projectId: "entrega365",
  storageBucket: "entrega365.firebasestorage.app",
  messagingSenderId: "686578751112",
  appId: "1:686578751112:web:4c0f8e4b3a569e7297313d",
  measurementId: "G-RPRXBXXDJK"
};

const auth = getAuth(initializeApp(firebaseConfig));
auth.languageCode = "pt-BR";
const K = "dcv2:";
let confirmationResult = null, recaptchaVerifier = null, recaptchaWidgetId = null, currentPhone = "", legacySession = localStorage.getItem(K + "session");

const normalize = raw => {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11) return "+55" + d;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return "+" + d;
  return null;
};
const display = raw => {
  const d = String(raw || "").replace(/\D/g, "").replace(/^55/, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

function migrate(uid) {
  if (!legacySession || legacySession.startsWith("phone:")) return;
  const from = K + legacySession + ":", to = K + "phone:" + uid + ":";
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(from)) {
      const target = to + k.slice(from.length);
      if (localStorage.getItem(target) === null) localStorage.setItem(target, localStorage.getItem(k));
    }
  }
}
function saveSession(u) {
  migrate(u.uid);
  localStorage.setItem(K + "session", "phone:" + u.uid);
  localStorage.setItem("entrega365:firebaseUid", u.uid);
  localStorage.setItem("entrega365:phone", u.phoneNumber || currentPhone || "");
}

function addStyle() {
  if (document.getElementById("phone-auth-style")) return;
  const s = document.createElement("style");
  s.id = "phone-auth-style";
  s.textContent = `.phone-login .loginbox{max-width:410px}.phone-login .phone-title{font-size:15px;font-weight:800;margin:0 0 8px}.phone-login .phone-help{font-size:12px;color:#aaa;line-height:1.45;margin:0 0 14px}.phone-login .phone-input{font-size:18px}.phone-login .code-input{text-align:center;font-size:24px;letter-spacing:7px}.phone-login .recaptcha{display:flex;justify-content:center;margin:10px 0}.phone-login .back-btn{width:100%;margin-top:9px;padding:11px;border:1px dashed #666;background:#202020;color:#ffd000;border-radius:11px;font-weight:800}.phone-login .status{display:none;margin:10px 0;padding:10px;border-radius:10px;background:#302a10;border:1px solid #826c12;color:#ffe16a;font-size:12px;text-align:center}.phone-login .status.show{display:block}`;
  document.head.appendChild(s);
}

function firebaseError(e) {
  const code = e?.code || "";
  const map = {
    "auth/invalid-phone-number": "Número de telefone inválido.",
    "auth/missing-phone-number": "Informe o número do telefone.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
    "auth/quota-exceeded": "O limite de SMS do projeto foi atingido. Tente novamente mais tarde.",
    "auth/captcha-check-failed": "A verificação reCAPTCHA falhou. Marque 'Não sou um robô' e tente novamente.",
    "auth/missing-app-credential": "A verificação de segurança do aplicativo não foi concluída. Recarregue a página e tente novamente.",
    "auth/invalid-app-credential": "A credencial de segurança é inválida. Recarregue a página e tente novamente.",
    "auth/app-not-authorized": "Este domínio não está autorizado no Firebase Authentication. Adicione entrega365.com.br aos domínios autorizados.",
    "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase Authentication. Adicione entrega365.com.br aos domínios autorizados.",
    "auth/operation-not-allowed": "O login por telefone não está ativado no Firebase Authentication.",
    "auth/network-request-failed": "Falha de conexão. Verifique a internet e tente novamente.",
    "auth/invalid-verification-code": "Código inválido. Confira o SMS e tente novamente.",
    "auth/code-expired": "O código expirou. Solicite um novo código."
  };
  return map[code] || `Não foi possível concluir a autenticação (${code || "erro desconhecido"}).`;
}

function resetRecaptcha() {
  try {
    if (window.grecaptcha && recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId);
  } catch {}
  try { recaptchaVerifier?.clear(); } catch {}
  recaptchaVerifier = null;
  recaptchaWidgetId = null;
}

function setupRecaptcha() {
  const container = document.getElementById("recaptcha-container");
  if (!container || recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal",
    callback: () => {},
    "expired-callback": () => resetRecaptcha()
  });
  recaptchaVerifier.render().then(id => { recaptchaWidgetId = id; }).catch(err => console.error("reCAPTCHA", err));
}

function render(mode = "phone") {
  addStyle();
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `<div class="login phone-login"><div class="loginbox"><div class="biglogo"></div><h1>Entrega365</h1><p>${mode === "code" ? "Confirme seu acesso pelo código enviado por SMS" : "Acesse de forma rápida e segura pelo seu telefone"}</p><div class="card"><section ${mode === "code" ? 'style="display:none"' : ''}><div class="phone-title">Número do celular</div><div class="phone-help">Digite seu celular com DDD. Enviaremos um código de verificação por SMS.</div><input id="phone-number" class="phone-input" type="tel" inputmode="tel" autocomplete="tel" placeholder="(47) 99999-9999" maxlength="15"><div id="recaptcha-container" class="recaptcha"></div><button class="primary" id="send-code">ENVIAR CÓDIGO</button></section><section ${mode === "code" ? '' : 'style="display:none"'}><div class="phone-title">Código de verificação</div><div class="phone-help">Digite o código de 6 números enviados para <b id="phone-display"></b>.</div><input id="sms-code" class="code-input" type="tel" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"><button class="primary" id="confirm-code">CONFIRMAR E ENTRAR</button><button class="back-btn" id="change-phone">ALTERAR NÚMERO</button></section><div id="phone-status" class="status"></div></div><div class="small">Seu número é usado somente para autenticação do Entrega365.</div></div></div>`;

  const status = document.getElementById("phone-status");
  const show = msg => { status.textContent = msg; status.classList.add("show"); };
  const input = document.getElementById("phone-number");
  if (input) { input.value = display(currentPhone); input.oninput = () => input.value = display(input.value); }

  if (mode === "code") {
    document.getElementById("phone-display").textContent = display(currentPhone);
    document.getElementById("confirm-code").onclick = confirmCode;
    document.getElementById("change-phone").onclick = () => { confirmationResult = null; resetRecaptcha(); render("phone"); setTimeout(setupRecaptcha, 150); };
  } else {
    document.getElementById("send-code").onclick = async () => {
      const phone = normalize(input.value);
      if (!phone) return show("Digite um celular válido com DDD. Ex.: (47) 99999-9999");
      currentPhone = phone;
      const button = document.getElementById("send-code");
      button.disabled = true;
      button.textContent = "ENVIANDO...";
      try {
        if (!recaptchaVerifier) setupRecaptcha();
        await recaptchaVerifier.render().catch(() => {});
        confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
        render("code");
      } catch (e) {
        console.error("Firebase Phone Auth", e?.code, e?.message, e);
        button.disabled = false;
        button.textContent = "ENVIAR CÓDIGO";
        show(firebaseError(e));
        resetRecaptcha();
        setTimeout(setupRecaptcha, 150);
      }
    };
  }
}

async function confirmCode() {
  const input = document.getElementById("sms-code"), status = document.getElementById("phone-status"), button = document.getElementById("confirm-code");
  const code = input?.value.replace(/\D/g, "");
  if (!confirmationResult) return render("phone");
  if (code.length !== 6) { status.textContent = "Digite o código de 6 números."; status.classList.add("show"); return; }
  button.disabled = true;
  button.textContent = "ENTRANDO...";
  try {
    const result = await confirmationResult.confirm(code);
    saveSession(result.user);
    location.reload();
  } catch (e) {
    console.error("Firebase Phone Code", e?.code, e?.message, e);
    button.disabled = false;
    button.textContent = "CONFIRMAR E ENTRAR";
    status.textContent = firebaseError(e);
    status.classList.add("show");
  }
}

onAuthStateChanged(auth, firebaseUser => {
  const session = localStorage.getItem(K + "session");
  if (firebaseUser) {
    if (!session || !session.startsWith("phone:")) { saveSession(firebaseUser); location.reload(); }
    return;
  }
  if (!session || !session.startsWith("phone:")) {
    legacySession = session;
    if (session && !session.startsWith("phone:")) localStorage.removeItem(K + "session");
    render("phone");
    setTimeout(setupRecaptcha, 150);
  }
});

window.entrega365Logout = async () => {
  try { await signOut(auth); } catch {}
  localStorage.removeItem(K + "session");
  localStorage.removeItem("entrega365:firebaseUid");
  localStorage.removeItem("entrega365:phone");
  location.reload();
};
setTimeout(() => { if (typeof window.logout === "function") window.logout = window.entrega365Logout; }, 100);
