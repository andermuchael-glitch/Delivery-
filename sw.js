const CACHE="entrega365-pwa-v100";
const AUTH="./auth-fix.js?v=100",BRAND="./brand-update.js?v=100",FEATURES="./entrega365-features.js?v=100",DRIVE="./drive-backup.js?v=100",SESSION="./session-policy.js?v=100",THEME="./entrega365-theme-v2.js?v=100",PRO="./entrega365-pro.js?v=100";
const ASSETS=["./login-google.html?v=100","./index.html?v=100","./manifest.json?v=100","./app-icon.svg?v=100","./icon-72.svg?v=100","./logo-entrega365.jpg?v=100",AUTH,BRAND,FEATURES,DRIVE,SESSION,THEME,PRO];

self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))).then(()=>self.clients.claim()))));
self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting()});

async function injectScripts(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(html.includes("auth-fix.js"))return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
  const injected=html.replace(/<\/body>/i,`<script type="module" src="${AUTH}"></script><script src="${BRAND}"></script><script src="${FEATURES}"></script><script src="${DRIVE}"></script><script src="${SESSION}"></script><script src="${THEME}"></script><script src="${PRO}"></script></body>`);
  const headers=new Headers(response.headers);headers.delete("content-length");
  return new Response(injected,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const path=url.pathname;

  if(path.endsWith("/auth-fix.js")||path.endsWith("/session-policy.js")||path.endsWith("/sw.js")){
    e.respondWith(fetch(req,{cache:"no-store"}));
    return;
  }

  if(req.mode==="navigate"){
    e.respondWith(
      fetch(req,{cache:"no-store"})
        .then(injectScripts)
        .catch(()=>{
          if(path==="/"||path==="/login-google.html")return caches.match("./login-google.html?v=100");
          return caches.match("./index.html?v=100");
        })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      if(res.ok&&/\.(js|css|svg|png|jpg|jpeg|json|html)$/.test(path)){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      }
      return res;
    }))
  );
});
