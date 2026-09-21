/* Entrega365 — geolocalização nativa Android/iOS + fallback web */
(function(){
  'use strict';
  const KEY='entrega365:location';
  let watchId=null,nativePlugin=null;
  function native(){const p=window.Capacitor?.getPlatform?.();return !!(window.Capacitor?.isNativePlatform?.()||(p&&p!=='web'))}
  async function plugin(){if(nativePlugin)return nativePlugin;const mod=await import('https://esm.sh/@capacitor/geolocation@8.0.0');nativePlugin=window.Capacitor?.Plugins?.Geolocation||mod?.Geolocation;return nativePlugin}
  function save(position){
    const c=position?.coords||position;if(!c||typeof c.latitude!=='number'||typeof c.longitude!=='number')return null;
    const value={latitude:c.latitude,longitude:c.longitude,accuracy:Number(c.accuracy||0),altitude:c.altitude==null?null:Number(c.altitude),speed:c.speed==null?null:Number(c.speed),heading:c.heading==null?null:Number(c.heading),timestamp:Number(position?.timestamp||Date.now())};
    localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new CustomEvent('e365-location',{detail:value}));window.dispatchEvent(new Event('e365-data-changed'));window.entrega365DataSync?.markDirty?.();return value;
  }
  async function permission(){
    if(native()){const g=await plugin();if(!g)throw new Error('geolocation_plugin_unavailable');const p=await g.requestPermissions({permissions:['location']});if(p?.location==='denied')throw new Error('location_permission_denied');return p}
    if(!navigator.geolocation)throw new Error('geolocation_unavailable');return {location:'granted'}
  }
  async function current(){
    await permission();
    if(native()){const g=await plugin();return save(await g.getCurrentPosition({enableHighAccuracy:true,timeout:15000,maximumAge:10000}))}
    return await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(save(p)),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:10000}))
  }
  async function start(){
    await permission();if(watchId!==null)return {watchId,running:true};
    if(native()){const g=await plugin();watchId=await g.watchPosition({enableHighAccuracy:true,timeout:15000,maximumAge:5000},(position,error)=>{if(!error)save(position)})}
    else watchId=navigator.geolocation.watchPosition(p=>save(p),e=>console.warn('Entrega365 localização:',e),{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    await current().catch(()=>null);localStorage.setItem('entrega365:locationTracking','1');return {watchId,running:true}
  }
  async function stop(){
    if(watchId===null){localStorage.setItem('entrega365:locationTracking','0');return}
    if(native()){const g=await plugin();await g?.clearWatch({id:watchId})}else navigator.geolocation.clearWatch(watchId);
    watchId=null;localStorage.setItem('entrega365:locationTracking','0')
  }
  function last(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
  async function toggle(){if(watchId!==null||localStorage.getItem('entrega365:locationTracking')==='1'){await stop();return false}await start();return true}
  window.entrega365Location={permission,current,start,stop,toggle,last,isNative:native};
})();