const CACHE="entrega365-v44";
const ASSETS=["./","./index.html?v=44","./logo-moto.svg?v=44","./manifest.json?v=44"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
    .then(()=>self.clients.matchAll({type:"window",includeUncontrolled:true}))
    .then(clients=>Promise.all(clients.map(client=>client.navigate(client.url))))
));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(event.request.mode==="navigate"||url.pathname.endsWith("/index.html")||url.pathname.endsWith("/sw.js")){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>response).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(response=>response||fetch(event.request)));
});