/* Entrega365 — reorganização do cabeçalho e menu Mais — abertura robusta */
(function(){
  'use strict';
  const STYLE_ID='e365-layout-reorg-style';
  let communityLoadPromise=null;
  function actions(){ return document.querySelector('header .actions,.actions'); }
  function actionButtons(){ const a=actions(); return a?[...a.querySelectorAll('.ico,button')]:[]; }
  function findAction(re){ return actionButtons().find(b=>re.test((b.textContent||'').trim())); }
  function clickLanguage(){ const b=findAction(/🌐|idioma|language/i); if(b){ b.click(); return true; } return false; }
  function clickExit(){ const b=findAction(/🚪|sair|logout|exit/i); if(b){ b.click(); return true; } return false; }
  function ensureCommunityScript(){
    if(window.e365CommunityOpen||window.e365MarketplaceOpen) return Promise.resolve();
    if(communityLoadPromise) return communityLoadPromise;
    communityLoadPromise=new Promise(resolve=>{
      let s=document.querySelector('script[data-e365-community]')||[...document.scripts].find(x=>(x.src||'').includes('/community-market.js'));
      const done=()=>resolve();
      if(s){
        if(window.e365CommunityOpen||window.e365MarketplaceOpen||typeof window.render==='function'){resolve();return;}
        s.addEventListener('load',done,{once:true}); s.addEventListener('error',done,{once:true}); setTimeout(done,3000); return;
      }
      s=document.createElement('script'); s.src='./community-market.js?v=168'; s.dataset.e365Community='1'; s.async=false;
      s.onload=done; s.onerror=done; document.head.appendChild(s);
    });
    return communityLoadPromise;
  }
  function authenticated(){
    const u=window.entrega365Auth?.auth?.currentUser||window.__e365Auth?.currentUser||window.e365GetCurrentUser?.();
    return !!(u?.uid&&typeof u.getIdToken==="function");
  }
  async function openCommunity(){
    if(!authenticated()) return;
    await ensureCommunityScript();
    const existing=document.querySelector('.cm-overlay');
    if(existing) existing.style.display='block';
    if(typeof window.e365CommunityOpen==='function'){ await window.e365CommunityOpen(); return; }
    if(typeof window.e365OpenCommunity==='function'){ await window.e365OpenCommunity(); return; }
    if(typeof window.render==='function'){ await window.render('community'); return; }
    console.warn('Entrega365: Comunidade indisponível');
  }
  async function openMarketplace(){
    if(!authenticated()) return;
    await ensureCommunityScript();
    if(typeof window.e365MarketplaceOpen==='function'){ await window.e365MarketplaceOpen(); return; }
    const existing=document.querySelector('.cm-overlay');
    if(existing){
      existing.style.display='block';
      const tab=existing.querySelector('.cm-tab[data-v="marketplace"]');
      if(tab){tab.click();return;}
    }
    if(typeof window.render==='function'){ await window.render('marketplace'); return; }
    await openCommunity();
    let n=0;const t=setInterval(()=>{const x=document.querySelector('.cm-tab[data-v="marketplace"]');if(x){clearInterval(t);x.click();}if(++n>40)clearInterval(t)},100);
  }
  function styles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
      .e365-more-layout{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.72);display:flex;align-items:flex-end}
      .e365-more-layout-card{width:100%;max-width:600px;margin:auto;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:22px 22px 0 0;padding:20px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.5)}
      .e365-more-layout-handle{width:44px;height:5px;border-radius:99px;background:#555;margin:0 auto 16px}
      .e365-more-layout-title{font-size:19px;font-weight:900;color:#fff}.e365-more-layout-sub{color:#999;font-size:12px;margin:4px 0 14px}
      .e365-more-layout-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .e365-more-layout-grid button{padding:15px 10px;min-height:72px;border:1px solid #444;border-radius:14px;background:#242424;color:#fff;font-weight:900;font-size:13px}
      .e365-more-layout-grid button:hover{border-color:#ffd000;background:#2c2c2c}
      @media(max-width:390px){.e365-more-layout-grid{gap:8px}}
    `;
    document.head.appendChild(s);
  }
  function showMore(){
    if(document.querySelector('.e365-more-layout'))return;
    styles();
    const m=document.createElement('div');m.className='e365-more-layout';
    m.innerHTML=`<div class="e365-more-layout-card"><div class="e365-more-layout-handle"></div><div class="e365-more-layout-title">Mais recursos</div><div class="e365-more-layout-sub">Ferramentas e opções do Entrega365</div><div class="e365-more-layout-grid">
      <button data-e365-more="pro">⭐<br>Modo PRO</button><button data-e365-more="agenda">📅<br>Agenda</button><button data-e365-more="finance">💰<br>Controle financeiro</button><button data-e365-more="calculator">🧮<br>Calculadora</button><button data-e365-more="language">🌐<br>Idioma</button><button data-e365-more="exit">🚪<br>Sair</button>
    </div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m){m.remove();return}const b=e.target.closest('[data-e365-more]');if(!b)return;const x=b.dataset.e365More;m.remove();if(x==='pro')window.e365OpenPro?.();else if(x==='agenda')window.e365OpenAgenda?.();else if(x==='finance')window.go?.('finance');else if(x==='calculator')window.e365OpenCalculator?.();else if(x==='language')clickLanguage();else if(x==='exit')clickExit();});
  }
  function removeSocialNav(){
    document.querySelectorAll('.e365-social-nav').forEach(n=>n.remove());
  }
  function build(){
    styles();
    if(!authenticated()){
      removeSocialNav();
      return;
    }
    const a=actions();
    if(a){const bs=actionButtons();const plus=bs.find(b=>/^\s*\+\s*$/.test((b.textContent||'')))||bs[bs.length-1];if(plus)plus.style.display='none';const lang=bs.find(b=>/🌐|idioma|language/i.test((b.textContent||'')));const exit=bs.find(b=>/🚪|sair|logout|exit/i.test((b.textContent||'')));if(lang)lang.style.display='none';if(exit)exit.style.display='none'}
    let nav=document.querySelector('.e365-social-nav');
    if(!nav){nav=document.createElement('nav');nav.className='e365-social-nav';nav.innerHTML='<button type="button" data-e365-social="community">👥 Comunidade</button><button type="button" data-e365-social="marketplace">🛍️ Marketplace</button>';const h=document.querySelector('header');if(h)h.insertAdjacentElement('afterend',nav);else document.body.prepend(nav);nav.addEventListener('click',e=>{const b=e.target.closest('[data-e365-social]');if(!b)return;if(b.dataset.e365Social==='community')void openCommunity();else void openMarketplace();});}
  }
  window.e365OpenMoreLayout=showMore;
  function boot(){build();setTimeout(build,250);setTimeout(build,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
