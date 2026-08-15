(() => {
  const target = "dcv2:auth:users";
  const legacy = "dcv2:null:users";
  try {
    if (localStorage.getItem(target) !== null) return;
    const raw = localStorage.getItem(legacy);
    if (!raw) return;
    const users = JSON.parse(raw);
    if (users && typeof users === "object" && !Array.isArray(users)) {
      localStorage.setItem(target, JSON.stringify(users));
    }
  } catch (_) {}
})();
