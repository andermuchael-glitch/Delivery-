/* Entrega365 PRO — assinatura Mercado Pago */
(function(){
  const PLAN_KEY='entrega365:plan';
  const SUB_KEY='entrega365:subscriptionId';
  const PRICE='R$ 9,90';
  const PAYMENT_LINK='https://mpago.la/2Zg7Yyc';
  const ADMIN_EMAIL='andermuchael@gmail.com';
  const getPlan=()=>isAdmin()?'active':(localStorage.getItem(PLAN_KEY)||'free');
  const setPlan=v=>{if(!isAdmin())localStorage.setItem(PLAN_KEY,v)};
  const getSub=()=>localStorage.getItem(SUB_KEY)||'';
  const setSub=v=>localStorage.setItem(SUB_KEY,v);
  function getUser(){
    const session=localStorage.getItem('dcv2:session')||'';
    const savedEmail=localStorage.getItem('entrega365:email')||'';
    const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());
    if(validEmail(savedEmail)) return savedEmail.trim();
    return session;
  }
  function email(){const u=getUser().trim();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)?u.toLowerCase():''}
  function isAdmin(){return email()===ADMIN_EMAIL}
  const css=()=>{if(document.getElementById('e365procss'))return;const s=document.createElement('style');s.id='e365procss';s.textContent=`
  .e365probtn{position:relative!important;color:#111!important;background:linear-gradient(135deg,#ffd000,#f2b800)!important;border-color:#ffd000!important;font-weight:900!important}
  .e365probadge{position:absolute;top:-6px;right:-4px;background:#111;color:#ffd000;border:1px solid #ffd000;border-radius:999px;padding:1px 5px;font-size:8px;font-weight:900}
  .e365prohero{background:linear-gradient(145deg,#292100,#1d1d1d 60%);border:1px solid rgba(255,208,0,.45);border-radius:20px;padding:22px;margin-bottom:14px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  .e365protitle{font-size:25px;font-weight:950;color:#fff}.e365proprice{font-size:30px;font-weight:950;color:#ffd000;margin:8px 0}.e365proprice span{font-size:13px;color:#aaa;font-weight:600}
  .e365protag{display:inline-block;padding:5px 9px;border-radius:999px;background:#ffd000;color:#111;font-size:10px;font-weight:950;margin-bottom:10px}
  .e365progrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.e365proitem{padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--panel)}.e365proitem b{display:block;margin-bottom:3px}.e365proitem span{font-size:11px;color:var(--muted)}
  .e365protable{width:100%;border-collapse:collapse;font-size:12px}.e365protable td{padding:10px 5px;border-bottom:1px solid var(--line)}.e365protable td:last-child{text-align:right;font-weight:900;color:#ffd000}
  .e365pronote{font-size:11px;color:var(--muted);line-height:1.45;margin-top:12px}.e365profree{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:15px;margin-bottom:14px}
  .e365prostatus{padding:10px 12px;border-radius:12px;background:rgba(255,208,0,.08);border:1px solid rgba(255,208,0,.25);font-size:12px;margin-top:10px}
  .e365prosecondary{width:100%;border:1px solid var(--line);background:var(--panel);color:#fff;border-radius:12px;padding:12px;font-weight:800;margin-top:8px}
  @media(max-width:390px){.e365progrid{grid-template-columns:1fr}.e365protitle{font-size:22px}}
  `;document.head.appendChild(s)};

  function statusText(){return getPlan()==='active'?'PRO ATIVO':'PLANO GRATUITO'}
  async function readJson(r){
    const raw=await r.text();let data=null;
    try{data=raw?JSON.parse(raw):null}catch(_){const ct=(r.headers.get('content-type')||'').toLowerCase();throw new Error(`O servidor não retornou JSON (HTTP ${r.status}${ct?`, ${ct}`:''}). Verifique se o domínio está apontando para a implantação atual.`)}
    return data||{};
  }

  function screen(){
    const active=getPlan();
    const mail=email();
    return `<div class="e365prohero">
      <div class="e365protag">ENTREGA365 PRO</div>
      <div class="e365protitle">Trabalhe mais. Controle melhor.</div>
      <div class="e365proprice">${PRICE} <span>/ mês</span></div>
      <div class="muted">Recursos profissionais para quem faz entregas todos os dias.</div>
      <div class="e365prostatus">Status: <b>${statusText()}</b>${mail?`<br><span class="small">Conta: ${esc(mail)}</span>`:'<br><span class="small">Para ativar automaticamente, use um login com e-mail.</span>'}</div>
      ${active==='active'?'<button class="primary" id="e365procheck">ATUALIZAR STATUS</button>':'<button class="primary" id="e365probuy">ASSINAR POR R$ 9,90</button>'}
      ${active!=='active'&&getSub()?'<button class="e365prosecondary" id="e365procheck">JÁ ASSINEI — VERIFICAR</button>':''}
      ${active!=='active'&&!getSub()?'<button class="e365prosecondary" id="e365prolegacy">PAGAR PELO LINK DO MERCADO PAGO</button>':''}
      <div class="e365pronote">A assinatura é recorrente. Para usuários comuns, o sistema consulta o status diretamente no Mercado Pago. A conta administradora de testes permanece PRO para permitir a validação dos recursos.</div>
    </div>
    <div class="card"><div class="title">⭐ O que entra no PRO</div><div class="e365progrid">
      <div class="e365proitem"><b>🏪 Vários estabelecimentos</b><span>Separe os dados de cada cliente ou empresa.</span></div>
      <div class="e365proitem"><b>☁️ Backup automático</b><span>Mais praticidade para proteger seus dados.</span></div>
      <div class="e365proitem"><b>📊 Relatórios avançados</b><span>Veja ganhos, entregas, gastos e histórico.</span></div>
      <div class="e365proitem"><b>📄 Exportações</b><span>PDF e planilhas para seus registros.</span></div>
      <div class="e365proitem"><b>🚫 Sem anúncios</b><span>Experiência limpa durante o trabalho.</span></div>
      <div class="e365proitem"><b>🔐 Recursos profissionais</b><span>Mais controle sobre seus dados e perfis.</span></div>
    </div></div>
    <div class="e365profree"><div class="title">🆓 Versão gratuita</div><table class="e365protable">
      <tr><td>Controle diário</td><td>✓</td></tr><tr><td>Gastos e mecânica</td><td>✓</td></tr><tr><td>Agenda e calculadora</td><td>✓</td></tr><tr><td>Backup no Google Drive</td><td>✓</td></tr><tr><td>Vários estabelecimentos</td><td>PRO</td></tr><tr><td>Relatórios avançados</td><td>PRO</td></tr><tr><td>Sem anúncios</td><td>PRO</td></tr>
    </table></div>`
  }

  async function startSubscription(){
    const mail=email();if(!mail){alert('Para assinar o PRO automaticamente, entre usando um e-mail válido como usuário.');return}
    const b=document.getElementById('e365probuy');if(b){b.disabled=true;b.textContent='ABRINDO MERCADO PAGO...'}
    try{const r=await fetch('/api/pro-checkout',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({email:mail}),cache:'no-store'});const d=await readJson(r);if(!r.ok||!d.init_point)throw new Error(d.message||`Não foi possível iniciar a assinatura (HTTP ${r.status}).`);if(d.subscription_id)setSub(d.subscription_id);location.href=d.init_point}catch(e){console.warn(e);alert(e.message||'Não foi possível iniciar a assinatura.');if(b){b.disabled=false;b.textContent='ASSINAR POR R$ 9,90'}}
  }

  async function fetchSubscriptionStatus(){
    const mail=email();if(!mail)return null;
    // Conta administradora: PRO de teste persistente, sem depender do Mercado Pago/localStorage.
    if(mail===ADMIN_EMAIL){setPlan('active');return {active:true,admin:true,email:mail}}
    const sub=getSub();
    const query=`/api/pro-status?email=${encodeURIComponent(mail)}${sub?`&subscription_id=${encodeURIComponent(sub)}`:''}`;
    const r=await fetch(query,{cache:'no-store',headers:{'Accept':'application/json'}});const d=await readJson(r);if(!r.ok)throw new Error(d.message||'Não foi possível consultar a assinatura.');if(d.subscription_id)setSub(d.subscription_id);setPlan(d.active?'active':'free');return d;
  }

  async function checkSubscription(showMessage=true){
    const mail=email();if(!mail){alert('Para verificar o PRO, entre usando um e-mail válido como usuário.');return}
    const b=document.getElementById('e365procheck');if(b){b.disabled=true;b.textContent='VERIFICANDO...'}
    try{const d=await fetchSubscriptionStatus();if(showMessage)alert(d?.active?'Assinatura PRO ativa.':'A assinatura ainda não está autorizada.');open()}catch(e){if(showMessage)alert(e.message||'Falha ao verificar assinatura.')}finally{if(b){b.disabled=false;b.textContent='ATUALIZAR STATUS'}}
  }

  function bind(){document.getElementById('e365probuy')?.addEventListener('click',startSubscription);document.getElementById('e365procheck')?.addEventListener('click',()=>checkSubscription(true));document.getElementById('e365prolegacy')?.addEventListener('click',()=>window.open(PAYMENT_LINK,'_blank','noopener,noreferrer'))}
  function open(){css();if(typeof window.shell==='function'){window.shell(screen());bind()}else setTimeout(open,100)}
  async function install(){css();const actions=document.querySelector('.actions');if(actions&&!actions.querySelector('.e365probtn')){const b=document.createElement('button');b.className='ico e365probtn';b.title='Entrega365 PRO';b.innerHTML='PRO<span class="e365probadge">+</span>';b.onclick=open;actions.prepend(b)}const tabs=document.querySelector('.tabs');if(tabs&&!tabs.querySelector('[data-pro]')){const b=document.createElement('button');b.className='tab';b.dataset.pro='1';b.innerHTML='<b>⭐</b>PRO';b.onclick=open;tabs.appendChild(b)}
    if(location.search.includes('pro=return') && email()){try{await fetchSubscriptionStatus();history.replaceState({},document.title,location.pathname)}catch(e){console.warn('PRO return status check failed',e)}}
    // Reforça o estado do administrador após carregamento/atualização da página.
    if(isAdmin() && localStorage.getItem(PLAN_KEY)!=='active') localStorage.setItem(PLAN_KEY,'active');
  }
  window.e365Pro=open;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,150));else setTimeout(install,150);
  setInterval(install,3000);
})();
