/* Entrega365 — exceção PRO para conta administradora de testes */
(function(){
  const ADMIN_EMAIL='andermuchael@gmail.com';
  const ADMIN_UID='EwrjXEWG3kbIVYufwYaDY6BMO7m1';
  const PLAN_KEY='entrega365:plan';
  const SESSION_KEY='dcv2:session';
  function apply(){
    const email=(localStorage.getItem('entrega365:email')||'').trim().toLowerCase();
    const session=localStorage.getItem(SESSION_KEY)||'';
    const uid=session.startsWith('google:')?session.slice('google:'.length):'';
    if((email===ADMIN_EMAIL || uid===ADMIN_UID) && session.startsWith('google:')){
      localStorage.setItem(PLAN_KEY,'active');
      localStorage.setItem('entrega365:adminPro','true');
    }else if(localStorage.getItem('entrega365:adminPro')==='true'){
      localStorage.removeItem('entrega365:adminPro');
      if(email===ADMIN_EMAIL || uid===ADMIN_UID) localStorage.removeItem(PLAN_KEY);
    }
  }
  apply();
  setInterval(apply,1000);
})();
