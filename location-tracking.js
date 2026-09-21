(function(){
  'use strict';
  const API='/api/location',QUEUE='entrega365:location:queue:v1';
  let sessionLast=null,sessionMeters=0;
  function currentUser(){return window.e365GetCurrentUser?.()||window.entrega365Auth?.auth?.currentUser||null}
  async function auth(){const u=currentUser();if(!u?.getIdToken)throw new Error('Usuário não autenticado');return u.getIdToken()}
  function readQueue(){try{const q=JSON.parse(localStorage.getItem(QUEUE)||'[]');return Array.isArray(q)?q:[]}catch{return[]}}
  function writeQueue(q){localStorage.setItem(QUEUE,JSON.stringify(q.slice(-300)))}
  function queue(point){if(!point)return;const q=readQueue(),last=q.at(-1);if(last&&Math.abs(Number(last.latitude)-Number(point.latitude))<0.00001&&Math.abs(Number(last.longitude)-Number(point.longitude))<0.00001&&Number(point.timestamp)-Number(last.timestamp)<5000)return;q.push(point);writeQueue(q);flush()}
  async function importBackgroundBuffer(){
    const points=await window.e365BackgroundLocation?.buffered?.()||[];
    if(!points.length)return 0;
    const q=readQueue();
    points.forEach(p=>{if(p&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude)))q.push(p)});
    writeQueue(q);
    return points.length;
  }
  async function flush(){
    if(!currentUser())return false;
    await importBackgroundBuffer();
    const q=readQueue();
    if(!q.length)return false;
    try{const t=await auth();const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({points:q.slice(0,200)})});if(!r.ok)throw new Error('HTTP '+r.status);writeQueue(q.slice(200));return true}catch(e){console.warn('Entrega365 localização aguardando sincronização:',e);return false}}
  function time(ts){return ts?new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'}
  function coord(n){return Number(n).toFixed(6).replace('.',',')}
  function openMaps(p){if(p)window.open('https://www.google.com/maps?q='+encodeURIComponent(p.latitude+','+p.longitude),'_blank')}
  async function load(){const t=await auth();const now=new Date();const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();const r=await fetch(API+'?limit=1000&from='+encodeURIComponent(start),{headers:{Authorization:'Bearer '+t},cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
  function open(){
    document.querySelector('.e365-location-panel')?.remove();
    sessionLast=window.entrega365Location?.last?.()||null;
    sessionMeters=0;
    const panel=document.createElement('div');panel.className='e365-location-panel';
    const card=document.createElement('div');card.className='e365-location-card';
    card.innerHTML='<div class="e365-location-head"><div><b>📍 Rastreamento de localização</b><small>Dados sincronizados com PostgreSQL</small></div><button id="e365LocClose">×</button></div><div id="e365LocStatus" class="e365-location-status">Carregando...</div><div class="e365-location-control"><button id="e365LocStart">📍 Ativar localização</button><button id="e365LocCapture">🎯 Capturar agora</button></div><div class="e365-location-grid"><div><span>Latitude</span><b id="e365Lat">—</b></div><div><span>Longitude</span><b id="e365Lng">—</b></div><div><span>Precisão</span><b id="e365Acc">—</b></div><div><span>Última atualização</span><b id="e365Time">—</b></div><div><span>Km hoje</span><b id="e365KmToday">0,00 km</b></div><div><span>Km nesta sessão</span><b id="e365KmSession">0,00 km</b></div></div><div class="e365-location-actions"><button id="e365LocRefresh">↻ Atualizar</button><button id="e365LocMaps">🗺️ Abrir no Google Maps</button></div><div class="e365-location-history"><b>Últimos registros</b><div id="e365LocList">Carregando...</div></div></div>';
    panel.appendChild(card);document.body.appendChild(panel);
    let latest=null;
    card.querySelector('#e365LocClose').onclick=()=>panel.remove();
    card.querySelector('#e365LocRefresh').onclick=()=>refresh();
    card.querySelector('#e365LocStart').onclick=()=>toggleTracking();
    card.querySelector('#e365LocCapture').onclick=()=>captureNow();
    window.addEventListener('e365-location',onLocation);
    card.querySelector('#e365LocMaps').onclick=()=>openMaps(latest);
    panel.onclick=e=>{if(e.target===panel)closePanel()};
    function closePanel(){window.removeEventListener('e365-location',onLocation);panel.remove()}
    function localPoint(){return window.entrega365Location?.last?.()||null}
    function haversine(a,b){const R=6371000,rad=Math.PI/180;const dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;const x=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))}
    function segmentMeters(a,b){if(!a||!b)return 0;const aa=Number(a.accuracy),bb=Number(b.accuracy);if(Number.isFinite(aa)&&aa>100||Number.isFinite(bb)&&bb>100)return 0;const dt=(Number(b.timestamp)-Number(a.timestamp))/1000;if(!(dt>0))return 0;const d=haversine(a,b);return d>=5&&d<=Math.max(500,50*dt)?d:0}
    function renderMileage(data){const km=Number(data?.distanceKm||0);card.querySelector('#e365KmToday').textContent=km.toFixed(2).replace('.',',')+' km';card.querySelector('#e365KmSession').textContent=(sessionMeters/1000).toFixed(2).replace('.',',')+' km'}
    function trackingOn(){return localStorage.getItem('entrega365:locationTracking')==='1'}
    function renderLocal(p,label){if(!p)return;latest=p;if(trackingOn()&&sessionLast){const d=segmentMeters(sessionLast,p);if(d>0)sessionMeters+=d}sessionLast=p;card.querySelector('#e365Lat').textContent=coord(p.latitude);card.querySelector('#e365Lng').textContent=coord(p.longitude);card.querySelector('#e365Acc').textContent=p.accuracy!=null?Math.round(p.accuracy)+' m':'—';card.querySelector('#e365Time').textContent=time(p.timestamp);card.querySelector('#e365LocStatus').textContent=label||'🟠 Localização capturada; sincronizando...';renderMileage(window.__e365LocationData||{});card.querySelector('#e365LocMaps').disabled=false}
    function updateControl(){const b=card.querySelector('#e365LocStart');b.textContent=trackingOn()?'⏹️ Parar rastreamento':'📍 Ativar localização'}
    function onLocation(e){renderLocal(e.detail,trackingOn()?'🟢 Rastreamento ativo — sincronizando localização...':'🟠 Localização capturada; sincronizando PostgreSQL...');flush().then(refresh).catch(()=>{})}
    async function toggleTracking(){const b=card.querySelector('#e365LocStart');b.disabled=true;try{if(trackingOn()){await window.entrega365Location.stop();card.querySelector('#e365LocStatus').textContent='⚪ Rastreamento desativado.'}else{await window.entrega365Location.start();const p=localPoint();sessionLast=null;sessionMeters=0;if(p)renderLocal(p,'🟢 Rastreamento ativo — sincronizando localização...');await flush();await refresh()}}catch(e){card.querySelector('#e365LocStatus').textContent='🔴 Não foi possível ativar. Verifique a permissão de localização do navegador/Android.'}finally{b.disabled=false;updateControl()}}
    async function captureNow(){const b=card.querySelector('#e365LocCapture');b.disabled=true;card.querySelector('#e365LocStatus').textContent='🟡 Obtendo localização...';try{const p=await window.entrega365Location?.current?.();if(p)renderLocal(p,'🟠 Localização capturada; sincronizando PostgreSQL...');await flush();await refresh()}catch(e){card.querySelector('#e365LocStatus').textContent='🔴 Não foi possível obter a localização. Permita o acesso à localização e tente novamente.'}finally{b.disabled=false}}

    async function refresh(){try{await flush();const local=localPoint();const data=await load();window.__e365LocationData=data;latest=data.latest||local||null;if(local&&(!data.latest||Number(local.timestamp)>Number(data.latest.timestamp||0)))renderLocal(local,trackingOn()?'🟠 Rastreamento ativo; último ponto local aguardando confirmação...':'🟠 Último ponto local');else card.querySelector('#e365LocStatus').textContent=latest?'🟢 Último ponto recebido do PostgreSQL':'🟡 Nenhum ponto sincronizado ainda';card.querySelector('#e365Lat').textContent=latest?coord(latest.latitude):'—';card.querySelector('#e365Lng').textContent=latest?coord(latest.longitude):'—';card.querySelector('#e365Acc').textContent=latest&&latest.accuracy!=null?Math.round(latest.accuracy)+' m':'—';card.querySelector('#e365Time').textContent=latest?time(latest.timestamp):'—';renderMileage(data);card.querySelector('#e365LocList').innerHTML=(data.points||[]).slice(-15).reverse().map(p=>'<div><span>'+time(p.timestamp)+'</span><strong>'+coord(p.latitude)+', '+coord(p.longitude)+'</strong><small>±'+(p.accuracy==null?'—':Math.round(p.accuracy)+' m')+'</small></div>').join('')||'<em>Nenhum registro ainda.</em>'}catch(e){card.querySelector('#e365LocStatus').textContent='Não foi possível carregar os dados. Verifique a conexão e o login.'}}
    updateControl();const lp=localPoint();if(lp)renderLocal(lp,trackingOn()?'🟠 Rastreamento ativo; sincronizando...':'🟠 Último ponto local');refresh();
  }
  function install(){if(window.__e365LocationTrackingInstalled)return;window.__e365LocationTrackingInstalled=true;const s=document.createElement('style');s.textContent='.e365-location-panel{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:14px}.e365-location-card{width:min(700px,100%);max-height:94vh;overflow:auto;background:#1e1e1e;color:#fff;border:1px solid #3a3a3a;border-radius:20px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.5)}.e365-location-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;font-size:18px}.e365-location-head small{display:block;color:#999;font-size:11px;margin-top:4px}.e365-location-head button{border:0;background:#333;color:#fff;border-radius:10px;font-size:24px;width:40px;height:40px}.e365-location-status{margin:12px 0;padding:10px;border-radius:12px;background:#292929;font-size:12px}.e365-location-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.e365-location-grid div{background:#252525;border:1px solid #3a3a3a;border-radius:12px;padding:10px}.e365-location-grid span{display:block;color:#999;font-size:10px;text-transform:uppercase}.e365-location-grid b{display:block;margin-top:4px;font-size:13px}.e365-location-control{display:flex;gap:8px;margin:10px 0}.e365-location-control button{flex:1;padding:12px;border:0;border-radius:11px;background:#1769aa;color:#fff;font-weight:800}.e365-location-control button:nth-child(2){background:#3b3b3b}.e365-location-control button:disabled,.e365-location-actions button:disabled{opacity:.55}.e365-location-actions{display:flex;gap:8px;margin-top:10px}.e365-location-actions button{flex:1;padding:12px;border:1px solid #555;border-radius:11px;background:#292929;color:#fff;font-weight:800}.e365-location-history{margin-top:14px;border-top:1px solid #3a3a3a;padding-top:12px}.e365-location-history>div>div{display:grid;grid-template-columns:115px 1fr 60px;gap:8px;padding:8px 0;border-bottom:1px solid #303030;font-size:11px}.e365-location-history span{color:#aaa}.e365-location-history small{color:#999;text-align:right}@media(max-width:500px){.e365-location-control{flex-direction:column}.e365-location-actions{flex-direction:column}.e365-location-history>div>div{grid-template-columns:90px 1fr}.e365-location-history small{display:none}}';document.head.appendChild(s);window.e365OpenLocationTracking=open;window.e365LocationServer={queue,flush,open};window.addEventListener('online',flush);setInterval(flush,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();