/* =====================================================
 * 超市保质期管理 - Service Worker
 * 离线缓存策略：应用外壳预缓存 + 运行时 stale-while-revalidate
 * ===================================================== */

const CACHE_NAME = 'shelflife-v4';

/* 应用核心资源（相对路径，适配 GitHub Pages 子目录部署） */
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.jpg'
];

/* CDN 第三方资源（首次联网时缓存，离线后仍可用） */
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js'
];

/* ---------- 安装：预缓存核心资源 ---------- */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // 核心资源必须缓存成功；CDN 资源失败不阻断安装（离线时再补）
      return cache.addAll(CORE_ASSETS).then(function() {
        return Promise.all(
          CDN_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('SW: CDN 资源预缓存失败（可后续补缓存）:', url);
            });
          })
        );
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ---------- 激活：清理旧缓存 ---------- */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ---------- 拦截请求：stale-while-revalidate ---------- */
self.addEventListener('fetch', function(event) {
  const req = event.request;

  // 仅处理 GET 请求
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // 仅缓存 http/https 协议（忽略 chrome-extension、data: 等）
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Firebase Realtime Database 通过 WebSocket / 长连接同步，不走 fetch 缓存
  if (url.hostname.indexOf('firebaseio.com') !== -1) return;

  event.respondWith(
    caches.match(req).then(function(cached) {
      const networkFetch = fetch(req).then(function(res) {
        // 缓存有效响应（200 或跨域 opaque）
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone).catch(function() {});
          });
        }
        return res;
      }).catch(function() {
        // 离线且无缓存时，对导航请求返回首页
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return cached || new Response('', { status: 504, statusText: 'Offline' });
      });

      // 导航请求优先用网络（确保最新代码），其他请求有缓存先返回
      if (req.mode === 'navigate') {
        return networkFetch.catch(function() { return cached; });
      }
      return cached || networkFetch;
    })
  );
});

/* ---------- 接受主线程消息：主动更新 ---------- */
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
