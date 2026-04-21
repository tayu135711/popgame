// ======================================
// INPUT - Keyboard Input Manager
// ======================================
class InputManager {
    constructor() {
        this.keys = {};
        this.prev = {};

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;

            // HTMLの入力欄（名前入力など）にフォーカスがある場合は、ブラウザのデフォルト挙動を止めない
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'KeyC', 'KeyB', 'KeyR', 'KeyH', 'KeyS', 'KeyF', 'Tab', 'KeyP'].includes(e.code))
                e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });
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
