(()=>{
const STYLE=`
#app input:not(.check),#app select{min-height:48px;font-size:16px;padding:12px 11px}
#app .entry{min-height:58px;gap:8px}
#app .entry .check{width:26px;height:26px}
#app .day-ui .add{min-height:56px;font-size:17px;margin:0 0 14px;display:block;border:0;background:linear-gradient(135deg,#087cff,#0057d9);color:#fff;box-shadow:0 7px 20px #006cff44}
#app .day-ui .tablehead{font-size:11px}
#app .day-ui .day-close-card{border-color:#155ba0;background:linear-gradient(145deg,#0b1d31,#081522)}
#app .day-ui .day-close-card .sum{font-size:14px}
#app .day-ui .day-close-card .sum.total{font-size:18px}
#app .day-ui .km-card{margin-top:12px}
#app .day-ui .km-card .kmgrid{grid-template-columns:repeat(3,1fr)}
#app .day-ui .km-card .kmresult{margin-top:10px}
#app .day-ui .cmd-list-card .entry{background:linear-gradient(145deg,#0a1725,#07111b);border:1px solid #172d42;border-radius:13px;padding:8px;margin:7px 0}
#app .radio-card,#app #miniRadio,#app #mini-radio-css{display:none!important}
#app .radio-tab{position:relative}
#app .radio-screen .radio-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
#app .radio-screen .radio-head-icon{width:58px;height:58px;border-radius:17px;display:grid;place-items:center;background:#ffc52d;color:#101827;font-size:30px;border:2px solid #111b2a;box-shadow:0 6px 18px #0003}
#app .radio-screen .radio-head h1{margin:0;font-size:24px}.radio-screen .radio-head p{margin:3px 0 0;color:var(--muted);font-size:13px}
#app .radio-screen .radio-player{background:linear-gradient(145deg,#182238,#111a2b);border-radius:22px;padding:18px;margin-bottom:18px;box-shadow:0 12px 30px #0005}
#app .radio-screen .radio-player .state{font-size:12px;font-weight:900;color:#ffd044;letter-spacing:.4px}
#app .radio-screen .radio-player h2{font-size:25px;margin:12px 0 3px}.radio-screen .radio-player .freq{color:#b8c2d0;font-size:14px}
#app .radio-screen .play-main{width:100%;height:58px;border:0;border-radius:16px;background:#ffd447;color:#121a28;font-size:19px;font-weight:900;margin:20px 0 13px}
#app .radio-screen .volume{display:flex;align-items:center;gap:10px}.radio-screen .volume input{accent-color:#ffd447;padding:0;min-height:0;height:6px;border:0;background:transparent}
#app .radio-screen .section-label{font-size:13px;font-weight:900;color:#98a8bb;letter-spacing:.8px;margin:20px 6px 9px;text-transform:uppercase}
#app .radio-screen .station{width:100%;display:flex;align-items:center;gap:12px;text-align:left;background:#0b1522;color:#fff;border:1px solid #1c2c40;border-radius:17px;padding:13px;margin:8px 0}
#app .radio-screen .station.active{border-color:#ffd447;background:#141c29;box-shadow:0 0 0 1px #ffd44733}
#app .radio-screen .station-icon{width:50px;height:50px;border-radius:14px;background:#eef2f7;color:#7d8da0;display:grid;place-items:center;font-size:24px;flex:0 0 auto}.radio-screen .station.active .station-icon{background:#ffc52d;color:#111827}
#app .radio-screen .station-info{min-width:0;flex:1}.radio-screen .station-info strong{display:block;font-size:16px}.radio-screen .station-info span{display:block;color:#91a0b4;font-size:12px;margin-top:4px}
#app .radio-screen .station-go{font-size:30px;color:#94a5b8}
#app .radio-screen .embedded-player{margin-top:14px;border:1px solid #263a50;border-radius:16px;overflow:hidden;background:#fff}
#app .radio-screen .embedded-player iframe{display:block;width:100%;height:430px;border:0;background:#fff}
#app .radio-screen .source-btn{display:block;width:100%;margin-top:10px;border:1px solid #2b4560;background:#0a1725;color:#dce7f3;border-radius:12px;padding:11px;text-align:center;text-decoration:none;font-weight:800}
#radioMini{position:fixed;left:10px;right:10px;bottom:84px;z-index:30;background:rgba(12,20,32,.98);border:1px solid #29415a;border-radius:16px;padding:9px 11px;box-shadow:0 10px 30px #0008;display:flex;align-items:center;gap:9px}
#radioMini .mini-play{width:40px;height:40px;border:0;border-radius:12px;background:#ffd447;color:#111827;font-size:18px;font-weight:900;flex:0 0 auto}
#radioMini .mini-info{min-width:0;flex:1}.mini-info strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}.mini-info span{display:block;color:#91a0b4;font-size:10px;margin-top:2px}
#radioMini .mini-close{width:30px;height:30px;border:0;background:transparent;color:#9aa9ba;font-size:20px}
@media(max-width:600px){#app .day-ui .entry{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 36px 30px}#app .day-ui .title{font-size:18px}.radio-screen .radio-player h2{font-size:22px}.radio-screen .embedded-player iframe{height:390px}}
@media(max-width:390px){#app .day-ui .km-card .kmgrid{grid-template-columns:1fr 1fr 1fr}}
`;
function css(){if(document.getElementById('ui-fixes-style'))return;let s=document.createElement('style');s.id='ui-fixes-style';s.textContent=STYLE;document.head.appendChild(s)}
function removeLegacyRadios(){document.querySelectorAll('.radio-card,#miniRadio,#mini-radio-css').forEach(el=>el.remove())}
function moveKmToBottom(main){if(main.dataset.kmMoved==='1')return;const kmInput=main.querySelector('input[id*="kmInicial" i],input[id*="kminicial" i],input[placeholder*="KM inicial" i]');if(!kmInput)return;const source=kmInput.closest('.card');if(!source)return;const kmGrid=source.querySelector('.kmgrid');if(!kmGrid)return;const kmResult=source.querySelector('.kmresult');const kmCard=document.createElement('section');kmCard.className='card km-card';kmCard.innerHTML='<div class="title">🏍️ KM DO DIA</div>';kmCard.appendChild(kmGrid);if(kmResult)kmCard.appendChild(kmResult);main.appendChild(kmCard);main.dataset.kmMoved='1'}
function organizeDay(main){main.classList.add('day-ui');const add=main.querySelector('.add');if(!add)return;const cmdCard=add.closest('.card');if(!cmdCard)return;cmdCard.classList.add('cmd-list-card');const title=cmdCard.querySelector(':scope > .title');const table=cmdCard.querySelector(':scope > .tablehead');if(table)cmdCard.insertBefore(add,table);else if(title)title.insertAdjacentElement('afterend',add);const entries=[...cmdCard.querySelectorAll(':scope > .entry')];if(entries.length&&!cmdCard.dataset.sorted){entries.reverse().forEach(e=>cmdCard.appendChild(e));if(table)cmdCard.insertBefore(table,cmdCard.querySelector(':scope > .entry'));cmdCard.insertBefore(add,table||cmdCard.querySelector(':scope > .entry')||null);cmdCard.dataset.sorted='1'}moveKmToBottom(main)}
const STATIONS={
 trans:{name:'Transamérica 99,7 FM',freq:'99.7 FM · Balneário Camboriú / SC',embed:'https://www.trans99fm.com.br/',source:'https://www.trans99fm.com.br/'},
 rock89:{name:'89 FM A Rádio Rock',freq:'89.1 FM · São Paulo / SP',embed:'https://radiomixer.net/pt/bra/arock/embed',source:'https://www.radiorock.com.br/'}
};
let radioCurrent=localStorage.getItem('dc-radio-current')||'trans';
function addRadioTab(){const nav=document.querySelector('#app .tabs');if(!nav||nav.querySelector('.radio-tab'))return;const b=document.createElement('button');b.className='tab radio-tab';b.innerHTML='<b>📻</b>Rádio';b.onclick=()=>showRadio();nav.appendChild(b)}
function stationButton(id){const s=STATIONS[id];return `<button class="station ${radioCurrent===id?'active':''}" data-radio-station="${id}"><div class="station-icon">📻</div><div class="station-info"><strong>${s.name}</strong><span>${s.freq}</span></div><div class="station-go">›</div></button>`}
function radioScreen(){const s=STATIONS[radioCurrent];return `<div class="radio-screen"><div class="radio-head"><div class="radio-head-icon">◉</div><div><h1>Rádio</h1><p>Ouça enquanto trabalha</p></div></div><div class="radio-player"><div class="state" id="radioState">PRONTO</div><h2 id="radioName">${s.name}</h2><div class="freq" id="radioFreq">${s.freq}</div><button class="play-main" id="radioPlay">▷ &nbsp; Tocar no app</button><div class="volume"><span>🔊</span><input id="radioVolume" type="range" min="0" max="1" step="0.01" value="0.85"></div></div><div id="embeddedArea"></div><div class="section-label">ESTAÇÕES</div>${stationButton('trans')}${stationButton('rock89')}<div class="notice" style="margin-top:14px">A Transamérica usa a fonte da emissora. A 89 FM usa um player alternativo compatível com navegador.</div></div>`}
function attachRadioEvents(){document.querySelectorAll('[data-radio-station]').forEach(b=>b.onclick=()=>{radioCurrent=b.dataset.radioStation;localStorage.setItem('dc-radio-current',radioCurrent);showRadio()});const play=document.getElementById('radioPlay');if(play)play.onclick=toggleRadio}
function showRadio(){const main=document.querySelector('#app main');if(!main)return;main.innerHTML=radioScreen();main.className='';main.dataset.kmMoved='0';document.querySelectorAll('#app .tab').forEach(t=>t.classList.remove('active'));const rt=document.querySelector('#app .radio-tab');if(rt)rt.classList.add('active');attachRadioEvents()}
function toggleRadio(){const s=STATIONS[radioCurrent];const area=document.getElementById('embeddedArea');if(!area)return;area.innerHTML=`<div class="embedded-player"><iframe src="${s.embed}" title="Player ${s.name}" allow="autoplay; encrypted-media; picture-in-picture" loading="eager"></iframe></div><a class="source-btn" href="${s.source}" target="_blank" rel="noopener">Abrir fonte da transmissão</a>`;const st=document.getElementById('radioState'),bt=document.getElementById('radioPlay');if(st)st.textContent='TOCANDO';if(bt)bt.innerHTML='❚❚ &nbsp; Player aberto';showMiniEmbedded()}
function showMiniEmbedded(){document.getElementById('radioMini')?.remove();const s=STATIONS[radioCurrent];const d=document.createElement('div');d.id='radioMini';d.innerHTML=`<button class="mini-play" id="miniRadioPlay">📻</button><div class="mini-info"><strong>${s.name}</strong><span>${s.freq}</span></div><button class="mini-close" id="miniRadioClose">×</button>`;document.body.appendChild(d);d.querySelector('#miniRadioPlay').onclick=()=>showRadio();d.querySelector('#miniRadioClose').onclick=()=>d.remove()}
const oldGo=window.go;window.go=function(v){if(v==='radio'){showRadio();return}oldGo(v);setTimeout(addRadioTab,80)};
function apply(){css();removeLegacyRadios();const main=document.querySelector('#app main');if(!main)return;addRadioTab();if(main.querySelector('.radio-screen')){attachRadioEvents();return}const isDay=!!main.querySelector('#date')&&!main.querySelector('#expdate')&&!main.querySelector('#last');if(!isDay)return;organizeDay(main)}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,50)}new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);run();
})();