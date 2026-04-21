// ======================================
// INPUT - Keyboard Input Manager
// ======================================
class InputManager {
    constructor() {
        this.keys = {};
        this.prev = {};

        window.addEventListener('keydown', e => {
            // フォーム入力中のキーはゲーム入力に流さない。
            // 先に keys を更新すると、Enter で名前確定した瞬間に menuConfirm まで発火しうる。
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;

            this.keys[e.code] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'KeyC', 'KeyB', 'KeyR', 'KeyH', 'KeyS', 'KeyF', 'F3', 'Backquote', 'Tab', 'KeyP'].includes(e.code))
                e.preventDefault();
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
        });
        window.addEventListener('blur', () => { this.keys = {}; this.prev = {}; }); // blur時prevもリセット
    }

    held(c) { return !!this.keys[c]; }
    pressed(c) { return !!this.keys[c] && !this.prev[c]; }
    released(c) { return !this.keys[c] && !!this.prev[c]; }

    get left() { return this.held('ArrowLeft') || this.held('KeyA'); }
    get right() { return this.held('ArrowRight') || this.held('KeyD'); }
    get up() { return this.held('ArrowUp') || this.held('KeyW'); }
    get down() { return this.held('ArrowDown') || this.held('KeyS'); }
    get jump() { return this.pressed('Space'); }
    get action() { return this.pressed('KeyZ'); }
    get attack() { return this.pressed('KeyX'); }
    get allyAction() { return this.pressed('KeyC'); }
    get invade() { return this.pressed('KeyC'); } // Cキー: 仲間編集・バトル開始・連携技
    get special() { return this.pressed('ShiftLeft') || this.pressed('ShiftRight'); } // X is handled by attack flow; Shift remains a dedicated shortcut
    get back() { return this.pressed('KeyB') || this.pressed('Escape'); }
    get confirm() { return this.pressed('Space') || this.pressed('Enter'); }
    // メニュー画面専用: ZボタンもOKにする（タッチ操作でZが「決定」として使える）
    get menuConfirm() { return this.pressed('Space') || this.pressed('Enter') || this.pressed('KeyZ'); }
    get cancel() { return this.pressed('Escape') || this.pressed('KeyB'); }
    get pause() { return this.pressed('KeyP'); }

    tick() { Object.assign(this.prev, this.keys); } // パフォーマンス改善: スプレッドによる毎フレームオブジェクト生成を廃止
}

window.InputManager = InputManager;
