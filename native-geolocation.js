/* Entrega365 — geolocalização nativa Android/iOS + fallback web */
(function(){
  'use strict';

  const KEY='entrega365:location';
  let watchId=null;
  let nativePlugin=null;

  function isNative(){
    const p=window.Capacitor?.getPlatform?.();
    return !!(window.Capacitor?.isNativePlatform?.() || (p && p!=='web'));
  }

  function getNativePlugin(name){
    const cap=window.Capacitor;
    if(!cap)return null;
    if(cap.Plugins?.[name])return cap.Plugins[name];
    if(typeof cap.registerPlugin==='function'){
      try{return cap.registerPlugin(name);}catch(e){console.warn('Entrega365 plugin '+name+':',e);}
    }
    return null;
  }

  async function plugin(){
    if(nativePlugin)return nativePlugin;
    nativePlugin=getNativePlugin('Geolocation');
    if(!nativePlugin)throw new Error('geolocation_plugin_unavailable');
    return nativePlugin;
  }

  function save(position){
    const c=position?.coords||position;
    if(!c||typeof c.latitude!=='number'||typeof c.longitude!=='number')return null;
    const value={
      latitude:c.latitude,
      longitude:c.longitude,
      accuracy:Number(c.accuracy||0),
      altitude:c.altitude==null?null:Number(c.altitude),
      speed:c.speed==null?null:Number(c.speed),
      heading:c.heading==null?null:Number(c.heading),
      timestamp:Number(position?.timestamp||Date.now())
    };
    localStorage.setItem(KEY,JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('e365-location',{detail:value}));
    window.dispatchEvent(new Event('e365-data-changed'));
    window.entrega365DataSync?.markDirty?.();
    return value;
  }

  async function permission(){
    if(isNative()){
      const g=await plugin();
      const p=await g.requestPermissions({permissions:['location']});
      if(p?.location==='denied')throw new Error('location_permission_denied');
      return p;
    }
    if(!navigator.geolocation)throw new Error('geolocation_unavailable');
    return {location:'granted'};
  }

  async function current(){
    await permission();
    if(isNative()){
      const g=await plugin();
      return save(await g.getCurrentPosition({
        enableHighAccuracy:true,
        timeout:15000,
        maximumAge:10000
      }));
    }
    return await new Promise((resolve,reject)=>
      navigator.geolocation.getCurrentPosition(
        p=>resolve(save(p)),
        reject,
        {enableHighAccuracy:true,timeout:15000,maximumAge:10000}
      )
    );
  }

  async function start(){
    await permission();
    if(watchId!==null)return {watchId,running:true,background:true};

    if(isNative()){
      const g=await plugin();
      watchId=await g.watchPosition(
        {enableHighAccuracy:true,timeout:15000,maximumAge:5000,minimumUpdateInterval:5000},
        (position,error)=>{if(!error&&position)save(position);}
      );

      let background={supported:false};
      try{
        if(window.e365BackgroundLocation?.start)
          background=await window.e365BackgroundLocation.start();
      }catch(e){
        console.warn('Entrega365 localização em segundo plano:',e);
        background={supported:true,error:e?.message||String(e)};
      }

      await current().catch(()=>null);
      localStorage.setItem('entrega365:locationTracking','1');
      return {watchId,running:true,...background};
    }

    watchId=navigator.geolocation.watchPosition(
      p=>save(p),
      e=>console.warn('Entrega365 localização:',e),
      {enableHighAccuracy:true,maximumAge:5000,timeout:15000}
    );
    await current().catch(()=>null);
    localStorage.setItem('entrega365:locationTracking','1');
    return {watchId,running:true,background:false};
  }

  async function stop(){
    if(watchId!==null){
      if(isNative()){
        const g=await plugin().catch(()=>null);
        await g?.clearWatch?.({id:watchId}).catch?.(()=>{});
      }else if(navigator.geolocation){
        navigator.geolocation.clearWatch(watchId);
      }
    }
    watchId=null;
    try{await window.e365BackgroundLocation?.stop?.();}catch{}
    localStorage.setItem('entrega365:locationTracking','0');
  }

  function last(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null');}
    catch{return null;}
  }

  async function toggle(){
    if(watchId!==null||localStorage.getItem('entrega365:locationTracking')==='1'){
      await stop();
      return false;
    }
    await start();
    return true;
  }

  window.entrega365Location={
    permission,current,start,stop,toggle,last,isNative:isNative
  };
})();