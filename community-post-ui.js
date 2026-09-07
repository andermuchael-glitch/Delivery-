/* Entrega365 — Community post composer collapsed + moderation notice */
(function(){
  const STYLE_ID='e365-community-post-ui';
  function styles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .cm-new-post-wrap{margin:0 0 14px}
      .cm-new-post-toggle{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 18px;border:1px solid #d9b400;border-radius:14px;background:linear-gradient(135deg,#ffd000,#e6b800);color:#111;font-size:15px;font-weight:950;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.18)}
      .cm-new-post-toggle:hover{filter:brightness(1.04);transform:translateY(-1px)}
      .cm-composer-collapsed{display:none!important}
      .cm-compose-close{width:100%;padding:10px;border:1px solid #555;border-radius:11px;background:#292929;color:#ddd;font-weight:800;cursor:pointer}
      .cm-moderation-notice{margin:2px 0 4px;padding:10px 12px;border:1px solid #4b4b4b;border-radius:11px;background:#191919;color:#bbb;font-size:11px;line-height:1.45}
      .cm-moderation-notice b{color:#ffd000}
    `;
    document.head.appendChild(s)
  }
  function collapseComposer(){
    const modal=document.querySelector('.cm-overlay');
    if(!modal)return;
    const form=modal.querySelector('.cm-main .cm-card.cm-form');
    if(!form)return;
    if(form.dataset.postUiReady==='1')return;
    form.dataset.postUiReady='1';
    styles();
    const wrap=document.createElement('div');
    wrap.className='cm-new-post-wrap';
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='cm-new-post-toggle';
    toggle.innerHTML='➕ <span>Nova publicação</span>';
    wrap.appendChild(toggle);
    form.parentNode.insertBefore(wrap,form);
    form.classList.add('cm-composer-collapsed');

    const notice=document.createElement('div');
    notice.className='cm-moderation-notice';
    notice.innerHTML='<b>🛡️ Moderação ativa</b><br>Não são permitidos conteúdos políticos, sexuais ou pornográficos, linguagem obscena, ameaças, discriminação ou outras condutas inadequadas. As publicações permanecem por 7 dias e depois são removidas.';
    form.insertBefore(notice,form.firstChild);

    const close=document.createElement('button');
    close.type='button';
    close.className='cm-compose-close';
    close.textContent='Fechar publicação';
    form.appendChild(close);
    function open(){form.classList.remove('cm-composer-collapsed');toggle.innerHTML='✕ <span>Fechar publicação</span>';setTimeout(()=>form.querySelector('#cm-text')?.focus(),40)}
    function closeForm(){form.classList.add('cm-composer-collapsed');toggle.innerHTML='➕ <span>Nova publicação</span>'}
    toggle.onclick=()=>form.classList.contains('cm-composer-collapsed')?open():closeForm();
    close.onclick=closeForm;
  }
  function schedule(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(window.e365CommunityOpen||document.querySelector('.cm-overlay')){
        const original=window.render;
        if(typeof original==='function'&&!original.__e365PostUiWrapped){
          const wrapped=async function(v){
            const result=await original.apply(this,arguments);
            if(v==='community'||v==null)setTimeout(collapseComposer,0);
            return result;
          };
          wrapped.__e365PostUiWrapped=true;
          window.render=wrapped;
        }
        if(document.querySelector('.cm-overlay'))collapseComposer();
        if(window.e365CommunityOpen&&!window.e365CommunityOpen.__e365PostUiWrapped){
          const open=window.e365CommunityOpen;
          const wrappedOpen=async function(){const result=await open.apply(this,arguments);setTimeout(collapseComposer,0);return result};
          wrappedOpen.__e365PostUiWrapped=true;
          window.e365CommunityOpen=wrappedOpen;
        }
        if(tries>40)clearInterval(timer);
      }else if(tries>80)clearInterval(timer);
    },250);
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('.cm-tab[data-v="community"]');
    if(tab)setTimeout(collapseComposer,100);
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
