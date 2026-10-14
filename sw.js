self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await self.clients.claim();
  })());
});

// Entrega365 stays online-first: do not cache authenticated pages or user data.
self.addEventListener("fetch", () => {});
