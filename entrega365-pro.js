/* Entrega365 PRO — painel e assinatura */
(function(){
  const PLAN_KEY='entrega365:plan',SUB_KEY='entrega365:subscriptionId',SYNC_KEY='entrega365:proSyncedAt';
  const PRICE='R$ 9,90',PAYMENT_LINK='https://mpago.la/2Zg7Yyc';
  const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  function email(){const a=(localStorage.getItem('entrega365:email')||'').trim().toLowerCase();return valid(a)?a:''}
  function getPlan(){return localStorage.getItem(PLAN_KEY)||'free'}
  function setPlan(v){localStorage.setItem(PLAN_KEY,v)}
  function sub(){return localStorage.getItem(SUB_KEY)||''}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function css(){if(document.getElementById('e365procss'))return;const s=document.createElement('style');s.id='e365procss';s.textContent=`.e365probtn{position:relative!important;color:#111!important;background:linear-gradient(135deg,#ffd000,#f2b800)!important;border-color:#ffd000!important;font-weight:900!important}.e365probadge{position:absolute;top:-6px;right:-4px;background:#111;color:#ffd000;border:1px solid #ffd000;border-radius:999px;padding:1px 5px;font-size:8px;font-weight:900}.e365prohero{background:linear-gradient(145deg,#292100,#1d1d1d 60%);border:1px solid rgba(255,208,0,.45);border-radius:20px;padding:20px;margin-bottom:14px;box-shadow:0 10px 30px rgba(0,0,0,.35)}.e365protitle{font-size:24px;font-weight:950;color:#fff}.e365proprice{font-size:29px;font-weight:950;color:#ffd000;margin:7px 0}.e365proprice span{font-size:13px;color:#aaa;font-weight:600}.e365protag{display:inline-block;padding:5px 9px;border-radius:999px;background:#ffd000;color:#111;font-size:10px;font-weight:950;margin-bottom:10px}.e365prostatus{padding:10px 12px;border-radius:12px;background:rgba(255,208,0,.08);border:1px solid rgba(255,208,0,.25);font-size:12px;margin-top:10px}.e365proactions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.e365proactions button{padding:13px;border-radius:12px;font-weight:900}.e365proprimary{background:#ffd000;color:#111}.e365prosecondary{border:1px solid #444;background:#222;color:#fff}.e365profeatures{display:grid;grid-template-columns:1fr 1fr;gap:10px}.e365profeature{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel);cursor:pointer}.e365profeature b{display:block;margin-bottom:4px}.e365profeature span{font-size:11px;color:var(--muted)}.e365pronote{font-size:11px;color:var(--muted);line-height:1.45;margin-top:12px}.e365profree{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:15px;margin-bottom:14px}.e365protable{width:100%;border-collapse:collapse;font-size:12px}.e365protable td{padding:9px 5px;border-bottom:1px solid var(--line)}.e365protable td:last-child{text-align:right;font-weight:900;color:#ffd000}.e365reportfilters{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.e365reportfilters select{padding:12px;border-radius:12px;background:#202020;color:#fff;border:1px solid #555;font-weight:800}.e365reportgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.e365reportstat{padding:14px;border-radius:15px;border:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;gap:7px}.e365reportstat span{font-size:11px;color:var(--muted);font-weight:800}.e365reportstat b{font-size:20px}.e365reportcols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.e365chart{margin-top:12px;display:flex;flex-direction:column;gap:9px}.e365barrow{display:grid;grid-template-columns:42px 1fr 86px;gap:7px;align-items:center;font-size:10px}.e365barlabel{color:var(--muted);font-weight:800}.e365bars{display:flex;flex-direction:column;gap:3px}.e365bars i{display:block;height:7px;border-radius:99px}.e365bars .earn{background:#4cd964}.e365bars .expense{background:#ff453a}.e365bars .profit{background:#64b5f6}.e365barrow small{text-align:right;color:var(--muted);font-size:9px}.e365legend{display:flex;gap:12px;font-size:10px;color:var(--muted);margin-top:12px}.e365monthchart{display:flex;flex-direction:column;gap:12px;margin-top:14px}.e365monthrow{display:grid;grid-template-columns:62px 1fr 100px;gap:9px;align-items:center;font-size:11px}.e365monthrow small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.e365monthbars{display:flex;flex-direction:column;gap:4px}.e365monthbars i{display:block;height:9px;border-radius:99px}.e365monthbars .earn{background:#4cd964}.e365monthbars .profit{background:#64b5f6}.e365rank{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid var(--line);font-size:13px}.e365rank:last-child{border-bottom:0}.e365medal{font-size:18px}@media(max-width:390px){.e365profeatures,.e365proactions,.e365reportcols{grid-template-columns:1fr}.e365reportfilters{grid-template-columns:1fr}.e365protitle{font-size:22px}}`;document.head.appendChild(s)}
  function panel(){const active=getPlan()==='active',mail=email();return `<div class="e365prohero"><div class="e365protag">ENTREGA365 PRO</div><div class="e365protitle">Seu painel profissional</div><div class="e365proprice">${PRICE} <span>/ mês</span></div><div class="muted">Mais controle para trabalhar com vários clientes e estabelecimentos.</div><div class="e365prostatus">Status: <b>${active?'PRO ATIVO':'PLANO GRATUITO'}</b>${mail?`<br><span class="small">Conta: ${esc(mail)}</span>`:''}</div>${active?`<div class="e365proactions"><button class="e365proprimary" id="e365procheck">ATUALIZAR STATUS</button><button class="e365prosecondary" id="e365proclose">VOLTAR</button></div>`:`<div class="e365proactions"><button class="e365proprimary" id="e365probuy">ASSINAR POR R$ 9,90</button><button class="e365prosecondary" id="e365prolegacy">PAGAR PELO MERCADO PAGO</button></div>`}</div><div class="card"><div class="title">⭐ Recursos PRO</div><div class="e365profeatures"><button class="e365profeature" id="e365estopen"><b>🏪 Vários estabelecimentos</b><span>Crie e alterne entre empresas e clientes.</span></button><button class="e365profeature" id="e365report"><b>📊 Relatórios avançados</b><span>Resumo de entregas, ganhos e despesas.</span></button><button class="e365profeature" id="e365export"><b>📄 Exportar dados</b><span>Exporte seus registros para guardar.</span></button><button class="e365profeature" id="e365backup"><b>☁️ Backup</b><span>Proteja seus dados no Google Drive.</span></button><button class="e365profeature" id="e365ads"><b>🚫 Sem anúncios</b><span>Experiência PRO limpa.</span></button><button class="e365profeature" id="e365security"><b>🔐 Conta PRO</b><span>Recursos profissionais habilitados.</span></button></div></div><div class="e365profree"><div class="title">🆓 Comparação</div><table class="e365protable"><tr><td>Controle diário</td><td>✓</td></tr><tr><td>Gastos e mecânica</td><td>✓</td></tr><tr><td>Agenda e calculadora</td><td>✓</td></tr><tr><td>Vários estabelecimentos</td><td>${active?'✓ PRO':'PRO'}</td></tr><tr><td>Relatórios avançados</td><td>${active?'✓ PRO':'PRO'}</td></tr><tr><td>Exportações</td><td>${active?'✓ PRO':'PRO'}</td></tr><tr><td>Sem anúncios</td><td>${active?'✓ PRO':'PRO'}</td></tr></table></div>`}
  function fallback(){let m=document.getElementById('e365profallback');if(m)m.remove();m=document.createElement('div');m.id='e365profallback';m.style.cssText='position:fixed;inset:0;z-index:99999;overflow:auto;background:#121212;padding:18px 12px 100px';m.innerHTML='<main style="max-width:600px;margin:auto"><button id="e365proback" style="padding:10px 14px;border:1px solid #444;border-radius:10px;background:#222;color:#fff;font-weight:800;margin-bottom:12px">← Voltar</button>'+panel()+'</main>';document.body.appendChild(m);bind(m);m.querySelector('#e365proback').onclick=()=>m.remove()}
  async function readJson(r){const raw=await r.text();try{return raw?JSON.parse(raw):{}}catch{throw new Error('Servidor não retornou JSON (HTTP '+r.status+').')}}
  async function status(){const mail=email();if(!mail)throw new Error('Entre usando sua conta Google para verificar o PRO.');const r=await fetch('/api/pro-status?email='+encodeURIComponent(mail)+(sub()?'&subscription_id='+encodeURIComponent(sub()):''),{cache:'no-store',headers:{Accept:'application/json'}}),d=await readJson(r);if(!r.ok)throw new Error(d.message||d.error||'Não foi possível consultar a assinatura.');if(d.subscription_id)localStorage.setItem(SUB_KEY,String(d.subscription_id));setPlan(d.active?'active':'free');localStorage.setItem(SYNC_KEY,String(Date.now()));return d}
  async function buy(){const mail=email();if(!mail)return alert('Entre usando sua conta Google antes de assinar.');try{const r=await fetch('/api/pro-checkout',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({email:mail}),cache:'no-store'}),d=await readJson(r);if(!r.ok||!d.init_point)throw new Error(d.message||'Não foi possível iniciar a assinatura.');if(d.subscription_id)localStorage.setItem(SUB_KEY,String(d.subscription_id));location.href=d.init_point}catch(e){alert(e.message)}}
  function report(){
    const uid=localStorage.getItem('dcv2:session')||'';
    const ests=(()=>{try{return JSON.parse(localStorage.getItem('entrega365:establishments:'+uid)||'[]')}catch{return[]}})();
    const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    const brl=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
    function collect(days,est){
      const out={days:0,entries:0,earn:0,expenses:0,km:0,cats:{},daily:[],byEst:{}}, from=new Date();from.setHours(0,0,0,0);from.setDate(from.getDate()-days+1);
      const prefix='dcv2:'+uid+':';
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';if(!key.startsWith(prefix))continue;
        let rest=key.slice(prefix.length),eid='principal',kind='',date='';
        let m=rest.match(/^est:([^:]+):(day|exp):(\d{4}-\d{2}-\d{2})$/);
        if(m){eid=m[1];kind=m[2];date=m[3]}else{m=rest.match(/^(day|exp):(\d{4}-\d{2}-\d{2})$/);if(!m)continue;kind=m[1];date=m[2]}
        if(est!=='all'&&eid!==est)continue;
        const dt=new Date(date+'T12:00:00');if(dt<from)continue;
        const d=read(key)||{};
        out.byEst[eid]=out.byEst[eid]||{earn:0,entries:0,expenses:0,km:0};
        const row=out.daily.find(x=>x.date===date)||(()=>{const x={date,earn:0,expenses:0,entries:0,km:0};out.daily.push(x);return x})();
        if(kind==='day'){
          out.days++;const es=Array.isArray(d.entries)?d.entries:[];
          const earn=es.reduce((s,e)=>s+(Number(e.taxa)||0),0)+(Number(d.arrancada)||0);
          const km=Math.max(0,(Number(d.kmFinal)||0)-(Number(d.kmInicial)||0));
          out.entries+=es.length;out.earn+=earn;out.km+=km;row.earn+=earn;row.entries+=es.length;row.km+=km;out.byEst[eid].earn+=earn;out.byEst[eid].entries+=es.length;out.byEst[eid].km+=km;
        }else{
          const items=Array.isArray(d.items)?d.items:[];items.forEach(e=>{const v=Number(e.val??e.valor)||0,c=e.cat||e.categoria||'outros';out.expenses+=v;row.expenses+=v;out.cats[c]=(out.cats[c]||0)+v;out.byEst[eid].expenses+=v});
        }
      }
      out.daily.sort((a,b)=>a.date.localeCompare(b.date));return out;
    }
    function render(){
      const root=document.getElementById('e365proreport');if(!root)return;
      const days=Number(root.querySelector('[data-range]').value),est=root.querySelector('[data-est]').value,d=collect(days,est),profit=d.earn-d.expenses,avgEntry=d.entries?d.earn/d.entries:0,costKm=d.km?d.expenses/d.km:0,profitKm=d.km?profit/d.km:0;
      const best=[...d.daily].sort((a,b)=>(b.earn-b.expenses)-(a.earn-a.expenses))[0],max=Math.max(1,...d.daily.map(x=>Math.max(x.earn,x.expenses)));
      const catLabel={combustivel:'⛽ Combustível',manutencao:'🔧 Manutenção',alimentacao:'🍔 Alimentação',outros:'📦 Outros'};
      root.innerHTML='<div class="e365prohero"><div class="e365protag">RELATÓRIOS AVANÇADOS</div><div class="e365protitle">📊 Dashboard PRO</div><div class="muted">Análise financeira, produtividade, quilometragem e custos.</div><div class="e365reportfilters"><select data-range><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option></select><select data-est><option value="all">Todos os estabelecimentos</option><option value="principal">Principal</option>'+ests.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select></div></div>'+
      '<div class="e365reportgrid">'+[
        ['💰 Ganhos',brl(d.earn),'green'],['📉 Gastos',brl(d.expenses),'red'],['💵 Lucro líquido',brl(profit),profit>=0?'green':'red'],
        ['📦 Entregas',d.entries,'blue'],['🛵 KM rodados',d.km.toLocaleString('pt-BR')+' km','blue'],['🎯 Ganho/entrega',brl(avgEntry),'yellow'],
        ['⛽ Custo/KM',brl(costKm),'red'],['📈 Lucro/KM',brl(profitKm),profitKm>=0?'green':'red']
      ].map(x=>'<div class="e365reportstat"><span>'+x[0]+'</span><b class="'+x[2]+'">'+x[1]+'</b></div>').join('')+'</div>'+
      '<div class="card"><div class="title">📈 Ganhos × Gastos × Lucro</div><div class="e365chart">'+(d.daily.length?d.daily.map(x=>{const p=x.earn-x.expenses;return '<div class="e365barrow"><div class="e365barlabel">'+x.date.slice(5).split('-').reverse().join('/')+'</div><div class="e365bars"><i class="earn" style="width:'+Math.max(2,x.earn/max*100)+'%"></i><i class="expense" style="width:'+Math.max(2,x.expenses/max*100)+'%"></i><i class="profit" style="width:'+Math.max(2,Math.max(0,p)/max*100)+'%"></i></div><small>'+brl(p)+'</small></div>'}).join(''):'<div class="empty">Ainda não há dados neste período.</div>')+'</div><div class="e365legend"><span>🟩 Ganhos</span><span>🟥 Gastos</span><span>🟦 Lucro</span></div></div>'+
      '<div class="e365reportcols"><div class="card"><div class="title">💸 Gastos por categoria</div>'+Object.keys(d.cats).length?Object.entries(d.cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="sum"><span>'+catLabel[k]||k+'</span><b class="red">'+brl(v)+'</b></div>').join(''):'<div class="empty">Nenhum gasto registrado.</div>'+'</div>'+
      '<div class="card"><div class="title">🏆 Destaques</div><div class="sum"><span>Dias trabalhados</span><b>'+d.daily.filter(x=>x.entries||x.earn).length+'</b></div><div class="sum"><span>Média diária</span><b>'+brl(d.days?d.earn/Math.max(1,d.daily.filter(x=>x.earn).length):0)+'</b></div><div class="sum"><span>Melhor dia</span><b>'+ (best?best.date.split('-').reverse().join('/'):'—')+'</b></div><div class="sum"><span>Resultado do melhor dia</span><b class="green">'+brl(best?best.earn-best.expenses:0)+'</b></div></div></div>'+
      '<div class="card"><div class="title">📅 Comparativo mensal</div><div class="e365monthchart">'+(()=>{const months={};d.daily.forEach(x=>{const k=x.date.slice(0,7);months[k]=months[k]||{earn:0,expenses:0,entries:0};months[k].earn+=x.earn;months[k].expenses+=x.expenses;months[k].entries+=x.entries});const rows=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0]));const mx=Math.max(1,...rows.map(x=>Math.max(x[1].earn,x[1].earn-x[1].expenses)));return rows.length?rows.map(([k,x])=>'<div class="e365monthrow"><div><b>'+k.slice(5)+'/'+k.slice(0,4)+'</b><small>'+x.entries+' entregas</small></div><div class="e365monthbars"><i class="earn" style="width:'+Math.max(3,x.earn/mx*100)+'%"></i><i class="profit" style="width:'+Math.max(3,Math.max(0,x.earn-x.expenses)/mx*100)+'%"></i></div><b class="green">'+brl(x.earn-x.expenses)+'</b></div>').join(''):'<div class="empty">Ainda não há meses suficientes para comparar.</div>'})()+'</div></div>'+
      '<div class="card"><div class="title">🏅 Ranking dos melhores meses</div>'+(()=>{const months={};d.daily.forEach(x=>{const k=x.date.slice(0,7);months[k]=(months[k]||0)+x.earn-x.expenses});const rows=Object.entries(months).sort((a,b)=>b[1]-a[1]).slice(0,6);return rows.length?rows.map(([k,v],i)=>'<div class="e365rank"><span class="e365medal">'+['🥇','🥈','🥉','🏅','🏅','🏅'][i]+'</span><span>'+k.slice(5)+'/'+k.slice(0,4)+'</span><b class="'+(v>=0?'green':'red')+'">'+brl(v)+'</b></div>').join(''):'<div class="empty">Ainda não há dados suficientes.</div>'})()+'</div>'+
      (est==='all'&&Object.keys(d.byEst).length>1?'<div class="card"><div class="title">🏪 Ranking de estabelecimentos</div>'+Object.entries(d.byEst).sort((a,b)=>(b[1].earn-b[1].expenses)-(a[1].earn-a[1].expenses)).map(([id,x])=>{const name=id==='principal'?'Principal':(ests.find(e=>e.id===id)?.name||id);return '<div class="sum"><span>'+esc(name)+'</span><b>'+brl(x.earn-x.expenses)+' · '+x.entries+' entregas</b></div>'}).join('')+'</div>':'')+
      '<div class="e365proactions"><button class="e365proprimary" id="e365reportprint">🖨️ IMPRIMIR / PDF</button><button class="e365prosecondary" id="e365reportclose">VOLTAR</button></div>';
      root.querySelector('[data-range]').value=days;root.querySelector('[data-est]').value=est;
      root.querySelector('[data-range]').onchange=render;root.querySelector('[data-est]').onchange=render;
      root.querySelector('#e365reportprint').onclick=()=>window.print();root.querySelector('#e365reportclose').onclick=()=>window.e365Pro();
    }
    if(typeof window.shell==='function')window.shell('<div id="e365proreport"></div>');else{fallback();const f=document.getElementById('e365profallback');f.querySelector('main').innerHTML='<div id="e365proreport"></div>'}
    render();
  }
  function exportData(){const u=localStorage.getItem('dcv2:session')||'';const data={exportadoEm:new Date().toISOString(),usuario:email(),dados:{}};Object.keys(localStorage).filter(k=>k.startsWith('dcv2:'+u+':')).forEach(k=>data.dados[k]=localStorage.getItem(k));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='entrega365-pro-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function bind(root=document){root.querySelector('#e365probuy')?.addEventListener('click',buy);root.querySelector('#e365prolegacy')?.addEventListener('click',()=>window.open(PAYMENT_LINK,'_blank','noopener,noreferrer'));root.querySelector('#e365procheck')?.addEventListener('click',async()=>{try{const d=await status();alert(d.active?'Assinatura PRO ativa.':'Assinatura ainda não autorizada.');open()}catch(e){alert(e.message)}});root.querySelector('#e365estopen')?.addEventListener('click',()=>window.e365Establishments?.openNew?window.e365Establishments.openNew():alert('Recurso de estabelecimentos carregando.'));root.querySelector('#e365report')?.addEventListener('click',report);root.querySelector('#e365export')?.addEventListener('click',exportData);root.querySelector('#e365backup')?.addEventListener('click',()=>window.entrega365SaveBackupToDrive?window.entrega365SaveBackupToDrive().catch(()=>{}):alert('Backup do Google Drive carregando.'));root.querySelector('#e365ads')?.addEventListener('click',()=>alert('PRO: anúncios desativados para esta conta.'));root.querySelector('#e365security')?.addEventListener('click',()=>alert('Conta PRO reconhecida e recursos profissionais habilitados.'));root.querySelector('#e365proclose')?.addEventListener('click',()=>window.go?.('day'))}
  let opening=false;
  function showPanel(){const sh=window.__e365BaseShell||window.shell;if(typeof sh==='function'){sh(panel());bind()}else fallback()}
  async function open(){
    if(opening)return;
    opening=true;
    css();
    // Mostra imediatamente o estado salvo e, em seguida, substitui pelo estado
    // confirmado pelo Mercado Pago. Assim cada navegador fica independente do cache local.
    showPanel();
    try{await status();showPanel()}catch(e){console.warn('PRO status:',e)}finally{opening=false}
  }
  function install(){
    css();
    const actions=document.querySelector('.actions');
    if(actions&&!actions.querySelector('.e365probtn')){
      const b=document.createElement('button');
      b.type='button';
      b.className='ico e365probtn';
      b.title='Entrega365 PRO';
      b.innerHTML='PRO<span class="e365probadge">+</span>';
      b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();open()};actions.prepend(b);
    }
    const tabs=document.querySelector('.tabs');
    if(tabs&&!tabs.querySelector('[data-pro]')){
      const b=document.createElement('button');
      b.type='button';
      b.className='tab';
      b.dataset.pro='1';
      b.innerHTML='<b>⭐</b>PRO';
      b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();open()};tabs.appendChild(b);
    }
  }
  // Delegação no document: o app recria o <body> a cada aba, então listeners presos
  // diretamente aos botões podem desaparecer. O listener abaixo permanece ativo em todos os navegadores.
  document.addEventListener('click',function(ev){
    const target=ev.target&&ev.target.closest?ev.target.closest('[data-pro],.e365probtn'):null;
    if(!target)return;
    ev.preventDefault();
    ev.stopPropagation();
    open();
  },true);
  window.e365Pro=open;
  window.e365OpenPro=open;
  window.e365ProStatus=status;
  window.e365OpenProPanel=open;
  css();
  if(!window.__e365ProObserver){window.__e365ProObserver=new MutationObserver(()=>install());window.__e365ProObserver.observe(document.documentElement,{childList:true,subtree:true});}\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();