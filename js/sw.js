// ======================================
// Service Worker - オフラインキャッシュ
// ======================================
const CACHE_NAME = 'slime-tank-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/config.js',
    './js/input.js',
    './js/particles.js',
    './js/sound.js',
    './js/save.js',
    './js/physics.js',
    './js/renderer.js',
    './js/projectile.js',
    './js/ammo.js',
    './js/powerup.js',
    './js/story.js',
    './js/defender.js',
    './js/invader.js',
    './js/ally.js',
    './js/player.js',
    './js/tank.js',
    './js/battle.js',
    './js/stages.js',
    './js/ui.js',
    './js/touch.js',
    './js/game.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// インストール: 全アセットをキャッシュ
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// フェッチ: キャッシュファースト（audioはネットワークファースト）
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // BGMファイルはネットワークから（キャッシュしない）
    if (url.pathname.includes('/audio/')) {
        event.respondWith(
            fetch(event.request).catch(() => new Response('', { status: 404 }))
        );
        return;
    }

    // その他: キャッシュファースト
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request)
                .then(res => {
                    // 新しいファイルをキャッシュに追加
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                })
            )
            .catch(() => caches.match('./index.html'))
    );
});
