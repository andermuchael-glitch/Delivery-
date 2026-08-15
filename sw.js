const CACHE="delivery-comandas-v6";
const ASSETS=["./","./index.html","./logo-moto.svg","./manifest.json"];

const PLAYER_CSS=`<style id="mini-radio-css">
#miniRadio{position:fixed;z-index:9999;left:10px;right:10px;bottom:82px;max-width:630px;margin:auto;background:rgba(7,18,30,.98);border:1px solid #1f4567;border-radius:16px;padding:8px 10px;box-shadow:0 10px 35px #0009;backdrop-filter:blur(14px);display:flex;align-items:center;gap:8px;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
#miniRadio .mrIcon{width:36px;height:36px;border-radius:11px;background:#0b6fe0;display:grid;place-items:center;font-size:18px;flex:none}
#miniRadio .mrInfo{min-width:0;flex:1}.mrName{font-weight:900;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mrSub{font-size:10px;color:#91a0b4;margin-top:2px}
#miniRadio select{width:145px;background:#081522;color:#fff;border:1px solid #28445d;border-radius:9px;padding:7px;font-size:11px}
#miniRadio button{border:0;border-radius:10px;background:#087cff;color:#fff;width:38px;height:36px;font-size:16px;font-weight:900}.mrClose{background:#142232!important;color:#aebdcd!important}
#miniRadio iframe{position:absolute;width:1px;height:1px;opacity:.01;pointer-events:none;border:0;left:-9999px}
@media(max-width:390px){#miniRadio{left:7px;right:7px;bottom:79px;padding:7px}.mrName{font-size:11px}#miniRadio select{width:112px;font-size:10px}}
</style>`;

const PLAYER_HTML=`<div id="miniRadio" aria-label="Mini player de rádio">
  <div class="mrIcon">📻</div>
  <div class="mrInfo"><div class="mrName" id="mrName">Jovem Pan Itajaí 94,1 FM</div><div class="mrSub" id="mrSub">Itajaí / Balneário Camboriú</div></div>
  <select id="mrStation" aria-label="Escolher rádio"><option value="jp">Jovem Pan Itajaí 94,1</option><option value="ta">Transamérica 99,7</option></select>
  <button id="mrPlay" aria-label="Reproduzir">▶</button><button id="mrClose" class="mrClose" aria-label="Fechar">×</button>
  <audio id="mrAudio" preload="none" playsinline></audio>
  <iframe id="mrFrame" title="Player da rádio"></iframe>
</div>
<script id="mini-radio-script">(()=>{
 const jp="https://www.jovempanitajai.com.br/";
 const ta="https://radio02.zas.media/proxy/trans99/stream";
 const el=id=>document.getElementById(id); const station=el("mrStation"), play=el("mrPlay"), audio=el("mrAudio"), frame=el("mrFrame"), name=el("mrName"), sub=el("mrSub"), box=el("miniRadio"), close=el("mrClose");
 let current="jp",playing=false;
 function setStation(s){current=s; audio.pause();audio.removeAttribute("src");frame.src="about:blank";playing=false;play.textContent="▶";if(s==="ta"){name.textContent="Transamérica 99,7 FM";sub.textContent="Balneário Camboriú";audio.src=ta}else{name.textContent="Jovem Pan Itajaí 94,1 FM";sub.textContent="Itajaí / Balneário Camboriú";frame.src=jp}}
 station.onchange=()=>setStation(station.value);
 play.onclick=async()=>{if(current==="ta"){try{if(audio.paused){await audio.play();playing=true;play.textContent="Ⅱ"}else{audio.pause();playing=false;play.textContent="▶"}}catch(e){alert("Não foi possível iniciar a Transamérica neste navegador.")}}else{frame.src=jp;window.openedRadioInApp=true;alert("A Jovem Pan será carregada pelo player oficial da emissora dentro do Delivery. Toque em 'Ouça ao vivo' no player.")}};
 audio.onended=()=>{playing=false;play.textContent="▶"};close.onclick=()=>box.remove();setStation("jp");
})();</script>`;

function inject(text){
 if(text.includes('id="miniRadio"')) return text;
 return text.replace('</head>',PLAYER_CSS+'</head>').replace('</body>',PLAYER_HTML+'</body>');
}

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
    text=inject(text);
    const headers=new Headers(r.headers);headers.delete("content-length");
    const out=new Response(text,{status:r.status,statusText:r.statusText,headers});
    caches.open(CACHE).then(c=>c.put(e.request,out.clone()));return out;
   } return r;
  }).catch(()=>caches.match(e.request)));
 }else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});