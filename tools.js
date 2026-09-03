/* Entrega365 v152 — ferramentas complementares */
window.e365Backup=()=>{};
window.backup=window.e365Backup;
window.e365Restore=()=>{};
window.e365CSV=()=>{};
window.e365PDF=()=>{};

// Carrega a Comunidade + Marketplace sem participar do fluxo de autenticação.
// O módulo inicializa o Firestore somente quando o usuário abre o recurso.
import("./community-market.js?v=1").catch(e=>console.warn("Entrega365 Community indisponível:",e));
