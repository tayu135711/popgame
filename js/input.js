// ======================================
// INPUT - Keyboard Input Manager
// ======================================
class InputManager {
    constructor() {
        this.keys = {};
        this.prev = {};

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'KeyC', 'KeyB'].includes(e.code))
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
    get invade() { return this.pressed('KeyC'); }
    get special() { return this.pressed('KeyX') || this.pressed('ShiftLeft'); }
    get back() { return this.pressed('KeyB') || this.pressed('Escape'); }
    get confirm() { return this.pressed('Space') || this.pressed('Enter'); }
    get cancel() { return this.pressed('Escape') || this.pressed('KeyB'); }
    get pause() { return this.pressed('KeyP'); }

    tick() { Object.assign(this.prev, this.keys); } // パフォーマンス改善: スプレッドによる毎フレームオブジェクト生成を廃止
}

window.InputManager = InputManager;
