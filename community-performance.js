/* Entrega365 — Comunidade/Marketplace: pré-carregamento e abertura instantânea */
(function(){
  'use strict';
  const FEED_KEY='e365:communityFeedCache:v2';
  const MARKET_KEY='e365:marketCache:v2';
  const TTL=45000;
  let originalFetch=null;
  const getUser=()=>window.entrega365Auth?.auth?.currentUser||window.__e365Auth?.currentUser||window.e365GetCurrentUser?.()||null;
  const cacheRead=(key)=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&Date.now()-Number(x.at||0)<TTL?x.data:null}catch{return null}};
  const cacheWrite=(key,data)=>{try{localStorage.setItem(key,JSON.stringify({at:Date.now(),data}))}catch{}};
  async function getToken(){const u=getUser();if(!u?.getIdToken)return null;try{return await u.getIdToken()}catch{return null}}
  async function prefetchOne(path,key){try{const token=await getToken();if(!token)return null;const r=await originalFetch(path,{method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});if(!r.ok)return null;const data=await r.json();cacheWrite(key,data);return data}catch(e){console.debug('Entrega365 prefetch:',path,e);return null}}
  function patchFetch(){if(window.__e365CommunityFetchPatched||typeof window.fetch!=='function')return;window.__e365CommunityFetchPatched=true;originalFetch=window.fetch.bind(window);window.fetch=function(input,init={}){try{const url=typeof input==='string'?input:(input?.url||''),method=String(init?.method||input?.method||'GET').toUpperCase();if(method==='GET'){if(url.includes('/api/community/posts')){const cached=cacheRead(FEED_KEY);if(cached){void originalFetch(input,init).then(async r=>{if(r.ok)try{cacheWrite(FEED_KEY,await r.clone().json())}catch{}}).catch(()=>{});return Promise.resolve(new Response(JSON.stringify(cached),{status:200,headers:{'Content-Type':'application/json','X-Entrega365-Cache':'warm'}}))}}if(url.includes('/api/marketplace')){const cached=cacheRead(MARKET_KEY);if(cached){void originalFetch(input,init).then(async r=>{if(r.ok)try{cacheWrite(MARKET_KEY,await r.clone().json())}catch{}}).catch(()=>{});return Promise.resolve(new Response(JSON.stringify(cached),{status:200,headers:{'Content-Type':'application/json','X-Entrega365-Cache':'warm'}}))}}}}catch(e){console.debug('Entrega365 fetch cache:',e)}return originalFetch(input,init)}};
  function hideBackendText(){document.querySelectorAll('.cm-hero p,.cm-store p,.cm-store .small').forEach(el=>{const t=(el.textContent||'').trim().toLowerCase();if(t.includes('configurada pelo backend')||t.includes('postgresql'))el.textContent='Encontre produtos e oportunidades para facilitar seu dia a dia.'})}
  function warm(){patchFetch();const u=getUser();if(!u?.getIdToken)return;prefetchOne('/api/community/posts?limit=50',FEED_KEY);prefetchOne('/api/marketplace',MARKET_KEY)}
  function ensureCommunityScript(){if(window.e365CommunityOpen||window.e365MarketplaceOpen)return;if(document.querySelector('script[data-e365-community]'))return;const s=document.createElement('script');s.src='./community-market.js?v=166';s.dataset.e365Community='1';s.async=true;s.onerror=()=>console.warn('Comunidade Entrega365 indisponível');document.head.appendChild(s)}
  function boot(){patchFetch();ensureCommunityScript();hideBackendText();setTimeout(warm,500);setTimeout(warm,2500);setInterval(warm,20000);window.addEventListener('focus',warm);window.addEventListener('online',warm);window.addEventListener('pageshow',warm);new MutationObserver(hideBackendText).observe(document.documentElement,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
