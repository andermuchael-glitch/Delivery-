/* Entrega365 PRO — vários estabelecimentos (sem monkey-patch do localStorage) */
(function(){
  'use strict';
  const LIST='entrega365:establishments';
  const CURRENT='entrega365:currentEstablishment';
  const PLAN='entrega365:plan';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid=()=>localStorage.getItem('dcv2:session')||'';
  const mail=()=>String(localStorage.getItem('entrega365:email')||'').trim().toLowerCase();
  const isPro=()=>localStorage.getItem(PLAN)==='active';
  const scope=()=>LIST+':'+(uid()||mail()||'guest');
  const currentKey=()=>CURRENT+':'+(uid()||mail()||'guest');

  function getList(){
    try{
      const x=JSON.parse(localStorage.getItem(scope())||'[]');
      const list=Array.isArray(x)?x.filter(e=>e&&e.id&&e.name):[];
      return list.some(e=>e.id==='principal') ? list : [{id:'principal',name:'Principal'},...list.filter(e=>e.id!=='principal')];
    }catch{return[{id:'principal',name:'Principal'}]}
  }
  function setList(x){
    const list=[{id:'principal',name:'Principal'},...x.filter(e=>e.id!=='principal')];
    localStorage.setItem(scope(),JSON.stringify(list));
    window.dispatchEvent(new Event('e365-data-changed'));
  }
  function current(){
    const id=localStorage.getItem(currentKey())||'principal';
    return getList().some(x=>x.id===id)?id:'principal';
  }
  function active(){return current()}

  // Apenas transforma as chaves de dados do app. Nunca altera os métodos nativos
  // do localStorage: a versão anterior chamava getItem dentro do próprio patch e
  // provocava "Maximum call stack size exceeded" em alguns navegadores.
  function mapDataKey(k){
    const s=uid();
    if(!s||active()==='principal')return k;
    const prefix='dcv2:'+s+':';
    if(!String(k).startsWith(prefix))return k;
    const rest=String(k).slice(prefix.length);
    if(/^day:\d{4}-\d{2}-\d{2}$/.test(rest)||/^exp:\d{4}-\d{2}-\d{2}$/.test(rest)||rest==='mechanica'){
      return prefix+'est:'+active()+':'+rest;
    }
    return k;
  }
  window.e365MapDataKey=mapDataKey;

  function css(){
    if(document.getElementById('e365estcss'))return;
    const s=document.createElement('style');s.id='e365estcss';
    s.textContent=`
      .e365estbar{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line);background:linear-gradient(160deg,var(--panel),var(--panel2));border-radius:14px;display:flex;align-items:center;gap:8px}
      .e365estbar select{flex:1;min-width:0;padding:9px 10px;font-weight:800}
      .e365estadd{padding:9px 12px;border:1px solid #ffd000;background:#ffd000;color:#111;border-radius:10px;font-weight:900;white-space:nowrap}
      .e365estmanage{padding:9px 12px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:10px;font-weight:800;white-space:nowrap}
      .e365estmodal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px}
      .e365estbox{width:100%;max-width:390px;background:var(--panel2);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 20px 60px #000}
      .e365estbox h3{margin:0 0 8px;font-size:19px}.e365estbox p{color:var(--muted);font-size:12px;margin:0 0 14px}.e365estrow{display:flex;gap:8px}.e365estrow button{flex:1;padding:12px;border-radius:11px;font-weight:900}.e365estok{background:#ffd000;color:#111}.e365estcancel{border:1px solid var(--line);color:var(--text)}
    `;document.head.appendChild(s);
  }

  function modal(){
    if(!isPro()){window.e365Pro?.();return}
    if(document.querySelector('.e365estmodal'))return;
    const m=document.createElement('div');m.className='e365estmodal';
    m.innerHTML=`<div class="e365estbox"><h3>🏪 Novo estabelecimento</h3><p>Os dados de cada estabelecimento ficam separados.</p><input id="e365estname" placeholder="Nome do estabelecimento" maxlength="50"><div class="e365estrow"><button class="e365estcancel" id="e365estcancel">Cancelar</button><button class="e365estok" id="e365estok">CRIAR</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#e365estname').focus();
    m.querySelector('#e365estcancel').onclick=()=>m.remove();
    m.querySelector('#e365estok').onclick=()=>{
      const name=m.querySelector('#e365estname').value.trim();
      if(!name)return alert('Informe o nome.');
      const id='est-'+Date.now().toString(36);
      const list=getList();
      list.push({id,name});
      setList(list);
      localStorage.setItem(currentKey(),id);
      m.remove();
      window.render?.();
      setTimeout(render,50);
    };
  }

  function render(){
    if(!uid()||!isPro())return;
    css();
    const main=document.querySelector('main');if(!main)return;
    let bar=document.getElementById('e365estbar');
    if(!bar){bar=document.createElement('div');bar.id='e365estbar';bar.className='e365estbar';main.prepend(bar)}
    const list=getList(),cur=active();
    bar.innerHTML=`<span>🏪</span><select id="e365estselect">${list.map(x=>`<option value="${esc(x.id)}" ${x.id===cur?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="e365estadd" id="e365estnew">+ Novo</button>${list.length>1?'<button class="e365estmanage" id="e365estmanage">⚙</button>':''}`;
    bar.querySelector('#e365estselect').onchange=e=>{
      localStorage.setItem(currentKey(),e.target.value);
      window.render?.();
      setTimeout(render,0);
    };
    bar.querySelector('#e365estnew').onclick=modal;
    bar.querySelector('#e365estmanage')?.addEventListener('click',manage);
  }

  function manage(){
    const list=getList();if(list.length<2)return;
    const choices=list.map(x=>`<button data-del-est="${esc(x.id)}" style="width:100%;padding:11px;margin:4px 0;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);text-align:left">🏪 ${esc(x.name)} ${x.id==='principal'?'(principal)':'— excluir'}</button>`).join('');
    const m=document.createElement('div');m.className='e365estmodal';
    m.innerHTML=`<div class="e365estbox"><h3>Gerenciar estabelecimentos</h3><p>Excluir um estabelecimento remove apenas os dados dele deste dispositivo. A sincronização salva a alteração no Drive.</p>${choices}<button class="e365estcancel" style="width:100%;margin-top:8px;padding:11px;border-radius:10px" id="e365estclose">Fechar</button></div>`;
    document.body.appendChild(m);
    m.querySelector('#e365estclose').onclick=()=>m.remove();
    m.querySelectorAll('[data-del-est]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.delEst;if(id==='principal')return;
      const name=list.find(x=>x.id===id)?.name||'';
      if(!confirm('Excluir '+name+'?'))return;
      setList(list.filter(x=>x.id!==id));
      if(current()===id)localStorage.setItem(currentKey(),'principal');
      m.remove();window.render?.();setTimeout(render,0);
    });
  }

  function install(){css();if(uid()&&isPro())render()}
  window.e365Establishments={isPro,openNew:modal,current,refresh:render,mapDataKey};
  window.addEventListener('e365-pro-updated',install);
  window.addEventListener('e365-data-changed',()=>setTimeout(install,0));
  window.addEventListener('e365-drive-restored',()=>setTimeout(install,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setInterval(install,1500);
})();