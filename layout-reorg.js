/* Entrega365 — layout principal do menu Mais + Backup local */
(function(){
  'use strict';
  const STYLE_ID='e365-layout-reorg-style';

  function actions(){ return document.querySelector('header .actions,.actions'); }
  function actionButtons(){ const a=actions(); return a?[...a.querySelectorAll('.ico,button')]:[]; }
  function findAction(re){ return actionButtons().find(b=>re.test((b.textContent||'').trim())); }

  function styles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .e365-more-layout{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.72);display:flex;align-items:flex-end}
      .e365-more-layout-card{width:100%;max-width:600px;margin:auto;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:22px 22px 0 0;padding:20px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.5)}
      .e365-more-layout-handle{width:44px;height:5px;border-radius:99px;background:#555;margin:0 auto 16px}
      .e365-more-layout-title{font-size:19px;font-weight:900;color:#fff}
      .e365-more-layout-sub{color:#999;font-size:12px;margin:4px 0 14px}
      .e365-more-layout-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .e365-more-layout-grid button{padding:15px 10px;min-height:72px;border:1px solid #444;border-radius:14px;background:#242424;color:#fff;font-weight:900;font-size:13px}
      .e365-more-layout-grid button:hover{border-color:#ffd000;background:#2c2c2c}
      .e365-more-layout-grid .backup{border-color:rgba(255,208,0,.55);color:#ffd000}
      @media(max-width:390px){.e365-more-layout-grid{gap:8px}}
    `;
    document.head.appendChild(s);
  }

  function close(){document.querySelector('.e365-more-layout')?.remove();}

  function showMore(){
    close();
    styles();
    const m=document.createElement('div');
    m.className='e365-more-layout';
    m.innerHTML=`<div class="e365-more-layout-card">
      <div class="e365-more-layout-handle"></div>
      <div class="e365-more-layout-title">Mais recursos</div>
      <div class="e365-more-layout-sub">Ferramentas e opções do Entrega365</div>
      <div class="e365-more-layout-grid">
        <button data-e365-more="pro">⭐<br>Modo PRO</button>
        <button data-e365-more="agenda">📅<br>Agenda</button>
        <button data-e365-more="finance">💰<br>Controle financeiro</button>
        <button data-e365-more="calculator">🧮<br>Calculadora</button>
        <button data-e365-more="location">📍<br>Localização</button><button class="backup" data-e365-more="backup">💾<br>Backup</button>
      </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{
      if(e.target===m){close();return}
      const b=e.target.closest('[data-e365-more]');
      if(!b)return;
      const x=b.dataset.e365More;
      close();
      if(x==='pro')window.e365OpenPro?.();
      else if(x==='agenda')window.e365OpenAgenda?.();
      else if(x==='finance')window.go?.('finance');
      else if(x==='calculator')window.e365OpenCalculator?.();
      else if(x==='location'){\n        const g=window.entrega365Location;\n        if(!g)return alert('Módulo de localização ainda está carregando.');\n        g.toggle().then(on=>alert(on?'Localização ativada. O Entrega365 acompanhará sua posição enquanto o recurso estiver ativo.':'Localização desativada.')).catch(err=>alert('Não foi possível ativar a localização. Verifique a permissão de localização do Android.'));\n      }\n      else if(x==='backup'){
        if(typeof window.e365OpenManualBackupMenu==='function') window.e365OpenManualBackupMenu();
        else setTimeout(()=>window.e365OpenManualBackupMenu?.(),150);
      }
    });
  }

  function keepTopActions(){
    const a=actions();
    if(!a)return;
    const lang=findAction(/🌐|idioma|language/i);
    if(lang){
      lang.style.display='inline-flex';
      lang.title='Idioma e moeda';
      lang.setAttribute('aria-label','Idioma e moeda');
    }
    const exit=findAction(/🚪|sair|logout|exit/i);
    if(exit)exit.style.display='inline-flex';
  }

  function install(){
    styles();
    keepTopActions();
    window.e365OpenMoreLayout=showMore;
  }

  function boot(){
    install();
    setTimeout(install,250);
    setTimeout(install,800);
    setTimeout(install,1600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();