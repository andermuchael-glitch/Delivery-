/* Entrega365 v153 — ferramentas complementares */
window.e365Backup=()=>{};
window.backup=window.e365Backup;
window.e365Restore=()=>{};
window.e365CSV=()=>{};
window.e365PDF=()=>{};

// Comunidade + Marketplace: carrega sem bloquear a autenticação.
import("./community-market.js?v=2").then(()=>{
  const bind=()=>{
    const open=window.e365CommunityOpen;
    if(typeof open!=="function")return;

    // Botão + no cabeçalho.
    const actions=document.querySelector("header .actions");
    if(actions&&!document.getElementById("e365-community-plus")){
      const b=document.createElement("button");
      b.id="e365-community-plus";
      b.type="button";
      b.title="Comunidade e Marketplace";
      b.setAttribute("aria-label","Abrir Comunidade e Marketplace");
      b.className="ico";
      b.innerHTML="+";
      b.onclick=()=>open();
      actions.appendChild(b);
    }

    // O botão Mais da navegação inferior também abre as novas funções.
    document.querySelectorAll(".tabs .tab").forEach(tab=>{
      const text=(tab.textContent||"").toLowerCase();
      if(text.includes("mais")||tab.dataset.section==="more"){
        tab.dataset.e365CommunityBound="1";
        tab.onclick=(e)=>{e.preventDefault();e.stopPropagation();open();};
        tab.setAttribute("aria-label","Mais: Comunidade e Marketplace");
      }
    });
  };

  bind();
  const observer=new MutationObserver(bind);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),30000);
}).catch(e=>console.warn("Entrega365 Community indisponível:",e));
