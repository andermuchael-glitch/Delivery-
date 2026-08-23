const CACHE="entrega365-v45";
const ASSETS=["./","./index.html?v=45","./logo-moto.svg?v=45","./manifest.json?v=45"];
const LOGO_FIX=`<style id="entrega365-logo-fix">
.logo{width:46px!important;height:46px!important;border-radius:10px!important;background-color:#111!important;background-image:url("logo-moto.svg?v=45")!important;background-position:center!important;background-size:contain!important;background-repeat:no-repeat!important;border:1px solid #ffbd19!important;}
.biglogo{width:min(340px,88vw)!important;height:min(340px,88vw)!important;margin:0 auto 14px!important;border-radius:0!important;background-color:transparent!important;background-image:url("logo-moto.svg?v=45")!important;background-position:center!important;background-size:contain!important;background-repeat:no-repeat!important;}
</style>`;
async function logoFixedResponse(request){
  try{
    const response=await fetch(request,{cache:"no-store"});
    const type=response.headers.get("content-type")||"";
    if(!type.includes("text/html")) return response;
    const html=await response.text();
    const fixed=html.includes("</head>")?html.replace("</head>",LOGO_FIX+"</head>"):html;
    return new Response(fixed,{status:response.status,statusText:response.statusText,headers:response.headers});
  }catch(e){
    return caches.match("./index.html");
  }
}
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
  if(event.request.mode==="navigate"||url.pathname.endsWith("/index.html")){
    event.respondWith(logoFixedResponse(event.request));
    return;
  }
  if(url.pathname.endsWith("/sw.js")){
    event.respondWith(fetch(event.request,{cache:"no-store"}));
    return;
  }
  event.respondWith(caches.match(event.request).then(response=>response||fetch(event.request)));
});