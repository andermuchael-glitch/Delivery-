(()=>{
const STYLE=`
#app input:not(.check),#app select{min-height:48px;font-size:16px;padding:12px 11px}
#app .entry{min-height:58px;gap:8px}
#app .entry .check{width:26px;height:26px}
#app .day-ui .add{min-height:56px;font-size:17px;margin:0 0 14px;display:block;border:0;background:#ffd200;color:#151515;box-shadow:0 7px 20px rgba(255,210,0,.24)}
#app .day-ui .tablehead{font-size:11px}
#app .day-ui .day-close-card{border-color:#d8b300;background:#fffdf0}
#app .day-ui .day-close-card .sum{font-size:14px}
#app .day-ui .km-card{margin-top:12px}
#app .day-ui .km-card .kmgrid{grid-template-columns:repeat(3,1fr)}
#app .day-ui .km-card .kmresult{margin-top:10px}
#app .day-ui .cmd-list-card .entry{background:#fafafa;border:1px solid #dedede;border-radius:13px;padding:8px;margin:7px 0}
#app .day-ui .cmd-list-card .entry:first-of-type{border-color:#d8b300;box-shadow:0 3px 10px rgba(0,0,0,.05)}
#app .tab b{font-size:21px;line-height:1;opacity:1;filter:none}
#app .tab{font-weight:700}
@media(max-width:600px){#app .day-ui .entry{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 36px 30px}#app .day-ui .title{font-size:18px}}
@media(max-width:390px){#app .day-ui .km-card .kmgrid{grid-template-columns:1fr 1fr 1fr}}
`;
function css(){if(document.getElementById('ui-fixes-style'))document.getElementById('ui-fixes-style').remove();const s=document.createElement('style');s.id='ui-fixes-style';s.textContent=STYLE;document.head.appendChild(s)}
function removeLegacyRadios(){document.querySelectorAll('.radio-card,#miniRadio,#mini-radio-css,.radio-tab,.radio-screen,.radio-screen-fix').forEach(el=>el.remove())}
function moveKmToBottom(main){if(main.dataset.kmMoved==='1')return;const kmInput=main.querySelector('input[id*="kmInicial" i],input[placeholder*="KM inicial" i]');if(!kmInput)return;const source=kmInput.closest('.card');if(!source)return;const kmGrid=source.querySelector('.kmgrid');if(!kmGrid)return;const kmResult=source.querySelector('.kmresult');const kmCard=document.createElement('section');kmCard.className='card km-card';kmCard.innerHTML='<div class="title">🏍️ KM DO DIA</div>';kmCard.appendChild(kmGrid);if(kmResult)kmCard.appendChild(kmResult);main.appendChild(kmCard);main.dataset.kmMoved='1'}
function organizeDay(main){main.classList.add('day-ui');const add=main.querySelector('.add');if(!add)return;const cmdCard=add.closest('.card');if(!cmdCard)return;cmdCard.classList.add('cmd-list-card');const title=cmdCard.querySelector(':scope > .title');const table=cmdCard.querySelector(':scope > .tablehead');if(table)cmdCard.insertBefore(add,table);else if(title)title.insertAdjacentElement('afterend',add);
const entries=[...cmdCard.querySelectorAll(':scope > .entry')];if(entries.length){entries.reverse().forEach(e=>cmdCard.appendChild(e));if(table)cmdCard.insertBefore(table,cmdCard.querySelector(':scope > .entry'));cmdCard.insertBefore(add,table||cmdCard.querySelector(':scope > .entry')||null)}
moveKmToBottom(main)}
function apply(){css();removeLegacyRadios();const main=document.querySelector('#app main');if(!main)return;const isDay=!!main.querySelector('#date')&&!main.querySelector('#expdate')&&!main.querySelector('#last');if(!isDay)return;organizeDay(main)}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,50)}new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',run);run();
})();