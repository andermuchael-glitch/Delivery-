/* Entrega365 — um backup local independente por dia, enviado ao PostgreSQL após 01:00. */
(function () {
  'use strict';
  if (window.__e365DailyBackupLoaded) return;
  window.__e365DailyBackupLoaded = true;

  const SESSION_KEY = 'dcv2:session';
  const META_KEY = 'entrega365:dailyBackup';
  let timer = 0, running = false;

  const session = () => localStorage.getItem(SESSION_KEY) || '';
  const uid = () => session().startsWith('google:') ? session().slice(7) : '';
  const meta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch { return {}; } };
  const setMeta = value => { try { localStorage.setItem(META_KEY, JSON.stringify({ ...meta(), ...value })); } catch (e) { console.warn('Backup diário:', e); } };
  const localDate = (d = new Date()) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const backupKeys = () => {
    const out = {};
    const s = session(), prefix = 'dcv2:' + s + ':';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k === SESSION_KEY || k === META_KEY) continue;
      if (k.startsWith(prefix) || k === 'entrega365:establishments:' + s ||
          k === 'entrega365:currentEstablishment:' + s ||
          ['entrega365:locale', 'entrega365:location', 'entrega365:locationTracking', 'entrega365:agenda', 'entrega365:settings', 'e365month'].includes(k)) {
        out[k] = localStorage.getItem(k);
      }
    }
    return out;
  };
  async function runBackup() {
    if (running || !uid() || !navigator.onLine) return false;
    const today = localDate();
    if (meta().lastSuccessDate === today) return true;
    running = true;
    setMeta({ status: 'preparing', attemptedDate: today });
    try {
      const user = window.e365GetCurrentUser?.();
      if (!user?.getIdToken) throw new Error('auth_required');
      const data = backupKeys();
      if (!Object.keys(data).length) throw new Error('empty_local_data');
      const response = await fetch('/api/backup', {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: 'Bearer ' + await user.getIdToken(false), 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupDate: today, data, source: 'local-device' })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || ('http_' + response.status));
      setMeta({ status: 'success', lastSuccessDate: today, lastBackupAt: result.createdAt || new Date().toISOString(), alreadyExisted: !!result.alreadyExists, error: '' });
      window.dispatchEvent(new CustomEvent('e365-daily-backup-complete', { detail: { date: today, alreadyExists: !!result.alreadyExists } }));
      return true;
    } catch (e) {
      console.warn('Entrega365 backup diário:', e);
      setMeta({ status: 'pending', error: String(e?.message || e), lastAttemptAt: new Date().toISOString() });
      return false;
    } finally { running = false; }
  }
  function schedule() {
    clearTimeout(timer);
    if (!uid()) return;
    const now = new Date(), next = new Date(now);
    next.setHours(1, 0, 0, 0);
    if (now >= next) {
      if (meta().lastSuccessDate !== localDate()) runBackup();
      next.setDate(next.getDate() + 1);
    }
    timer = setTimeout(() => { runBackup().finally(schedule); }, Math.max(1000, next.getTime() - now.getTime()));
  }
  window.entrega365DailyBackup = { run: runBackup, status: () => meta() };
  window.addEventListener('online', () => { if (meta().lastSuccessDate !== localDate()) runBackup(); });
  window.addEventListener('focus', () => { if (meta().lastSuccessDate !== localDate()) runBackup(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && meta().lastSuccessDate !== localDate()) runBackup(); });
  let checks = 0;
  const poll = setInterval(() => {
    if (uid() && window.e365GetCurrentUser?.()?.uid) { clearInterval(poll); schedule(); if (new Date().getHours() >= 1 && meta().lastSuccessDate !== localDate()) runBackup(); }
    if (++checks > 120) clearInterval(poll);
  }, 500);
})();