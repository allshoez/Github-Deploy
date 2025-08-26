// Nama cache unik biar bisa update otomatis kalau ada versi baru
const CACHE_NAME = "myapp-cache-v1";
const URLS_TO_CACHE = [
  "/",          // index.html
  "/index.html",
  "/style.css",
  "/script.js",
  "/icon-192.png",  // contoh icon
  "/icon-512.png"
];

// Install Service Worker & simpan file ke cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Ambil file dari cache kalau offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Hapus cache lama kalau ada versi baru
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});