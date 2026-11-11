// Force redirect from intro to professional landing
(function(){
  function checkAndRedirect(){
    try{
      const params = new URLSearchParams(window.location.search);
      if(params.get('entrar') === '1'){
        // Allow app to show login
        return;
      }
      // If no session, redirect to landing
      let hasSession = false;
      for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(key && key.includes('session')){
          hasSession = true;
          break;
        }
      }
      if(!hasSession && window.location.pathname === '/' || window.location.pathname === '/index.html'){
        // Small delay to let app init
        setTimeout(()=>{
          if(document.body && document.body.innerText.includes('ENTRAR NO ENTREGA365') || document.querySelector('.login-intro')){
            window.location.href = '/landing.html';
          }
        }, 800);
      }
    }catch(e){}
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', checkAndRedirect);
  }else{
    checkAndRedirect();
  }
  // Also override showLogin if present
  setTimeout(()=>{
    if(typeof window.showLogin === 'function'){
      const orig = window.showLogin;
      window.showLogin = function(){
        const params = new URLSearchParams(window.location.search);
        if(params.get('entrar') !== '1' && typeof loginScreen !== 'undefined' && loginScreen === 'intro'){
          window.location.href = '/landing.html';
          return;
        }
        return orig.apply(this, arguments);
      };
    }
  }, 500);
})();
