/**
 * StickForStats Service Worker
 * 
 * This service worker provides offline capabilities and resource caching
 * to improve performance and user experience.
 */

// Version of the cache
const CACHE_VERSION = 'v1';

// Name of our cache
const CACHE_NAME = `stickforstats-cache-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/runtime.js',
  '/static/js/vendor.react.js',
  '/static/js/vendor.mui.js',
  '/static/js/main.js',
  '/static/css/main.css',
  '/images/probability/image-placeholder.svg',
];

// URLs to exclude from caching (e.g., API endpoints)
const EXCLUDE_FROM_CACHE = [
  '/api/',
];

/**
 * Check if a URL should be cached
 * @param {string} url - URL to check
 * @returns {boolean} Whether the URL should be cached
 */
function shouldCache(url) {
  // Don't cache excluded paths
  for (const excludePath of EXCLUDE_FROM_CACHE) {
    if (url.includes(excludePath)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Install event handler - precache static assets
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch(error => {
        console.error('[Service Worker] Cache failure:', error);
      })
  );
});

/**
 * Activate event handler - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete caches that are older versions
              return cacheName.startsWith('stickforstats-cache-') && cacheName !== CACHE_NAME;
            })
            .map(cacheName => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event handler - serve from cache if possible,
 * then update cache with network response
 */
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Check if URL should be cached
  if (!shouldCache(event.request.url)) {
    return;
  }
  
  // Use a stale-while-revalidate caching strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            
            // Update the cache with the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('[Service Worker] Cache update error:', error);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch error:', error);
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            return null;
          });
        
        // Return the cached response immediately if available, otherwise wait for the network
        return cachedResponse || fetchPromise;
      })
  );
});

/**
 * Push event handler for notifications
 */
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received');
  
  const data = event.data.json();
  const title = data.title || 'StickForStats Update';
  const options = {
    body: data.message || 'Something new happened!',
    icon: '/images/probability/image-placeholder.svg',
    badge: '/images/probability/image-placeholder.svg',
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

/**
 * Sync data from IndexedDB to the server
 */
async function syncData() {
  // This would be implemented to sync data from IndexedDB to the server
  console.log('[Service Worker] Syncing data...');
  // Actual implementation would depend on what needs to be synced
}