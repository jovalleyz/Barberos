const CACHE_NAME = 'yoel-barber-v10'; // <--- CAMBIA ESTO A v4, v5... CUANDO ACTUALICES

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://esm.sh/react@18.2.0',
  'https://esm.sh/react-dom@18.2.0/client',
  'https://esm.sh/lucide-react@0.292.0',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Opcional: Fuerza la instalación rápida, aunque el botón manual es más seguro
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma control de los clientes inmediatamente
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Escuchar mensaje para saltar la espera si el usuario le da al botón
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
