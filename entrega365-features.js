/* Entrega365 features loader */
(function(){
  const KEY='entrega365:settings';
  let s={theme:'night',stayConnected:true};
  try{s={...s,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
  localStorage.setItem(KEY,JSON.stringify(s));
  document.documentElement.dataset.theme=s.theme==='day'?'day':'night';
})();
