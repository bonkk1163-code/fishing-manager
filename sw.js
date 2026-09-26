// 낚시매니저 오프라인 동작용. 앱을 수정해 올릴 때 VERSION 숫자를 올려 주세요.
const VERSION = "v20";
const CACHE = "nakssi-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192-any.png", "./icons/icon-512-any.png",
  "./icons/icon-192-maskable.png", "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png", "./icons/favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("nakssi-") && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // 앱 화면: 인터넷이 되면 최신 버전, 안 되면 저장해 둔 버전
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  // 공지사항: 인터넷이 되면 항상 최신, 안 되면 저장해 둔 것
  if (new URL(req.url).pathname.endsWith("/notices.json")) {
    e.respondWith(fetch(req, { cache: "no-store" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  // 아이콘·글꼴 등: 저장해 둔 것을 먼저 쓰고 뒤에서 새로 받아 둠
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
