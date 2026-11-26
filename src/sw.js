// Offline support. This file is a template: at build time (vite.config.ts) the two placeholders below
// receive the build version and the list of build files, so everything is cached at install and each
// new version gets its own cache (the old one is deleted).
// - Build files (hashed names) and fonts never change: served from the cache first (fast, works offline).
// - Pages and other files: network first so updates arrive, but after 3 s on a bad connection the cached
//   copy is used instead of making the child wait.
const CACHE = 'schoolcraft-__VERSION__';
// Pixel's recorded voice (public/voice/): kept from one version to the next, filled in the background
// by the page (prefetchVoice in src/audio.ts), which also removes the clips that are no longer used.
const VOICE = 'schoolcraft-voice';
const CORE = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', ...__ASSETS__.map((f) => './' + f)];

self.addEventListener('install', (e) => {
  // `reload`: straight from the server. Through the HTTP cache (GitHub Pages sends max-age=600) the
  // install stored the previous index.html next to the new build files: it pointed to build files no
  // longer on the server, and the app stayed white.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

// Old versions are deleted, except the one just before: a page that started on it (its index.html came
// from the old cache on a slow network, while this version was installing) still finds its build files.
// Without them that page stays white.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const old = keys.filter((k) => k.startsWith('schoolcraft-') && k !== CACHE && k !== VOICE);
        // caches.keys() lists caches in creation order: the last one is the previous version
        return Promise.all(old.slice(0, -1).map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim()),
  );
});

function store(req, res, name = CACHE) {
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(name).then((c) => c.put(req, copy));
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
  // this version's copy first (the previous version's cache is kept, and caches.match() would find it first)
  const mine = (r) => caches.open(CACHE).then((c) => c.match(r, MATCH)).then((hit) => hit || caches.match(r, MATCH));
  const fallback = () => mine(req).then((hit) => hit || (req.mode === 'navigate' ? mine('./') : undefined));
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res) => {
      if (!settled && res) {
        settled = true;
        resolve(res);
      }
    };
    const timer = setTimeout(() => fallback().then(finish), 3000);
    // `no-cache`: revalidate with the server, never a stale page from the HTTP cache
    fetch(req, { cache: 'no-cache' })
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
  if (!sameOrigin) return;
  // clips never change: a new recording gets a new file name
  if (sameOrigin && url.pathname.includes('/voice/')) {
    e.respondWith(caches.match(req, MATCH).then((hit) => hit || fetch(req).then((res) => store(req, res, VOICE))));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(cacheFirst(req));
    return;
  }
  e.respondWith(networkFirst(req));
});
