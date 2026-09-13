/* Entrega365 — Backup manual no Google Drive dentro do + do cabeçalho */
(function(){
  'use strict';
  const STYLE='e365-manual-backup-style';
  let menu=null;
  function actions(){return document.querySelector('header .actions,.actions')}
  function plus(){const a=actions();if(!a)return null;return [...a.querySelectorAll('.ico,button')].find(b=>/^\s*\+\s*$/.test((b.textContent||'').trim()))||null}
  function styles(){if(document.getElementById(STYLE))return;const s=document.createElement('style');s.id=STYLE;s.textContent=`.e365-backup-menu{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:flex-start;justify-content:flex-end;padding:82px 14px 14px}.e365-backup-card{width:min(330px,calc(100vw - 28px));background:#202020;border:1px solid #444;border-radius:18px;padding:16px;box-shadow:0 15px 45px rgba(0,0,0,.55)}.e365-backup-title{font-size:18px;font-weight:900;color:#fff;margin-bottom:5px}.e365-backup-sub{font-size:12px;color:#aaa;margin-bottom:13px}.e365-backup-action{width:100%;min-height:54px;border:1px solid #555;border-radius:13px;background:#ffd000;color:#111;font-weight:900;font-size:15px}.e365-backup-status{font-size:12px;color:#aaa;margin-top:10px;min-height:18px}.e365-backup-close{margin-top:9px;width:100%;min-height:42px;border:1px solid #444;border-radius:12px;background:#292929;color:#fff;font-weight:800}`;document.head.appendChild(s)}
  function close(){if(menu){menu.remove();menu=null}}
  async function runBackup(status,button){
    if(typeof window.entrega365DriveManualBackup!=='function'){status.textContent='⏳ O backup ainda está carregando. Tente novamente em alguns segundos.';return}
    button.disabled=true;button.textContent='⏳ SALVANDO NO DRIVE...';status.textContent='Preparando o backup dos seus dados...';
    try{const ok=await window.entrega365DriveManualBackup();if(ok){status.textContent='✅ Backup salvo no Google Drive com sucesso.';button.textContent='💾 BACKUP SALVO';}else{status.textContent='⚠️ Não foi possível salvar. Verifique sua conexão e autorização do Google Drive.';button.disabled=false;button.textContent='💾 SALVAR BACKUP NO DRIVE';}}catch(e){status.textContent='⚠️ Não foi possível salvar o backup.';button.disabled=false;button.textContent='💾 SALVAR BACKUP NO DRIVE'}}
  function open(){close();styles();menu=document.createElement('div');menu.className='e365-backup-menu';menu.innerHTML=`<div class="e365-backup-card"><div class="e365-backup-title">💾 Backup</div><div class="e365-backup-sub">Salve manualmente seus dados atuais no Google Drive quando quiser confirmar que o backup está atualizado.</div><button class="e365-backup-action">💾 SALVAR BACKUP NO DRIVE</button><div class="e365-backup-status"></div><button class="e365-backup-close">Fechar</button></div>`;document.body.appendChild(menu);const b=menu.querySelector('.e365-backup-action'),st=menu.querySelector('.e365-backup-status');b.addEventListener('click',()=>runBackup(st,b));menu.addEventListener('click',e=>{if(e.target===menu||e.target.closest('.e365-backup-close'))close()})}
  function install(){
    styles();const p=plus();if(p){p.style.display='inline-flex';p.title='Mais opções e Backup';p.setAttribute('aria-label','Mais opções e Backup')}
    if(window.__e365ManualBackupClick)return;window.__e365ManualBackupClick=true;
    document.addEventListener('click',e=>{const p2=e.target?.closest?.('header .actions .ico,header .actions button,.actions .ico,.actions button');if(!p2)return;if(/^\s*\+\s*$/.test((p2.textContent||'').trim())){e.preventDefault();e.stopImmediatePropagation();open()}},true);
  }
  function boot(){install();setTimeout(install,300);setTimeout(install,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  new MutationObserver(()=>{const p=plus();if(p&&p.style.display==='none')p.style.display='inline-flex'}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
})();
