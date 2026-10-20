/* Entrega365 — módulo de rastreamento GPS. */
(() => {
  'use strict';
  const ADMIN_FALLBACK = 'entrega365.suporte@gmail.com';
  const API = {
    me: './api/location-me',
    session: './api/location-session',
    update: './api/location-update',
    latest: './api/location-latest'
  };
  let map = null, markers = new Map(), refreshTimer = null, watchId = null;
  let trackingUser = null, trackingActive = false, isAdmin = false, leafletPromise = null;
  const $ = (s, root=document) => root.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const emailIsAdmin = email => String(email || '').toLowerCase() === ADMIN_FALLBACK;

  async function getUser() {
    const user = window.e365GetCurrentUser?.() || window.entrega365Auth?.auth?.currentUser;
    if (!user?.getIdToken) throw new Error('Entre no Entrega365 para usar o rastreamento.');
    trackingUser = user;
    return user;
  }
  async function request(path, options={}) {
    const user = await getUser();
    const token = await user.getIdToken();
    const response = await fetch(path, {
      ...options,
      cache: 'no-store',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error === 'admin_only' ? 'Acesso restrito ao administrador do estabelecimento.' : (data.error || 'Falha ao comunicar com o servidor.'));
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      if (!$('#e365-leaflet-css')) {
        const css = document.createElement('link');
        css.id='e365-leaflet-css'; css.rel='stylesheet';
        css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
      }
      let script = $('#e365-leaflet-js');
      if (!script) {
        script = document.createElement('script'); script.id='e365-leaflet-js';
        script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);
      }
      script.addEventListener('load', () => window.L ? resolve(window.L) : reject(new Error('Mapa indisponível.')));
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar o mapa. Verifique a conexão.')));
      if (window.L) resolve(window.L);
    });
    return leafletPromise;
  }
  function addStyles() {
    if ($('#e365-tracking-style')) return;
    const style = document.createElement('style');
    style.id='e365-tracking-style';
    style.textContent = `
      .e365-track-overlay{position:fixed;inset:0;z-index:10020;background:#101010;color:#f7f7f7;display:flex;flex-direction:column;font:14px/1.45 system-ui,-apple-system,sans-serif}
      .e365-track-head{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #343434;background:#171717}
      .e365-track-head h2{margin:0;font-size:18px}.e365-track-head small{display:block;color:#aaa;font-size:11px}
      .e365-track-close,.e365-track-btn{border:1px solid #444;border-radius:11px;padding:10px 13px;background:#242424;color:#fff;font-weight:800;cursor:pointer}
      .e365-track-btn.primary{background:#ffd000;color:#141414;border-color:#ffd000}.e365-track-btn.stop{background:#421d1d;border-color:#743232;color:#ffb5b5}
      .e365-track-body{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:0;flex:1;min-height:0}
      .e365-track-side{overflow:auto;padding:14px;border-right:1px solid #343434;background:#171717}
      .e365-track-map{min-height:280px;height:100%;background:#242424}
      .e365-track-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
      .e365-track-stat div{padding:11px;border:1px solid #363636;border-radius:12px;background:#222}
      .e365-track-stat b{display:block;font-size:20px;color:#ffd000}.e365-track-stat small{color:#aaa;font-size:10px}
      .e365-track-person{padding:12px;border:1px solid #363636;border-radius:13px;margin:8px 0;background:#202020}
      .e365-track-person-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.e365-track-person b{font-size:13px;overflow-wrap:anywhere}
      .e365-track-badge{font-size:10px;border-radius:999px;padding:4px 7px;background:#1b3b28;color:#81ef9d;white-space:nowrap}
      .e365-track-badge.stale{background:#493b1b;color:#ffe08a}.e365-track-meta{color:#aaa;font-size:11px;margin-top:6px}
      .e365-track-empty{padding:22px 10px;text-align:center;color:#aaa;border:1px dashed #444;border-radius:12px}
      .e365-track-note{padding:12px;border-radius:12px;background:#292719;border:1px solid #51451c;color:#f1dfa1;font-size:12px;margin:12px 0}
      .e365-track-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .e365-track-status{font-size:12px;color:#aaa;margin:10px 0}.e365-track-status.ok{color:#81ef9d}.e365-track-status.err{color:#ff9b9b}
      .e365-track-footer{padding:10px 14px;border-top:1px solid #343434;color:#aaa;font-size:10px;background:#151515}
      @media(max-width:760px){.e365-track-body{display:flex;flex-direction:column-reverse}.e365-track-map{height:43vh;min-height:260px;flex:none}.e365-track-side{border-right:0;border-top:1px solid #343434;max-height:48vh}.e365-track-head{padding:11px}.e365-track-head h2{font-size:15px}}
    `;
    document.head.appendChild(style);
  }
  function setStatus(message, type='') {
    const el = $('#e365-track-status');
    if (el) { el.textContent = message; el.className = 'e365-track-status '+type; }
  }
  function cleanup() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (map) { map.remove(); map = null; }
    markers.clear();
    $('.e365-track-overlay')?.remove();
  }
  function closeTracking() {
    cleanup();
    window.e365TrackingOpen = false;
  }
  async function openTracking() {
    if (window.e365TrackingOpen) return;
    window.e365TrackingOpen = true;
    addStyles();
    const root = document.createElement('section');
    root.className='e365-track-overlay';
    root.innerHTML = `
      <div class="e365-track-head">
        <div><h2>📍 Entrega365 · Rastreamento</h2><small>Localização compartilhada somente durante o expediente</small></div>
        <button class="e365-track-close" id="e365-track-close" aria-label="Fechar">✕</button>
      </div>
      <div class="e365-track-body">
        <aside class="e365-track-side" id="e365-track-side">
          <div class="e365-track-stat"><div><b id="e365-track-count">—</b><small>Motoboys ativos</small></div><div><b id="e365-track-online">—</b><small>Conectados</small></div><div><b id="e365-track-stale">—</b><small>Sem sinal recente</small></div></div>
          <div id="e365-track-content"><div class="e365-track-empty">Verificando acesso…</div></div>
          <div id="e365-track-status" class="e365-track-status">Conectando ao Entrega365…</div>
        </aside>
        <div class="e365-track-map" id="e365-track-map" aria-label="Mapa de localização dos motoboys"></div>
      </div>
      <div class="e365-track-footer">O mapa pode apresentar atraso por GPS, internet ou restrições de bateria. Uma posição antiga nunca é apresentada como localização atual.</div>
    `;
    document.body.appendChild(root);
    $('#e365-track-close',root).onclick=closeTracking;
    try {
      const me = await request(API.me);
      isAdmin = Boolean(me.isAdmin);
      trackingActive = Boolean(me.courier?.active);
      if (isAdmin) {
        $('#e365-track-content',root).innerHTML='<div class="e365-track-empty">Carregando motoboys ativos…</div>';
        await loadLeaflet();
        map = window.L.map('e365-track-map').setView([-27.59,-48.55], 11);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
        }).addTo(map);
        setTimeout(()=>map?.invalidateSize(),100);
        await refreshCouriers();
        refreshTimer = setInterval(refreshCouriers,10000);
      } else {
        renderCourierControls(me.courier);
      }
    } catch (error) {
      $('#e365-track-content',root).innerHTML='<div class="e365-track-empty">'+esc(error.message)+'</div>';
      setStatus('Não foi possível iniciar o rastreamento.', 'err');
    }
  }
  function renderCourierControls(courier) {
    const active = Boolean(courier?.active);
    $('#e365-track-count').textContent=active?'1':'0';
    $('#e365-track-online').textContent=active?'1':'0';
    $('#e365-track-stale').textContent='—';
    $('#e365-track-content').innerHTML=`
      <div class="e365-track-person">
        <div class="e365-track-person-top"><b>Seu expediente</b><span class="e365-track-badge ${active?'':'stale'}">${active?'ATIVO':'ENCERRADO'}</span></div>
        <div class="e365-track-meta">${active?'Sua localização está sendo compartilhada com o estabelecimento.':'Inicie o expediente para liberar a localização no painel.'}</div>
        <div class="e365-track-actions">
          <button class="e365-track-btn primary" id="e365-track-start" ${active?'disabled':''}>▶ Iniciar expediente</button>
          <button class="e365-track-btn stop" id="e365-track-stop" ${active?'':'disabled'}>■ Encerrar expediente</button>
        </div>
      </div>
      <div class="e365-track-note">No Android, mantenha a permissão de localização como “Permitir o tempo todo” quando solicitada e não restrinja a bateria do Entrega365. O app exibirá uma notificação enquanto o GPS estiver ativo.</div>
      <div class="e365-track-meta">Conta: ${esc(trackingUser?.email || '')}</div>
    `;
    $('#e365-track-start').onclick=startShift;
    $('#e365-track-stop').onclick=stopShift;
    setStatus(active?'Expediente ativo. Verificando serviço de localização…':'Aguardando início do expediente.');
  }
  async function startShift() {
    try {
      const user = await getUser();
      const displayName = user.displayName || user.email || 'Motoboy';
      await request(API.session,{method:'POST',body:JSON.stringify({action:'start',displayName})});
      const plugin = window.Capacitor?.Plugins?.Entrega365Location;
      if (window.Capacitor?.isNativePlatform?.() && plugin?.startTracking) {
        await plugin.startTracking({
          endpoint: new URL(API.update,location.href).href,
          idToken: await user.getIdToken(true),
          refreshToken: user.refreshToken || '',
          apiKey: 'AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU',
          displayName
        });
        trackingActive=true;
        renderCourierControls({active:true});
        setStatus('GPS em segundo plano ativo. A notificação do Android deve permanecer visível.','ok');
      } else {
        if (!navigator.geolocation) throw new Error('Este dispositivo não disponibiliza GPS pelo navegador.');
        trackingActive=true;
        renderCourierControls({active:true});
        setStatus('Rastreamento pelo navegador ativo. Para funcionar com a tela apagada, use o APK atualizado.','err');
        watchId = navigator.geolocation.watchPosition(async pos => {
          try {
            await request(API.update,{method:'POST',body:JSON.stringify({
              latitude:pos.coords.latitude,longitude:pos.coords.longitude,
              accuracy:pos.coords.accuracy,altitude:pos.coords.altitude,
              speed:pos.coords.speed,heading:pos.coords.heading
            })});
            setStatus('Localização enviada às '+new Date().toLocaleTimeString('pt-BR'), 'ok');
          } catch(e) { setStatus('GPS obtido, mas não foi enviado: '+e.message,'err'); }
        }, e => setStatus('Falha no GPS: '+e.message,'err'), {enableHighAccuracy:true,maximumAge:5000,timeout:20000});
      }
    } catch (error) {
      setStatus(error.message || 'Não foi possível iniciar o expediente.','err');
    }
  }
  async function stopShift() {
    try {
      const plugin = window.Capacitor?.Plugins?.Entrega365Location;
      if (plugin?.stopTracking) await plugin.stopTracking();
      if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
      watchId=null;
      await request(API.session,{method:'POST',body:JSON.stringify({action:'stop'})});
      trackingActive=false;
      renderCourierControls({active:false});
      setStatus('Expediente encerrado. A localização deixou de ser compartilhada.','ok');
    } catch (error) { setStatus(error.message || 'Não foi possível encerrar o expediente.','err'); }
  }
  function timeAgo(value) {
    if (!value) return 'Sem localização recebida';
    const seconds=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/1000));
    if (seconds<60) return 'Atualizado há '+seconds+' s';
    return 'Atualizado há '+Math.floor(seconds/60)+' min';
  }
  async function refreshCouriers() {
    try {
      const data=await request(API.latest);
      const list=data.couriers||[];
      $('#e365-track-count').textContent=list.length;
      $('#e365-track-online').textContent=list.filter(c=>c.connection_status==='online').length;
      $('#e365-track-stale').textContent=list.filter(c=>c.connection_status!=='online').length;
      const content=$('#e365-track-content');
      if (!list.length) content.innerHTML='<div class="e365-track-empty">Nenhum motoboy iniciou o expediente ainda. Quando um entregador iniciar, aparecerá aqui.</div>';
      else content.innerHTML=list.map(c=>`
        <div class="e365-track-person">
          <div class="e365-track-person-top"><b>${esc(c.display_name||c.email||'Motoboy')}</b><span class="e365-track-badge ${c.connection_status==='online'?'':'stale'}">${c.connection_status==='online'?'AO VIVO':'SEM SINAL'}</span></div>
          <div class="e365-track-meta">${esc(c.email||'')} · ${esc(timeAgo(c.last_seen))}</div>
          <div class="e365-track-meta">${c.latitude!=null&&c.longitude!=null?'Precisão GPS: '+(c.accuracy?Math.round(c.accuracy)+' m':'não informada'):'Aguardando primeira posição'}</div>
          ${c.latitude!=null&&c.longitude!=null?'<div class="e365-track-actions"><button class="e365-track-btn" data-center="'+esc(c.uid)+'">⌖ Ver no mapa</button><a class="e365-track-btn" target="_blank" rel="noopener" href="https://www.google.com/maps?q='+encodeURIComponent(c.latitude+','+c.longitude)+'">Abrir Maps</a></div>':''}
        </div>`).join('');
      content.querySelectorAll('[data-center]').forEach(button=>button.onclick=()=>{
        const c=list.find(x=>x.uid===button.dataset.center);
        if(c?.latitude!=null&&c?.longitude!=null&&map)map.setView([Number(c.latitude),Number(c.longitude)],16);
      });
      const valid=list.filter(c=>Number.isFinite(Number(c.latitude))&&Number.isFinite(Number(c.longitude)));
      valid.forEach(c=>{
        const key=c.uid, lat=Number(c.latitude),lng=Number(c.longitude);
        let marker=markers.get(key);
        const color=c.connection_status==='online'?'#20c86a':'#f0b429';
        const icon=window.L.divIcon({className:'',html:'<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:'+color+';border:3px solid white;box-shadow:0 2px 8px #0008;display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:15px">🏍️</span></div>',iconSize:[30,30],iconAnchor:[15,30]});
        if(!marker){marker=window.L.marker([lat,lng],{icon}).addTo(map);markers.set(key,marker);}
        else {marker.setLatLng([lat,lng]);marker.setIcon(icon);}
        marker.bindPopup('<b>'+esc(c.display_name||c.email||'Motoboy')+'</b><br>'+esc(timeAgo(c.last_seen)));
      });
      for (const [key,marker] of markers) if(!list.some(c=>c.uid===key&&c.latitude!=null&&c.longitude!=null)){map.removeLayer(marker);markers.delete(key);}
      if(valid.length && !map.__e365Fitted){map.fitBounds(window.L.latLngBounds(valid.map(c=>[Number(c.latitude),Number(c.longitude)])),{padding:[35,35],maxZoom:15});map.__e365Fitted=true;}
      setStatus('Atualização automática a cada 10 segundos · '+new Date().toLocaleTimeString('pt-BR'),'ok');
    } catch(error) { setStatus('Falha ao atualizar o mapa: '+error.message,'err'); }
  }
  // Acrescenta o módulo ao menu existente sem alterar a tela principal ou as comandas.
  function patchMoreMenu() {
    if (typeof window.openMore !== 'function' || window.openMore.__e365TrackingPatched) return;
    const original=window.openMore;
    const wrapped=function(...args) {
      original.apply(this,args);
      const grid=$('.moregrid');
      if(grid&&!$('#e365-open-tracking',grid)) {
        const button=document.createElement('button');
        button.className='moreitem';button.id='e365-open-tracking';
        button.innerHTML='<b>📍</b><span>Rastreamento GPS</span><small>Mapa dos motoboys</small>';
        button.onclick=()=>{$('.moremodal')?.remove();openTracking();};
        grid.appendChild(button);
      }
    };
    wrapped.__e365TrackingPatched=true;
    window.openMore=wrapped;
  }
  patchMoreMenu();
  const patchObserver=new MutationObserver(()=>patchMoreMenu());
  patchObserver.observe(document.documentElement,{childList:true,subtree:true});
  window.e365Tracking={open:openTracking,close:closeTracking};
})();