(function(){
  "use strict";
  const api=()=>{const c=window.Capacitor;if(!c)return null;return c.Plugins?.BackgroundLocation||(typeof c.registerPlugin==='function'?c.registerPlugin('BackgroundLocation'):null)};
  let starting=false;

  async function start(){
    const p=api();
    if(!p?.start)return {supported:false};
    if(starting)return {supported:true,starting:true};
    starting=true;
    try{
      const r=await p.start();
      if(r?.backgroundRequired){
        console.info("Entrega365: conceda 'Permitir o tempo todo' nas permissões de localização.");
      }
      return r||{};
    }catch(e){
      console.warn("Entrega365 localização:",e);
      return {error:e?.message||String(e)};
    }finally{
      starting=false;
    }
  }

  async function stop(){
    const p=api();
    if(!p?.stop)return;
    try{return await p.stop();}catch(e){console.warn("Entrega365 parar localização:",e);}
  }

  async function buffered(){
    const p=api();
    if(!p?.getBufferedLocations)return [];
    try{const r=await p.getBufferedLocations();return Array.isArray(r?.points)?r.points:[];}catch(e){return []}
  }

  async function clearBuffered(){
    const p=api();
    if(!p?.clearBufferedLocations)return;
    try{return await p.clearBufferedLocations();}catch(e){console.warn("Entrega365 limpar buffer:",e);}
  }

  async function status(){
    const p=api();
    if(!p?.status)return {supported:false};
    try{return await p.status();}catch(e){return {supported:true,error:e?.message||String(e)};}
  }

  window.e365BackgroundLocation={start,stop,status,buffered,clearBuffered};

  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible" && window.e365GetCurrentUser?.()){
      setTimeout(start,500);
    }
  });

  window.addEventListener("focus",()=>{
    if(window.e365GetCurrentUser?.())setTimeout(start,500);
  });

  // O serviço é iniciado depois que o login Google estiver concluído.
  const boot=setInterval(()=>{
    if(window.e365GetCurrentUser?.()){
      clearInterval(boot);
      setTimeout(start,700);
    }
  },1000);
  setTimeout(()=>clearInterval(boot),30000);
})();
