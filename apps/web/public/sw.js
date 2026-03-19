// SopranoChat Service Worker — PWA desteği için minimal service worker
// Bu dosya uygulamanın PWA olarak yüklenebilmesini sağlar

const CACHE_NAME = 'soprano-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests (API calls to different ports like :3002)
    if (url.origin !== self.location.origin) return;

    // Skip API/admin requests — these should never be cached
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) return;

    // Skip navigation requests — Next.js handles SPA routing client-side
    if (event.request.mode === 'navigate') return;

    // Network-first strategy for same-origin static assets only
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then(r => {
                if (r) return r;
                // Cache'de yoksa tekrar fetch deneme (çünkü zaten network patlak), offline/error yanıtı dön
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
