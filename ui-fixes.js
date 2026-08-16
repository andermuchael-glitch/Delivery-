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
function removeRadios(){document.querySelectorAll('.radio-card,#miniRadio,#mini-radio-css').forEach(el=>el.remove());document.querySelectorAll('script').forEach(s=>{if((s.textContent||'').includes('miniRadio'))s.remove()})}
function apply(){
 css();removeRadios();
 const main=document.querySelector('#app main');if(!main)return;
 const isDay=!!main.querySelector('#date')&&!main.querySelector('#expdate')&&!main.querySelector('#last');if(!isDay)return;
 main.classList.add('day-ui');
 const add=main.querySelector('.add');
 if(!add)return;
 const cmdCard=add.closest('.card');
 if(!cmdCard)return;
 cmdCard.classList.add('cmd-list-card');
 // Nova Comanda fica sempre antes da tabela/lista.
 const table=cmdCard.querySelector(':scope > .tablehead');
 const title=cmdCard.querySelector(':scope > .title');
 if(table)cmdCard.insertBefore(add,table);else if(title)title.insertAdjacentElement('afterend',add);
 // A lista visual é invertida uma única vez por render: a última lançada fica no topo.
 if(!cmdCard.dataset.sorted){
   const entries=[...cmdCard.querySelectorAll(':scope > .entry')];
   if(entries.length){
     entries.reverse().forEach(e=>cmdCard.appendChild(e));
     if(table)cmdCard.insertBefore(table,cmdCard.querySelector(':scope > .entry'));
     cmdCard.insertBefore(add,table||cmdCard.querySelector(':scope > .entry')||null);
   }
   cmdCard.dataset.sorted='1';
 }
 // KM permanece depois do cartão de comandas.
 const kmInput=main.querySelector('input[id*="kmInicial"],input[id*="kminicial"],input[placeholder*="KM inicial" i]');
 const kmCard=kmInput?.closest('.card');
 if(kmCard&&kmCard!==cmdCard)cmdCard.insertAdjacentElement('afterend',kmCard);
}
let timer;function run(){clearTimeout(timer);timer=setTimeout(apply,40)}
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',run);run();
})();