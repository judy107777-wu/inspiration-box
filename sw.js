// App 外殼：畫面檔離線快取 + 接收從其他 App 分享進來的內容。
// 改了任何畫面檔，記得把 VERSION 加 1，手機才會換新版。

const VERSION = 'v4';
const APP_CACHE = `inspiration-app-${VERSION}`;
const SHARE_CACHE = 'inspiration-share';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/add.js',
  './src/api.js',
  './src/detail.js',
  './src/image.js',
  './src/list.js',
  './src/main.js',
  './src/photo.js',
  './src/queue.js',
  './src/search.js',
  './src/settings.js',
  './src/share.js',
  './src/style.css',
];

// GitHub Pages 讓瀏覽器把檔案快取約 10 分鐘，安裝時一律向伺服器拿最新的
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('inspiration-app-') && k !== APP_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 分享進來的文字與照片先放進快取，再把畫面導回首頁讀取
async function receiveShare(request) {
  const form = await request.formData();
  const data = {
    title: form.get('title') || '',
    text: form.get('text') || '',
    url: form.get('url') || '',
  };
  const cache = await caches.open(SHARE_CACHE);
  await cache.put('shared-data', new Response(JSON.stringify(data)));
  const photo = form.get('photo');
  if (photo && photo.size) {
    await cache.put('shared-photo', new Response(photo, { headers: { 'Content-Type': photo.type } }));
  } else {
    await cache.delete('shared-photo');
  }
  return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // 雲端小程式、雲端硬碟照片不經過這裡

  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(receiveShare(event.request));
    return;
  }
  if (event.request.method !== 'GET') return;

  // 有網路拿最新版（先跟伺服器確認有沒有改過），沒網路用快取
  event.respondWith(
    fetch(event.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
