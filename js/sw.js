// ======================================
// Service Worker - オフラインキャッシュ
// ======================================
// ★バグ修正: キャッシュバージョンを上げて修正済みファイルが確実に反映されるようにする
const CACHE_NAME = 'slime-tank-v6';
const ASSETS = [
    '../',
    '../index.html',
    './manifest.json',
    '../css/style.css',
    './config.js',
    './input.js',
    './particles.js',
    './sound.js',
    './save.js',
    './physics.js',
    './renderer.js',
    './projectile.js',
    './ammo.js',
    './powerup.js',
    './story.js',
    './defender.js',
    './invader.js',
    './ally.js',
    './player.js',
    './tank.js',
    './battle.js',
    './stages.js',
    './ui.js',
    './touch.js',
    './game.js',
    './network.js',
    './online.js',

                       // オフライン時に React UI が読み込めなかった
    '../icons/icon-192.png',
    '../icons/icon-512.png',
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
            .catch(() => caches.match('../index.html'))
    );
});
