/* Entrega365 — correção do menu Mais / ferramentas rápidas */
(function(){
  'use strict';
  let installed=false;
  function fallbackMenu(){
    if(document.querySelector('.e365-more-fallback'))return;
    const m=document.createElement('div');
    m.className='e365-more-fallback';
    m.style.cssText='position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;padding:0;';
    m.innerHTML='<div style="width:100%;max-width:600px;margin:auto;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:22px 22px 0 0;padding:20px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.5)"><div style="width:44px;height:5px;border-radius:99px;background:#555;margin:0 auto 16px"></div><b style="font-size:19px">Mais recursos</b><div style="color:#999;font-size:12px;margin:4px 0 14px">Ferramentas adicionais do Entrega365</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button data-more-fix="pro" style="padding:15px;border:1px solid #444;border-radius:14px;background:#242424;color:#fff;font-weight:900">⭐<br>Modo PRO</button><button data-more-fix="calendar" style="padding:15px;border:1px solid #444;border-radius:14px;background:#242424;color:#fff;font-weight:900">📅<br>Agenda</button><button data-more-fix="finance" style="padding:15px;border:1px solid #444;border-radius:14px;background:#242424;color:#fff;font-weight:900">💰<br>Controle financeiro</button><button data-more-fix="calculator" style="padding:15px;border:1px solid #444;border-radius:14px;background:#242424;color:#fff;font-weight:900">🧮<br>Calculadora</button></div></div>';
    document.body.appendChild(m);
    m.onclick=e=>{if(e.target===m)m.remove()};
    m.querySelectorAll('[data-more-fix]').forEach(b=>b.onclick=()=>{const x=b.dataset.moreFix;m.remove();if(x==='pro')window.e365OpenPro?.();else if(x==='calendar')window.e365OpenAgenda?.();else if(x==='calculator')window.e365OpenCalculator?.();else if(x==='finance'){window.go?.('finance');}});
  }
  function open(){
    if(typeof window.openMore==='function'){window.openMore();return;}
    fallbackMenu();
  }
  function install(){
    if(installed)return;
    installed=true;
    document.addEventListener('click',function(e){
      const b=e.target?.closest?.('.tabs .tab:last-child');
      if(!b)return;
      e.preventDefault();
      e.stopPropagation();
      open();
    },true);
    const observer=new MutationObserver(()=>{
      const b=document.querySelector('.tabs .tab:last-child');
      if(b){b.setAttribute('aria-label','Mais recursos');b.title='Mais recursos: calculadora, agenda e controle financeiro';}
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
