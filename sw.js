// Offline support: app shell cached; content + fonts cached as they're fetched.
const VERSION = 'fd-v1';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'src/app.js',
  'src/store.js',
  'src/speech.js',
  'src/engine/fsrs.js',
  'src/engine/french.js',
  'src/engine/answer.js',
  'src/engine/cards.js',
  'src/engine/exercises.js',
  'src/engine/session.js',
  'content/verbs.json',
  'content/vocab.json',
  'content/meta.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.host.includes('fonts.g');
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isFont) return;

  if (isFont) {
    // Cache-first for fonts.
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }
  // Network-first for everything of ours (so daily content and app updates arrive), cache fallback offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
