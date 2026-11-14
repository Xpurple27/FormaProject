const CACHE = "forma-offline-v2";
const FALLBACK = "/offline.html";
const destinations = {
  meal: "/nutrisi#catat",
  workout: "/latihan",
  weight: "/progres#pengukuran",
  bedtime: "/beranda",
};

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.add(new Request(FALLBACK, { cache: "reload", credentials: "omit" })))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith("forma-offline-") && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request).catch(async () => {
    const fallback = await (await caches.open(CACHE)).match(FALLBACK);
    return fallback ?? Response.error();
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const kind = event.notification.data?.kind;
  const path = Object.hasOwn(destinations, kind) ? destinations[kind] : "/beranda";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = windows.find(item => item.url === url);
    return client ? client.focus() : self.clients.openWindow(url);
  })());
});
