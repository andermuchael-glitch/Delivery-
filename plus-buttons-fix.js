/* Entrega365 — fallback independente para todos os botões de ação com + */
(function(){
  'use strict';
  function openMoreSafe(){
    try{
      if(typeof window.openMore==='function') return window.openMore();
      const m=document.querySelector('.e365-more-fallback');
      if(m)return;
      alert('O menu de recursos ainda está carregando. Tente novamente.');
    }catch(e){console.warn('Mais:',e)}
  }
  function handle(e){
    const more=e.target?.closest?.('.tabs .tab:last-child');
    if(more){
      e.preventDefault();
      e.stopImmediatePropagation();
      openMoreSafe();
      return;
    }
    const est=e.target?.closest?.('.e365estadd');
    if(est){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.e365Establishments?.openNew==='function') window.e365Establishments.openNew();
      else alert('O módulo de estabelecimentos ainda está carregando. Tente novamente.');
      return;
    }
    const add=e.target?.closest?.('#add,#addexp');
    if(add && typeof add.onclick!=='function'){
      e.preventDefault();
      if(add.id==='add'){
        const d=typeof window.getDay==='function'?window.getDay(window.__e365Day||''):null;
        if(d&&typeof window.saveDayAnd==='function'&&typeof window.render==='function'){
          if(!Array.isArray(d.entries))d.entries=[];
          d.entries.push({id:crypto.randomUUID(),comanda:'',taxa:'',ok:false});
          window.saveDayAnd(window.__e365Day,d);window.render();
        }
      }
    }
  }
  function install(){
    if(window.__e365PlusButtonsFix)return;
    window.__e365PlusButtonsFix=true;
    document.addEventListener('click',handle,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
