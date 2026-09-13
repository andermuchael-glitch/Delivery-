/* Entrega365 — Comunidade: publicações mais compactas */
(function(){
'use strict';
function apply(){
  if(!document.getElementById('e365-community-post-size')){
    const s=document.createElement('style');s.id='e365-community-post-size';
    s.textContent=`
      .cm-post{max-width:100%;}
      .cm-post .cm-image img{display:block;width:100%;height:360px;max-height:360px;object-fit:contain;background:#090909;}
      .cm-post .cm-media{max-height:420px;aspect-ratio:16/9;}
      .cm-post .cm-media iframe{max-height:420px;}
      @media(max-width:600px){
        .cm-post .cm-image img{height:340px;max-height:340px;}
        .cm-post .cm-media{max-height:340px;aspect-ratio:16/9;}
        .cm-post .cm-media iframe{max-height:340px;}
        .cm-post-head{padding:11px 12px 4px;}
        .cm-actions{padding:8px 10px;}
      }
    `;document.head.appendChild(s);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
