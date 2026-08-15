const CACHE="delivery-comandas-v4";
const ASSETS=["./","./index.html","./logo-moto.svg","./manifest.json"];

self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

async function enhanceRadio(response){
  if(!response || !response.ok) return response;
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html")) return response;
  let html=await response.text();
  const css=`
.radio-player{margin-top:12px}.radio-grid{grid-template-columns:1fr 1fr}.radio button{width:100%;border:0;border-radius:10px;background:#0b6fe0;color:#fff;padding:10px;font-weight:900;font-size:12px}.radio button.active{background:#19a86b}.radio-status{margin-top:10px;padding:10px 12px;border:1px solid #1b3855;border-radius:11px;background:#06172a;color:#bcd0e5;font-size:12px}.radio-modal{position:fixed;inset:0;z-index:100;background:rgba(2,7,13,.82);display:none;align-items:flex-end;justify-content:center;padding:0}.radio-modal.open{display:flex}.radio-sheet{width:100%;max-width:650px;background:#0b1420;border:1px solid #263c52;border-radius:22px 22px 0 0;padding:16px;box-shadow:0 -15px 45px #0008}.radio-sheet h3{margin:0 0 4px}.radio-sheet p{margin:0;color:#91a0b4;font-size:12px}.radio-frame{width:100%;height:390px;border:0;border-radius:14px;margin-top:12px;background:#050b14}.radio-close{width:100%;margin-top:10px;border:1px solid #294158;background:#081522;color:#fff;border-radius:11px;padding:11px;font-weight:800}`;
  const js=`
function openRadio(url,name){const m=document.getElementById('radioModal');const f=document.getElementById('radioFrame');const t=document.getElementById('radioTitle');const s=document.getElementById('radioStatus');if(!m||!f)return;t.textContent=name;s.textContent='Carregando transmissão...';f.src=url;m.classList.add('open');document.body.style.overflow='hidden';setTimeout(()=>s.textContent='A transmissão está aberta dentro do aplicativo. Você não precisa sair da tela.',800)}
function closeRadio(){const m=document.getElementById('radioModal');const f=document.getElementById('radioFrame');if(m)m.classList.remove('open');if(f)f.src='about:blank';document.body.style.overflow=''}
`;
  const modal=`<div id="radioModal" class="radio-modal" onclick="if(event.target===this)closeRadio()"><div class="radio-sheet"><div class="row between"><div><h3 id="radioTitle">Rádio</h3><p>Player integrado</p></div><button class="ico" onclick="closeRadio()">×</button></div><div id="radioStatus" class="radio-status">Selecione uma rádio.</div><iframe id="radioFrame" class="radio-frame" allow="autoplay; encrypted-media" referrerpolicy="no-referrer"></iframe><button class="radio-close" onclick="closeRadio()">Fechar rádio</button></div></div>`;
  html=html.replace('</style>',css+'</style>');
  html=html.replace('</body>',modal+'</body>');
  html=html.replace('</script>',js+'</script>');
  html=html.replace(/<a href="https:\/\/www\.jovempanitajai\.com\.br\/" target="_blank" rel="noopener">▶ Ouvir ao vivo<\/a>/g,'<button onclick="openRadio(\'https://www.jovempanitajai.com.br/\',\'Jovem Pan 94,1 FM\')">▶ Ouvir no app</button>');
  html=html.replace(/<a href="https:\/\/www\.trans99fm\.com\.br\/" target="_blank" rel="noopener">▶ Ouvir ao vivo<\/a>/g,'<button onclick="openRadio(\'https://www.trans99fm.com.br/radio/\',\'Transamérica 99,7 FM\')">▶ Ouvir no app</button>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(e.request.mode==='navigate' || url.pathname.endsWith('/index.html')){
    e.respondWith(fetch(e.request).then(r=>enhanceRadio(r).then(out=>{const copy=out.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return out})).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
  }
});