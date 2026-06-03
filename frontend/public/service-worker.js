/**
 * StickForStats Service Worker
 *
 * Caching strategy for a hashed-asset single-page PWA:
 *
 *  - **Navigations (HTML): network-first.** Always load the current app shell so
 *    it references the chunk hashes of the currently-deployed build. This is the
 *    fix for the post-deploy "w is not a function" crash, where a stale cached
 *    index.html loaded a stale main.js that then pulled a mismatched code-split
 *    chunk. Cache is used only as an offline fallback.
 *  - **Hashed build assets under /static/: cache-first.** They are immutable by
 *    content hash, and because the shell is always fresh it references the
 *    correct hashes -- so cached assets can never be inconsistent with the shell.
 *  - **Other same-origin GETs: network-first** with a cache fallback.
 *  - **/api/**: never handled by the service worker.
 *
 * Bumping CACHE_VERSION purges older caches on activate, recovering users whose
 * previous service worker had cached a stale, internally inconsistent bundle.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `stickforstats-cache-${CACHE_VERSION}`;

// App shell only -- hashed JS/CSS are cached on demand (their names are not
// known ahead of time), so precaching fixed names here would 404.
const APP_SHELL = ['/', '/index.html', '/manifest.json'];
const EXCLUDE_PREFIXES = ['/api/'];


self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Resilient: one missing asset must not fail the whole install.
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('stickforstats-cache-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (EXCLUDE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  // --- Navigations: network-first (keeps the shell consistent with the deploy) ---
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh shell for offline use (all SPA routes serve index.html).
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // --- Immutable hashed build assets: cache-first ---
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            putInCache(request, response);
            return response;
          })
      )
    );
    return;
  }

  // --- Everything else same-origin: network-first, cache fallback ---
  event.respondWith(
    fetch(request)
      .then((response) => {
        putInCache(request, response);
        return response;
      })
      .catch(() => caches.match(request))
  );
});

/**
 * Push notifications
 */
self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch (e) {
      return {};
    }
  })();
  const title = data.title || 'StickForStats Update';
  const options = {
    body: data.message || 'Something new happened!',
    icon: '/images/probability/image-placeholder.svg',
    badge: '/images/probability/image-placeholder.svg',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(Promise.resolve());
  }
});
