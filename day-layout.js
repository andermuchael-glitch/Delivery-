/* Ajuste de layout da tela Dia — não altera a estrutura dos dados. */
"use strict";
function renderDay(){
  const d=getDay(day),t=totals(d);
  const rows=(d.entries||[]).map(e=>`<div class="entry" data-id="${esc(e.id)}"><input data-f="comanda" type="number" inputmode="numeric" placeholder="Nº" value="${esc(e.comanda||"")}"><input data-f="taxa" type="number" inputmode="decimal" placeholder="Taxa" value="${esc(e.taxa||"")}"><input class="check" data-f="ok" type="checkbox" ${e.ok||e.conferido?"checked":""}><button class="trash" data-remove>×</button></div>`).join("");
  return `<div class="daynav"><button class="navbtn" data-shift="-1">‹</button><div class="daycenter"><strong>${dateLabel(day)}</strong><input id="date" type="date" value="${day}"></div><button class="navbtn" data-shift="1">›</button></div>
  <div class="card day-summary"><div class="title">Fechamento do dia</div><div class="grid"><div class="stat"><div class="l">Número de entregas</div><div class="v blue">${t.ent}</div></div><div class="stat"><div class="l">Soma das taxas</div><div class="v">${brl(t.taxas)}</div></div><div class="stat"><div class="l">Arrancada</div><div class="v yellow">${brl(t.arr)}</div></div><div class="stat"><div class="l">Total do dia</div><div class="v green">${brl(t.total)}</div></div></div></div>
  <button class="primary" id="add">+ Nova comanda</button>
  <div class="card" style="margin-top:12px"><div class="row between"><div class="title">Comandas</div><span class="small">${t.conf}/${t.ent} conferidas</span></div><div class="tablehead"><span>Comanda</span><span>Taxa</span><span>OK</span><span></span></div>${rows||`<div class="empty">Nenhuma entrega lançada.<br>Toque em Nova comanda.</div>`}<div class="line"></div><div class="row between"><span>Arrancada do dia</span><div style="width:120px"><input id="arr" type="number" inputmode="decimal" value="${d.arrancada||0}"></div></div></div>
  <div class="card"><div class="title">Quilometragem</div><div class="kmgrid"><div><div class="small">KM inicial do dia</div><input id="kmi" type="number" inputmode="numeric" value="${esc(d.kmInicial)}" placeholder="Ex.: 45280"></div><div><div class="small">KM final do dia</div><input id="kmf" type="number" inputmode="numeric" value="${esc(d.kmFinal)}" placeholder="Ex.: 45397"></div></div><div class="kmresult"><span>Total rodado</span><b>${t.km} km</b></div></div>`;
}
function bindDay(){
  const d=getDay(day);
  $("#date").onchange=e=>{day=e.target.value;render()};
  ["kmi","kmf","arr"].forEach(id=>$("#"+id).onchange=e=>{if(id==="kmi")d.kmInicial=e.target.value;if(id==="kmf")d.kmFinal=e.target.value;if(id==="arr")d.arrancada=e.target.value;save(`day:${day}`,d);render()});
  document.querySelectorAll(".entry").forEach(r=>{const id=r.dataset.id,e=d.entries.find(x=>x.id===id);r.querySelectorAll("input").forEach(i=>i.onchange=()=>{const f=i.dataset.f;if(f==="ok")e.ok=i.checked;else e[f]=i.value;delete e.conferido;save(`day:${day}`,d);render()});r.querySelector("[data-remove]").onclick=()=>{d.entries=d.entries.filter(x=>x.id!==id);save(`day:${day}`,d);render()}});
  $("#add").onclick=()=>{d.entries.push({id:crypto.randomUUID(),comanda:"",taxa:"",ok:false});save(`day:${day}`,d);render()};
  document.querySelectorAll("[data-shift]").forEach(b=>b.onclick=()=>shiftDate("day",+b.dataset.shift));
}
if(typeof render==="function")render();
