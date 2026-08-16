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
#app .day-ui .entry-list{display:flex;flex-direction:column;gap:0}
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
 if(add&&title&&table&&!add.dataset.fixed){cmdCard.insertBefore(add,table)}
 // Lista: a ordem visual é do mais recente para o mais antigo. O render original mantém a ordem dos dados.
 // Não alteramos a ordem dos dados nem os números das comandas.
 let entries=[...cmdCard.querySelectorAll(':scope > .entry')];
 if(entries.length){
   let list=cmdCard.querySelector(':scope > .entry-list');
   if(!list){list=document.createElement('div');list.className='entry-list';entries.forEach(e=>list.appendChild(e));if(table)table.insertAdjacentElement('afterend',list);else if(add)add.insertAdjacentElement('afterend',list);}
   // A comanda mais recente é a primeira visualmente: inverte apenas a apresentação.
   list.style.flexDirection='column-reverse';
 }
 cmdCard.classList.add('cmd-list-card');
 if(kmCard.parentElement===main)cmdCard.insertAdjacentElement('afterend',kmCard);
}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,40)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',run);run();
})();