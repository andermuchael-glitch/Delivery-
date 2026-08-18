(function(){'use strict';if(window.__deliveryThemeLoaded)return;window.__deliveryThemeLoaded=true;
const KEY='delivery-theme';
const saved=localStorage.getItem(KEY)||'light';
document.documentElement.dataset.theme=saved;
const css=`
:root{--yellow:#ffd200;--bg:#fff;--panel:#fff;--panel2:#f7f7f7;--line:#dedede;--text:#151515;--muted:#6f6f6f;--blue:var(--yellow);--blue2:#e4b900;--cyan:#151515}
:root[data-theme="light"] body{background:#f4f4f4!important;color:#151515!important}
:root[data-theme="light"] header{background:rgba(255,255,255,.97)!important;border-color:#dedede!important;color:#151515!important}
:root[data-theme="light"] .logo{border-color:#151515!important;background:#ffd200!important}
:root[data-theme="light"] .brand{color:#151515!important}.sub{color:#6f6f6f!important}
:root[data-theme="light"] .ico,:root[data-theme="light"] .navbtn{background:#fff!important;border-color:#d7d7d7!important;color:#151515!important}
:root[data-theme="light"] .tabs{background:rgba(255,255,255,.98)!important;border-color:#dedede!important}
:root[data-theme="light"] .tab{color:#666!important}.tab.active{color:#151515!important}
:root[data-theme="light"] .tab b{filter:none!important;opacity:1!important;text-shadow:0 0 0 #151515}
:root[data-theme="light"] .card{background:#fff!important;border-color:#dedede!important;color:#151515!important;box-shadow:0 4px 18px rgba(0,0,0,.07)!important}
:root[data-theme="light"] .hero,:root[data-theme="light"] .stat{background:#fafafa!important;border-color:#dedede!important}
:root[data-theme="light"] .blue,:root[data-theme="light"] .bigblue{color:#151515!important}.yellow{color:var(--yellow)!important}
:root[data-theme="light"] .primary{background:var(--yellow)!important;color:#151515!important;box-shadow:0 6px 18px rgba(255,210,0,.3)!important}
:root[data-theme="light"] .add{background:var(--yellow)!important;border-color:#d4ad00!important;color:#151515!important;box-shadow:0 5px 14px rgba(255,210,0,.22)!important}
:root[data-theme="light"] input,:root[data-theme="light"] select{background:#fff!important;color:#151515!important;border-color:#d2d2d2!important}
:root[data-theme="light"] input:focus,:root[data-theme="light"] select:focus{border-color:var(--yellow)!important;box-shadow:0 0 0 2px rgba(255,210,0,.16)!important}
:root[data-theme="light"] .check{accent-color:var(--yellow)!important}:root[data-theme="light"] .line,:root[data-theme="light"] .tablehead,:root[data-theme="light"] .dayitem{border-color:#dedede!important}
:root[data-theme="light"] .sum{color:#666!important}.sum.total{color:#151515!important;border-color:#dedede!important}
:root[data-theme="light"] .kmresult{background:#fffdf0!important;border-color:#e1bd00!important}.kmresult b{color:#151515!important}
:root[data-theme="light"] .notice{background:#fafafa!important;border-color:#dedede!important;color:#666!important}:root[data-theme="light"] .notice.warn{background:#fff8d8!important;border-color:#e1c000!important;color:#6b5700!important}
:root[data-theme="light"] .oilbox{background:#fffdf0!important;border-color:#e1bd00!important}.kv{border-color:#dedede!important}
:root[data-theme="light"] .day-ui .cmd-list-card .entry{background:#fafafa!important;border-color:#dedede!important}:root[data-theme="light"] .day-ui .day-close-card{background:#fff!important;border-color:#dedede!important}
:root[data-theme="light"] .company-profile-bar,:root[data-theme="light"] .latest-worked-card{background:#fff!important;border-color:#dedede!important}
:root[data-theme="light"] .company-title,:root[data-theme="light"] .latest-date,:root[data-theme="light"] .latest-grid b{color:#151515!important}
:root[data-theme="light"] .company-action{background:#fff!important;color:#151515!important;border-color:#dedede!important}:root[data-theme="light"] .company-add{background:#fffdf0!important;color:#151515!important;border-color:#e1bd00!important}
:root[data-theme="dark"] body{background:#1a1a1a!important;color:#f5f5f5!important}
:root[data-theme="dark"] header{background:rgba(28,28,28,.97)!important;border-color:#3a3a3a!important;color:#fff!important}
:root[data-theme="dark"] .logo{border-color:var(--yellow)!important;background:#ffd200!important}
:root[data-theme="dark"] .ico,:root[data-theme="dark"] .navbtn{background:#242424!important;border-color:#414141!important;color:#fff!important}
:root[data-theme="dark"] .tabs{background:rgba(24,24,24,.98)!important;border-color:#3a3a3a!important}
:root[data-theme="dark"] .tab{color:#d0d0d0!important}.tab.active{color:var(--yellow)!important}
:root[data-theme="dark"] .tab b{filter:none!important;opacity:1!important;text-shadow:0 1px 3px #000}
:root[data-theme="dark"] .card{background:#242424!important;border-color:#3a3a3a!important;color:#f5f5f5!important;box-shadow:0 8px 28px rgba(0,0,0,.32)!important}
:root[data-theme="dark"] .hero,:root[data-theme="dark"] .stat{background:#202020!important;border-color:#3a3a3a!important}
:root[data-theme="dark"] input,:root[data-theme="dark"] select{background:#202020!important;border-color:#444!important;color:#fff!important}
:root[data-theme="dark"] input:focus,:root[data-theme="dark"] select:focus{border-color:var(--yellow)!important;box-shadow:0 0 0 2px rgba(255,210,0,.15)!important}
:root[data-theme="dark"] .primary{background:var(--yellow)!important;color:#151515!important}:root[data-theme="dark"] .add{background:var(--yellow)!important;color:#151515!important;border-color:#ffd200!important}
:root[data-theme="dark"] .kmresult{background:#202020!important;border-color:#555!important}:root[data-theme="dark"] .kmresult b{color:var(--yellow)!important}
:root[data-theme="dark"] .notice{background:#202020!important;border-color:#3a3a3a!important;color:#d0d0d0!important}:root[data-theme="dark"] .oilbox{background:#202020!important;border-color:#555!important}
:root[data-theme="dark"] .day-ui .cmd-list-card .entry{background:#202020!important;border-color:#3a3a3a!important}:root[data-theme="dark"] .day-ui .day-close-card{background:#242424!important;border-color:#555!important}
:root[data-theme="dark"] .company-profile-bar,:root[data-theme="dark"] .latest-worked-card{background:#242424!important;border-color:#444!important}
:root[data-theme="dark"] .company-title,:root[data-theme="dark"] .latest-date,:root[data-theme="dark"] .latest-grid b{color:#fff!important}
:root[data-theme="dark"] .company-action{background:#242424!important;color:#fff!important;border-color:#444!important}:root[data-theme="dark"] .company-add{background:#202020!important;color:var(--yellow)!important;border-color:#555!important}
:root[data-theme="dark"] .radio-page{background:#1a1a1a!important;color:#fff!important}.radio-main{background:#242424!important}.radio-station{background:#242424!important;border-color:#3f3f3f!important;color:#fff!important}.radio-station.active{background:#2a2a24!important;border-color:var(--yellow)!important}.radio-station-icon{background:#303030!important;color:#f0f0f0!important}.radio-station.active .radio-station-icon{background:var(--yellow)!important;color:#151515!important}.radio-mini{background:#242424!important;border-color:#444!important}
.theme-switch{display:flex;gap:6px;margin:8px 0 12px;padding:4px;background:#eee;border-radius:13px;border:1px solid #ddd}.theme-switch button{flex:1;border:0;border-radius:10px;padding:9px 8px;background:transparent;color:#666;font-weight:900;font-size:12px}.theme-switch button.active{background:var(--yellow);color:#151515;box-shadow:0 2px 6px rgba(0,0,0,.12)}:root[data-theme="dark"] .theme-switch{background:#242424;border-color:#444}:root[data-theme="dark"] .theme-switch button{color:#ddd}:root[data-theme="dark"] .theme-switch button.active{color:#151515}
`;
const style=document.createElement('style');style.id='deliveryThemeStyle';style.textContent=css;document.head.appendChild(style);
function updateMeta(){let m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m)}m.content=document.documentElement.dataset.theme==='light'?'#ffffff':'#1a1a1a'}
function update(){document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===document.documentElement.dataset.theme))}
function setTheme(v){localStorage.setItem(KEY,v);document.documentElement.dataset.theme=v;update();updateMeta()}
function mount(){if(view==='radio')return;if(document.getElementById('themeSwitch'))return;const main=document.querySelector('main');if(!main)return;const wrap=document.createElement('div');wrap.id='themeSwitch';wrap.className='theme-switch';wrap.innerHTML='<button data-theme-choice="light">☀ Claro</button><button data-theme-choice="dark">☾ Escuro</button>';wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>setTheme(b.dataset.themeChoice));main.prepend(wrap);update()}
updateMeta();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80));else setTimeout(mount,80);
if(typeof shell==='function'){const old=shell;shell=function(c){old(c);setTimeout(mount,20)}}
if(typeof go==='function'){const old=go;go=function(v){old(v);setTimeout(mount,20)}}
})();