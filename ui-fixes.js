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
#app .day-ui .cmd-list-card .entry{background:linear-gradient(145deg,#0a1725,#07111b);border:1px solid #172d42;border-radius:13px;padding:8px;margin:7px 0}
@media(max-width:600px){#app .day-ui .entry{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 36px 30px}#app .day-ui .title{font-size:18px}}
`;
function css(){if(document.getElementById('ui-fixes-style'))return;let s=document.createElement('style');s.id='ui-fixes-style';s.textContent=STYLE;document.head.appendChild(s)}
function removeRadios(){document.querySelectorAll('.radio-card,#miniRadio').forEach(el=>el.remove())}
function apply(){
 css();removeRadios();
 let main=document.querySelector('#app main');if(!main)return;
 let isDay=!!main.querySelector('#date')&&!main.querySelector('#expdate')&&!main.querySelector('#last');if(!isDay)return;
 main.classList.add('day-ui');
 let cards=[...main.querySelectorAll(':scope > .card')];if(cards.length<2)return;
 let kmCard=cards[0],cmdCard=cards[1];kmCard.classList.add('km-card');
 let close=main.querySelector(':scope > .day-close-card');
 if(!close){close=document.createElement('div');close.className='card day-close-card';close.innerHTML='<div class="title">Fechamento do dia</div><div class="close-content"></div>';main.insertBefore(close,cmdCard)}
 let cc=close.querySelector('.close-content');
 [...cmdCard.querySelectorAll(':scope > .sum'),...cmdCard.querySelectorAll(':scope > .line')].forEach(el=>cc.appendChild(el));
 let arrRow=[...cmdCard.children].find(el=>el.textContent.includes('Arrancada do dia')&&el.querySelector('#arr'));if(arrRow)cc.insertBefore(arrRow,cc.querySelector('.sum'));
 let add=cmdCard.querySelector(':scope > .add'),title=cmdCard.querySelector(':scope > .title'),table=cmdCard.querySelector(':scope > .tablehead');
 if(add&&title){if(table)cmdCard.insertBefore(add,table);else title.insertAdjacentElement('afterend',add)}
 // Mais recente sempre no topo; a ordem cronológica fica de baixo para cima.
 let entries=[...cmdCard.querySelectorAll(':scope > .entry')];if(entries.length){let ref=cmdCard.querySelector(':scope > .add');entries.reverse().forEach(e=>cmdCard.insertBefore(e,ref))}
 cmdCard.classList.add('cmd-list-card');
 if(kmCard.parentElement===main)cmdCard.insertAdjacentElement('afterend',kmCard);
 // Próxima comanda nasce no topo da lista.
 if(add&&!add.dataset.fixed){add.dataset.fixed='1';add.onclick=()=>{const d=getDay(day);d.entries.unshift({id:crypto.randomUUID(),comanda:'',taxa:'',ok:false});saveDayAnd(day,d);render()}}
}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,40)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',run);run();
})();