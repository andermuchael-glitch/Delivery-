const CACHE="delivery-comandas-v5";
const ASSETS=["./","./index.html","./logo-moto.svg","./manifest.json"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const url=new URL(e.request.url);
  if(e.request.mode==="navigate" || url.pathname.endsWith("/index.html")){
    e.respondWith(fetch(e.request).then(async r=>{
      const type=r.headers.get("content-type")||"";
      if(type.includes("text/html")){
        let text=await r.text();
        text=text.replaceAll("Jovem Pan 94,1 FM","Jovem Pan Itajaí 94,1 FM");
        text=text.replaceAll("Itajaí / Balneário Camboriú","Itajaí / Balneário Camboriú");
        const headers=new Headers(r.headers); headers.delete("content-length");
        const out=new Response(text,{status:r.status,statusText:r.statusText,headers});
        caches.open(CACHE).then(c=>c.put(e.request,out.clone()));
        return out;
      }
      return r;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
  }
});