// ======================================
// Service Worker - オフラインキャッシュ
// ======================================
// ★バグ修正: v15にバージョンアップ（プレミアムチケット修正を確実に反映）
// ★バグ修正: v17 React/ReactDOM/Babel（外部CDN）がキャッシュされておらず、
//   オフライン時にタイトル画面が真っ白になる問題を修正
const CACHE_NAME = 'slime-tank-v17';
const ASSETS = [
    '../',
    '../index.html',
    './manifest.json',
    '../css/style.css',
    'https://unpkg.com/react@18/umd/react.development.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
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
    '../icons/icon-192.png',
    '../icons/icon-512.png',
];

// インストール: 全アセットをキャッシュ
// ★改善: addAll の失敗で SW 全体が止まらないよう個別に try/catch
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                ASSETS.map(url =>
                    cache.add(url).catch(e => console.warn('[SW] cache miss:', url, e))
                )
            )
        ).then(() => self.skipWaiting())
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

// フェッチ: HTMLはネットワーク優先、その他はキャッシュファースト
self.addEventListener('fetch', event => {
    // chrome-extension や非 http スキームは無視
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);

    if (event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(event.request).then(cached => cached || caches.match('../index.html')))
        );
        return;
    }

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