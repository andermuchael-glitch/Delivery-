const CACHE = "entrega365-logo-v6-final";
const AUTH = "./auth-fix.js";
const ASSETS = ["./", "./index.html", "./manifest.json", "./logo-entrega365.png", "./logo-moto.svg", AUTH];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function injectAuth(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const html = await response.text();
  if (html.includes(AUTH)) return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  const injected = html.replace(/<\/body>/i, `<script type="module" src="${AUTH}"></script></body>`);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injected, { status: response.status, statusText: response.statusText, headers });
}
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).then(injectAuth).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok && /\.(js|css|svg|png|json)$/.test(url.pathname)) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  })));
});
