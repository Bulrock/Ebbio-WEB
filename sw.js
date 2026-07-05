// Service worker: precache the app shell for offline use and serve local
// assets cache-first. External API calls (Wiktionary, MyMemory) always go
// to the network and are never cached. Also focuses the app on a
// notification tap.
const CACHE = 'ebbio-v5';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/i18n.js',
  'js/i18n_data.js',
  'js/db.js',
  'js/models.js',
  'js/store.js',
  'js/logic/review_scheduler.js',
  'js/logic/matching_session.js',
  'js/logic/quiz_engine.js',
  'js/logic/definition_formatter.js',
  'js/services/dictionary.js',
  'js/services/translation.js',
  'js/services/autofill.js',
  'js/services/tts.js',
  'js/services/notifications.js',
  'js/util/languages.js',
  'js/util/format.js',
  'js/ui/dom.js',
  'js/ui/icons.js',
  'js/ui/router.js',
  'js/ui/components.js',
  'js/ui/definition_view.js',
  'js/ui/screens/splash.js',
  'js/ui/screens/home.js',
  'js/ui/screens/add_card.js',
  'js/ui/screens/training.js',
  'js/ui/screens/training_modes.js',
  'js/ui/screens/matching.js',
  'js/ui/screens/quiz.js',
  'js/ui/screens/spelling.js',
  'js/ui/screens/word_list.js',
  'js/ui/screens/settings.js',
  'js/ui/screens/about.js',
  'assets/icon/app_icon.png',
  'assets/icon/icon-192.png',
  'assets/icon/icon-512.png',
  'assets/icon/apple-touch-icon.png',
  'assets/icon/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only handle same-origin GETs; let API calls hit the network directly.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first: always prefer fresh code/assets when online (so updates
  // land without a hard refresh), fall back to the cache offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('index.html')),
      ),
  );
});

// Periodic background sync: the browser wakes the worker (installed PWA on
// Chrome/Android, cadence at its discretion) so we can remind about cards
// that came due while the app was closed. Best-effort — no server involved.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ebbio-review-check') {
    event.waitUntil(checkDueAndNotify());
  }
});

function openEbbioDb() {
  return new Promise((resolve, reject) => {
    // Open without a version so we never trigger an upgrade race with the app.
    const req = indexedDB.open('ebbio');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readonly').objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readonly').objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function checkDueAndNotify() {
  let db;
  try {
    db = await openEbbioDb();
  } catch {
    return;
  }
  if (!db.objectStoreNames.contains('cards') || !db.objectStoreNames.contains('settings')) {
    return;
  }
  const [settings, cards] = await Promise.all([
    idbGet(db, 'settings', 'app').catch(() => null),
    idbGetAll(db, 'cards').catch(() => []),
  ]);
  const now = Date.now();
  const lang = settings && settings.activeCourseLang;
  const due = cards.filter(
    (c) => !c.isLearned && c.nextReviewTime <= now && (!lang || c.courseLang === lang),
  );
  if (due.length === 0) return;
  const title = (settings && settings.notifTitle) || 'Ebbio';
  const body = (settings && settings.notifBody) || 'Time to review';
  await self.registration.showNotification(title, {
    body,
    tag: 'ebbio-review-summary',
    icon: 'assets/icon/icon-192.png',
    badge: 'assets/icon/icon-192.png',
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('./');
    }),
  );
});
