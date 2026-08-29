/* Entrega365 — sincronização persistente do PRO */
(function(){
  const PLAN_KEY='entrega365:plan';
  const SUB_KEY='entrega365:subscriptionId';
  const ADMIN='andermuchael@gmail.com';
  let busy=false;
  const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  function email(){
    const e=localStorage.getItem('entrega365:email')||'';
    if(valid(e)) return e.trim().toLowerCase();
    return '';
  }
  function isPro(){return email()===ADMIN || localStorage.getItem(PLAN_KEY)==='active';}
  window.e365IsPro=()=>isPro();
  async function sync(){
    const mail=email();
    if(!mail || busy)return;
    if(mail===ADMIN){localStorage.setItem(PLAN_KEY,'active');localStorage.setItem('entrega365:adminPro','true');window.e365ApplyProLayout?.();return}
    busy=true;
    try{
      const sub=localStorage.getItem(SUB_KEY)||'';
      const q='/api/pro-status?email='+encodeURIComponent(mail)+(sub?'&subscription_id='+encodeURIComponent(sub):'');
      const r=await fetch(q,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)return;
      const d=await r.json();
      if(d.subscription_id)localStorage.setItem(SUB_KEY,String(d.subscription_id));
      localStorage.setItem(PLAN_KEY,d.active?'active':'free');window.e365ApplyProLayout?.();
    }catch(e){console.warn('PRO sync:',e)}finally{busy=false}
  }
  window.e365SyncPro=sync;
  setTimeout(sync,150);
  setInterval(sync,30000);
})();
