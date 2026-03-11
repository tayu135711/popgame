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
            Space: false, KeyB: false,
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
    --btn-a:  68px;
    --btn-m:  58px;
    --btn-xs: 44px;
    --dpad:   152px;
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
.t-btn .btn-key   { font-size: 20px; font-weight: 900; letter-spacing: 0; }
.t-btn .btn-label { font-size: 10px; font-weight: 700; opacity: 0.95; white-space: nowrap; }
.t-btn.pressed    { transform: scale(0.84); filter: brightness(1.5); }

/* ===== Z: 拾う / 装填 / 攻撃 ===== */
#tb-z {
    width: var(--btn-a); height: var(--btn-a);
    background: rgba(30,160,60,0.72);
    border: 3px solid rgba(80,240,110,0.90);
    box-shadow: 0 0 14px rgba(60,220,90,0.45), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-z.mode-load {
    background: rgba(0,150,220,0.82);
    border-color: rgba(60,210,255,0.95);
    box-shadow: 0 0 20px rgba(0,190,255,0.72), 0 3px 10px rgba(0,0,0,0.5);
}

/* ===== X: 必殺技 ===== */
#tb-x {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(200,120,0,0.72);
    border: 3px solid rgba(255,210,40,0.90);
    box-shadow: 0 0 14px rgba(255,200,30,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-x.mode-ready {
    background: rgba(220,170,0,0.92);
    border-color: rgba(255,240,80,1.0);
    animation: pulse-gold 0.6s ease-in-out infinite alternate;
}
@keyframes pulse-gold {
    from { box-shadow: 0 0 14px rgba(255,220,0,0.7), 0 3px 10px rgba(0,0,0,0.5); }
    to   { box-shadow: 0 0 32px rgba(255,240,60,1.0), 0 4px 16px rgba(0,0,0,0.6); transform: scale(1.07); }
}

/* ===== C: 侵攻 / 仲間連携 ===== */
#tb-c {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(30,90,220,0.72);
    border: 3px solid rgba(90,160,255,0.90);
    box-shadow: 0 0 14px rgba(80,150,255,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-c.mode-invade {
    background: rgba(200,30,30,0.90);
    border-color: rgba(255,80,80,1.0);
    animation: pulse-red 0.5s ease-in-out infinite alternate;
}
#tb-c.mode-throw-ally {
    background: rgba(120,0,200,0.84);
    border-color: rgba(200,80,255,0.95);
    box-shadow: 0 0 18px rgba(180,60,255,0.65), 0 3px 10px rgba(0,0,0,0.5);
}
@keyframes pulse-red {
    from { box-shadow: 0 0 14px rgba(255,50,50,0.6), 0 3px 10px rgba(0,0,0,0.5); }
    to   { box-shadow: 0 0 30px rgba(255,80,80,1.0), 0 4px 16px rgba(0,0,0,0.6); transform: scale(1.08); }
}

/* ===== B: 投げる / 捨てる ===== */
/* 通常時は薄く表示 → 「何も持っていないときに押すボタンではない」を直感的に伝える */
#tb-b {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(120,25,25,0.50);
    border: 3px solid rgba(180,60,60,0.65);
    box-shadow: 0 0 6px rgba(160,40,40,0.20), 0 3px 10px rgba(0,0,0,0.5);
    opacity: 0.45;
}
/* アイテム/仲間所持中 → 通常輝度に */
#tb-b.mode-active {
    background: rgba(180,40,40,0.82);
    border-color: rgba(255,90,90,0.95);
    box-shadow: 0 0 16px rgba(230,60,60,0.55), 0 3px 10px rgba(0,0,0,0.5);
    opacity: 1.0;
}

/* ポーズ */
#tb-pause {
    width: var(--btn-xs); height: 34px;
    border-radius: 12px;
    background: rgba(60,60,80,0.75);
    border: 1.5px solid rgba(200,200,220,0.60);
    font-size: 16px;
}

/* メニュー用ボタン */
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

/* チュートリアルヒント */
#touch-tutorial {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.88);
    border: 1px solid rgba(91,163,230,0.5);
    border-radius: 14px;
    padding: 18px 24px;
    color: #fff;
    font-size: 13px;
    line-height: 1.9;
    text-align: left;
    pointer-events: none;
    transition: opacity 0.5s;
    white-space: nowrap;
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
    #touch-ui { --btn-a: 72px; --btn-m: 62px; --btn-xs: 42px; --dpad: 140px; }
    .t-btn .btn-key   { font-size: 18px; }
    .t-btn .btn-label { font-size: 9px; }
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

<!-- バトル用ボタン群 -->
<div class="t-btn" id="tb-z">
    <span class="btn-key">Z</span>
    <span class="btn-label">拾う/攻撃</span>
</div>
<div class="t-btn" id="tb-x">
    <span class="btn-key">X</span>
    <span class="btn-label">必殺技</span>
</div>
<div class="t-btn" id="tb-c">
    <span class="btn-key">C</span>
    <span class="btn-label">侵攻/連携</span>
</div>
<div class="t-btn" id="tb-b">
    <span class="btn-key">B</span>
    <span class="btn-label">投げる</span>
</div>
<div class="t-btn" id="tb-pause">⏸</div>

<!-- メニュー用ボタン群 -->
<div id="tb-menu-confirm">
    <span class="btn-key">Z</span>
    <span class="btn-label">決定</span>
</div>
<div id="tb-menu-back">
    <span class="btn-key">B</span>
    <span class="btn-label">戻る</span>
</div>

<!-- 初回チュートリアルヒント -->
<div id="touch-tutorial" style="display:none;">
    <div class="tut-title">🎮 タッチ操作ガイド</div>
    <div class="tut-row">
        <span class="tut-key z">Z</span>
        <div>拾う・攻撃<br><span class="tut-sub">大砲の近くで持つ → <b style="color:#4df">装填↑</b>に変化</span></div>
    </div>
    <div class="tut-row">
        <span class="tut-key x">X</span>
        <div>必殺技<br><span class="tut-sub">ゲージMAXで <b style="color:#fd0">金色点滅</b></span></div>
    </div>
    <div class="tut-row">
        <span class="tut-key c">C</span>
        <div>敵陣侵攻・仲間連携<br><span class="tut-sub">侵攻可能で <b style="color:#f44">赤く点滅</b></span></div>
    </div>
    <div class="tut-row">
        <span class="tut-key b">B</span>
        <div>投げる・捨てる<br><span class="tut-sub">何か持つと <b style="color:#f88">明るくなる</b></span></div>
    </div>
    <div class="tut-note">タップすると閉じます</div>
</div>
`;
        document.body.appendChild(el);
        this.ui = el;

        const btnDefs = [
            { id: 'tb-z',     key: 'KeyZ' },
            { id: 'tb-x',     key: 'KeyX' },
            { id: 'tb-c',     key: 'KeyC' },
            { id: 'tb-b',     key: 'KeyB' },
            { id: 'tb-pause', key: 'KeyP_FAKE' },
        ];
        this.buttons = btnDefs.map(b => ({
            el: document.getElementById(b.id),
            key: b.key,
        }));

        this.menuButtons = [
            { el: document.getElementById('tb-menu-confirm'), key: 'KeyZ' },
            { el: document.getElementById('tb-menu-back'),    key: 'KeyB' },
        ];

        this.dpadEl = document.getElementById('t-dpad');
        this.knobEl = document.getElementById('t-dpad-knob');
        this.tutorialEl = document.getElementById('touch-tutorial');

        this._updateLayout();
    }

    _bindEvents() {
        for (const btn of this.buttons) {
            btn.el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (btn.key === 'KeyP_FAKE') {
                    if (window.game) window.game.input.keys['KeyP'] = true;
                    setTimeout(() => { if (window.game) window.game.input.keys['KeyP'] = false; }, 60);
                } else {
                    this.vKeys[btn.key] = true;
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
            btn.el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.vKeys[btn.key] = true;
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

        this.dpadEl.addEventListener('touchstart', (e) => { e.preventDefault(); this._dpadMove(e.touches[0]); }, { passive: false });
        this.dpadEl.addEventListener('touchmove',  (e) => { e.preventDefault(); this._dpadMove(e.touches[0]); }, { passive: false });
        this.dpadEl.addEventListener('touchend',   (e) => { e.preventDefault(); this._dpadRelease(); }, { passive: false });
        this.dpadEl.addEventListener('touchcancel',() => { this._dpadRelease(); });

        if (this.tutorialEl) {
            this.tutorialEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._hideTutorial();
            }, { passive: false });
        }

        window.addEventListener('orientationchange', () => { setTimeout(() => this._updateLayout(), 120); });
        window.addEventListener('resize', () => this._updateLayout());
    }

    _dpadMove(touch) {
        const rect = this.dpadEl.getBoundingClientRect();
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;
        const dx = touch.clientX - cx;
        const dy = touch.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dead = 12;
        const max  = rect.width * 0.42;

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
        if (!this.ui || this.mode !== 'battle') return;
        this._ctxFrame++;

        const tbZ    = document.getElementById('tb-z');
        const tbZLbl = tbZ  ? tbZ.querySelector('.btn-label')  : null;
        const tbX    = document.getElementById('tb-x');
        const tbXLbl = tbX  ? tbX.querySelector('.btn-label')  : null;
        const tbC    = document.getElementById('tb-c');
        const tbCLbl = tbC  ? tbC.querySelector('.btn-label')  : null;
        const tbB    = document.getElementById('tb-b');
        const tbBLbl = tbB  ? tbB.querySelector('.btn-label')  : null;
        if (!tbZ || !tbX || !tbC || !tbB) return;

        // ---- Z ----
        if (ctx.nearCannon && ctx.holdingItem) {
            tbZ.className = 't-btn mode-load';
            if (tbZLbl) tbZLbl.textContent = '装填↑';
        } else if (ctx.holdingItem) {
            tbZ.className = 't-btn';
            if (tbZLbl) tbZLbl.textContent = '攻撃/置く';
        } else if (ctx.holdingAlly) {
            tbZ.className = 't-btn';
            if (tbZLbl) tbZLbl.textContent = '仲間攻撃';
        } else {
            tbZ.className = 't-btn';
            if (tbZLbl) tbZLbl.textContent = '拾う/攻撃';
        }

        // ---- X ----
        if (ctx.specialReady) {
            tbX.className = 't-btn mode-ready';
            if (tbXLbl) tbXLbl.textContent = '必殺技!';
        } else {
            tbX.className = 't-btn';
            if (tbXLbl) tbXLbl.textContent = '必殺技';
        }

        // ---- C ----
        if (ctx.invasionAvailable) {
            tbC.className = 't-btn mode-invade';
            if (tbCLbl) tbCLbl.textContent = '侵攻!!';
        } else if (ctx.holdingAlly) {
            tbC.className = 't-btn mode-throw-ally';
            if (tbCLbl) tbCLbl.textContent = 'ミサイル!';
        } else {
            tbC.className = 't-btn';
            if (tbCLbl) tbCLbl.textContent = '侵攻/連携';
        }

        // ---- B ----
        const bHolding = ctx.holdingItem || ctx.holdingAlly;
        if (bHolding) {
            tbB.className = 't-btn mode-active';
            if (tbBLbl) {
                if (ctx.holdingAlly && ctx.nearCannon) tbBLbl.textContent = 'ミサイル!';
                else if (ctx.holdingAlly)              tbBLbl.textContent = '投げる';
                else if (ctx.nearCannon)               tbBLbl.textContent = '捨てる';
                else                                   tbBLbl.textContent = '投げる';
            }
        } else {
            tbB.className = 't-btn';
            if (tbBLbl) tbBLbl.textContent = '投げる';
        }

        this._ctx = ctx;
    }

    _updateLayout() {
        if (!this.ui) return;

        const W = window.innerWidth;
        const safeB = parseFloat(
            getComputedStyle(document.documentElement)
                .getPropertyValue('env(safe-area-inset-bottom)') || '0'
        ) || 0;
        const safeR = parseFloat(
            getComputedStyle(document.documentElement)
                .getPropertyValue('env(safe-area-inset-right)') || '0'
        ) || 0;

        const btnA = W <= 380 ? 72 : 84;
        const btnM = W <= 380 ? 62 : 72;
        const gap  = 12;
        const rEdge = 16 + safeR;
        const bEdge = 20 + safeB;

        const tbZ     = document.getElementById('tb-z');
        const tbX     = document.getElementById('tb-x');
        const tbC     = document.getElementById('tb-c');
        const tbB     = document.getElementById('tb-b');
        const tbPause = document.getElementById('tb-pause');
        const tbMC    = document.getElementById('tb-menu-confirm');
        const tbMB    = document.getElementById('tb-menu-back');
        if (!tbZ) return;

        this.ui.style.setProperty('--btn-a', btnA + 'px');
        this.ui.style.setProperty('--btn-m', btnM + 'px');

        const pos = 'position:absolute;';

        // ボタン配置 (右下):
        //
        //   [ B ]        ← B: 何か持ったとき用。Z の真上で「上に投げる」感覚
        //   [ X ] [ Z ]  ← Z: 主操作。最も押しやすい右端
        //   [ C ]        ← C: 左下 (侵攻はタイミングが大事なので独立)
        //
        // 考え方:
        //  - Z(緑・大) が右端。親指がいちばん自然に届く
        //  - B(赤)    が Z の真上。「持ったまま上に投げる」直感
        //  - X(金)    が Z の左隣。必殺技は少し離して誤爆防止
        //  - C(青/赤) が X の下。侵攻/連携は独立した操作

        tbZ.style.cssText = `${pos} width:${btnA}px; height:${btnA}px; right:${rEdge}px;                  bottom:${bEdge}px;`;
        tbB.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge+(btnA-btnM)/2}px;    bottom:${bEdge+btnA+gap}px;`;
        tbX.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge+btnA+gap}px;         bottom:${bEdge+btnM+gap}px;`;
        tbC.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge+btnA+gap}px;         bottom:${bEdge}px;`;

        tbPause.style.cssText = `${pos} width:var(--btn-xs); right:${rEdge}px; top:14px;`;

        tbMC.style.cssText = `${pos} right:${rEdge}px; bottom:${bEdge}px;`;
        tbMB.style.cssText = `${pos} right:${rEdge + 80 + gap}px; bottom:${bEdge + 8}px;`;
    }

    setMode(mode) {
        if (!this.ui) return;
        this.mode = mode;

        const tbZ     = document.getElementById('tb-z');
        const tbX     = document.getElementById('tb-x');
        const tbC     = document.getElementById('tb-c');
        const tbB     = document.getElementById('tb-b');
        const tbPause = document.getElementById('tb-pause');
        const tbMC    = document.getElementById('tb-menu-confirm');
        const tbMB    = document.getElementById('tb-menu-back');
        const dpad    = document.getElementById('t-dpad');

        if (mode === 'hidden') {
            this.ui.style.display = 'none';
        } else if (mode === 'battle') {
            this.ui.style.display = '';
            tbZ.style.display = ''; tbX.style.display = '';
            tbC.style.display = ''; tbB.style.display = '';
            tbPause.style.display = '';
            tbMC.style.display = 'none'; tbMB.style.display = 'none';
            dpad.style.display = '';
            if (!this._tutorialShown) {
                setTimeout(() => this._showTutorial(), 800);
            }
        } else if (mode === 'menu') {
            this.ui.style.display = '';
            tbZ.style.display = 'none'; tbX.style.display = 'none';
            tbC.style.display = 'none'; tbB.style.display = 'none';
            tbPause.style.display = 'none';
            tbMC.style.display = ''; tbMB.style.display = '';
            dpad.style.display = '';
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
window.TouchController = TouchController;
