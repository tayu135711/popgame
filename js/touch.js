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
    transition: background 0.07s, transform 0.06s;
    gap: 2px;
    line-height: 1;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
}
.t-btn .btn-key {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0;
}
.t-btn .btn-label {
    font-size: 10px;
    font-weight: 700;
    opacity: 0.95;
    white-space: nowrap;
}
.t-btn.pressed {
    transform: scale(0.84);
    filter: brightness(1.5);
}
/* バトル用ボタン */
#tb-z {
    width: var(--btn-a); height: var(--btn-a);
    background: rgba(30,160,60,0.72);
    border: 3px solid rgba(80,240,110,0.90);
    box-shadow: 0 0 14px rgba(60,220,90,0.45), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-x {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(200,120,0,0.72);
    border: 3px solid rgba(255,210,40,0.90);
    box-shadow: 0 0 14px rgba(255,200,30,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-c {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(30,90,220,0.72);
    border: 3px solid rgba(90,160,255,0.90);
    box-shadow: 0 0 14px rgba(80,150,255,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
#tb-b {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(180,40,40,0.72);
    border: 3px solid rgba(240,90,90,0.90);
    box-shadow: 0 0 14px rgba(230,80,80,0.40), 0 3px 10px rgba(0,0,0,0.5);
}
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    gap: 3px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
    font-weight: 900;
    transition: transform 0.06s, filter 0.06s;
}
#tb-menu-confirm .btn-key { font-size: 22px; font-weight: 900; }
#tb-menu-confirm .btn-label { font-size: 11px; font-weight: 700; white-space: nowrap; }
#tb-menu-confirm.pressed { transform: scale(0.84); filter: brightness(1.5); }

#tb-menu-back {
    width: 64px; height: 64px;
    background: rgba(180,40,40,0.80);
    border: 3px solid rgba(240,90,90,0.90);
    box-shadow: 0 0 14px rgba(230,80,80,0.45), 0 4px 14px rgba(0,0,0,0.6);
    border-radius: 50%;
    position: absolute;
    pointer-events: all;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    gap: 3px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);
    font-weight: 900;
    transition: transform 0.06s, filter 0.06s;
}
#tb-menu-back .btn-key { font-size: 18px; font-weight: 900; }
#tb-menu-back .btn-label { font-size: 10px; font-weight: 700; white-space: nowrap; }
#tb-menu-back.pressed { transform: scale(0.84); filter: brightness(1.5); }

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
.t-dpad-arrow.up    { top:8px;    left:50%; transform:translateX(-50%); border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:13px solid white; }
.t-dpad-arrow.down  { bottom:8px; left:50%; transform:translateX(-50%); border-left:8px solid transparent; border-right:8px solid transparent; border-top:13px solid white; }
.t-dpad-arrow.left  { left:8px;   top:50%; transform:translateY(-50%);  border-top:8px solid transparent; border-bottom:8px solid transparent; border-right:13px solid white; }
.t-dpad-arrow.right { right:8px;  top:50%; transform:translateY(-50%);  border-top:8px solid transparent; border-bottom:8px solid transparent; border-left:13px solid white; }

/* チュートリアルヒント */
#touch-tutorial {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.82);
    border: 1px solid rgba(91,163,230,0.5);
    border-radius: 14px;
    padding: 18px 22px;
    color: #fff;
    font-size: 13px;
    line-height: 1.9;
    text-align: center;
    pointer-events: none;
    transition: opacity 0.5s;
    white-space: nowrap;
    box-shadow: 0 4px 24px rgba(0,0,0,0.6);
}
#touch-tutorial .tut-title { font-size: 15px; font-weight: 900; color: #FFD700; margin-bottom: 6px; }
#touch-tutorial .tut-row { display: flex; align-items: center; gap: 8px; justify-content: flex-start; }
#touch-tutorial .tut-key { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; font-weight: 900; font-size: 13px; flex-shrink: 0; }
#touch-tutorial .tut-key.z { background: rgba(40,180,70,0.5);  border:1px solid rgba(60,220,90,0.8); }
#touch-tutorial .tut-key.x { background: rgba(220,150,0,0.5);  border:1px solid rgba(255,200,30,0.8); }
#touch-tutorial .tut-key.c { background: rgba(40,100,240,0.5); border:1px solid rgba(80,150,255,0.8); }
#touch-tutorial .tut-key.b { background: rgba(200,50,50,0.5);  border:1px solid rgba(230,80,80,0.8); }

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
    <span class="btn-label">拾う/装填</span>
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
    <div class="tut-row"><span class="tut-key z">Z</span><span>拾う・装填・攻撃</span></div>
    <div class="tut-row"><span class="tut-key x">X</span><span>必殺技（ゲージMAXで使用）</span></div>
    <div class="tut-row"><span class="tut-key c">C</span><span>敵陣侵攻・仲間連携</span></div>
    <div class="tut-row"><span class="tut-key b">B</span><span>アイテム投げる・キャンセル</span></div>
    <div style="margin-top:8px; opacity:0.6; font-size:11px;">タップすると閉じます</div>
</div>
`;
        document.body.appendChild(el);
        this.ui = el;

        // バトル用ボタン登録
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

        // メニュー用ボタン登録
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
        // バトル用ボタン
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

        // メニュー用ボタン
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

        // Dpad
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

    _updateLayout() {
        if (!this.ui) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        const isLandscape = W > H;

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

        if (isLandscape) {
            tbZ.style.cssText = `${pos} width:${btnA}px; height:${btnA}px; right:${rEdge}px; bottom:${bEdge + btnM + gap}px;`;
            tbX.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge + btnA + gap}px; bottom:${bEdge + btnM + gap}px;`;
            tbC.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge}px; bottom:${bEdge}px;`;
            tbB.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge + btnA + gap}px; bottom:${bEdge}px;`;
        } else {
            tbZ.style.cssText = `${pos} width:${btnA}px; height:${btnA}px; right:${rEdge}px; bottom:${bEdge + btnM + gap}px;`;
            tbX.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge + btnA + gap}px; bottom:${bEdge + btnM + gap}px;`;
            tbC.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge}px; bottom:${bEdge}px;`;
            tbB.style.cssText = `${pos} width:${btnM}px; height:${btnM}px; right:${rEdge + btnA + gap}px; bottom:${bEdge}px;`;
        }

        tbPause.style.cssText = `${pos} width:var(--btn-xs); right:${rEdge}px; top:14px;`;

        // メニューボタン配置: 右下に「決定(Z)」大、その左に「戻る(B)」小
        tbMC.style.cssText = `${pos} right:${rEdge}px; bottom:${bEdge}px;`;
        tbMB.style.cssText = `${pos} right:${rEdge + 80 + gap}px; bottom:${bEdge + 8}px;`;
    }

    // ===== モード切替 =====
    // mode: 'hidden' | 'battle' | 'menu'
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
            tbZ.style.display = '';
            tbX.style.display = '';
            tbC.style.display = '';
            tbB.style.display = '';
            tbPause.style.display = '';
            tbMC.style.display = 'none';
            tbMB.style.display = 'none';
            dpad.style.display = '';
            if (!this._tutorialShown) {
                setTimeout(() => this._showTutorial(), 800);
            }
        } else if (mode === 'menu') {
            this.ui.style.display = '';
            tbZ.style.display = 'none';
            tbX.style.display = 'none';
            tbC.style.display = 'none';
            tbB.style.display = 'none';
            tbPause.style.display = 'none';
            tbMC.style.display = '';
            tbMB.style.display = '';
            dpad.style.display = '';
        }
    }

    // 後方互換: setVisible(true) → battle, setVisible(false) → hidden
    setVisible(v) {
        this.setMode(v ? 'battle' : 'hidden');
    }

    _showTutorial() {
        if (this._tutorialShown || !this.tutorialEl) return;
        this._tutorialShown = true;
        this.tutorialEl.style.display = '';
        this.tutorialEl.style.opacity = '1';
        this._tutTimer = setTimeout(() => this._hideTutorial(), 6000);
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
