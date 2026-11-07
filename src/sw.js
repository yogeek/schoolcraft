// Offline support. This file is a template: at build time (vite.config.ts) the two placeholders below
// receive the build version and the list of build files, so everything is cached at install and each
// new version gets its own cache (the old one is deleted).
// - Build files (hashed names) and fonts never change: served from the cache first (fast, works offline).
// - Pages and other files: network first so updates arrive, but after 3 s on a bad connection the cached
//   copy is used instead of making the child wait.
const CACHE = 'schoolcraft-__VERSION__';
const CORE = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', ...__ASSETS__.map((f) => './' + f)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('schoolcraft-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function store(req, res) {
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

// Our files only depend on their URL: ignore `Vary` (some servers send `Vary: Origin`, and the page's
// module/stylesheet requests carry an Origin header that the pre-cached copies don't have).
const MATCH = { ignoreVary: true };

function cacheFirst(req) {
  return caches.match(req, MATCH).then((hit) => hit || fetch(req).then((res) => store(req, res)));
}

function networkFirst(req) {
  const fallback = () => caches.match(req, MATCH).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./', MATCH) : undefined));
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res) => {
      if (!settled && res) {
        settled = true;
        resolve(res);
      }
    };
    const timer = setTimeout(() => fallback().then(finish), 3000);
    fetch(req)
      .then((res) => {
        clearTimeout(timer);
        finish(store(req, res));
      })
      .catch(() => {
        clearTimeout(timer);
        fallback().then((hit) => finish(hit || Response.error()));
      });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && url.hostname !== 'fonts.googleapis.com' && url.hostname !== 'fonts.gstatic.com') return;
  if ((sameOrigin && url.pathname.includes('/assets/')) || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
    return;
  }
  e.respondWith(networkFirst(req));
});
