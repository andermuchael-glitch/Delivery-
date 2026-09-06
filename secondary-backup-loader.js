import { initSecondaryBackup } from './secondary-backup.js';
(function boot(){
  const start=()=>{const auth=window.entrega365Auth?.auth;if(auth){initSecondaryBackup(auth);return true}return false};
  if(start())return;
  let n=0;const t=setInterval(()=>{if(start()||++n>80)clearInterval(t)},250);
})();
