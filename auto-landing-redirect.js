// Auto-redirect from old intro to professional landing page
(function() {
  function shouldRedirect() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('entrar') === '1') return false;
      
      // Check if user is logged in
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('session') && localStorage.getItem(key)) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  function doRedirect() {
    if (shouldRedirect()) {
      window.location.replace('/landing.html');
    }
  }

  // Run immediately and also after a short delay
  doRedirect();
  setTimeout(doRedirect, 300);
  setTimeout(doRedirect, 1000);

  // Override showLogin if it exists
  const checkOverride = setInterval(() => {
    if (typeof window.showLogin === 'function') {
      const original = window.showLogin;
      window.showLogin = function() {
        if (shouldRedirect()) {
          window.location.replace('/landing.html');
          return;
        }
        return original.apply(this, arguments);
      };
      clearInterval(checkOverride);
    }
  }, 100);
})();
