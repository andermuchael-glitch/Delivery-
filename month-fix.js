(function(){'use strict';
if(window.__monthFixLoaded)return;window.__monthFixLoaded=true;
function renderMonthFixed(){
  const ks=monthKeys().sort().reverse();
  const ds=ks.map(getDay);
  const ent=ds.reduce((s,d)=>s+d.entries.length,0);
  const tax=ds.reduce((s,d)=>s+totals(d).taxas,0);
  const arr=ds.reduce((s,d)=>s+(+d.arrancada||0),0);
  let exp=0;ks.forEach(k=>{exp+=getExp(k).items.reduce((s,e)=>s+(+e.val||0),0)});
  const recebido=tax+arr;
  const media=ds.length?recebido/ds.length:0;
  const trabalhados=ds.filter(d=>d.entries.length>0||(+d.arrancada||0)>0).length;
  return `<div class="card"><div class="monthnav"><button class="navbtn" onclick="shiftMonth(-1)">‹</button><strong>${month.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</strong><button class="navbtn" onclick="shiftMonth(1)">›</button></div></div>
  <div class="grid">
    <div class="stat"><div class="l">Recebido no mês</div><div class="v yellow">${brl(recebido)}</div></div>
    <div class="stat"><div class="l">Entregas</div><div class="v">${ent}</div></div>
    <div class="stat"><div class="l">Média por dia</div><div class="v">${brl(media)}</div></div>
    <div class="stat"><div class="l">Dias trabalhados</div><div class="v">${trabalhados}</div></div>
  </div>
  <div class="card" style="margin-top:12px"><div class="sum"><span>Taxas recebidas</span><b>${brl(tax)}</b></div><div class="sum"><span>Arrancadas</span><b>${brl(arr)}</b></div><div class="sum"><span>Gastos</span><b class="red">${brl(exp)}</b></div><div class="sum total"><span>Saldo do mês</span><b class="yellow">${brl(recebido-exp)}</b></div></div>
  <div class="card"><div class="title">Dias do mês</div><div class="tablehead" style="grid-template-columns:1.1fr .8fr .9fr"><span>Data</span><span>Entregas</span><span class="right">Valor do dia</span></div>
  ${ks.map(k=>{let t=totals(getDay(k));return `<div class="dayitem" style="grid-template-columns:1.1fr .8fr .9fr"><span>${dateLabel(k)}</span><span>${t.ent} entregas</span><b class="right yellow">${brl(t.total)}</b></div>`}).join('')||'<div class="empty">Nenhum dia lançado neste mês.</div>'}</div>`;
}
function install(){if(typeof renderMonth!=='function'||window.__renderMonthOriginal)return;window.__renderMonthOriginal=renderMonth;renderMonth=renderMonthFixed;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
