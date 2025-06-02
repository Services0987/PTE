// service-worker.js - PTE Navigator Pro - Enhanced Caching & Offline Support v1.3

const CACHE_NAME = 'pte-navigator-pro-cache-v1.3'; // Increment version on significant asset changes
const OFFLINE_URL = 'offline.html'; // Ensure you have this file in your root directory
const DATA_CACHE_NAME = 'pte-navigator-data-cache-v1.1'; // For dynamic data (less used here)

// Core assets to cache immediately on install
const CORE_ASSETS = [
  './', // Caches the root URL (index.html)
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png', // Main PWA icon
  './icons/icon-512x512.png', // Larger PWA icon
  './icons/icon-32x32.png',   // Favicon size
  // OFFLINE_URL // Only if you create an offline.html
];

// External resources (CDNs)
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', // Updated FontAwesome
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/compromise', // Fetches latest redirect
  // 'https://unpkg.com/compromise@14.11.0/builds/compromise.min.js', // Example: Specific version for stability
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install Event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching core and CDN assets');
        // Cache core assets - essential for app shell
        const coreAssetPromises = cache.addAll(CORE_ASSETS)
          .catch(error => console.error('[ServiceWorker] Failed to cache one or more CORE assets during install:', error));

        // Cache CDN assets - attempt, but don't block install on failure
        const cdnAssetPromises = Promise.all(
          CDN_ASSETS.map(url => {
            return cache.add(new Request(url, { mode: 'cors' })) // Ensure CORS for CDNs
              .catch(err => console.warn(`[ServiceWorker] Failed to cache CDN asset: ${url}`, err));
          })
        );
        return Promise.all([coreAssetPromises, cdnAssetPromises]);
      })
      .then(() => {
        console.log('[ServiceWorker] All specified assets cached (or attempted).');
        return self.skipWaiting(); // Activate new SW immediately
      })
      .catch(error => console.error('[ServiceWorker] Caching failed catastrophically during install:', error))
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate Event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old app cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Old caches cleaned up.');
        return self.clients.claim(); // Take control of clients
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for non-GET requests or specific paths if needed
  if (request.method !== 'GET') {
    // console.log(`[ServiceWorker] Ignoring non-GET request: ${request.method} ${request.url}`);
    return;
  }

  // Example: API calls - Network first, then cache (for dynamic data)
  // Not strictly needed for this app as data is in localStorage, but good pattern.
  if (url.pathname.startsWith('/api/')) { 
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(request)
          .then(networkResponse => {
            if (networkResponse.ok) { // Cache only successful responses
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cache.match(request).then(r => r || new Response(JSON.stringify({ error: "Offline and not in cache" }), { headers: { 'Content-Type': 'application/json' }})));
      })
    );
    return;
  }

  // Navigation requests: Network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If successful, clone and cache for future offline use
          if (response.ok) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          }
          return response;
        })
        .catch(() => { // Network failed, try cache
          return caches.match(request)
            .then(cachedResponse => {
              // Return cached page or the global offline page
              return cachedResponse // || (OFFLINE_URL ? caches.match(OFFLINE_URL) : new Response("You are offline.", { headers: { 'Content-Type': 'text/html' }}));
            });
        })
    );
    return;
  }

  // For other assets (CSS, JS, images, fonts): Cache first, then network
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log(`[ServiceWorker] Serving from cache: ${request.url}`);
          return cachedResponse;
        }
        // console.log(`[ServiceWorker] Fetching from network: ${request.url}`);
        return fetch(request).then(networkResponse => {
          // Check if the response is valid before caching
          if (!networkResponse || networkResponse.status !== 200) {
            // Don't cache error responses (unless it's an opaque response from a CDN we trust)
            if (networkResponse.type === 'opaque' && CDN_ASSETS.some(cdnUrl => request.url.startsWith(cdnUrl.substring(0, cdnUrl.lastIndexOf('/'))))) {
                // Allow caching opaque responses from known CDNs (e.g. fonts.gstatic.com)
            } else {
                // console.warn(`[ServiceWorker] Not caching bad/opaque response from network for ${request.url}: ${networkResponse.status}`);
                return networkResponse; // Return the error/bad response without caching
            }
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });
          return networkResponse;
        }).catch(error => {
            console.warn(`[ServiceWorker] Fetch failed for: ${request.url}; Error: ${error}`);
            // For critical assets, you might provide a specific fallback.
            // For documents, the 'navigate' block above handles OFFLINE_URL.
            // For images, you might return a placeholder image.
            // For now, just let the browser handle the failed asset load.
            // if (request.destination === 'image') return caches.match('/icons/placeholder.png');
        });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING message.');
    self.skipWaiting();
  }
});