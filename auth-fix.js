import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU",
  authDomain: "entrega365.firebaseapp.com",
  projectId: "entrega365",
  storageBucket: "entrega365.firebasestorage.app",
  messagingSenderId: "686578751112",
  appId: "1:686578751112:web:4c0f8e4b3a569e7297313d",
  measurementId: "G-RPRXBXXDJK"
};

const auth = getAuth(initializeApp(firebaseConfig));
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
const SESSION = "dcv2:session";

function fixLogo() {
  document.querySelectorAll(".biglogo,.logo").forEach(el => {
    el.style.backgroundImage = 'url("logo-entrega365.png")';
    el.style.backgroundSize = "contain";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
  });
}

function addGoogleButton() {
  const card = document.querySelector(".loginbox .card");
  if (!card || document.getElementById("google-login")) return;
  const b = document.createElement("button");
  b.id = "google-login";
  b.type = "button";
  b.textContent = "CONTINUAR COM GOOGLE";
  b.style.cssText = "width:100%;border:1px solid #666;border-radius:12px;background:#fff;color:#222;font-weight:900;padding:13px;margin-top:10px;box-shadow:none";
  b.onclick = async () => {
    b.disabled = true;
    b.textContent = "CONECTANDO...";
    try {
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      localStorage.setItem(SESSION, "google:" + u.uid);
      localStorage.setItem("entrega365:firebaseUid", u.uid);
      localStorage.setItem("entrega365:email", u.email || "");
      localStorage.setItem("entrega365:displayName", u.displayName || "");
      location.reload();
    } catch (e) {
      console.error(e);
      b.disabled = false;
      b.textContent = "CONTINUAR COM GOOGLE";
      const msg = e?.code === "auth/unauthorized-domain"
        ? "Este domínio ainda não está autorizado no Firebase."
        : e?.code === "auth/popup-blocked"
          ? "O navegador bloqueou a janela do Google. Tente novamente."
          : e?.code === "auth/operation-not-allowed"
            ? "O login com Google ainda não está ativado no Firebase."
            : `Não foi possível entrar com Google (${e?.code || "erro"}).`;
      alert(msg);
    }
  };
  card.appendChild(b);
}

function showProfessionalLogin() {
  if (localStorage.getItem(SESSION)) return;
  if (typeof window.showLogin === "function") window.showLogin();
  fixLogo();
  addGoogleButton();
}

onAuthStateChanged(auth, u => {
  if (u && !localStorage.getItem(SESSION)) {
    localStorage.setItem(SESSION, "google:" + u.uid);
    localStorage.setItem("entrega365:firebaseUid", u.uid);
    localStorage.setItem("entrega365:email", u.email || "");
    localStorage.setItem("entrega365:displayName", u.displayName || "");
    location.reload();
  }
});

const originalLogout = window.logout;
window.logout = async () => {
  try { await signOut(auth); } catch {}
  if (typeof originalLogout === "function") originalLogout();
  else { localStorage.removeItem(SESSION); location.reload(); }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(showProfessionalLogin, 50));
} else {
  setTimeout(showProfessionalLogin, 50);
}
