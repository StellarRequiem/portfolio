// Offline cache for the professional StellarRequiem portfolio shell.
// Archived interactive routes stay available by direct URL but are not preloaded here.
const CACHE = "xclvxo-v17";
const SHELL = [
  "/", "/index.html", "/manifest.webmanifest",
  "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/ask-widget.js", "/bifrost-ambient.js",
  "/capability-statement.html",
  "/workflow/", "/mcp-assurance/", "/mcp-review-sample/",
  "/papers/", "/papers/mediated-control-plane/", "/papers/grok-native-median-plane/",
  "/control-plane/",
  "/assurance/", "/security/",
  "/feedback/", "/report/", "/diagnostics/",
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
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
    return;
  }
  // Same-origin assets: stale-while-revalidate.
  //
  // This was cache-first, which meant an asset served once was served forever — a
  // deployed JS change stayed invisible until someone remembered to bump CACHE above.
  // That bit us: the Hall shipped a new registry.js and returning visitors kept getting
  // the old one, so a newly published cab simply did not appear.
  //
  // Now: answer instantly from cache (fast, still works offline), but always revalidate
  // in the background so the next load is current. Deploys self-heal within one visit
  // instead of depending on anyone remembering the version bump.
  e.respondWith(
    caches.match(req).then((m) => {
      const network = fetch(req).then((r) => {
        if (r && r.status === 200 && r.type === "basic") {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
        }
        return r;
      }).catch(() => m);
      return m || network;
    })
  );
});
