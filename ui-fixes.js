(()=>{
const STYLE=`
#app input:not(.check),#app select{min-height:48px;font-size:16px;padding:12px 11px}
#app .entry{min-height:58px;gap:8px}
#app .entry .check{width:26px;height:26px}
#app .day-ui .add{min-height:52px;font-size:16px;margin:0 0 14px;display:block}
#app .day-ui .tablehead{font-size:11px}
#app .day-ui .day-close-card{border-color:#155ba0;background:linear-gradient(145deg,#0b1d31,#081522)}
#app .day-ui .day-close-card .sum{font-size:14px}
#app .day-ui .day-close-card .sum.total{font-size:18px}
#app .day-ui .km-card{margin-top:12px}
@media(max-width:600px){#app .day-ui .entry{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 36px 30px}#app .day-ui .title{font-size:18px}}
`;
function css(){if(document.getElementById('ui-fixes-style'))return;let s=document.createElement('style');s.id='ui-fixes-style';s.textContent=STYLE;document.head.appendChild(s)}
function apply(){css();let main=document.querySelector('#app main');if(!main)return;let isDay=!!main.querySelector('#date')&&!main.querySelector('#expdate')&&!main.querySelector('#last');if(!isDay)return;main.classList.add('day-ui');
 let cards=[...main.querySelectorAll(':scope > .card')];if(cards.length<2)return;let kmCard=cards[0],cmdCard=cards[1];
 kmCard.classList.add('km-card');
 let close=main.querySelector(':scope > .day-close-card');
 if(!close){close=document.createElement('div');close.className='card day-close-card';close.innerHTML='<div class="title">Fechamento do dia</div><div class="close-content"></div>';main.insertBefore(close,cmdCard)}
 let cc=close.querySelector('.close-content');
 [...cmdCard.querySelectorAll(':scope > .sum'),...cmdCard.querySelectorAll(':scope > .line')].forEach(el=>cc.appendChild(el));
 let arrRow=[...cmdCard.children].find(el=>el.textContent.includes('Arrancada do dia')&&el.querySelector('#arr'));if(arrRow)cc.insertBefore(arrRow,cc.querySelector('.sum'));
 // Nova comanda fica como primeira ação da seção, imediatamente após o título.
 let add=cmdCard.querySelector(':scope > .add');let title=cmdCard.querySelector(':scope > .title');let table=cmdCard.querySelector(':scope > .tablehead');
 if(add&&title){if(table)cmdCard.insertBefore(add,table);else title.insertAdjacentElement('afterend',add)}
 // KM fica abaixo das comandas/taxas.
 if(kmCard.parentElement===main&&cmdCard.nextElementSibling!==kmCard)cmdCard.insertAdjacentElement('afterend',kmCard);
}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,30)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',run);run();
})();