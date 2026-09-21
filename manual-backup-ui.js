/* Entrega365 — Backup local manual */
(function(){
  'use strict';
  const STYLE='e365-local-backup-style';
  const SESSION_KEY='dcv2:session';
  const GLOBAL_KEYS=['entrega365:locale','entrega365:agenda','entrega365:settings','e365month'];
  const BLOCKED_PREFIXES=[
    'entrega365:driveAccessToken','entrega365:driveAccessTokenExp','entrega365:driveAuthorized',
    'entrega365:driveAuthPending','entrega365:cloudState:','entrega365:syncBridge:',
    'entrega365:driveState:','entrega365:runtime-'
  ];

  function session(){return String(localStorage.getItem(SESSION_KEY)||'').trim();}
  function allowedKey(k){
    const s=session();
    if(!s||!k)return false;
    if(BLOCKED_PREFIXES.some(p=>k===p||k.startsWith(p)))return false;
    if(k.startsWith('dcv2:'+s+':'))return true;
    if(k==='entrega365:establishments:'+s||k==='entrega365:currentEstablishment:'+s)return true;
    return GLOBAL_KEYS.includes(k);
  }
  function snapshot(){
    const data={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(allowedKey(k))data[k]=localStorage.getItem(k);
    }
    return data;
  }
  function styles(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');
    s.id=STYLE;
    s.textContent=`
      .e365-local-backup-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.74);display:flex;align-items:flex-end}
      .e365-local-backup-card{width:100%;max-width:600px;margin:auto;background:#1e1e1e;border:1px solid #444;border-radius:22px 22px 0 0;padding:20px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.55)}
      .e365-local-backup-title{font-size:19px;font-weight:900;color:#fff}
      .e365-local-backup-sub{font-size:12px;color:#aaa;line-height:1.45;margin:5px 0 15px}
      .e365-local-backup-btn{width:100%;min-height:56px;border:1px solid #555;border-radius:14px;background:#282828;color:#fff;font-weight:900;font-size:14px;margin-top:9px}
      .e365-local-backup-btn.primary{background:linear-gradient(135deg,#ffe45c,#ffd000);color:#111;border-color:#ffd000}
      .e365-local-backup-status{min-height:18px;margin-top:11px;color:#aaa;font-size:12px;line-height:1.4}
      .e365-local-backup-close{width:100%;min-height:44px;border:1px solid #444;border-radius:12px;background:#292929;color:#fff;font-weight:800;margin-top:9px}
    `;
    document.head.appendChild(s);
  }

  function close(){document.querySelector('.e365-local-backup-overlay')?.remove();}

  function downloadBackup(status){
    const s=session();
    if(!s){status.textContent='⚠️ Nenhuma sessão ativa para fazer o backup.';return;}
    const storage=snapshot();
    const payload={
      schema:'entrega365-local-backup',
      version:2,
      user:s,
      exportedAt:new Date().toISOString(),
      storage
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href=url;
    a.download='entrega365-backup-local-'+stamp+'.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='✅ Backup local baixado. Foram incluídos '+Object.keys(storage).length+' registros de armazenamento do usuário.';
  }

  function legacyToStorage(data){
    if(!data||typeof data!=='object'||!data.user)return null;
    const u=String(data.user);
    const out={};
    if(data.days&&typeof data.days==='object')Object.entries(data.days).forEach(([k,v])=>out['dcv2:'+u+':day:'+k]=JSON.stringify(v));
    if(data.expenses&&typeof data.expenses==='object')Object.entries(data.expenses).forEach(([k,v])=>out['dcv2:'+u+':exp:'+k]=JSON.stringify(v));
    if(data.mechanica)out['dcv2:'+u+':mechanica']=JSON.stringify(data.mechanica);
    if(data.finance)out['dcv2:'+u+':finance']=JSON.stringify(data.finance);
    return out;
  }

  async function importBackup(status){
    const s=session();
    if(!s){status.textContent='⚠️ Faça login antes de subir um backup.';return;}
    const input=document.createElement('input');
    input.type='file';
    input.accept='.json,application/json';
    input.onchange=async()=>{
      const file=input.files?.[0];
      if(!file)return;
      try{
        const raw=await file.text();
        const data=JSON.parse(raw);
        let storage=data?.storage;
        const backupUser=String(data?.user||'').trim();
        if(!storage&&data?.days)storage=legacyToStorage(data);
        if(!storage||typeof storage!=='object')throw new Error('formato');
        if(backupUser&&backupUser!==s){
          status.textContent='⚠️ Este backup pertence a outra conta. Para proteger seus dados, a restauração foi bloqueada.';
          return;
        }
        const keys=Object.keys(storage).filter(allowedKey);
        if(!keys.length){
          status.textContent='⚠️ O arquivo não contém dados compatíveis com esta conta.';
          return;
        }
        if(!confirm('Subir este backup vai substituir os dados atuais deste navegador. Deseja continuar?'))return;
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(allowedKey(k))localStorage.removeItem(k);
        }
        for(const k of keys) localStorage.setItem(k,String(storage[k]));
        localStorage.setItem(SESSION_KEY,s);
        status.textContent='✅ Backup local restaurado. Recarregando o Entrega365...';
        setTimeout(()=>location.reload(),500);
      }catch(e){
        console.warn('Backup local inválido:',e);
        status.textContent='⚠️ Não foi possível ler este arquivo de backup.';
      }
    };
    input.click();
  }

  function open(){
    close();styles();
    const m=document.createElement('div');
    m.className='e365-local-backup-overlay';
    m.innerHTML=`<div class="e365-local-backup-card">
      <div class="e365-local-backup-title">💾 Backup local</div>
      <div class="e365-local-backup-sub">Use estas opções para proteger ou restaurar os dados deste navegador. Este backup não depende do Google Drive.</div>
      <button class="e365-local-backup-btn primary" data-backup="download">⬇️ Baixar backup</button>
      <button class="e365-local-backup-btn" data-backup="upload">⬆️ Subir backup local</button>
      <div class="e365-local-backup-status"></div>
      <button class="e365-local-backup-close">Fechar</button>
    </div>`;
    document.body.appendChild(m);
    const status=m.querySelector('.e365-local-backup-status');
    m.querySelector('[data-backup="download"]').onclick=()=>downloadBackup(status);
    m.querySelector('[data-backup="upload"]').onclick=()=>importBackup(status);
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.e365-local-backup-close'))close()});
  }

  window.e365OpenManualBackupMenu=open;
  window.e365LocalBackup={download:()=>downloadBackup({textContent:''}),upload:()=>importBackup({textContent:''}),snapshot};
})();