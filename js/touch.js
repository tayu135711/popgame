// ======================================
// TOUCH - スマホ用タッチコントロール
// ======================================
class TouchController {
    constructor(inputManager, canvas) {
        this.input = inputManager;
        this.canvas = canvas;
        this.active = false;
        this.touches = {};
        this.mode = 'hidden'; // 'hidden' | 'battle' | 'menu'

        this.vKeys = {
            ArrowLeft: false, ArrowRight: false,
            ArrowUp: false, ArrowDown: false,
            KeyZ: false, KeyX: false, KeyC: false,
            Space: false, KeyB: false, KeyQ: false,
        };
        this._prevVKeys = {};
        this._tutorialShown = false;

        // バトルコンテキスト（毎フレーム drawBattleScene から更新される）
        this._ctx = {
            holdingItem: false,
            holdingAlly: false,
            nearCannon: false,
            invasionAvailable: false,
            specialReady: false,
        };
        this._ctxFrame = 0;

        this.buttons = [];
        this.dpadEl = null;
        this.knobEl = null;

        this._detectTouch();
        if (this.active) this._init();

        // ★ズーム完全防止 (iOS Safari / Android Chrome)
        document.addEventListener('gesturestart',  (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gestureend',    (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) e.preventDefault();
        }, { passive: false });
    }

    _detectTouch() {
        this.active = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    _init() {
        this._buildUI();
        this._bindEvents();
        this._patchInput();
    }

    _patchInput() {
        const self = this;
        const origHeld    = this.input.held.bind(this.input);
        const origPressed = this.input.pressed.bind(this.input);
        this.input.held    = (c) => origHeld(c)    || !!self.vKeys[c];
        this.input.pressed = (c) => {
            const was = !!self._prevVKeys[c];
            const now = !!self.vKeys[c];
            return origPressed(c) || (now && !was);
        };
        const origTick = this.input.tick.bind(this.input);
        this.input.tick = () => {
            origTick();
            Object.assign(self._prevVKeys, self.vKeys);
        };
    }

    // ★改善: 触覚フィードバック（バイブレーション）ユーティリティ
    _vibrate(pattern) {
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch {}
        }
    }

    _buildUI() {
        const el = document.createElement('div');
        el.id = 'touch-ui';
        el.innerHTML = `
<style>
#touch-ui {
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 100;
    user-select: none;
    -webkit-user-select: none;
    --btn-a: clamp(44px, 7vw, 58px);  /* メインボタン（Z） */
    --btn-m: clamp(36px, 6vw, 48px);  /* サブボタン（X/C/B） */
    --btn-xs: clamp(32px, 5vw, 40px);  /* ポーズボタン */
    --dpad:   clamp(92px, 18vw, 120px); /* Dpad */
    --safe-b: env(safe-area-inset-bottom, 0px);
    --safe-r: env(safe-area-inset-right,  0px);
    --safe-l: env(safe-area-inset-left,   0px);
}
.t-btn {
    position: absolute;
    pointer-events: all;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,1.0);
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    transition: background 0.12s, transform 0.06s, box-shadow 0.15s, border-color 0.12s, opacity 0.15s;
    gap: 2px;
    line-height: 1;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
}
/* ★改善②: アイコンベースに統一（テキストラベルは廃止し、覚える負担を減らす） */
.t-btn .btn-icon  { font-size: 22px; }
.t-btn .btn-badge {
    position: absolute;
    top: -6px; right: -6px;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: #FFD700;
    color: #3a2a00;
    font-size: 12px; font-weight: 900;
    display: none;
    align-items: center; justify-content: center;
    box-shadow: 0 0 10px rgba(255,215,0,0.9), 0 2px 4px rgba(0,0,0,0.5);
    animation: pulse-badge 0.6s ease-in-out infinite alternate;
}
.t-btn .btn-badge.show { display: flex; }
@keyframes pulse-badge {
    from { transform: scale(1.0); }
    to   { transform: scale(1.18); }
}

/* ===== Z: アクション（拾う/装填。長押しで捨てる） ===== */

#tb-z {
    width: var(--btn-a); height: var(--btn-a);
    background: rgba(30,160,60,0.82);
    border: 3px solid rgba(80,240,110,0.95);
    box-shadow: 0 0 18px rgba(60,220,90,0.55), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-z.mode-load {
    background: rgba(0,150,220,0.90);
    border-color: rgba(60,210,255,0.98);
    box-shadow: 0 0 24px rgba(0,190,255,0.80), 0 3px 10px rgba(0,0,0,0.5);
}

/* ===== X: 攻撃（ゲージMAXでバッジ点灯→必殺技） ===== */
#tb-x {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(200,120,0,0.72);
    border: 3px solid rgba(255,210,40,0.90);
    box-shadow: 0 0 14px rgba(255,200,30,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-x.mode-ready {
    border-color: rgba(255,240,80,1.0);
}

/* ===== C: 仲間（担ぐ/投げる。長押しで連携技/侵攻） ===== */
#tb-c {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(30,90,220,0.72);
    border: 3px solid rgba(90,160,255,0.90);
    box-shadow: 0 0 14px rgba(80,150,255,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-c.mode-active {
    background: rgba(120,0,200,0.84);
    border-color: rgba(200,80,255,0.95);
    box-shadow: 0 0 18px rgba(180,60,255,0.65), 0 3px 10px rgba(0,0,0,0.5);
}

/* ★改善④: ポーズボタン拡大（52×40px）で押しやすく */
#tb-pause {
    width: var(--btn-xs); height: var(--btn-xs);
    border-radius: 14px;
    background: rgba(60,60,90,0.85);
    border: 2px solid rgba(200,200,230,0.70);
    font-size: 18px;
}

/* メニュー用ボタン */
#tb-menu-tab {
    width: 64px; height: 64px;
    background: rgba(20,80,180,0.80);
    border: 3px solid rgba(80,140,240,0.90);
    box-shadow: 0 0 14px rgba(80,140,230,0.45), 0 4px 14px rgba(0,0,0,0.6);
    border-radius: 50%;
    position: absolute;
    pointer-events: all;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #fff;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    gap: 3px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
    font-weight: 900;
    transition: transform 0.06s, filter 0.06s;
}
#tb-menu-tab .btn-key   { font-size: 20px; font-weight: 900; }
#tb-menu-tab .btn-label { font-size: 9px; font-weight: 700; white-space: nowrap; }
#tb-menu-tab.pressed    { transform: scale(0.84); filter: brightness(1.5); }

#tb-menu-confirm {
    width: 80px; height: 80px;
    background: rgba(30,160,60,0.80);
    border: 3px solid rgba(80,240,110,0.90);
    box-shadow: 0 0 18px rgba(60,220,90,0.50), 0 4px 14px rgba(0,0,0,0.6);
    border-radius: 50%;
    position: absolute;
    pointer-events: all;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #fff;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    gap: 3px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
    font-weight: 900;
    transition: transform 0.06s, filter 0.06s;
}
#tb-menu-confirm .btn-key   { font-size: 22px; font-weight: 900; }
#tb-menu-confirm .btn-label { font-size: 11px; font-weight: 700; white-space: nowrap; }
#tb-menu-confirm.pressed    { transform: scale(0.84); filter: brightness(1.5); }

#tb-menu-back {
    width: 64px; height: 64px;
    background: rgba(180,40,40,0.80);
    border: 3px solid rgba(240,90,90,0.90);
    box-shadow: 0 0 14px rgba(230,80,80,0.45), 0 4px 14px rgba(0,0,0,0.6);
    border-radius: 50%;
    position: absolute;
    pointer-events: all;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #fff;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    gap: 3px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
    font-weight: 900;
    transition: transform 0.06s, filter 0.06s;
}
#tb-menu-back .btn-key   { font-size: 18px; font-weight: 900; }
#tb-menu-back .btn-label { font-size: 10px; font-weight: 700; white-space: nowrap; }
#tb-menu-back.pressed    { transform: scale(0.84); filter: brightness(1.5); }

/* 仲間編成専用: 選択/外すボタン (KeyZ) */
#tb-ally-toggle {
    width: 72px; height: 72px;
    background: rgba(20,120,200,0.85);
    border: 3px solid rgba(80,180,255,0.95);
    box-shadow: 0 0 16px rgba(60,160,255,0.55), 0 4px 14px rgba(0,0,0,0.6);
    border-radius: 50%;
    position: absolute;
    pointer-events: all;
    display: none;
    flex-direction: column;
    align-items: center; justify-content: center;
    color: #fff;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    gap: 3px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
    font-weight: 900;
    transition: transform 0.06s, filter 0.06s;
}
#tb-ally-toggle .btn-key   { font-size: 20px; font-weight: 900; }
#tb-ally-toggle .btn-label { font-size: 10px; font-weight: 700; white-space: nowrap; }
#tb-ally-toggle.pressed    { transform: scale(0.84); filter: brightness(1.5); }

/* Dpad */
#t-dpad {
    position: absolute;
    pointer-events: all;
    touch-action: none;
    width: var(--dpad); height: var(--dpad);
    bottom: calc(18px + var(--safe-b));
    left:   calc(18px + var(--safe-l));
}
.t-dpad-bg {
    position: absolute; inset: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: 2.5px solid rgba(255,255,255,0.40);
    box-shadow: 0 2px 20px rgba(0,0,0,0.5);
}
.t-dpad-knob {
    position: absolute;
    width: 58px; height: 58px;
    border-radius: 50%;
    background: rgba(200,220,255,0.30);
    border: 2.5px solid rgba(255,255,255,0.65);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    transition: transform 0.05s;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
}
.t-dpad-arrows { position: absolute; inset: 0; pointer-events: none; }
.t-dpad-arrow  { position: absolute; width: 0; height: 0; opacity: 0.38; }
.t-dpad-arrow.up    { top:8px;    left:50%; transform:translateX(-50%);  border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:13px solid white; }
.t-dpad-arrow.down  { bottom:8px; left:50%; transform:translateX(-50%);  border-left:8px solid transparent; border-right:8px solid transparent; border-top:13px solid white; }
.t-dpad-arrow.left  { left:8px;   top:50%; transform:translateY(-50%);   border-top:8px solid transparent; border-bottom:8px solid transparent; border-right:13px solid white; }
.t-dpad-arrow.right { right:8px;  top:50%; transform:translateY(-50%);   border-top:8px solid transparent; border-bottom:8px solid transparent; border-left:13px solid white; }

#touch-tutorial {
    position: absolute;
    top: 35%; left: 50%; /* ボタン群と被らないように少し上に配置 */
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.88);
    border: 1px solid rgba(91,163,230,0.5);
    border-radius: 14px;
    padding: 18px 24px;
    color: #fff;
    font-size: 13px;
    line-height: 1.9;
    text-align: left;
    pointer-events: auto; /* タップで閉じられるようにautoに変更 */
    z-index: 9999; /* 他のUIより必ず前面に出るように */
    transition: opacity 0.5s;
    white-space: normal;
    max-width: min(92vw, 360px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.6);
}
#touch-tutorial .tut-title { font-size: 15px; font-weight: 900; color: #FFD700; margin-bottom: 8px; text-align: center; }
#touch-tutorial .tut-row   { display: flex; align-items: center; gap: 10px; margin-bottom: 3px; }
#touch-tutorial .tut-key   { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; font-weight: 900; font-size: 13px; flex-shrink: 0; }
#touch-tutorial .tut-key.z { background: rgba(40,180,70,0.5);  border:1px solid rgba(60,220,90,0.8); }
#touch-tutorial .tut-key.x { background: rgba(220,150,0,0.5);  border:1px solid rgba(255,200,30,0.8); }
#touch-tutorial .tut-key.c { background: rgba(40,100,240,0.5); border:1px solid rgba(80,150,255,0.8); }
#touch-tutorial .tut-key.b { background: rgba(200,50,50,0.5);  border:1px solid rgba(230,80,80,0.8); }
#touch-tutorial .tut-sub   { font-size: 10px; opacity: 0.6; margin-left: 2px; }
#touch-tutorial .tut-note  { margin-top: 10px; opacity: 0.55; font-size: 11px; text-align: center; }

@media (max-width: 380px) {
    #touch-ui { --btn-a: clamp(40px, 14vw, 52px); --btn-m: clamp(34px, 12vw, 42px); --btn-xs: clamp(30px, 10vw, 36px); --dpad: clamp(88px, 24vw, 110px); }
    .t-btn .btn-key   { font-size: 9px; }
    .t-btn .btn-label { font-size: 11px; }
}
</style>

<!-- Dpad -->
<div id="t-dpad">
    <div class="t-dpad-bg"></div>
    <div class="t-dpad-arrows">
        <div class="t-dpad-arrow up"></div>
        <div class="t-dpad-arrow down"></div>
        <div class="t-dpad-arrow left"></div>
        <div class="t-dpad-arrow right"></div>
    </div>
    <div class="t-dpad-knob" id="t-dpad-knob"></div>
</div>

<!-- バトル用ボタン群（🔧 リデザイン: アイコン3つ+バッジ方式に統一。捨てる/修理の専用ボタンは廃止） -->
<div class="t-btn" id="tb-z">
    <span class="btn-icon">✋</span>
</div>
<div class="t-btn" id="tb-x">
    <span class="btn-icon">⚔️</span>
    <span class="btn-badge" id="tb-x-badge">★</span>
</div>
<div class="t-btn" id="tb-c">
    <span class="btn-icon">🤝</span>
    <span class="btn-badge" id="tb-c-badge">!</span>
</div>
<div class="t-btn" id="tb-pause">⏸</div>

<!-- メニュー用ボタン群 -->
<div id="tb-menu-tab">
    <span class="btn-key">🔖</span>
    <span class="btn-label">図鑑/配合</span>
</div>
<div id="tb-menu-confirm">
    <span class="btn-key">Z</span>
    <span class="btn-label">決定</span>
</div>
<div id="tb-menu-back">
    <span class="btn-key">B</span>
    <span class="btn-label">戻る</span>
</div>
<div id="tb-ally-toggle">
    <span class="btn-key">✔</span>
    <span class="btn-label">選択/外す</span>
</div>

<!-- 初回チュートリアルヒント -->
<div id="touch-tutorial" style="display:none;">
    <div class="tut-title">🎮 タッチ操作ガイド</div>
    <div class="tut-row">
        <span class="tut-key z">✋</span>
        <div>アクション<br><span class="tut-sub">拾う・装填。長押しで捨てる</span></div>
    </div>
    <div class="tut-row">
        <span class="tut-key x">⚔️</span>
        <div>攻撃<br><span class="tut-sub">ゲージMAXで光る→必殺技</span></div>
    </div>
    <div class="tut-row">
        <span class="tut-key c">🤝</span>
        <div>仲間<br><span class="tut-sub">担ぐ・投げる。長押しで連携技/侵攻</span></div>
    </div>
    <div class="tut-note">修理キットはHPが低くなると自動発動します<br>タップすると閉じます</div>
</div>
`;
        document.body.appendChild(el);
        this.ui = el;

        const btnDefs = [
            { id: 'tb-z',     key: 'KeyZ' },
            { id: 'tb-x',     key: 'KeyX' },
            { id: 'tb-c',     key: 'KeyC' },
            { id: 'tb-pause', key: 'KeyP_FAKE' },
        ];
        this.buttons = btnDefs.map(b => ({
            el: document.getElementById(b.id),
            key: b.key,
        }));

        this.menuButtons = [
            // ★バグ修正: KeyZ だと deck_edit/ally_edit でZキー（弾の着脱）と決定が同フレームで
            // 両方発火してしまう競合バグがあった。Space に変更することで action(Z) と分離する。
            { el: document.getElementById('tb-menu-confirm'), key: 'Space' },
            { el: document.getElementById('tb-menu-back'),    key: 'KeyB' },
            { el: document.getElementById('tb-menu-tab'),     key: 'KeyQ' }, // 配合タブ切替
            { el: document.getElementById('tb-ally-toggle'),  key: 'KeyZ' }, // 仲間編成: 選択/外す
        ];

        this.dpadEl = document.getElementById('t-dpad');
        this.knobEl = document.getElementById('t-dpad-knob');
        this.tutorialEl = document.getElementById('touch-tutorial');

        this._updateLayout();
    }

    _bindEvents() {
        // ★改善⑦: Cボタンの長押しロングプレス管理
        this._cLongPressTimer = null;
        this._cLongPressActive = false;
        // 🔧 リデザイン: Zボタンの長押し = 捨てる(KeyB)。専用の捨てるボタンを廃止したための対応
        this._zLongPressTimer = null;

        for (const btn of this.buttons) {
            if (btn.key === 'KeyZ') {
                btn.el.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.vKeys.KeyZ = true; // 通常タップ: 拾う/装填
                    btn.el.classList.add('pressed');
                    this._vibrate(25);
                    // 400ms長押しで「捨てる」(KeyB)をワンショット発火
                    this._zLongPressTimer = setTimeout(() => {
                        this.vKeys.KeyB = true;
                        this._vibrate(20);
                        setTimeout(() => { this.vKeys.KeyB = false; }, 60);
                    }, 400);
                }, { passive: false });

                btn.el.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    clearTimeout(this._zLongPressTimer);
                    this.vKeys.KeyZ = false;
                    btn.el.classList.remove('pressed');
                }, { passive: false });

                btn.el.addEventListener('touchcancel', () => {
                    clearTimeout(this._zLongPressTimer);
                    this.vKeys.KeyZ = false;
                    btn.el.classList.remove('pressed');
                });
                continue;
            }

            if (btn.key === 'KeyC') {
                // Cボタンは長押しロジックを追加
                btn.el.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    // 🔧 ストーリー中はCボタンを「スキップ」(KeyB)として扱う（Bボタン廃止のため）
                    if (this.mode === 'story') {
                        this.vKeys.KeyB = true;
                        btn.el.classList.add('pressed');
                        this._vibrate(20);
                        return;
                    }
                    this._cLongPressActive = false;
                    // 即時に KeyC を true（通常タップの動作）
                    this.vKeys.KeyC = true;
                    btn.el.classList.add('pressed');
                    this._vibrate(25); // ★改善: 触覚フィードバック

                    // 400ms 後に長押し判定 → 連携技優先発動
                    this._cLongPressTimer = setTimeout(() => {
                        this._cLongPressActive = true;
                        // 連携技発動アクション（KeyI = 避容/連携指示キーとして利用）
                        if (window.game && window.game.allies) {
                            // 連携技ゲージMAXなら window.game.input.invade をワンショット発火
                            const g = window.game;
                            // ★バグ修正: 仲間を担いでいる最中は連携技トリガーをスキップ
                            // KeyCを再プレスすると handleAllyThrow が発火して即離しになるため
                            if (g.player && g.player.stackedAlly) return;
                            const hasAllySpecial = g.allies && g.allies.some(a =>
                                (!a.isDead && !a.isStacked) && (
                                    (a.type === 'titan_golem'    && g.titanSpecialGauge    >= g.MAX_ALLY_SPECIAL_GAUGE) ||
                                    (a.type === 'dragon_lord'    && g.dragonSpecialGauge   >= g.MAX_ALLY_SPECIAL_GAUGE) ||
                                    (a.type === 'platinum_golem' && g.platinumSpecialGauge >= g.MAX_ALLY_SPECIAL_GAUGE)
                                )
                            );
                            if (hasAllySpecial) {
                                // 連携技発動: KeyC をリリースしてから再プレスで発火させる
                                this.vKeys.KeyC = false;
                                requestAnimationFrame(() => { this.vKeys.KeyC = true; });
                                // 蓄電表示を点滅アニメで強調
                                btn.el.style.filter = 'brightness(2.5)';
                                setTimeout(() => { btn.el.style.filter = ''; }, 300);
                            }
                        }
                    }, 400);
                }, { passive: false });

                btn.el.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    clearTimeout(this._cLongPressTimer);
                    this.vKeys.KeyC = false;
                    this.vKeys.KeyB = false;
                    btn.el.classList.remove('pressed');
                    btn.el.style.filter = '';
                }, { passive: false });

                btn.el.addEventListener('touchcancel', () => {
                    clearTimeout(this._cLongPressTimer);
                    this.vKeys.KeyC = false;
                    this.vKeys.KeyB = false;
                    btn.el.classList.remove('pressed');
                    btn.el.style.filter = '';
                });
                continue; // 通常のループ処理はスキップ
            }

            btn.el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (btn.key === 'KeyP_FAKE') {
                    if (window.game) window.game.input.keys['KeyP'] = true;
                    setTimeout(() => { if (window.game) window.game.input.keys['KeyP'] = false; }, 60);
                    this._vibrate(30); // ポーズ: 短めバイブ
                } else {
                    this.vKeys[btn.key] = true;
                    // ★改善: ボタン種別ごとに触覚フィードバック
                    if (btn.key === 'KeyZ') this._vibrate(25);       // アクション: 短め
                    else if (btn.key === 'KeyX') this._vibrate([30, 20, 30]); // 必殺: 強め
                    else if (btn.key === 'KeyB') this._vibrate(20);  // 投げる: 軽め
                    else if (btn.key === 'KeyC') this._vibrate(25);  // 侵攻/連携
                    else this._vibrate(15);                           // その他
                }
                btn.el.classList.add('pressed');
            }, { passive: false });

            btn.el.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.vKeys[btn.key] = false;
                btn.el.classList.remove('pressed');
            }, { passive: false });

            btn.el.addEventListener('touchcancel', () => {
                this.vKeys[btn.key] = false;
                btn.el.classList.remove('pressed');
            });
        }

        for (const btn of this.menuButtons) {
            if (!btn.el) continue; // ★null guard: 要素が見つからない場合をスキップ
            btn.el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.vKeys[btn.key] = true;
                btn.el.classList.add('pressed');
                this._vibrate(20); // ★改善: メニューボタン触覚フィードバック
            }, { passive: false });

            btn.el.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.vKeys[btn.key] = false;
                btn.el.classList.remove('pressed');
            }, { passive: false });

            btn.el.addEventListener('touchcancel', () => {
                this.vKeys[btn.key] = false;
                btn.el.classList.remove('pressed');
            });
        }

        // Dpadイベント（★改善⑥: 上スワイプ検出追加）
        this._swipeStartY = null;
        this._swipeStartTime = null;
        this.dpadEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches && e.touches.length > 0) {
                // 🔧 パフォーマンス改善: dpadの位置/サイズはドラッグ中に変わらないので
                //   touchstart時に1回だけ計測してキャッシュする（touchmoveのたびに
                //   getBoundingClientRectを呼ぶと毎回強制リフローが発生し操作が重くなる）
                this._dpadRect = this.dpadEl.getBoundingClientRect();
                this._dpadMove(e.touches[0]);
                // スワイプ開始座標を記録
                this._swipeStartY = e.touches[0].clientY;
                this._swipeStartTime = Date.now();
            }
        }, { passive: false });

        this.dpadEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches && e.touches.length > 0) {
                this._dpadMove(e.touches[0]);
            }
        }, { passive: false });

        this.dpadEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            this._swipeStartY = null;
            this._swipeStartTime = null;
            this._dpadRelease();
        }, { passive: false });

        this.dpadEl.addEventListener('touchcancel', () => {
            this._swipeStartY = null;
            this._swipeStartTime = null;
            this._dpadRelease();
        });

        if (this.tutorialEl) {
            this.tutorialEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._hideTutorial();
            }, { passive: false });
        }

        window.addEventListener('orientationchange', () => {
            // Android は orientationchange 後のレイアウト確定が遅いため 300ms 待つ
            setTimeout(() => this._updateLayout(), 300);
        });
        window.addEventListener('resize', () => this._updateLayout());
        // iOS Safari: アドレスバー出現/消去でも再レイアウト
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this._updateLayout());
        }
    }

    _dpadMove(touch) {
        // 🔧 パフォーマンス改善: touchstartでキャッシュしたrectを使う（毎回re計測しない）
        const rect = this._dpadRect || this.dpadEl.getBoundingClientRect();
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;
        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // ★改善: デッドゾーン12px（過剰な不反応を防ぎつつ誤作動も抑える）
        const dead = 12;
        const max  = rect.width * 0.44;

        const clamp = Math.min(dist, max);
        const nx = dist > 0 ? (dx / dist) * clamp : 0;
        const ny = dist > 0 ? (dy / dist) * clamp : 0;
        this.knobEl.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

        this.vKeys.ArrowLeft  = dx < -dead;
        this.vKeys.ArrowRight = dx >  dead;
        this.vKeys.ArrowUp    = dy < -dead;
        this.vKeys.ArrowDown  = dy >  dead;
    }

    _dpadRelease() {
        this.vKeys.ArrowLeft = this.vKeys.ArrowRight =
        this.vKeys.ArrowUp   = this.vKeys.ArrowDown  = false;
        this.knobEl.style.transform = 'translate(-50%, -50%)';
    }

    // =========================================================
    // ★ コンテキスト感応型ボタン更新 (毎フレーム drawBattleScene から呼ばれる)
    //
    // ctx = {
    //   holdingItem: bool,      // アイテムを手持ち中
    //   holdingAlly: bool,      // 仲間を担ぎ中
    //   nearCannon:  bool,      // 大砲の近く
    //   invasionAvailable: bool,// 侵攻可能
    //   specialReady: bool,     // 必殺技ゲージMAX
    // }
    // =========================================================
    updateBattleContext(ctx) {
        if (!this.ui || (this.mode !== 'battle' && this.mode !== 'invasion' && this.mode !== 'defense')) return;
        this._ctxFrame++;

        // 🔧 パフォーマンス改善: document.getElementById を毎フレーム呼んでいたのを
        //   初回のみ実行してキャッシュするように変更（DOM検索コストをカット）
        if (!this._btnRefs) {
            const tbZ = document.getElementById('tb-z');
            const tbX = document.getElementById('tb-x');
            const tbC = document.getElementById('tb-c');
            this._btnRefs = {
                tbZ, tbZIcon: tbZ ? tbZ.querySelector('.btn-icon') : null,
                tbX, tbXBadge: document.getElementById('tb-x-badge'),
                tbC, tbCBadge: document.getElementById('tb-c-badge'),
            };
        }
        const { tbZ, tbZIcon, tbX, tbXBadge, tbC, tbCBadge } = this._btnRefs;
        if (!tbZ || !tbX || !tbC) return;

        // 🔧 パフォーマンス改善: className / textContent は値が変わった時だけ書き込む
        //   （同じ値でも毎フレーム代入するとブラウザがスタイル再計算をしてしまい、
        //    タッチ操作の反応が遅れる原因になっていた）
        const applyClass = (el, className) => { if (el.className !== className) el.className = className; };
        const applyText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
        const applyBadge = (el, show, text) => {
            if (!el) return;
            const cls = show ? 'btn-badge show' : 'btn-badge';
            if (el.className !== cls) el.className = cls;
            if (show) applyText(el, text);
        };

        // ---- Z (アクション: 拾う/装填。長押しで捨てる) ----
        if (ctx.nearCannon && ctx.holdingItem) {
            applyClass(tbZ, 't-btn mode-load');
            applyText(tbZIcon, '⬆️');
        } else if (ctx.holdingItem) {
            applyClass(tbZ, 't-btn');
            applyText(tbZIcon, '📦');
        } else {
            applyClass(tbZ, 't-btn');
            applyText(tbZIcon, '✋');
        }

        // ---- X (攻撃。ゲージMAXでバッジ点灯→必殺技) ----
        applyClass(tbX, (this.mode === 'invasion' && ctx.holdingItem) || ctx.specialReady ? 't-btn mode-ready' : 't-btn');
        applyBadge(tbXBadge, !!ctx.specialReady, '★');

        // ---- C (仲間: 担ぐ/投げる。連携技/侵攻が可能な時だけバッジ点灯) ----
        applyClass(tbC, ctx.holdingAlly ? 't-btn mode-active' : 't-btn');
        const cReady = ctx.allySpecialReady || ctx.invasionAvailable;
        applyBadge(tbCBadge, cReady, ctx.allySpecialReady ? '連' : '侵');

        // 修理キットはボタン無し・HP低下時に自動発動（game.js側で処理）

        this._ctx = ctx;
    }

    _updateLayout() {
        // 🔧 レイアウトが変わるのでdpadの位置キャッシュも無効化
        this._dpadRect = null;
        if (!this.ui) return;

        // visualViewport はiOS Safariで仮想キーボード表示中も正確な幅を返す
        const W = (window.visualViewport ? window.visualViewport.width : window.innerWidth);
        const H = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
        const uiStyle = getComputedStyle(this.ui);
        const safeB = parseFloat(uiStyle.getPropertyValue('--safe-b')) || 0;
        const safeR = parseFloat(uiStyle.getPropertyValue('--safe-r')) || 0;

        // ★バグ修正: ボタンが大きすぎてゲーム下画面を隠していた。
        // ゲーム画面は縦長(600×800)なので下半分(400px相当)がタンク内部。
        // ボタン群の合計占有高さを画面高の約22%以内に収める。
        // 画面高に応じて動的にサイズを決定する。
        const availH = H - safeB;
        // ボタン領域は画面高の最大20%（2段構成なのでその半分が1ボタン）
        const maxBtnArea = Math.floor(availH * 0.17);
        const gap  = 6;
        // 2段に収まるよう: btnA = (maxBtnArea - gap) * 0.55 くらい
        const btnA = Math.min(58, Math.max(42, Math.floor((maxBtnArea - gap) * 0.55)));
        const btnM = Math.min(46, Math.max(34, Math.floor(btnA * 0.82)));

        const rEdge = 12 + safeR;
        const bEdge = 6 + safeB;  // 下余白を小さく

        // Dpadサイズも画面に合わせて縮小
        const dpadSize = Math.min(120, Math.max(92, Math.floor(availH * 0.16)));
        const dpadEl = document.getElementById('t-dpad');
        if (dpadEl) {
            dpadEl.style.width  = dpadSize + 'px';
            dpadEl.style.height = dpadSize + 'px';
            dpadEl.style.bottom = (6 + safeB) + 'px';
        }

        const tbZ     = document.getElementById('tb-z');
        const tbX     = document.getElementById('tb-x');
        const tbC     = document.getElementById('tb-c');
        const tbPause = document.getElementById('tb-pause');
        const tbMC    = document.getElementById('tb-menu-confirm');
        const tbMB    = document.getElementById('tb-menu-back');
        if (!tbZ) return;

        this.ui.style.setProperty('--btn-a', btnA + 'px');
        this.ui.style.setProperty('--btn-m', btnM + 'px');

        const pos = 'position:absolute;';

        // ボタン配置（🔧 リデザイン: アイコン3つのみ。捨てる/修理の専用スロットは廃止）:
        //        [ X ]
        //   [ Z ]  [ C ]
        tbZ.style.cssText = `${pos} width:${btnA}px; height:${btnA}px; right:${rEdge}px; bottom:${bEdge}px;`;
        tbC.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge+btnA+gap}px; bottom:${bEdge}px;`;
        tbX.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge+btnA+gap}px; bottom:${bEdge+btnM+gap}px;`;

        // ★バグ修正: storyモードの時は次へ(MC)ボタンを押しやすい配置にする
        if (this.mode === 'story') {
            const storyBtnSize = Math.min(70, btnA);
            tbMC.style.cssText = `${pos} width:${storyBtnSize}px; height:${storyBtnSize}px; right:${rEdge}px; bottom:${bEdge}px;`;
        } else {
            // 通常のメニュー配置
            tbMC.style.cssText = `${pos} right:${rEdge}px; bottom:${bEdge}px;`;
        }

        // ポーズボタン（小さめ・右上）
        const pauseW = Math.min(44, btnM);
        tbPause.style.cssText = `${pos} width:${pauseW}px; height:36px; border-radius:10px; right:${rEdge}px; top:10px;`;

        tbMB.style.cssText = `${pos} right:${rEdge + 80 + gap}px; bottom:${bEdge + 8}px;`;
        const tbMT = document.getElementById('tb-menu-tab');
        if (tbMT) tbMT.style.cssText = `${pos} right:${rEdge + 80 + gap}px; bottom:${bEdge + 80 + gap}px;`;

        // 仲間編成専用ボタン: 確定ボタンの上に配置
        const tbAT = document.getElementById('tb-ally-toggle');
        if (tbAT) tbAT.style.cssText = `${pos} right:${rEdge}px; bottom:${bEdge + 88 + gap}px;`;
    }

    setMode(mode) {
        if (!this.ui) return;
        this.mode = mode;

        const tbZ     = document.getElementById('tb-z');
        const tbX     = document.getElementById('tb-x');
        const tbC     = document.getElementById('tb-c');
        const tbPause = document.getElementById('tb-pause');
        const tbMC    = document.getElementById('tb-menu-confirm');
        const tbMB    = document.getElementById('tb-menu-back');
        const dpad    = document.getElementById('t-dpad');
        const tbCIcon = tbC ? tbC.querySelector('.btn-icon') : null;

        if (mode === 'hidden') {
            this.ui.style.display = 'none';
            const tbAT2 = document.getElementById('tb-ally-toggle');
            if (tbAT2) tbAT2.style.display = 'none';
        } else if (mode === 'battle') {
            this.ui.style.display = '';
            if (tbZ) tbZ.style.display = ''; if (tbX) tbX.style.display = '';
            if (tbC) tbC.style.display = '';
            if (tbPause) tbPause.style.display = '';
            if (tbMC) tbMC.style.display = 'none'; if (tbMB) tbMB.style.display = 'none';
            const tbMT = document.getElementById('tb-menu-tab');
            if (tbMT) tbMT.style.display = 'none';
            // ★バグ修正: ally_edit → battle 遷移時に「選択/外す」ボタンが残るバグを修正
            const tbAT_battle = document.getElementById('tb-ally-toggle');
            if (tbAT_battle) tbAT_battle.style.display = 'none';
            if (dpad) dpad.style.display = '';
            // ★バグ修正: story モードで書き換えたアイコンを元に戻す
            if (tbCIcon) tbCIcon.textContent = '🤝';
            if (!this._tutorialShown) {
                setTimeout(() => this._showTutorial(), 800);
            }
        } else if (mode === 'menu') {
            this.ui.style.display = '';
            if (tbZ) tbZ.style.display = 'none'; if (tbX) tbX.style.display = 'none';
            if (tbC) tbC.style.display = 'none';
            if (tbPause) tbPause.style.display = 'none';
            if (tbMC) tbMC.style.display = ''; if (tbMB) tbMB.style.display = '';
            if (dpad) dpad.style.display = '';

            // ★仲間編成専用ボタン: ally_edit 状態のときだけ「選択/外す」ボタンを表示
            const tbAT = document.getElementById('tb-ally-toggle');
            const isAllyEdit = window.game && window.game.state === 'ally_edit';
            if (tbAT) tbAT.style.display = isAllyEdit ? 'flex' : 'none';
            // ally_edit では「決定」=バトル開始なのでラベルを変更
            if (isAllyEdit && tbMC) {
                const mcKey = tbMC.querySelector('.btn-key');
                const mcLbl = tbMC.querySelector('.btn-label');
                if (mcKey) mcKey.textContent = '⚔';
                if (mcLbl) mcLbl.textContent = 'バトル開始';
            }

            // ★バグ修正: menu モードに戻った時、story モードで書き換えた tbMC(次へ) のラベルを「決定」に復元
            // ally_edit から他のメニューへ遷移した場合もラベルをリセット
            if (tbMC && !isAllyEdit) {
                const mcKey = tbMC.querySelector('.btn-key');
                const mcLbl = tbMC.querySelector('.btn-label');
                if (mcKey) mcKey.textContent = '○';
                if (mcLbl) mcLbl.textContent = '決定';
            }

            // タブ切替ボタン（図鑑/配合）：メニュー全般で表示してアクセスしやすくする
            const tbMT2 = document.getElementById('tb-menu-tab');
            if (tbMT2) {
                const showInStates = new Set([
                    'title', 'stage_select', 'collection', 'fusion', 
                    'upgrade', 'deck_edit', 'ally_edit',
                    'event_select', 'daily_missions', 'settings', 'customize'
                ]);
                const isMenuState = window.game && showInStates.has(window.game.state);
                tbMT2.style.display = isMenuState ? '' : 'none';
            }
        } else if (mode === 'invasion') {
            // 侵攻モード: Z=スイッチ/拾う、X=攻撃/妨害、C=仲間連携（長押しで侵攻/連携技）
            this.ui.style.display = '';
            if (tbZ) tbZ.style.display = ''; if (tbX) tbX.style.display = '';
            if (tbC) tbC.style.display = '';
            if (tbPause) tbPause.style.display = '';
            if (tbMC) tbMC.style.display = 'none'; if (tbMB) tbMB.style.display = 'none';
            const tbMT_inv = document.getElementById('tb-menu-tab');
            if (tbMT_inv) tbMT_inv.style.display = 'none';
            const tbAT_inv = document.getElementById('tb-ally-toggle');
            if (tbAT_inv) tbAT_inv.style.display = 'none';
            if (dpad) dpad.style.display = '';
            if (tbCIcon) tbCIcon.textContent = '🤝';
        } else if (mode === 'story') {
            // ストーリー画面：「次へ」ボタンと「スキップ」だけ表示
            // 🔧 Bボタン廃止に伴い、スキップはCボタン(story中は未使用)に割り当て直す
            this.ui.style.display = '';
            if (tbZ) tbZ.style.display = 'none'; if (tbX) tbX.style.display = 'none';
            if (tbC) tbC.style.display = '';
            if (tbPause) tbPause.style.display = 'none';
            if (tbMC) tbMC.style.display = ''; if (tbMB) tbMB.style.display = 'none';
            const tbMT = document.getElementById('tb-menu-tab');
            if (tbMT) tbMT.style.display = 'none';
            if (dpad) dpad.style.display = 'none';
            // 「次へ」「スキップ」ボタンのアイコンを分かりやすくする
            // ★バグ修正: textContent = '...' はボタン内の span 要素を全削除してしまうため、
            //   querySelector で子要素のテキストだけ書き換える。
            if (tbMC) {
                const mcKey = tbMC.querySelector('.btn-key');
                const mcLbl = tbMC.querySelector('.btn-label');
                if (mcKey) mcKey.textContent = '▶';
                if (mcLbl) mcLbl.textContent = '次へ';
            }
            if (tbCIcon) tbCIcon.textContent = '⏭️'; // スキップ
        }
    }

    setVisible(v) { this.setMode(v ? 'battle' : 'hidden'); }

    _showTutorial() {
        if (this._tutorialShown || !this.tutorialEl) return;
        this._tutorialShown = true;
        this.tutorialEl.style.display = '';
        this.tutorialEl.style.opacity = '1';
        this._tutTimer = setTimeout(() => this._hideTutorial(), 7000);
    }

    _hideTutorial() {
        if (!this.tutorialEl) return;
        clearTimeout(this._tutTimer);
        this.tutorialEl.style.opacity = '0';
        setTimeout(() => {
            if (this.tutorialEl) this.tutorialEl.style.display = 'none';
        }, 500);
    }
}
// ★改善: ゲームイベントに応じた触覚フィードバック（game.js から呼ぶ）
window.touchVibrate = function(type) {
    if (!navigator.vibrate) return;
    try {
        switch (type) {
            case 'damage':   navigator.vibrate([60, 20, 60]); break; // ダメージ: 強め
            case 'death':    navigator.vibrate([100, 30, 100, 30, 100]); break; // 死亡: 長め
            case 'special':  navigator.vibrate([40, 20, 80]); break;  // 必殺技: 特徴的
            case 'confirm':  navigator.vibrate(25); break;             // 決定: 短め
            case 'powerup':  navigator.vibrate([30, 15, 30]); break;  // パワーアップ
            case 'select':   navigator.vibrate(15); break;             // 選択: 軽め
            default:         navigator.vibrate(20); break;
        }
    } catch {}
};

window.TouchController = TouchController;
