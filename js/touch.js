// ======================================
// TOUCH - スマホ用タッチコントロール
// ======================================
class TouchController {
    constructor(inputManager, canvas) {
        this.input = inputManager;
        this.canvas = canvas;
        this.active = false;
        this.touches = {};

        // 仮想ボタン状態
        this.vKeys = {
            ArrowLeft: false, ArrowRight: false,
            ArrowUp: false, ArrowDown: false,
            KeyZ: false, KeyX: false, KeyC: false,
            Space: false, KeyB: false,
        };
        this._prevVKeys = {};

        this.buttons = [];
        this.dpad = null;
        this.dpadTouch = null;

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

    // InputManagerのpressed/heldをvキー対応に拡張
    _patchInput() {
        const self = this;
        const origHeld = this.input.held.bind(this.input);
        const origPressed = this.input.pressed.bind(this.input);
        this.input.held = (c) => origHeld(c) || !!self.vKeys[c];
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
}
/* =====================================================
   ボタンサイズ: CSS変数で一括管理（_updateLayout で変更）
===================================================== */
#touch-ui {
    --btn-size: 64px;
    --btn-sm: 56px;
    --btn-xs: 44px;
    --dpad-size: 150px;
    --safe-b: env(safe-area-inset-bottom, 0px);
    --safe-r: env(safe-area-inset-right, 0px);
    --safe-l: env(safe-area-inset-left, 0px);
}
.t-btn {
    position: absolute;
    pointer-events: all;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    width: var(--btn-size); height: var(--btn-size);
    font-size: 22px;
    font-weight: bold;
    color: rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.12);
    border: 2px solid rgba(255,255,255,0.28);
    backdrop-filter: blur(4px);
    transition: background 0.07s, transform 0.07s;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    box-shadow: 0 2px 12px rgba(0,0,0,0.35);
}
.t-btn.pressed {
    background: rgba(255,255,255,0.32);
    transform: scale(0.88);
}
.t-btn.btn-action  { width: var(--btn-size); height: var(--btn-size); background: rgba(60,200,80,0.25);  border-color: rgba(80,220,100,0.5); }
.t-btn.btn-special { width: var(--btn-sm); height: var(--btn-sm); background: rgba(255,180,0,0.25);  border-color: rgba(255,200,30,0.5); }
.t-btn.btn-invade  { width: var(--btn-sm); height: var(--btn-sm); background: rgba(60,120,255,0.25); border-color: rgba(80,150,255,0.5); }
.t-btn.btn-back    { width: var(--btn-sm); height: var(--btn-sm); background: rgba(200,60,60,0.22);  border-color: rgba(220,80,80,0.45); }
.t-btn.btn-pause   { width: var(--btn-xs); height: 34px; background: rgba(120,120,120,0.2); border-color: rgba(180,180,180,0.3); font-size:16px; border-radius:12px; }

/* Dpad */
#t-dpad {
    position: absolute;
    pointer-events: all;
    touch-action: none;
    width: var(--dpad-size); height: var(--dpad-size);
    bottom: calc(20px + var(--safe-b));
    left: calc(20px + var(--safe-l));
}
.t-dpad-bg {
    position: absolute; inset: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
    border: 2px solid rgba(255,255,255,0.2);
    box-shadow: 0 2px 16px rgba(0,0,0,0.3);
}
.t-dpad-knob {
    position: absolute;
    width: 52px; height: 52px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    border: 2px solid rgba(255,255,255,0.45);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    transition: transform 0.05s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.t-dpad-arrows {
    position: absolute; inset: 0;
    pointer-events: none;
}
.t-dpad-arrow {
    position: absolute;
    width: 0; height: 0;
    opacity: 0.35;
}
.t-dpad-arrow.up    { top: 8px;  left: 50%; transform: translateX(-50%); border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 12px solid white; }
.t-dpad-arrow.down  { bottom: 8px; left: 50%; transform: translateX(-50%); border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid white; }
.t-dpad-arrow.left  { left: 8px; top: 50%; transform: translateY(-50%); border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 12px solid white; }
.t-dpad-arrow.right { right: 8px; top: 50%; transform: translateY(-50%); border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 12px solid white; }

/* =====================================================
   小画面対応 (幅 360px 以下など)
===================================================== */
@media (max-width: 380px) {
    #touch-ui {
        --btn-size: 54px;
        --btn-sm:   48px;
        --btn-xs:   36px;
        --dpad-size: 130px;
    }
}
</style>

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

<div class="t-btn btn-action"  id="tb-action"></div>
<div class="t-btn btn-special" id="tb-special"></div>
<div class="t-btn btn-invade"  id="tb-invade"></div>
<div class="t-btn btn-back"    id="tb-back"></div>
<div class="t-btn btn-pause"   id="tb-pause">⏸</div>
`;
        document.body.appendChild(el);
        this.ui = el;

        // ボタン登録
        const btns = [
            { id: 'tb-action',  key: 'KeyZ',      icon: '⚡' },
            { id: 'tb-special', key: 'KeyX',      icon: '💥' },
            { id: 'tb-invade',  key: 'KeyC',      icon: '⚔️' },
            { id: 'tb-back',    key: 'KeyB',      icon: '✖' },
            { id: 'tb-pause',   key: 'KeyP_FAKE', icon: '⏸' },
        ];
        this.buttons = btns.map(b => {
            const elem = document.getElementById(b.id);
            elem.textContent = b.icon;
            return { el: elem, key: b.key };
        });

        this.dpadEl = document.getElementById('t-dpad');
        this.knobEl = document.getElementById('t-dpad-knob');

        // 初期配置
        this._updateLayout();
    }

    _bindEvents() {
        // ボタンタッチ
        for (const btn of this.buttons) {
            btn.el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (btn.key === 'KeyP_FAKE') {
                    if (window.game) window.game.input.keys['KeyP'] = true;
                    setTimeout(() => { if (window.game) window.game.input.keys['KeyP'] = false; }, 60);
                } else {
                    if (btn.key === 'KeyZ') this.vKeys['Space'] = true;
                    this.vKeys[btn.key] = true;
                }
                btn.el.classList.add('pressed');
            }, { passive: false });

            btn.el.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (btn.key === 'KeyZ') this.vKeys['Space'] = false;
                this.vKeys[btn.key] = false;
                btn.el.classList.remove('pressed');
            }, { passive: false });

            btn.el.addEventListener('touchcancel', () => {
                if (btn.key === 'KeyZ') this.vKeys['Space'] = false;
                this.vKeys[btn.key] = false;
                btn.el.classList.remove('pressed');
            });
        }

        // Dpad
        this.dpadEl.addEventListener('touchstart', (e) => { e.preventDefault(); this._dpadMove(e.touches[0]); }, { passive: false });
        this.dpadEl.addEventListener('touchmove',  (e) => { e.preventDefault(); this._dpadMove(e.touches[0]); }, { passive: false });
        this.dpadEl.addEventListener('touchend',   (e) => { e.preventDefault(); this._dpadRelease(); }, { passive: false });
        this.dpadEl.addEventListener('touchcancel',() => { this._dpadRelease(); });

        window.addEventListener('orientationchange', () => { setTimeout(() => this._updateLayout(), 100); });
        window.addEventListener('resize', () => this._updateLayout());
    }

    _dpadMove(touch) {
        const rect = this.dpadEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
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
        this.vKeys.ArrowLeft = this.vKeys.ArrowRight = this.vKeys.ArrowUp = this.vKeys.ArrowDown = false;
        this.knobEl.style.transform = 'translate(-50%, -50%)';
    }

    // =====================================================
    // ★修正: ボタン位置をビューポートサイズに応じて動的配置
    //   safe-area-inset を考慮してノッチ/パンチホール対応
    // =====================================================
    _updateLayout() {
        if (!this.ui) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        const isLandscape = W > H;

        // safe-area-inset (CSS env() の実測値を取得)
        const safeB = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-b') || '0') || 0;
        const safeR = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-r') || '0') || 0;

        // ボタンサイズ (小画面では縮小)
        const baseSize = W <= 380 ? 54 : 64;
        const smSize   = W <= 380 ? 48 : 56;

        // 右側ボタンの基準マージン
        const rEdge = 16 + safeR;
        const bEdge = 16 + safeB;

        const actionEl  = document.getElementById('tb-action');
        const specialEl = document.getElementById('tb-special');
        const invadeEl  = document.getElementById('tb-invade');
        const backEl    = document.getElementById('tb-back');
        const pauseEl   = document.getElementById('tb-pause');

        if (!actionEl) return;

        if (isLandscape) {
            // ランドスケープ: ボタンを右下にクラスター配置
            actionEl.style.cssText  = `right:${rEdge + smSize + 10}px; bottom:${bEdge + smSize + 10}px;`;
            specialEl.style.cssText = `right:${rEdge}px; bottom:${bEdge + smSize + 10}px;`;
            invadeEl.style.cssText  = `right:${rEdge + smSize + 10}px; bottom:${bEdge}px;`;
            backEl.style.cssText    = `right:${rEdge}px; bottom:${bEdge}px;`;
        } else {
            // ポートレート: ボタンを右下にクラスター配置
            // A:右, B:右上, C:右下から少し上, X:一番右
            actionEl.style.cssText  = `right:${rEdge + smSize + 12}px; bottom:${bEdge + smSize + 12}px;`;
            specialEl.style.cssText = `right:${rEdge}px;              bottom:${bEdge + smSize + 12}px;`;
            invadeEl.style.cssText  = `right:${rEdge + smSize + 12}px; bottom:${bEdge}px;`;
            backEl.style.cssText    = `right:${rEdge}px;              bottom:${bEdge}px;`;
        }

        // ポーズボタンは右上固定
        pauseEl.style.cssText = `right:${rEdge}px; top:10px; width:44px; height:34px;`;
    }

    // タッチUIを表示/非表示切り替え（ゲームstateで呼ばれる）
    setVisible(v) {
        if (this.ui) this.ui.style.display = v ? '' : 'none';
    }
}
window.TouchController = TouchController;
