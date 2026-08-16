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
#app .radio-card{display:none!important}
#mini89{position:fixed;left:8px;right:8px;bottom:82px;z-index:9999;max-width:650px;margin:auto;background:rgba(7,18,30,.98);border:1px solid #29435c;border-radius:16px;padding:8px 10px;box-shadow:0 10px 35px #0009;color:#fff;display:flex;align-items:center;gap:9px;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
#mini89 .logo89{width:38px;height:38px;border-radius:11px;background:#151515;display:grid;place-items:center;font-weight:1000;font-size:12px;color:#fff;border:1px solid #444}
#mini89 .info{min-width:0;flex:1}.m89n{font-weight:900;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m89s{font-size:10px;color:#91a0b4}
#mini89 button{border:0;border-radius:10px;background:#087cff;color:#fff;width:40px;height:36px;font-size:17px;font-weight:900}#mini89 .close89{background:#142232;color:#aebdcd}
@media(max-width:390px){#mini89{bottom:79px;padding:7px}#mini89 button{width:36px}}
`;
function css(){if(document.getElementById('ui-fixes-style'))return;let s=document.createElement('style');s.id='ui-fixes-style';s.textContent=STYLE;document.head.appendChild(s)}
function removeOldRadios(){document.querySelectorAll('.radio-card,#miniRadio,#mini-radio-css').forEach(el=>el.remove());document.querySelectorAll('script').forEach(s=>{if((s.textContent||'').includes('miniRadio'))s.remove()})}
function add89Player(){
 if(document.getElementById('mini89'))return;
 const el=document.createElement('div');el.id='mini89';el.innerHTML='<div class="logo89">89</div><div class="info"><div class="m89n">89 FM A Rádio Rock</div><div class="m89s">89.1 FM • Rock</div></div><button id="p89">▶</button><button id="c89" class="close89">×</button>';
 document.body.appendChild(el);
 const audio=document.createElement('audio');audio.id='audio89';audio.preload='none';audio.src='https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_89FM_ADP_SC';audio.style.display='none';document.body.appendChild(audio);
 const p=document.getElementById('p89');p.onclick=async()=>{try{if(audio.paused){await audio.play();p.textContent='⏸'}else{audio.pause();p.textContent='▶'}}catch(e){alert('Não foi possível iniciar a 89 FM agora. Tente novamente.')}};
 audio.onended=()=>p.textContent='▶';audio.onerror=()=>p.textContent='▶';
 document.getElementById('c89').onclick=()=>{audio.pause();audio.remove();el.remove()};
}
function moveKmToBottom(main){
 if(main.dataset.kmMoved==='1')return;
 const kmInput=main.querySelector('input[id*="kmInicial" i],input[id*="kminicial" i],input[placeholder*="KM inicial" i]');
 if(!kmInput)return;
 const source=kmInput.closest('.card');if(!source)return;
 const kmGrid=source.querySelector('.kmgrid');if(!kmGrid)return;
 const kmResult=source.querySelector('.kmresult');
 const kmCard=document.createElement('section');kmCard.className='card km-card';kmCard.innerHTML='<div class="title">🏍️ KM DO DIA</div>';kmCard.appendChild(kmGrid);if(kmResult)kmCard.appendChild(kmResult);main.appendChild(kmCard);main.dataset.kmMoved='1';
}
function organizeDay(main){
 main.classList.add('day-ui');const add=main.querySelector('.add');if(!add)return;const cmdCard=add.closest('.card');if(!cmdCard)return;cmdCard.classList.add('cmd-list-card');
 const title=cmdCard.querySelector(':scope > .title');const table=cmdCard.querySelector(':scope > .tablehead');if(table)cmdCard.insertBefore(add,table);else if(title)title.insertAdjacentElement('afterend',add);
 const entries=[...cmdCard.querySelectorAll(':scope > .entry')];if(entries.length&&!cmdCard.dataset.sorted){entries.reverse().forEach(e=>cmdCard.appendChild(e));if(table)cmdCard.insertBefore(table,cmdCard.querySelector(':scope > .entry'));cmdCard.insertBefore(add,table||cmdCard.querySelector(':scope > .entry')||null);cmdCard.dataset.sorted='1'}
 moveKmToBottom(main);
}
function apply(){css();removeOldRadios();const main=document.querySelector('#app main');if(!main)return;const isDay=!!main.querySelector('#date')&&!main.querySelector('#expdate')&&!main.querySelector('#last');if(isDay)organizeDay(main);add89Player()}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,50)}new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);run();
})();