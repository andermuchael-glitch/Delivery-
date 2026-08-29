/* Entrega365 — sincronização do PRO exclusivamente pelo Mercado Pago */
(function(){
  const PLAN_KEY='entrega365:plan';
  const SUB_KEY='entrega365:subscriptionId';
  let busy=false;
  const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  function email(){
    const e=(localStorage.getItem('entrega365:email')||'').trim().toLowerCase();
    return valid(e)?e:'';
  }
  async function sync(){
    const mail=email();
    if(!mail||busy)return;
    busy=true;
    try{
      const sub=localStorage.getItem(SUB_KEY)||'';
      const q='/api/pro-status?email='+encodeURIComponent(mail)+(sub?'&subscription_id='+encodeURIComponent(sub):'');
      const r=await fetch(q,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json();
      if(d.subscription_id)localStorage.setItem(SUB_KEY,String(d.subscription_id));
      const previous=localStorage.getItem(PLAN_KEY)||'free';
      const next=d.active?'active':'free';
      localStorage.setItem(PLAN_KEY,next);
      localStorage.setItem('entrega365:proSyncedAt',String(Date.now()));
      if(previous!==next)window.dispatchEvent(new CustomEvent('e365-pro-updated',{detail:{active:d.active,status:d.status||''}}));
    }catch(e){
      // Em falha temporária de rede, preserva o último estado confirmado em vez de derrubar um PRO válido.
      console.warn('PRO sync:',e);
    }finally{busy=false}
  }
  window.e365IsPro=()=>localStorage.getItem(PLAN_KEY)==='active';
  window.e365SyncPro=sync;
  setTimeout(sync,700);
  setInterval(sync,30000);
  window.addEventListener('online',sync);
})();