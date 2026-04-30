// ======================================
// Service Worker - オフラインキャッシュ
// ======================================
// ★バグ修正: キャッシュバージョンを上げて修正済みファイルが確実に反映されるようにする
const CACHE_NAME = 'slime-tank-v12';

// 必須アセット: これが1つでも失敗するとSWインストール自体が失敗する
const CORE_ASSETS = [
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
    './gm_narrator.js',
    './game.js',
];

// ★バグ修正②: アイコンはオプション扱い。存在しなくてもSWインストールを妨げない
const OPTIONAL_ASSETS = [
    '../icons/icon-192.png',
    '../icons/icon-512.png',
];

// インストール: 必須アセットのみ addAll、オプションは失敗を無視
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            const corePromise = cache.addAll(CORE_ASSETS);
            const optionalPromise = Promise.all(
                OPTIONAL_ASSETS.map(url =>
                    cache.add(url).catch(() => {})
                )
            );
            return Promise.all([corePromise, optionalPromise]);
        }).then(() => self.skipWaiting())
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

    // ★バグ修正③: { ignoreSearch: true } で ?v=23 などのクエリを無視してキャッシュヒットさせる
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
            .then(cached => cached || fetch(event.request)
                .then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                })
            )
            .catch(() => caches.match('../index.html', { ignoreSearch: true }))
    );
});
