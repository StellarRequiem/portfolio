// Unified offline cache for xclusivexo.com — the StellarRequiem portfolio shell
// AND the xclusivexo village app. One root-scoped worker. Bump CACHE to invalidate.
const CACHE = "xclvxo-v5";
const SHELL = [
  "/", "/index.html", "/manifest.webmanifest", "/app.webmanifest",
  "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/ask-widget.js",
  "/village/", "/create/", "/room/", "/account/", "/forum/",
  "/favicon.svg", "/logo.svg", "/logo-192.png", "/logo-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // Never intercept cross-origin (Supabase, esm.sh, giscus, fonts) — those must stay live.
  if (url.origin !== self.location.origin) return;
  // Navigations: network-first so updates show; fall back to cache when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match("/village/")).then((m) => m || caches.match("/")))
    );
    return;
  }
  // Same-origin assets: cache-first, then network (and cache the 200).
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r && r.status === 200 && r.type === "basic") { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }))
  );
});
