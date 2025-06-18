const CACHE_NAME = 'the-farmer-app-cache-v2';

const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/scripts/index.js',
    '/assets/images',
    '/assets/ui',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache); // Aggiunge i file alla cache
            })
            .catch(reason => console.log(reason))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request) // Try to fetch from the network first
            .then(response => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response; // If not valid, just return it (e.g., error page)
                }

                // IMPORTANT: Clone the response. A response is a stream
                // and can only be consumed once. We consume it once when
                // caching it and again when returning the response.
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache); // Update cache with fresh version
                    });

                return response;
            })
            .catch(() => {
                // Network request failed, try to get it from the cache
                return caches.match(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});