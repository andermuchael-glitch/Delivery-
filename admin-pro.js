/* Entrega365 — exceção PRO para conta administradora de testes */
(function(){
  const ADMIN_EMAIL='andermuchael@gmail.com';
  const PLAN_KEY='entrega365:plan';
  const SESSION_KEY='dcv2:session';
  function apply(){
    const email=(localStorage.getItem('entrega365:email')||'').trim().toLowerCase();
    const session=localStorage.getItem(SESSION_KEY)||'';
    if(email===ADMIN_EMAIL && session.startsWith('google:')){
      localStorage.setItem(PLAN_KEY,'active');
      localStorage.setItem('entrega365:adminPro','true');
      window.e365ApplyProLayout?.();
    }else if(localStorage.getItem('entrega365:adminPro')==='true'){
      localStorage.removeItem('entrega365:adminPro');
      if(email===ADMIN_EMAIL) localStorage.removeItem(PLAN_KEY);
      window.e365ApplyProLayout?.();
    }
  }
  apply();
  setInterval(apply,1000);
})();
