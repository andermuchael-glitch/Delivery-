(() => {
  "use strict";
  const APP = "dcv2:", VERSION = 1;
  const style = document.createElement("style");
  style.textContent = `
    #backup-tools{position:fixed;right:10px;top:74px;z-index:30;display:flex;gap:6px}
    #backup-tools button{border:1px solid #29465e;background:#0b1a29;color:#fff;border-radius:10px;width:42px;height:38px;font-size:18px;box-shadow:0 5px 16px #0006}
    #backup-file{display:none}
    #backup-toast{position:fixed;left:12px;right:12px;bottom:88px;z-index:40;padding:11px 13px;border-radius:12px;background:#0b1b2b;border:1px solid #285075;color:#dce8f5;text-align:center;font-size:12px;display:none}
  `;
  document.head.appendChild(style);

  const toast = msg => {
    let t = document.getElementById("backup-toast");
    if (!t) { t = document.createElement("div"); t.id = "backup-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = "block";
    clearTimeout(t._timer); t._timer = setTimeout(() => t.style.display = "none", 2600);
  };

  function install() {
    if (!document.getElementById("backup-tools") || !document.getElementById("backup-tools").isConnected) {
      const old = document.getElementById("backup-tools"); if (old) old.remove();
      const wrap = document.createElement("div"); wrap.id = "backup-tools";
      wrap.innerHTML = `<button id="backup-export" title="Baixar backup">⬇</button><button id="backup-import" title="Restaurar backup">⬆</button><input id="backup-file" type="file" accept="application/json,.json">`;
      document.body.appendChild(wrap);
      wrap.querySelector("#backup-export").onclick = exportBackup;
      wrap.querySelector("#backup-import").onclick = () => wrap.querySelector("#backup-file").click();
      wrap.querySelector("#backup-file").onchange = e => { const f=e.target.files?.[0]; if(f) importBackup(f); e.target.value=""; };
    }
  }

  function exportBackup() {
    const user = localStorage.getItem(APP + "auth:session");
    if (!user) return toast("Faça login para criar o backup.");
    const prefix = `${APP}${user}:`, data = {};
    for (let i=0;i<localStorage.length;i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith(prefix)) data[key] = localStorage.getItem(key);
    }
    const payload = {app:"Delivery Comandas",version:VERSION,type:"user-backup",createdAt:new Date().toISOString(),user,data};
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `delivery-backup-${user}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Backup baixado com sucesso.");
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        const current = localStorage.getItem(APP + "auth:session");
        if (!p || p.type !== "user-backup" || p.app !== "Delivery Comandas" || !p.data || !p.user) throw new Error("Arquivo de backup inválido.");
        if (!current) throw new Error("Faça login antes de restaurar.");
        if (p.user !== current) {
          if (!confirm(`Este backup pertence ao usuário "${p.user}" e você está logado como "${current}". Restaurar mesmo assim?`)) return;
        }
        const keys = Object.keys(p.data).filter(k => k.startsWith(APP + p.user + ":"));
        if (!keys.length) throw new Error("Nenhum dado deste usuário foi encontrado no backup.");
        if (!confirm(`Restaurar ${keys.length} registros do backup? Os dados atuais deste usuário serão substituídos pelos registros presentes no arquivo.`)) return;
        const currentPrefix = APP + current + ":";
        keys.forEach(k => {
          const suffix = k.slice((APP + p.user + ":").length);
          localStorage.setItem(currentPrefix + suffix, p.data[k]);
        });
        toast("Backup restaurado. Recarregando...");
        setTimeout(() => location.reload(), 900);
      } catch (err) { alert(err.message || "Não foi possível restaurar o backup."); }
    };
    reader.readAsText(file);
  }

  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  install();
})();
