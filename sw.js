/* Service worker: rende il sito installabile come app e lo apre anche senza rete. */
const VERSION = "rosa-v1";
const CORE = ["/", "/prenota/", "/offline/", "/static/css/site.css?v=2", "/static/js/site.js?v=2",
              "/static/logo.svg", "/static/fonts/bricolage.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Pagine: prima la rete (contenuti aggiornati), se offline la copia salvata.
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("/offline/"))));
    return;
  }
  if (url.pathname.startsWith("/static/")) {
    // File statici: prima la cache (velocità), poi la rete.
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    })));
  }
});