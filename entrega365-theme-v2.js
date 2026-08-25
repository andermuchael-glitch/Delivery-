/* Entrega365 — tema claro creme + calculadora ampliada */
(function(){
  function apply(){
    if(document.getElementById('e365-theme-v2'))return;
    const s=document.createElement('style');
    s.id='e365-theme-v2';
    s.textContent=`
      :root[data-theme="day"]{
        --bg:#f6f0e5;
        --panel:#fffaf1;
        --panel2:#f8f1e5;
        --line:#e8ddca;
        --line-focus:#f2bd32;
        --text:#2b2925;
        --muted:#817a70;
        --accent:#f5bd24;
        --accent2:#dfa817;
      }
      :root[data-theme="day"] body{
        background:linear-gradient(180deg,#fffaf1 0%,#f5eee2 100%) !important;
        color:var(--text) !important;
      }
      :root[data-theme="day"] header{
        background:rgba(255,250,241,.94) !important;
        border-bottom-color:#e9dfcf !important;
      }
      :root[data-theme="day"] .tabs{
        background:rgba(255,250,241,.96) !important;
        border-top-color:#e9dfcf !important;
      }
      :root[data-theme="day"] .card,
      :root[data-theme="day"] .e365card{
        background:linear-gradient(145deg,#fffdf8,#faf3e7) !important;
        border-color:#eadfce !important;
        box-shadow:0 8px 24px rgba(104,84,48,.08) !important;
      }
      :root[data-theme="day"] input,
      :root[data-theme="day"] textarea,
      :root[data-theme="day"] select,
      :root[data-theme="day"] .e365day,
      :root[data-theme="day"] .e365key,
      :root[data-theme="day"] .e365display{
        background:#fffaf1 !important;
        color:#2b2925 !important;
        border-color:#eadfce !important;
      }
      :root[data-theme="day"] .ico{
        background:#fffaf1 !important;
        border-color:#eadfce !important;
        color:#302e29 !important;
      }
      :root[data-theme="day"] .brand{color:#292722 !important}
      :root[data-theme="day"] .tab{color:#80786d !important}
      :root[data-theme="day"] .tab.active{color:#e3aa13 !important}
      :root[data-theme="day"] .primary,
      :root[data-theme="day"] .e365key.op,
      :root[data-theme="day"] .e365key.eq{
        background:#f8c534 !important;
        border-color:#f8c534 !important;
        color:#2b2925 !important;
      }
      :root[data-theme="day"] .e365calc{gap:10px}
      .e365display{
        height:100px !important;
        font-size:38px !important;
        font-weight:600 !important;
        padding:18px 20px !important;
        border-radius:20px !important;
      }
      .e365key{
        min-height:68px !important;
        font-size:23px !important;
        border-radius:17px !important;
      }
      .e365calc{gap:10px !important}
      @media(min-width:430px){
        .e365display{height:112px !important;font-size:42px !important}
        .e365key{min-height:76px !important;font-size:25px !important}
      }
      @media(max-width:390px){
        .e365display{height:90px !important;font-size:34px !important}
        .e365key{min-height:62px !important;font-size:21px !important}
      }
    `;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setTimeout(apply,300);
})();
