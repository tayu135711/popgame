// ======================================
// TOUCH - スマホ用タッチコントロール
// ======================================
class TouchController {
    constructor(inputManager, canvas) {
        this.input = inputManager;
        this.canvas = canvas;
        this.active = false;
        this.touches = {};

        this.vKeys = {
            ArrowLeft: false, ArrowRight: false,
            ArrowUp: false, ArrowDown: false,
            KeyZ: false, KeyX: false, KeyC: false,
            Space: false, KeyB: false,
        };
        this._prevVKeys = {};
        this._tutorialShown = false; // チュートリアルヒント表示済みフラグ

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

    // InputManagerのpressed/heldをvキー対応に拡張
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
    /* サイズ変数 */
    --btn-a:  68px;   /* Zボタン (一番大きい) */
    --btn-m:  58px;   /* X/C/Bボタン */
    --btn-xs: 44px;   /* ポーズ */
    --dpad:   152px;
    --safe-b: env(safe-area-inset-bottom, 0px);
    --safe-r: env(safe-area-inset-right,  0px);
    --safe-l: env(safe-area-inset-left,   0px);
}

/* ===== 共通ボタン ===== */
.t-btn {
    position: absolute;
    pointer-events: all;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.95);
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    backdrop-filter: blur(4px);
    box-shadow: 0 3px 14px rgba(0,0,0,0.45);
    transition: background 0.07s, transform 0.06s;
    gap: 1px;
    line-height: 1;
}
.t-btn .btn-key {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0;
}
.t-btn .btn-label {
    font-size: 9px;
    font-weight: 600;
    opacity: 0.82;
    white-space: nowrap;
}
.t-btn.pressed {
    transform: scale(0.87);
    filter: brightness(1.4);
}

/* ===== 各ボタン個別スタイル ===== */
/* Z: アクション（緑・大） */
#tb-z {
    width: var(--btn-a); height: var(--btn-a);
    background: rgba(40,180,70,0.30);
    border: 2.5px solid rgba(60,220,90,0.60);
}
/* X: 必殺技（金・中） */
#tb-x {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(220,150,0,0.28);
    border: 2.5px solid rgba(255,200,30,0.60);
}
/* C: 侵攻/連携（青・中） */
#tb-c {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(40,100,240,0.28);
    border: 2.5px solid rgba(80,150,255,0.60);
}
/* B: 投げる/戻る（赤・中） */
#tb-b {
    width: var(--btn-m); height: var(--btn-m);
    background: rgba(200,50,50,0.26);
    border: 2.5px solid rgba(230,80,80,0.55);
}
/* ポーズ */
#tb-pause {
    width: var(--btn-xs); height: 34px;
    border-radius: 12px;
    background: rgba(100,100,100,0.25);
    border: 1.5px solid rgba(180,180,180,0.35);
    font-size: 16px;
}

/* ===== Dpad ===== */
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
    background: rgba(255,255,255,0.07);
    border: 2px solid rgba(255,255,255,0.22);
    box-shadow: 0 2px 16px rgba(0,0,0,0.3);
}
.t-dpad-knob {
    position: absolute;
    width: 54px; height: 54px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    border: 2px solid rgba(255,255,255,0.48);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    transition: transform 0.05s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.t-dpad-arrows { position: absolute; inset: 0; pointer-events: none; }
.t-dpad-arrow  { position: absolute; width: 0; height: 0; opacity: 0.38; }
.t-dpad-arrow.up    { top:8px;    left:50%; transform:translateX(-50%); border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:13px solid white; }
.t-dpad-arrow.down  { bottom:8px; left:50%; transform:translateX(-50%); border-left:8px solid transparent; border-right:8px solid transparent; border-top:13px solid white; }
.t-dpad-arrow.left  { left:8px;   top:50%; transform:translateY(-50%);  border-top:8px solid transparent; border-bottom:8px solid transparent; border-right:13px solid white; }
.t-dpad-arrow.right { right:8px;  top:50%; transform:translateY(-50%);  border-top:8px solid transparent; border-bottom:8px solid transparent; border-left:13px solid white; }

/* ===== チュートリアルヒント ===== */
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
#touch-tutorial .tut-title {
    font-size: 15px;
    font-weight: 900;
    color: #FFD700;
    margin-bottom: 6px;
}
#touch-tutorial .tut-row {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-start;
}
#touch-tutorial .tut-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px; height: 26px;
    border-radius: 6px;
    font-weight: 900;
    font-size: 13px;
    flex-shrink: 0;
}
#touch-tutorial .tut-key.z { background: rgba(40,180,70,0.5);  border:1px solid rgba(60,220,90,0.8); }
#touch-tutorial .tut-key.x { background: rgba(220,150,0,0.5);  border:1px solid rgba(255,200,30,0.8); }
#touch-tutorial .tut-key.c { background: rgba(40,100,240,0.5); border:1px solid rgba(80,150,255,0.8); }
#touch-tutorial .tut-key.b { background: rgba(200,50,50,0.5);  border:1px solid rgba(230,80,80,0.8); }

/* ===== 小画面対応 ===== */
@media (max-width: 380px) {
    #touch-ui {
        --btn-a: 58px;
        --btn-m: 50px;
        --btn-xs: 38px;
        --dpad: 132px;
    }
    .t-btn .btn-key   { font-size: 15px; }
    .t-btn .btn-label { font-size: 8px; }
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

<!-- アクションボタン群 -->
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

        // ボタン登録
        // ★バグ修正: ZボタンはKeyZのみ発火。Spaceは発火しない。
        //   (以前はZ→Spaceも同時発火しておりバトル中にドッジが意図せず発動していた)
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

        // Dpad
        this.dpadEl.addEventListener('touchstart', (e) => { e.preventDefault(); this._dpadMove(e.touches[0]); }, { passive: false });
        this.dpadEl.addEventListener('touchmove',  (e) => { e.preventDefault(); this._dpadMove(e.touches[0]); }, { passive: false });
        this.dpadEl.addEventListener('touchend',   (e) => { e.preventDefault(); this._dpadRelease(); }, { passive: false });
        this.dpadEl.addEventListener('touchcancel',() => { this._dpadRelease(); });

        // チュートリアルをタップで閉じる
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

    // =====================================================
    // ボタン配置: ポートレート/ランドスケープで自動切替
    // セーフエリア (ノッチ・Dynamic Island) に対応
    // =====================================================
    _updateLayout() {
        if (!this.ui) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        const isLandscape = W > H;

        // safe-area (CSS env()値は JS から直接取れないのでフォールバック値)
        const safeB = parseFloat(
            getComputedStyle(document.documentElement)
                .getPropertyValue('env(safe-area-inset-bottom)') || '0'
        ) || 0;
        const safeR = parseFloat(
            getComputedStyle(document.documentElement)
                .getPropertyValue('env(safe-area-inset-right)') || '0'
        ) || 0;

        const btnA = W <= 380 ? 58 : 68;   // Zボタン
        const btnM = W <= 380 ? 50 : 58;   // X/C/Bボタン
        const gap  = 10;
        const rEdge = 14 + safeR;
        const bEdge = 14 + safeB;

        const tbZ     = document.getElementById('tb-z');
        const tbX     = document.getElementById('tb-x');
        const tbC     = document.getElementById('tb-c');
        const tbB     = document.getElementById('tb-b');
        const tbPause = document.getElementById('tb-pause');
        if (!tbZ) return;

        // ボタンサイズをCSS変数に反映
        this.ui.style.setProperty('--btn-a',  btnA + 'px');
        this.ui.style.setProperty('--btn-m',  btnM + 'px');

        if (isLandscape) {
            // ランドスケープ: 右下クラスター
            //   [X] [Z]
            //   [B] [C]
            tbZ.style.cssText     = `right:${rEdge}px; bottom:${bEdge + btnM + gap}px;`;
            tbX.style.cssText     = `right:${rEdge + btnA + gap}px; bottom:${bEdge + btnM + gap}px;`;
            tbC.style.cssText     = `right:${rEdge}px; bottom:${bEdge}px;`;
            tbB.style.cssText     = `right:${rEdge + btnA + gap}px; bottom:${bEdge}px;`;
        } else {
            // ポートレート: 右下クラスター
            //   [X] [Z]
            //   [B] [C]
            tbZ.style.cssText     = `right:${rEdge}px; bottom:${bEdge + btnM + gap}px;`;
            tbX.style.cssText     = `right:${rEdge + btnA + gap}px; bottom:${bEdge + btnM + gap}px;`;
            tbC.style.cssText     = `right:${rEdge}px; bottom:${bEdge}px;`;
            tbB.style.cssText     = `right:${rEdge + btnA + gap}px; bottom:${bEdge}px;`;
        }

        // ポーズボタンは右上固定
        tbPause.style.cssText = `right:${rEdge}px; top:10px;`;
    }

    // =====================================================
    // チュートリアルヒント: 初回バトル時のみ表示
    // =====================================================
    _showTutorial() {
        if (this._tutorialShown || !this.tutorialEl) return;
        this._tutorialShown = true;
        this.tutorialEl.style.display = '';
        this.tutorialEl.style.opacity = '1';
        // 6秒後にフェードアウト
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

    // タッチUIを表示/非表示切り替え（game.jsのstate変化で呼ばれる）
    setVisible(v) {
        if (!this.ui) return;
        this.ui.style.display = v ? '' : 'none';
        // 初めてバトルに入った時のみチュートリアルを表示
        if (v && !this._tutorialShown) {
            setTimeout(() => this._showTutorial(), 800); // 画面が落ち着いてから
        }
    }
}
window.TouchController = TouchController;
