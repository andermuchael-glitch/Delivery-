/* Entrega365 — pré-visualização de YouTube e Instagram na Comunidade */
(function(){
  const ROOT='.cm-overlay';
  function getYouTubeId(raw){
    try{
      const u=new URL(raw);
      if(u.hostname.includes('youtu.be')) return u.pathname.split('/').filter(Boolean)[0]||'';
      if(u.hostname.includes('youtube.com')){
        if(u.pathname==='/watch') return u.searchParams.get('v')||'';
        const m=u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/); if(m)return m[1];
      }
    }catch{}
    return '';
  }
  function getInstagramUrl(raw){
    try{
      const u=new URL(raw);
      if(!/instagram\.com$/i.test(u.hostname)&&!/instagram\.com$/i.test(u.hostname.replace(/^www\./i,'')))return '';
      if(!/^\/(?:p|reel|reels|tv)\//i.test(u.pathname))return '';
      return 'https://www.instagram.com'+u.pathname;
    }catch{return ''}
  }
  function css(){
    if(document.getElementById('e365-media-preview-style'))return;
    const s=document.createElement('style');s.id='e365-media-preview-style';s.textContent=`
      .e365-media-preview{margin-top:8px;border:1px solid #444;border-radius:14px;overflow:hidden;background:#090909}
      .e365-media-preview iframe{display:block;width:100%;aspect-ratio:16/9;border:0}
      .e365-media-preview.instagram{background:#fff;min-height:430px;padding:8px;box-sizing:border-box}
      .e365-media-preview.instagram blockquote{margin:0 auto!important;max-width:540px!important;width:calc(100% - 4px)!important}
      .e365-preview-label{font-size:11px;color:#999;padding:7px 10px;border-bottom:1px solid #333}
      .cm-instagram-preview{display:flex;justify-content:center;background:#fff;padding:8px;overflow:hidden;border-top:1px solid #303030;border-bottom:1px solid #303030}
      .cm-instagram-preview blockquote{margin:0 auto!important;max-width:540px!important;width:calc(100% - 8px)!important}
    `;document.head.appendChild(s)
  }
  function loadInstagram(){
    if(window.instgrm?.Embeds?.process){try{window.instgrm.Embeds.process();return}catch{}}
    if(document.getElementById('e365-instagram-embed-js'))return;
    const s=document.createElement('script');s.id='e365-instagram-embed-js';s.async=true;s.src='https://www.instagram.com/embed.js';document.head.appendChild(s)
  }
  function composer(){
    const modal=document.querySelector(ROOT); if(!modal)return;
    const input=modal.querySelector('#cm-url'); if(!input||input.dataset.e365PreviewBound)return;
    input.dataset.e365PreviewBound='1';
    const preview=document.createElement('div');preview.id='e365-link-preview';preview.className='e365-media-preview';preview.style.display='none';
    input.insertAdjacentElement('afterend',preview);
    function update(){
      const raw=input.value.trim(); const yt=getYouTubeId(raw); const ig=getInstagramUrl(raw);
      preview.innerHTML='';preview.style.display='none';
      if(yt){
        preview.innerHTML='<div class="e365-preview-label">▶️ Pré-visualização do YouTube</div><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(yt)+'" title="Pré-visualização do YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        preview.style.display='block';
      }else if(ig){
        preview.className='e365-media-preview instagram';
        const b=document.createElement('blockquote');b.className='instagram-media';b.setAttribute('data-instgrm-permalink',ig);b.setAttribute('data-instgrm-version','14');b.style.cssText='background:#fff;border:0;margin:0 auto;max-width:540px;min-width:280px;width:calc(100% - 8px);';preview.appendChild(b);preview.style.display='block';loadInstagram();setTimeout(()=>window.instgrm?.Embeds?.process?.(),300);
      }
    }
    input.addEventListener('input',update);input.addEventListener('change',update);input.addEventListener('paste',()=>setTimeout(update,0));
  }
  function feed(){
    const modal=document.querySelector(ROOT); if(!modal)return;
    modal.querySelectorAll('.cm-link').forEach(a=>{
      if(a.dataset.e365EmbedDone)return;
      const raw=a.getAttribute('href')||'';const ig=getInstagramUrl(raw);if(!ig)return;
      a.dataset.e365EmbedDone='1';
      const wrap=document.createElement('div');wrap.className='cm-instagram-preview';
      const b=document.createElement('blockquote');b.className='instagram-media';b.setAttribute('data-instgrm-permalink',ig);b.setAttribute('data-instgrm-version','14');b.style.cssText='background:#fff;border:0;margin:0 auto;max-width:540px;min-width:280px;width:calc(100% - 8px);';wrap.appendChild(b);a.replaceWith(wrap);loadInstagram();setTimeout(()=>window.instgrm?.Embeds?.process?.(),300)
    });
  }
  function run(){css();composer();feed()}
  const mo=new MutationObserver(()=>{clearTimeout(window.__e365MediaPreviewTimer);window.__e365MediaPreviewTimer=setTimeout(run,80)});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(run,400);
  window.e365RefreshMediaPreview=run;
})();
