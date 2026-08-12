const CACHE_NAME = 'sari-systeme-v1.6.0-configurable-erp';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/assets/sari-logo.svg',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
  '/js/config.js',
  '/js/db.js',
  '/js/reference-codes.js',
  '/js/document-security.js',
  '/js/i18n.js',
  '/js/auth.js',
  '/js/sync.js',
  '/js/charts.js',
  '/js/utils.js',
  '/js/dialogs.js',
  '/js/validation.js',
  '/js/image-dropzone.js',
  '/js/rich-editor.js',
  '/js/template-designer.js',
  '/js/catalog-picker.js',
  '/js/partner-360.js',
  '/js/document-link-picker.js',
  '/js/documents.js',
  '/js/modules/dashboard.js',
  '/js/modules/inventory.js',
  '/js/modules/suppliers.js',
  '/js/modules/import-export.js',
  '/js/modules/tenders.js',
  '/js/modules/sales.js',
  '/js/modules/customers.js',
  '/js/modules/reports.js',
  '/js/modules/audit.js',
  '/js/modules/settings.js',
  '/js/modules/hr.js',
  '/js/modules/tasks.js',
  '/js/modules/portal.js',
  '/js/modules/purchases.js',
  '/js/modules/ged.js',
  '/js/modules/taxes.js',
  '/js/modules/master-data.js',
  '/js/modules/inventory-ops.js',
  '/js/modules/bulk-import.js',
  '/js/modules/api.js',
  '/js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching SARI Système assets for offline PWA mode...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Some non-critical assets could not be cached immediately:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Authentication must always reach the server and must never be cached.
  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navigation is network-first so a stale cached index cannot hide a newly fixed login gate.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  // Static app assets use Stale-While-Revalidate for immediate offline rendering.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          // If network fails, we fall back to cached response or offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Support for background sync simulation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sari-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_TRIGGERED', time: Date.now() });
        });
      })
    );
  }
});
