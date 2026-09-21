/* Entrega365 — carregamento dos módulos de backup/localização */
(function(){
  'use strict';
  const base='./';
  const loadScript=(src,type='text/javascript')=>new Promise((resolve,reject)=>{
    if(document.querySelector('script[data-e365-module="'+src+'"]'))return resolve();
    const s=document.createElement('script');s.src=base+src;s.dataset.e365Module=src;
    if(type==='module')s.type='module';
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
  const boot=async()=>{
    try{
      await loadScript('native-geolocation.js','text/javascript');
      await loadScript('manual-backup-ui.js','text/javascript');
      await loadScript('layout-reorg.js','text/javascript');
      await loadScript('plus-buttons-fix.js','text/javascript');
      await loadScript('more-menu-fix.js','text/javascript');
      await loadScript('secondary-backup-loader.js','module');
      await loadScript('drive-backup-loader.js','module');
    }catch(e){console.warn('Entrega365 módulos complementares:',e);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();