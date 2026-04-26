const CACHE_NAME = "traklist-cache-v1";

const FILES_TO_CACHE = [
  "index.html",

  "styles.css",

  "canciones.html",
  "canciones.css",
  "canciones.js",

  "crear_cancion.html",
  "crear_cancion.css",
  "crear_cancion.js",

  "crear_setlist.html",
  "crear_setlist.css",
  "crear_setlist.js",

  "setlists.html",
  "setlists.css",
  "setlists.js",

  "song-print.css",
  "song-print.js",

  "manifest.json",

  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});