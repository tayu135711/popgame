// ======================================
// INPUT - Keyboard Input Manager
// ======================================
class InputManager {
    constructor() {
        this.keys = {};
        this.prev = {};

        // ★改善: ジャンプバッファ（着地直前のジャンプ入力を8フレーム保持）
        this._jumpBuffer   = 0;
        // ★改善: コヨーテタイム（足場から離れた直後もジャンプ可能な猶予フレーム）
        this._coyoteTimer  = 0;
        this._JUMP_BUFFER  = 8;  // バッファ保持フレーム数
        this._COYOTE_TIME  = 8;  // コヨーテ猶予フレーム数

        window.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
            this.keys[e.code] = true;
            // ジャンプキーが押されたらバッファをセット
            if (e.code === 'Space') this._jumpBuffer = this._JUMP_BUFFER;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'KeyC', 'KeyB', 'KeyR', 'KeyH', 'KeyS', 'KeyF', 'F3', 'Backquote', 'Tab', 'KeyP'].includes(e.code))
                e.preventDefault();
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
        });
        window.addEventListener('blur', () => { this.keys = {}; this.prev = {}; });

        // ★改善: ゲームパッド対応
        this._gamepads = {};
        this._gpPrev   = {};
        window.addEventListener('gamepadconnected',    e => { this._gamepads[e.gamepad.index] = e.gamepad; });
        window.addEventListener('gamepaddisconnected', e => { delete this._gamepads[e.gamepad.index]; delete this._gpPrev[e.gamepad.index]; });
        this._gpAxes    = { left: false, right: false, up: false, down: false };
        this._gpButtons = {};
        this._gpPrevBtn = {};
        // ゲームパッドボタンマッピング (標準レイアウト)
        this._GP_MAP = {
            jump:    [0],       // A / ×
            action:  [2],       // X / □
            attack:  [3],       // Y / △
            allyAction: [1],    // B / ○
            back:    [1, 8],    // B / select
            special: [4, 5],    // LB / RB
            pause:   [9],       // start / options
        };
        this._GP_AXIS_DEAD = 0.25;
    }

    // ★ゲームパッド状態を毎フレーム更新
    _updateGamepad() {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gps) {
            if (!gp) continue;
            // 軸入力（左スティック or Dpad）
            const ax = gp.axes[0] || 0;
            const ay = gp.axes[1] || 0;
            const dpL = gp.buttons[14] && gp.buttons[14].pressed;
            const dpR = gp.buttons[15] && gp.buttons[15].pressed;
            const dpU = gp.buttons[12] && gp.buttons[12].pressed;
            const dpD = gp.buttons[13] && gp.buttons[13].pressed;
            this._gpAxes.left  = ax < -this._GP_AXIS_DEAD || dpL;
            this._gpAxes.right = ax >  this._GP_AXIS_DEAD || dpR;
            this._gpAxes.up    = ay < -this._GP_AXIS_DEAD || dpU;
            this._gpAxes.down  = ay >  this._GP_AXIS_DEAD || dpD;

            // ボタン
            this._gpPrevBtn = Object.assign({}, this._gpButtons);
            for (let i = 0; i < gp.buttons.length; i++) {
                this._gpButtons[i] = gp.buttons[i] && gp.buttons[i].pressed;
            }
            // ジャンプバッファ (A/× ボタン)
            if (this._gpButtons[0] && !this._gpPrevBtn[0]) {
                this._jumpBuffer = this._JUMP_BUFFER;
            }
            break; // 最初に見つかったゲームパッドのみ使用
        }
    }

    _gpPressed(indices) {
        return indices.some(i => this._gpButtons[i] && !this._gpPrevBtn[i]);
    }
    _gpHeld(indices) {
        return indices.some(i => !!this._gpButtons[i]);
    }

    held(c)     { return !!this.keys[c]; }
    pressed(c)  { return !!this.keys[c] && !this.prev[c]; }
    released(c) { return !this.keys[c] && !!this.prev[c]; }

    get left()   { return this.held('ArrowLeft')  || this.held('KeyA') || this._gpAxes.left; }
    get right()  { return this.held('ArrowRight') || this.held('KeyD') || this._gpAxes.right; }
    get up()     { return this.held('ArrowUp')    || this.held('KeyW') || this._gpAxes.up; }
    get down()   { return this.held('ArrowDown')  || this.held('KeyS') || this._gpAxes.down; }

    // ★ジャンプ: バッファ消費 or コヨーテタイム内にバッファあり
    get jump() {
        const kb = this.pressed('Space');
        if (kb) return true;
        if (this._jumpBuffer > 0) {
            this._jumpBuffer = 0;
            return true;
        }
        return false;
    }

    // コヨーテタイムを考慮したジャンプ判定（player.jsから呼ぶ）
    consumeJump(isGrounded) {
        if (isGrounded) this._coyoteTimer = this._COYOTE_TIME;
        else if (this._coyoteTimer > 0) this._coyoteTimer--;

        const hasBuffer = this._jumpBuffer > 0;
        const canJump   = isGrounded || this._coyoteTimer > 0;
        if (hasBuffer && canJump) {
            this._jumpBuffer  = 0;
            this._coyoteTimer = 0;
            return true;
        }
        return false;
    }

    get action()      { return this.pressed('KeyZ')       || this._gpPressed([2]); }
    get attack()      { return this.pressed('KeyX')       || this._gpPressed([3]); }
    get allyAction()  { return this.pressed('KeyC')       || this._gpPressed([1]); }
    get invade()      { return this.pressed('KeyC')       || this._gpPressed([1]); }
    get special()     { return this.pressed('ShiftLeft')  || this.pressed('ShiftRight') || this._gpPressed([4, 5]); }
    get back()        { return this.pressed('KeyB')       || this.pressed('Escape')     || this._gpPressed([1, 8]); }
    get confirm()     { return this.pressed('Space')      || this.pressed('Enter')      || this._gpPressed([0]); }
    get menuConfirm() { return this.pressed('Space')      || this.pressed('Enter')      || this.pressed('KeyZ') || this._gpPressed([0, 2]); }
    get cancel()      { return this.pressed('Escape')     || this.pressed('KeyB')       || this._gpPressed([1, 8]); }
    get pause()       { return this.pressed('KeyP')       || this._gpPressed([9]); }

    tick() {
        Object.assign(this.prev, this.keys);
        // ジャンプバッファをカウントダウン
        if (this._jumpBuffer > 0) this._jumpBuffer--;
        // ゲームパッド更新
        this._updateGamepad();
    }
}

window.InputManager = InputManager;
