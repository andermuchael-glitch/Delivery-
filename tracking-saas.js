/* Entrega365 Rastreamento SaaS: onboarding, equipe, cobrança e rotas. */
(() => {
  'use strict';
  const API = {
    establishment: './api/tracking-establishment',
    couriers: './api/tracking-couriers',
    accept: './api/tracking-courier-accept',
    checkout: './api/tracking-checkout',
    routes: './api/tracking-routes'
  };
  const $ = (s,root=document) => root.querySelector(s);
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let overlay=null, establishment=null, couriers=[], routes=[];
  async function request(path, options={}) {
    const user=window.e365GetCurrentUser?.()||window.entrega365Auth?.auth?.currentUser;
    if(!user?.getIdToken) throw new Error('Entre com sua conta Google no Entrega365 para continuar.');
    const token=await user.getIdToken();
    const response=await fetch(path,{...options,cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||friendly(data.error)||'Não foi possível concluir a operação.');
    return data;
  }
  function friendly(code) {
    return ({
      subscription_required:'Ative a assinatura mensal de R$ 19,90 para usar este recurso.',
      create_establishment_first:'Cadastre os dados do estabelecimento primeiro.',
      google_email_required:'Entre com uma conta Google que tenha e-mail verificado.',
      courier_not_accepted:'O motoboy ainda precisa aceitar o convite com o e-mail Google cadastrado.',
      courier_not_linked:'Este e-mail ainda não foi vinculado a um estabelecimento.',
      mercadopago_not_configured:'A cobrança ainda precisa ser configurada pelo suporte do Entrega365.',
      mercadopago_checkout_failed:'O Mercado Pago não conseguiu criar a assinatura agora.',
      courier_destination_required:'Informe o motoboy, o nome do destino e o endereço.'
    })[code]||code||'Erro inesperado.';
  }
  function styles() {
    if($('#e365-saas-style'))return;
    const s=document.createElement('style');s.id='e365-saas-style';
    s.textContent=`
    .e365-saas{position:fixed;inset:0;z-index:10040;overflow:auto;background:#0c1421;color:#f7fafc;font:14px/1.45 system-ui,sans-serif;padding:16px}
    .e365-saas *{box-sizing:border-box}.e365-saas-inner{max-width:920px;margin:0 auto}.e365-saas-head{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #2b3a4e;padding:4px 0 16px}
    .e365-saas h2{margin:0;font-size:21px}.e365-saas h3{margin:0 0 10px}.e365-saas p{color:#b5c2d4}.e365-saas-card{border:1px solid #2b3a4e;background:#121f31;border-radius:16px;padding:16px;margin:14px 0}
    .e365-saas-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.e365-saas label{display:block;color:#b5c2d4;font-size:12px;margin:10px 0 5px}.e365-saas input,.e365-saas textarea{width:100%;padding:12px;border:1px solid #35465d;border-radius:10px;background:#0b1523;color:white;font:inherit}.e365-saas textarea{min-height:70px}
    .e365-saas-btn{display:inline-flex;justify-content:center;align-items:center;gap:7px;border:1px solid #3b4c62;border-radius:10px;padding:10px 13px;background:#1b2a40;color:#fff;font-weight:800;cursor:pointer;text-decoration:none}.e365-saas-btn.primary{background:#ffd000;border-color:#ffd000;color:#171717}.e365-saas-btn:disabled{opacity:.45}
    .e365-saas-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.e365-saas-muted{color:#9aabc1;font-size:12px}.e365-saas-pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#26394d;color:#c9d9ec;font-size:11px}.e365-saas-pill.ok{background:#153b2b;color:#7df0b0}.e365-saas-list{display:grid;gap:8px}.e365-saas-item{border:1px solid #2b3a4e;border-radius:12px;padding:12px;background:#0f1a2a}.e365-saas-msg{padding:10px 12px;border-radius:10px;background:#302a16;color:#ffe18c;margin:10px 0}.e365-saas-msg.err{background:#3a1d24;color:#ffb5c0}.e365-saas-price{font-size:28px;font-weight:900;color:#7df0b0}.e365-saas-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.e365-saas-tab{border:1px solid #35465d;background:#121f31;color:#fff;border-radius:999px;padding:8px 12px;cursor:pointer}.e365-saas-tab.active{background:#ffd000;color:#171717;border-color:#ffd000}
    @media(max-width:620px){.e365-saas{padding:10px}.e365-saas-grid{grid-template-columns:1fr}.e365-saas h2{font-size:17px}}
    `;
    document.head.appendChild(s);
  }
  function statusText(s){return s==='authorized'?'Assinatura ativa':s==='inactive'?'Assinatura inativa':'Aguardando pagamento';}
  async function open() {
    if(overlay){overlay.remove();overlay=null;}
    styles();overlay=document.createElement('section');overlay.className='e365-saas';
    overlay.innerHTML='<div class="e365-saas-inner"><div class="e365-saas-head"><div><h2>📍 Gestão do Rastreamento</h2><div class="e365-saas-muted">Estabelecimento, motoboys, assinatura e rotas</div></div><button class="e365-saas-btn" id="e365-saas-close">Fechar ✕</button></div><div id="e365-saas-body"><div class="e365-saas-card">Carregando sua conta…</div></div></div>';
    document.body.appendChild(overlay);$('#e365-saas-close',overlay).onclick=()=>{overlay.remove();overlay=null;};
    try {
      const data=await request(API.establishment);
      establishment=data.establishment;
      const me=window.e365GetCurrentUser?.()||window.entrega365Auth?.auth?.currentUser;
      const isCourier=!establishment && !data.isSupport;
      if(isCourier) {
        $('#e365-saas-body').innerHTML='<div class="e365-saas-card"><h3>Convite de motoboy</h3><p>Se um estabelecimento cadastrou este e-mail Google, você pode confirmar o vínculo e autorizar a localização apenas durante o expediente.</p><button class="e365-saas-btn primary" id="e365-saas-accept">Verificar e aceitar convite</button><div id="e365-saas-msg" class="e365-saas-muted"></div></div>';
        $('#e365-saas-accept').onclick=async()=>{try{const r=await request(API.accept,{method:'POST',body:JSON.stringify({displayName:me?.displayName||''})});$('#e365-saas-msg').textContent=r.message||'Concluído.';}catch(e){$('#e365-saas-msg').textContent=e.message;}};
        return;
      }
      renderDashboard(data.isSupport);
    } catch(e) { $('#e365-saas-body').innerHTML='<div class="e365-saas-card"><div class="e365-saas-msg err">'+esc(e.message)+'</div><p>Entre com Google no Entrega365 e abra novamente esta área.</p></div>'; }
  }
  function renderDashboard(isSupport) {
    const active=establishment?.subscription_status==='authorized';
    $('#e365-saas-body').innerHTML=`
      <div class="e365-saas-card">
        <div class="e365-saas-row"><div><div class="e365-saas-muted">Plano mensal · motoboys ilimitados</div><div class="e365-saas-price">R$ 19,90 <span style="font-size:13px;color:#9aabc1">/mês</span></div></div><span class="e365-saas-pill ${active?'ok':''}">${esc(statusText(establishment?.subscription_status))}</span></div>
        <p>O acesso ao mapa e ao cadastro de motoboys é liberado após a confirmação da assinatura no Mercado Pago.</p>
        <button class="e365-saas-btn primary" id="e365-saas-pay" ${active?'disabled':''}>${active?'Assinatura já ativa':'Assinar por R$ 19,90/mês'}</button>
        <div class="e365-saas-muted" style="margin-top:8px">Se o pagamento não abrir, o suporte precisa concluir a configuração segura das credenciais do Mercado Pago.</div>
      </div>
      <div class="e365-saas-card">
        <h3>Dados do estabelecimento</h3>
        <div class="e365-saas-grid"><div><label>Nome do estabelecimento</label><input id="e365-saas-name" maxlength="120" value="${esc(establishment?.name||'')}" placeholder="Ex.: Pizzaria Central"></div><div><label>Telefone (opcional)</label><input id="e365-saas-phone" maxlength="40" value="${esc(establishment?.phone||'')}" placeholder="(47) 99999-9999"></div></div>
        <button class="e365-saas-btn primary" id="e365-saas-save">Salvar estabelecimento</button>
      </div>
      <div class="e365-saas-tabs"><button class="e365-saas-tab active" data-tab="couriers">Motoboys</button><button class="e365-saas-tab" data-tab="routes">Rotas</button><button class="e365-saas-tab" data-tab="map">Mapa ao vivo</button></div>
      <div id="e365-saas-panel"></div>
      <div id="e365-saas-msg" class="e365-saas-muted"></div>
      `;
    $('#e365-saas-save').onclick=async()=>{try{const r=await request(API.establishment,{method:'POST',body:JSON.stringify({name:$('#e365-saas-name').value,phone:$('#e365-saas-phone').value})});establishment=r.establishment;msg('Dados do estabelecimento salvos.');renderDashboard(isSupport);}catch(e){msg(e.message,true);}};
    $('#e365-saas-pay').onclick=async()=>{try{const r=await request(API.checkout,{method:'POST',body:'{}'});if(r.checkoutUrl)location.href=r.checkoutUrl;else if(r.alreadySubscribed)msg('Sua assinatura já está ativa.');}catch(e){msg(e.message,true);}};
    $('.e365-saas-tabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ $('.e365-saas-tabs').querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b)); if(b.dataset.tab==='couriers')renderCouriers();if(b.dataset.tab==='routes')renderRoutes();if(b.dataset.tab==='map')openMap();});
    renderCouriers();
  }
  function msg(text,error=false){const el=$('#e365-saas-msg');if(el){el.textContent=text;el.className='e365-saas-msg'+(error?' err':'');}}
  async function renderCouriers(){
    const panel=$('#e365-saas-panel');if(!panel)return;
    if(establishment?.subscription_status!=='authorized'){panel.innerHTML='<div class="e365-saas-card">Ative a assinatura para cadastrar motoboys.</div>';return;}
    panel.innerHTML='<div class="e365-saas-card">Carregando equipe…</div>';
    try{const data=await request(API.couriers);couriers=data.couriers||[];panel.innerHTML=`
      <div class="e365-saas-card"><h3>Cadastrar motoboy</h3><p>Informe o e-mail Google usado pelo entregador. Ele precisa entrar com essa conta e aceitar o vínculo.</p><div class="e365-saas-grid"><div><label>E-mail Google</label><input id="e365-courier-email" type="email" placeholder="motoboy@gmail.com"></div><div><label>Nome (opcional)</label><input id="e365-courier-name" placeholder="Nome do motoboy"></div></div><button class="e365-saas-btn primary" id="e365-courier-add">Cadastrar motoboy</button></div>
      <div class="e365-saas-card"><h3>Sua equipe <span class="e365-saas-pill">${couriers.length} cadastrados</span></h3><div class="e365-saas-list">${couriers.map(c=>'<div class="e365-saas-item"><div class="e365-saas-row"><div><b>'+esc(c.display_name||c.courier_email)+'</b><div class="e365-saas-muted">'+esc(c.courier_email)+'</div></div><span class="e365-saas-pill '+(c.status==='accepted'?'ok':'')+'">'+(c.status==='accepted'?'Vínculo confirmado':'Convite pendente')+'</span></div><div class="e365-saas-row" style="margin-top:8px"><button class="e365-saas-btn" data-remove="'+esc(c.courier_email)+'">Remover</button></div></div>').join('')||'<div class="e365-saas-muted">Nenhum motoboy cadastrado.</div>'}</div></div>`;
      $('#e365-courier-add').onclick=async()=>{try{await request(API.couriers,{method:'POST',body:JSON.stringify({email:$('#e365-courier-email').value,displayName:$('#e365-courier-name').value})});msg('Motoboy cadastrado. Peça para ele entrar com o e-mail Google e aceitar o vínculo.');renderCouriers();}catch(e){msg(e.message,true);}};
      panel.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Remover '+b.dataset.remove+' da equipe?'))return;try{await request(API.couriers,{method:'DELETE',body:JSON.stringify({email:b.dataset.remove})});renderCouriers();}catch(e){msg(e.message,true);}});
    }catch(e){panel.innerHTML='<div class="e365-saas-card">'+esc(e.message)+'</div>';}
  }
  async function renderRoutes(){
    const panel=$('#e365-saas-panel');if(!panel)return;
    if(establishment?.subscription_status!=='authorized'){panel.innerHTML='<div class="e365-saas-card">Ative a assinatura para enviar rotas.</div>';return;}
    try{const [c,r]=await Promise.all([request(API.couriers),request(API.routes)]);couriers=c.couriers||[];routes=r.routes||[];
      panel.innerHTML=`<div class="e365-saas-card"><h3>Enviar destino ao motoboy</h3><div class="e365-saas-grid"><div><label>Motoboy</label><select id="e365-route-courier" style="width:100%;padding:12px;border-radius:10px;background:#0b1523;color:white;border:1px solid #35465d">${couriers.filter(x=>x.status==='accepted').map(x=>'<option value="'+esc(x.courier_email)+'">'+esc(x.display_name||x.courier_email)+'</option>').join('')}</select></div><div><label>Nome do destino</label><input id="e365-route-label" placeholder="Ex.: Entrega pedido 1024"></div></div><label>Endereço completo</label><input id="e365-route-address" placeholder="Rua, número, bairro, cidade"><div class="e365-saas-grid"><div><label>Latitude (opcional)</label><input id="e365-route-lat" inputmode="decimal" placeholder="-26.3044"></div><div><label>Longitude (opcional)</label><input id="e365-route-lng" inputmode="decimal" placeholder="-48.8487"></div></div><label>Observações (opcional)</label><textarea id="e365-route-notes" placeholder="Referência, instruções para entrega…"></textarea><button class="e365-saas-btn primary" id="e365-route-send">Criar rota e abrir navegação</button></div>
      <div class="e365-saas-card"><h3>Rotas recentes</h3><div class="e365-saas-list">${routes.map(x=>'<div class="e365-saas-item"><b>'+esc(x.destination_label)+'</b><div class="e365-saas-muted">'+esc(x.courier_email)+' · '+esc(x.destination_address)+'</div><div class="e365-saas-row" style="margin-top:8px"><span class="e365-saas-pill">'+esc(x.status)+'</span><a class="e365-saas-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(x.latitude!=null&&x.longitude!=null?x.latitude+','+x.longitude:x.destination_address)+'&travelmode=driving">Abrir Google Maps ↗</a></div></div>').join('')||'<div class="e365-saas-muted">Nenhuma rota enviada ainda.</div>'}</div></div>`;
      $('#e365-route-send').onclick=async()=>{try{const data=await request(API.routes,{method:'POST',body:JSON.stringify({courierEmail:$('#e365-route-courier').value,destinationLabel:$('#e365-route-label').value,destinationAddress:$('#e365-route-address').value,latitude:$('#e365-route-lat').value,longitude:$('#e365-route-lng').value,notes:$('#e365-route-notes').value})});msg('Rota criada. O Google Maps abrirá para você; o envio de notificação direta ao telefone do motoboy é uma etapa adicional.');window.open(data.navigationUrl,'_blank','noopener');renderRoutes();}catch(e){msg(e.message,true);}};
    }catch(e){panel.innerHTML='<div class="e365-saas-card">'+esc(e.message)+'</div>';}
  }
  function openMap(){const panel=$('#e365-saas-panel');panel.innerHTML='<div class="e365-saas-card"><h3>Mapa ao vivo</h3><p>O mapa de acompanhamento usa a sessão de rastreamento existente do Entrega365. Feche esta janela e abra <b>Mais → Rastreamento GPS</b> para acompanhar as posições em tempo real.</p><button class="e365-saas-btn primary" id="e365-saas-map-open">Abrir mapa ao vivo</button></div>';$('#e365-saas-map-open').onclick=()=>{overlay?.remove();overlay=null;window.e365Tracking?.open?.();};}
  function patchMenu(){
    if(typeof window.openMore!=='function'||window.openMore.__e365SaasPatched)return;
    const original=window.openMore;
    const wrapped=function(...args){original.apply(this,args);const grid=$('.moregrid');if(grid&&!$('#e365-open-saas',grid)){const b=document.createElement('button');b.className='moreitem';b.id='e365-open-saas';b.innerHTML='<b>🏪</b><span>Gestão do Rastreamento</span><small>Estabelecimento, equipe e rotas</small>';b.onclick=()=>{$('.moremodal')?.remove();open();};grid.appendChild(b);}};
    wrapped.__e365SaasPatched=true;window.openMore=wrapped;
  }
  patchMenu();new MutationObserver(patchMenu).observe(document.documentElement,{childList:true,subtree:true});
  const params=new URLSearchParams(location.search);
  if(params.get('tracking')==='signup') {
    const tryOpen=()=>{if(window.e365GetCurrentUser?.()||window.entrega365Auth?.auth?.currentUser){open();return true;}return false;};
    let tries=0;const timer=setInterval(()=>{tries++;if(tryOpen()||tries>30)clearInterval(timer);},500);
  }
  window.e365TrackingSaas={open};
})();
