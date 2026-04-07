// ======================================
// RENDERER - 3D-Style Drawing Utilities
// ======================================

// === パフォーマンス最適化: グラデーションキャッシュ ===
// createRadialGradient は毎フレーム呼ぶと非常に重いため、キャッシュして再利用する
const _gradientCache = new Map();
function _getCachedGradient(ctx, key, createFn) {
    if (!_gradientCache.has(key)) {
        if (_gradientCache.size > 200) { // キャッシュが多すぎる場合はクリア
            _gradientCache.clear();
        }
        _gradientCache.set(key, createFn());
    }
    return _gradientCache.get(key);
}

// === 背景オフスクリーンキャッシュ ===
// 静的な背景（山・城・木など）を毎フレーム再描画しないためのキャッシュ
// 雲は動くので毎フレーム上書き、それ以外はキャッシュから貼るだけ
const _bgCache = new Map();
function _getCachedBg(key, w, h, drawFn) {
    if (!_bgCache.has(key)) {
        try {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const bctx = c.getContext('2d');
            if (bctx) { drawFn(bctx); _bgCache.set(key, c); }
        } catch(e) { /* offscreen canvas unavailable */ }
    }
    return _bgCache.get(key) || null;
}

// === タンク外観キャッシュ ===
const _tankCache = new Map();
function _getCachedTank(key, w, h, drawFn) {
    if (_tankCache.size > 50) _tankCache.clear(); // 多すぎたらリセット
    if (!_tankCache.has(key)) {
        try {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const tctx = c.getContext('2d');
            if (tctx) { drawFn(tctx, w, h); _tankCache.set(key, c); }
        } catch(e) { /* offscreen canvas unavailable */ }
    }
    return _tankCache.get(key) || null;
}

// === _getFrameNow() フレームキャッシュ ===
// 同じフレーム内で何十回も _getFrameNow() を呼ぶのを1回にまとめる
let _frameNow = 0;
function _getFrameNow() { return _frameNow; }
function _tickFrameNow() { _frameNow = Date.now(); }

// === Android向けパフォーマンスフラグ ===
// shadowBlur はモバイルGPUで非常に重いため、Androidでは完全に無効化する
const _isAndroid = /Android/i.test(navigator.userAgent);
// shadowBlur を安全にセットするラッパー（Androidでは常に0）
function _setShadowBlur(ctx, val) {
    if (_isAndroid) { ctx.shadowBlur = 0; return; }
    ctx.shadowBlur = val;
}

// === _lighten キャッシュ ===
const _lightenCache = new Map();
function _lightenCached(color, amount) {
    const key = color + '_' + amount;
    if (_lightenCache.has(key)) return _lightenCache.get(key);
    let c = color;
    let usePound = false;
    if (c[0] === '#') { c = c.slice(1); usePound = true; }
    const num = parseInt(c, 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
    const result = (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    if (_lightenCache.size > 200) _lightenCache.clear();
    _lightenCache.set(key, result);
    return result;
}

const Renderer = {
    // === RENDERING UTILITIES ===
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _darkenHex(color, percent) {
        if (!color.startsWith('#')) return color;
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    },

    _getStageEnemyVariant(battle) {
        const stageId = battle && battle.stageData && battle.stageData.id;
        const theme = battle && battle.stageData && battle.stageData.enemyTankTheme;
        const variants = {
            stage1:       { shape: 'diamond',   base: '#4CAF50', high: '#8BE28E', shadow: '#1F5A2C', accent: '#D9FFE1', trim: '#7CFF98', glow: 'rgba(80,255,140,0.28)' },
            stage2:       { shape: 'triangle',  base: '#FF8A3D', high: '#FFC184', shadow: '#8A3C12', accent: '#FFF0D8', trim: '#FFD166', glow: 'rgba(255,170,90,0.35)' },
            stage3:       { shape: 'diamond',   base: '#26A69A', high: '#7AE8DB', shadow: '#0E5B54', accent: '#D9FFF8', trim: '#76FFF0', glow: 'rgba(80,255,220,0.32)' },
            stage4:       { shape: 'hex',       base: '#EF6C57', high: '#FFB2A4', shadow: '#7A271F', accent: '#FFE4DF', trim: '#FFC2A8', glow: 'rgba(255,120,110,0.32)' },
            stage5:       { shape: 'crown',     base: '#8E44AD', high: '#D5A6F0', shadow: '#40175A', accent: '#F8E6FF', trim: '#E7B8FF', glow: 'rgba(200,120,255,0.34)' },
            stage_shakkin:{ shape: 'bolt',      base: '#C9A227', high: '#F5DD7A', shadow: '#635011', accent: '#FFF6D6', trim: '#FFE27A', glow: 'rgba(255,215,80,0.34)' },
            stage_boss:   { shape: 'octagon',   base: '#C62828', high: '#FF8A80', shadow: '#5A1212', accent: '#FFE2DE', trim: '#FFB199', glow: 'rgba(255,100,100,0.34)' },
            stage_secret: { shape: 'star',      base: '#D81B60', high: '#FF89B1', shadow: '#6E1032', accent: '#FFE2EE', trim: '#FFB3CF', glow: 'rgba(255,100,180,0.35)' },
            stage8:       { shape: 'kite',      base: '#00ACC1', high: '#7BE7F4', shadow: '#045560', accent: '#D9FBFF', trim: '#9AF6FF', glow: 'rgba(80,240,255,0.33)' },
            event1:       { shape: 'trapezoid', base: '#7CB342', high: '#C7F08C', shadow: '#395B17', accent: '#F1FFD7', trim: '#D6FF85', glow: 'rgba(170,255,90,0.30)' },
            event2:       { shape: 'triangle',  base: '#42A5F5', high: '#9ED3FF', shadow: '#194C7A', accent: '#E1F1FF', trim: '#A8DCFF', glow: 'rgba(110,180,255,0.32)' },
            event3:       { shape: 'star',      base: '#FFB300', high: '#FFE082', shadow: '#7A5400', accent: '#FFF4CF', trim: '#FFE89A', glow: 'rgba(255,210,90,0.33)' },
            event4:       { shape: 'diamond',   base: '#EC407A', high: '#FF9FBE', shadow: '#7A163A', accent: '#FFE4EE', trim: '#FFBED1', glow: 'rgba(255,120,170,0.33)' },
            stage_ex1:    { shape: 'hex',       base: '#5C6BC0', high: '#A9B2F2', shadow: '#28316B', accent: '#E6E9FF', trim: '#BBC6FF', glow: 'rgba(120,140,255,0.33)' },
            stage_ex2:    { shape: 'crown',     base: '#FDD835', high: '#FFF59D', shadow: '#7C6400', accent: '#FFFADB', trim: '#FFF1A8', glow: 'rgba(255,240,100,0.34)' },
            stage_ex3:    { shape: 'bolt',      base: '#F4511E', high: '#FFAA80', shadow: '#7A2108', accent: '#FFE7DE', trim: '#FFC49C', glow: 'rgba(255,130,80,0.34)' },
            c2_stage1:    { shape: 'kite',      base: '#607D8B', high: '#B0BEC5', shadow: '#263238', accent: '#EAF6FF', trim: '#8BE9FF', glow: 'rgba(94,211,255,0.35)' },
            c2_stage2:    { shape: 'triangle',  base: '#00838F', high: '#6EE7F0', shadow: '#003C43', accent: '#DBFCFF', trim: '#8AF7FF', glow: 'rgba(80,240,255,0.35)' },
            c2_stage3:    { shape: 'diamond',   base: '#546E7A', high: '#B4E1E8', shadow: '#22343D', accent: '#E7FCFF', trim: '#92F3FF', glow: 'rgba(100,225,255,0.34)' },
            c2_stage4:    { shape: 'hex',       base: '#FF7043', high: '#FFBEA8', shadow: '#7D2E14', accent: '#FFF0EA', trim: '#FFCEA7', glow: 'rgba(255,140,110,0.33)' },
            c2_stage5:    { shape: 'bolt',      base: '#7CB342', high: '#D6FF8B', shadow: '#315211', accent: '#F2FFDB', trim: '#C7FF70', glow: 'rgba(180,255,90,0.33)' },
            c2_boss:      { shape: 'octagon',   base: '#8E24AA', high: '#E1A6FF', shadow: '#3E104B', accent: '#F8E3FF', trim: '#F0B8FF', glow: 'rgba(210,110,255,0.36)' },
            c3_stage1:    { shape: 'kite',      base: '#F5E6B3', high: '#FFFDF2', shadow: '#A78F48', accent: '#FFFFFF', trim: '#FFE28A', glow: 'rgba(255,240,180,0.34)' },
            c3_stage2:    { shape: 'star',      base: '#CFE8FF', high: '#FFFFFF', shadow: '#7D9AB7', accent: '#FFFBEA', trim: '#FFE082', glow: 'rgba(255,235,150,0.32)' },
            c3_stage3:    { shape: 'crown',     base: '#DCCBFF', high: '#FFFFFF', shadow: '#8D7CB7', accent: '#FFF8F0', trim: '#F2D36B', glow: 'rgba(255,225,140,0.31)' },
            c3_stage4:    { shape: 'diamond',   base: '#FFD6E7', high: '#FFFFFF', shadow: '#B88099', accent: '#FFFDF7', trim: '#FFDB8A', glow: 'rgba(255,220,170,0.31)' },
            c3_stage5:    { shape: 'triangle',  base: '#D6FFF3', high: '#FFFFFF', shadow: '#72A597', accent: '#FFFDF2', trim: '#C9A646', glow: 'rgba(230,255,245,0.30)' },
            c3_boss:      { shape: 'star',      base: '#FFF1B8', high: '#FFFFFF', shadow: '#B19541', accent: '#FFFFFF', trim: '#FFD54F', glow: 'rgba(255,230,120,0.36)' }
        };
        if (variants[stageId]) return variants[stageId];
        if (theme === 'mecha') return { shape: 'hex', base: '#607D8B', high: '#B0BEC5', shadow: '#263238', accent: '#E3F8FF', trim: '#8BE9FF', glow: 'rgba(94,211,255,0.33)' };
        if (theme === 'heaven') return { shape: 'star', base: '#F3E1A0', high: '#FFFFFF', shadow: '#9E8541', accent: '#FFFDF4', trim: '#FFD86B', glow: 'rgba(255,225,120,0.30)' };
        return { shape: 'diamond', base: '#D84315', high: '#FF8A65', shadow: '#7A250B', accent: '#FFF1E8', trim: '#FFD166', glow: 'rgba(255,150,90,0.30)' };
    },

    _traceStageEnemyShape(ctx, shape, cx, cy, rx, ry) {
        const points = (count, innerScale = 1, outerScale = 1, rot = -Math.PI / 2) => {
            for (let i = 0; i < count; i++) {
                const a = rot + (Math.PI * 2 * i) / count;
                const px = cx + Math.cos(a) * rx * outerScale;
                const py = cy + Math.sin(a) * ry * innerScale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        };

        ctx.beginPath();
        switch (shape) {
        case 'triangle':
            ctx.moveTo(cx, cy - ry);
            ctx.lineTo(cx + rx, cy + ry * 0.9);
            ctx.lineTo(cx - rx, cy + ry * 0.9);
            ctx.closePath();
            break;
        case 'diamond':
            ctx.moveTo(cx, cy - ry);
            ctx.lineTo(cx + rx, cy);
            ctx.lineTo(cx, cy + ry);
            ctx.lineTo(cx - rx, cy);
            ctx.closePath();
            break;
        case 'hex':
            points(6, 1, 1, Math.PI / 6);
            break;
        case 'octagon':
            points(8, 1, 1, Math.PI / 8);
            break;
        case 'trapezoid':
            ctx.moveTo(cx - rx * 0.7, cy - ry);
            ctx.lineTo(cx + rx * 0.7, cy - ry);
            ctx.lineTo(cx + rx, cy + ry);
            ctx.lineTo(cx - rx, cy + ry);
            ctx.closePath();
            break;
        case 'kite':
            ctx.moveTo(cx, cy - ry);
            ctx.lineTo(cx + rx * 0.85, cy - ry * 0.1);
            ctx.lineTo(cx, cy + ry);
            ctx.lineTo(cx - rx * 0.85, cy - ry * 0.1);
            ctx.closePath();
            break;
        case 'bolt':
            ctx.moveTo(cx - rx * 0.35, cy - ry);
            ctx.lineTo(cx + rx * 0.08, cy - ry * 0.15);
            ctx.lineTo(cx - rx * 0.05, cy - ry * 0.15);
            ctx.lineTo(cx + rx * 0.38, cy + ry);
            ctx.lineTo(cx - rx * 0.1, cy + ry * 0.2);
            ctx.lineTo(cx + rx * 0.02, cy + ry * 0.2);
            ctx.closePath();
            break;
        case 'crown':
            ctx.moveTo(cx - rx, cy + ry * 0.85);
            ctx.lineTo(cx - rx * 0.88, cy - ry * 0.2);
            ctx.lineTo(cx - rx * 0.45, cy - ry * 0.55);
            ctx.lineTo(cx, cy - ry);
            ctx.lineTo(cx + rx * 0.45, cy - ry * 0.55);
            ctx.lineTo(cx + rx * 0.88, cy - ry * 0.2);
            ctx.lineTo(cx + rx, cy + ry * 0.85);
            ctx.closePath();
            break;
        case 'star':
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + i * Math.PI / 5;
                const rScale = i % 2 === 0 ? 1 : 0.45;
                const px = cx + Math.cos(a) * rx * rScale;
                const py = cy + Math.sin(a) * ry * rScale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            break;
        case 'square':
        default:
            ctx.rect(cx - rx, cy - ry, rx * 2, ry * 2);
            break;
        }
    },

    _drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, alpha = 1) {
        if (!battle || !battle.stageData) return;
        const variant = this._getStageEnemyVariant(battle);
        const cx = tx + tw / 2;
        const cy = ty + th * 0.42;
        const rx = tw * 0.13;
        const ry = th * 0.10;

        ctx.save();
        ctx.globalAlpha *= alpha;

        ctx.fillStyle = variant.glow;
        this._traceStageEnemyShape(ctx, variant.shape, cx, cy, rx * 1.45, ry * 1.45);
        ctx.fill();

        ctx.fillStyle = variant.base;
        this._traceStageEnemyShape(ctx, variant.shape, cx, cy, rx, ry);
        ctx.fill();

        ctx.strokeStyle = variant.trim;
        ctx.lineWidth = 2;
        this._traceStageEnemyShape(ctx, variant.shape, cx, cy, rx, ry);
        ctx.stroke();

        ctx.fillStyle = variant.accent;
        this._traceStageEnemyShape(ctx, variant.shape, cx, cy, rx * 0.45, ry * 0.45);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.5, cy - ry * 0.35);
        ctx.lineTo(cx + rx * 0.2, cy - ry * 0.55);
        ctx.stroke();

        ctx.restore();
    },
    // === SLIME (High Quality 3D Style v2 - Optimized) ===
    drawSlime(ctx, x, y, w, h, color, darkColor, dir = 1, frame = 0, vy = 0, slimeType = 'slime') {
        ctx.save();
        ctx.translate(Math.round(x + w / 2), Math.round(y + h));

        // Animation: Squash & Stretch based on vertical velocity
        let squashY = vy > 3 ? 0.85 : vy < -3 ? 1.15 : 1.0;
        
        // 歩行モーション：移動中は躍動感のある「弾み」を追加
        let walkY = 0;
        let walkRot = 0;
        if (frame > 0) {
            const cycle = frame * 0.22;
            walkY = -Math.abs(Math.sin(cycle)) * 8; // 上下にピョンピョン跳ねる
            // 着地時に少し潰れる（Squish & Stretch）
            const bounceSquash = 1 + Math.sin(cycle - Math.PI/2) * 0.12;
            squashY *= bounceSquash;
            walkRot = Math.sin(cycle) * 0.08; // 左右にわずかに傾く
        }

        ctx.translate(0, walkY);
        ctx.rotate(walkRot);
        ctx.scale(dir * (1 / squashY), squashY);

        const sz = Math.min(w, h) * 0.95;

        // 1. Shadow (Simplified)
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 0.5, sz * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Body Shape
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.bezierCurveTo(sz * 0.5, -sz * 0.9, sz * 0.6, -sz * 0.2, sz * 0.4, 0);
        ctx.bezierCurveTo(sz * 0.2, sz * 0.1, -sz * 0.2, sz * 0.1, -sz * 0.4, 0);
        ctx.bezierCurveTo(-sz * 0.6, -sz * 0.2, -sz * 0.5, -sz * 0.9, 0, -sz);
        ctx.closePath();

        // 3. Coloring & Shading (Cached Radial Gradient)
        // ※ createRadialGradient を毎フレーム生成すると重いためキャッシュ利用
        const safeDarkColor = (typeof darkColor === 'string' && darkColor.length > 1) ? darkColor : '#1B5E20';
        const gradKey = `slime_${color}_${safeDarkColor}_${sz | 0}`;
        const grad = _getCachedGradient(ctx, gradKey, () => {
            const g = ctx.createRadialGradient(-sz * 0.1, -sz * 0.5, 0, -sz * 0.1, -sz * 0.5, sz);
            g.addColorStop(0, this._lighten(color, 40));
            g.addColorStop(1, safeDarkColor);
            return g;
        });
        ctx.fillStyle = grad;
        ctx.fill();
        // プレイヤー: 輪郭線でキャラらしさUP
        if (slimeType === 'player') {
            ctx.strokeStyle = safeDarkColor;
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }

        // (glossy reflection removed for performance)

        // 5. Face (Cute style)
        // Eye Position calculation
        const faceY = -sz * 0.45;
        const eyeSpace = sz * 0.28; // 目の間隔を広げてより目を解消

        // Eyes - プレイヤーは丸い目（●●）、その他は丸みのある目
        const eyeW = sz * 0.13;
        const eyeH = sz * 0.11;
        if (color === CONFIG.COLORS.PLAYER || slimeType === 'player') {
            // プレイヤー専用: 大きな丸い目（方向追従瞳 + 眉毛）
            const eyeR = sz * 0.12;
            if (frame % 120 > 115) {
                // Blink: 横線（まつ毛なし）
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-eyeSpace - eyeR, faceY); ctx.lineTo(-eyeSpace + eyeR, faceY);
                ctx.moveTo(eyeSpace - eyeR, faceY); ctx.lineTo(eyeSpace + eyeR, faceY);
                ctx.stroke();
            } else {
                // 方向に合わせて瞳が少し動く
                const pupilShift = dir * eyeR * 0.22;
                // 白目（縁取り付き）
                ctx.fillStyle = '#FFF';
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(-eyeSpace, faceY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(eyeSpace, faceY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // 黒目（方向追従）
                ctx.fillStyle = '#1A1A2E';
                ctx.beginPath(); ctx.arc(-eyeSpace + pupilShift, faceY + eyeR * 0.1, eyeR * 0.62, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeSpace + pupilShift, faceY + eyeR * 0.1, eyeR * 0.62, 0, Math.PI * 2); ctx.fill();
                // 大ハイライト
                ctx.fillStyle = '#FFF';
                ctx.beginPath(); ctx.arc(-eyeSpace + pupilShift - eyeR * 0.22, faceY - eyeR * 0.25, eyeR * 0.28, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeSpace + pupilShift - eyeR * 0.22, faceY - eyeR * 0.25, eyeR * 0.28, 0, Math.PI * 2); ctx.fill();
                // 小ハイライト
                ctx.fillStyle = 'rgba(255,255,255,0.65)';
                ctx.beginPath(); ctx.arc(-eyeSpace + pupilShift + eyeR * 0.12, faceY + eyeR * 0.18, eyeR * 0.13, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeSpace + pupilShift + eyeR * 0.12, faceY + eyeR * 0.18, eyeR * 0.13, 0, Math.PI * 2); ctx.fill();
            }
            // 眉毛なし（シンプルかわいいスライム）
        } else {
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (frame % 120 > 115) {
                // Blink: 横線
                ctx.moveTo(-eyeSpace - eyeW, faceY); ctx.lineTo(-eyeSpace + eyeW, faceY);
                ctx.moveTo(eyeSpace - eyeW, faceY); ctx.lineTo(eyeSpace + eyeW, faceY);
                ctx.stroke();
            } else {
                ctx.stroke(); // strokeを先に終了してfillに切り替え
                // 丸くて可愛い目（白目+黒目）
                const eyeR = eyeW * 0.9;
                // 白目
                ctx.fillStyle = '#FFF';
                ctx.beginPath(); ctx.arc(-eyeSpace, faceY, eyeR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeSpace, faceY, eyeR, 0, Math.PI * 2); ctx.fill();
                // 黒目
                ctx.fillStyle = '#1A1A2E';
                ctx.beginPath(); ctx.arc(-eyeSpace, faceY + eyeR * 0.1, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeSpace, faceY + eyeR * 0.1, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
                // ハイライト
                ctx.fillStyle = '#FFF';
                ctx.beginPath(); ctx.arc(-eyeSpace - eyeR * 0.2, faceY - eyeR * 0.2, eyeR * 0.22, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeSpace - eyeR * 0.2, faceY - eyeR * 0.2, eyeR * 0.22, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Mouth (Small smile) - タイプ別
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (slimeType === 'devil') {
            // 悪魔：邪悪な笑み
            ctx.arc(0, faceY + 3, 5, 0.1, Math.PI - 0.1);
        } else if (slimeType === 'ninja') {
            // 忍者：口は隠れている（描画なし）
        } else if (slimeType === 'player') {
            // Player: 元気な笑顔（少し開いた口 + 歯）
            ctx.fillStyle = '#C84B6A';
            ctx.beginPath();
            ctx.arc(0, faceY + sz * 0.14, sz * 0.09, 0.15, Math.PI - 0.15);
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 歯
            ctx.fillStyle = '#FFF';
            ctx.fillRect(-sz * 0.06, faceY + sz * 0.1, sz * 0.12, sz * 0.06);
            ctx.beginPath(); // 二重ストローク防止：パスをリセット
        } else {
            // 通常の笑顔
            ctx.arc(0, faceY + 5, 4, 0.2, Math.PI - 0.2);
        }
        ctx.stroke();

        // 6. Accessories / Role Indicators - 大幅拡張
        // ★バグ修正: bounce が未定義のまま王冠・兜などのアクセサリ描画で使われ
        //   ReferenceError になっていた。drawSlime スコープ内で定義する。
        const bounce = Math.abs(Math.sin(frame * 0.15)) * 2;
        if (color === CONFIG.COLORS.PLAYER || slimeType === 'player') {
            // Player: シンプルかわいいスライム（頬赤みのみ）
            ctx.fillStyle = 'rgba(255,130,130,0.45)';
            ctx.beginPath();
            ctx.ellipse(-sz * 0.30, -sz * 0.26, sz * 0.13, sz * 0.09, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sz * 0.30, -sz * 0.26, sz * 0.13, sz * 0.09, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (color === CONFIG.COLORS.BOSS || slimeType === 'kingslime') {
            // Boss/King: Gold Crown
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.beginPath();
            ctx.moveTo(-sz * 0.3, -sz * 0.8 + bounce);
            ctx.lineTo(-sz * 0.15, -sz * 1.1 + bounce);
            ctx.lineTo(0, -sz * 0.8 + bounce);
            ctx.lineTo(sz * 0.15, -sz * 1.1 + bounce);
            ctx.lineTo(sz * 0.3, -sz * 0.8 + bounce);
            ctx.lineTo(sz * 0.3, -sz * 0.5 + bounce);
            ctx.lineTo(-sz * 0.3, -sz * 0.5 + bounce);
            ctx.fill();
            ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1; ctx.stroke();
            // 宝石追加
            ctx.fillStyle = '#FF0000';
            ctx.beginPath(); ctx.arc(0, -sz * 0.9 + bounce, 4, 0, Math.PI * 2); ctx.fill();
        } else if (slimeType === 'defender' || slimeType === 'golem') {
            // Defender/Golem: Iron Helmet + Shield
            ctx.fillStyle = '#607D8B';
            ctx.beginPath();
            ctx.arc(0, -sz * 0.5 + bounce, sz * 0.42, Math.PI, 0); // Helmet Dome
            ctx.lineTo(sz * 0.42, -sz * 0.5 + bounce);
            ctx.lineTo(-sz * 0.42, -sz * 0.5 + bounce);
            ctx.fill();
            // Horn
            ctx.fillStyle = '#CFD8DC';
            ctx.beginPath(); ctx.moveTo(0, -sz * 0.9 + bounce); ctx.lineTo(5, -sz * 1.3 + bounce); ctx.lineTo(10, -sz * 0.9 + bounce); ctx.fill();

            // Shield emblem on body
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -sz * 0.3);
            ctx.lineTo(-sz * 0.15, -sz * 0.15);
            ctx.lineTo(-sz * 0.15, 0);
            ctx.lineTo(0, sz * 0.1);
            ctx.lineTo(sz * 0.15, 0);
            ctx.lineTo(sz * 0.15, -sz * 0.15);
            ctx.closePath();
            ctx.stroke();
        } else if (slimeType === 'slime_metal') {
            // Metal Slime: Sparkles + Metallic sheen
            if (frame % 20 < 10) {
                ctx.fillStyle = '#FFF';

                ctx.beginPath(); ctx.arc(sz * 0.3, -sz * 0.8 + bounce, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(-sz * 0.25, -sz * 0.65 + bounce, 2, 0, Math.PI * 2); ctx.fill();

            }
            // Metallic lines
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.3, -sz * 0.7); ctx.lineTo(sz * 0.25, -sz * 0.5);
            ctx.moveTo(-sz * 0.25, -sz * 0.4); ctx.lineTo(sz * 0.3, -sz * 0.25);
            ctx.stroke();
        } else if (slimeType === 'slime_gold') {
            // Gold Slime: Crown (shadowBlurをsave/restoreで確実に封じ込め)
            ctx.save();
            ctx.fillStyle = '#FFD700';

            ctx.beginPath();
            ctx.moveTo(-sz * 0.25, -sz * 0.7 + bounce);
            ctx.lineTo(-sz * 0.15, -sz * 0.9 + bounce);
            ctx.lineTo(-sz * 0.05, -sz * 0.75 + bounce);
            ctx.lineTo(sz * 0.05, -sz * 0.9 + bounce);
            ctx.lineTo(sz * 0.15, -sz * 0.75 + bounce);
            ctx.lineTo(sz * 0.25, -sz * 0.9 + bounce);
            ctx.lineTo(sz * 0.25, -sz * 0.65 + bounce);
            ctx.lineTo(-sz * 0.25, -sz * 0.65 + bounce);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (slimeType === 'ninja') {
            // Ninja: Headband + Mask
            // Headband
            ctx.fillStyle = '#212121';
            ctx.fillRect(-sz * 0.35, -sz * 0.55 + bounce, sz * 0.7, sz * 0.12);
            // Knot
            ctx.fillStyle = '#424242';
            ctx.beginPath();
            ctx.arc(sz * 0.4, -sz * 0.49 + bounce, sz * 0.08, 0, Math.PI * 2);
            ctx.fill();
            // Mask (covering mouth)
            ctx.fillStyle = '#212121';
            ctx.beginPath();
            ctx.moveTo(-sz * 0.3, faceY + sz * 0.1);
            ctx.lineTo(sz * 0.3, faceY + sz * 0.1);
            ctx.lineTo(sz * 0.25, faceY + sz * 0.25);
            ctx.lineTo(-sz * 0.25, faceY + sz * 0.25);
            ctx.closePath();
            ctx.fill();
        } else if (slimeType === 'wizard') {
            // Wizard: Pointed Hat + Stars
            ctx.fillStyle = '#4A148C';
            ctx.beginPath();
            ctx.moveTo(0, -sz * 1.2 + bounce);
            ctx.lineTo(-sz * 0.35, -sz * 0.6 + bounce);
            ctx.lineTo(sz * 0.35, -sz * 0.6 + bounce);
            ctx.closePath();
            ctx.fill();
            // Hat brim
            ctx.fillStyle = '#6A1B9A';
            ctx.beginPath();
            ctx.ellipse(0, -sz * 0.6 + bounce, sz * 0.4, sz * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            // Stars on hat
            ctx.fillStyle = '#FFD700';
            for (let i = 0; i < 3; i++) {
                const starX = (i - 1) * sz * 0.15;
                const starY = -sz * 0.85 + bounce - i * sz * 0.05;
                this._drawStar(ctx, starX, starY, 4, 2, 1.5);
            }
        } else if (slimeType === 'angel') {
            // Angel: Halo + Wings
            // Halo
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(0, -sz * 1.1 + bounce, sz * 0.25, 0, Math.PI * 2);
            ctx.stroke();

            // Wings
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            // Left wing
            ctx.beginPath();
            ctx.ellipse(-sz * 0.5, -sz * 0.3, sz * 0.2, sz * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Right wing
            ctx.beginPath();
            ctx.ellipse(sz * 0.5, -sz * 0.3, sz * 0.2, sz * 0.3, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Wing details
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(-sz * 0.5, -sz * 0.3, sz * 0.1 + i * sz * 0.05, 0.5, Math.PI - 0.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(sz * 0.5, -sz * 0.3, sz * 0.1 + i * sz * 0.05, 0.5, Math.PI - 0.5);
                ctx.stroke();
            }
        } else if (slimeType === 'devil') {
            // Devil: Demon Horns + Wings
            // Horns
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            // Left horn
            ctx.moveTo(-sz * 0.3, -sz * 0.7 + bounce);
            ctx.quadraticCurveTo(-sz * 0.4, -sz * 1.1 + bounce, -sz * 0.25, -sz * 1.2 + bounce);
            ctx.quadraticCurveTo(-sz * 0.2, -sz * 1.0 + bounce, -sz * 0.25, -sz * 0.7 + bounce);
            ctx.closePath();
            ctx.fill();
            // Right horn
            ctx.beginPath();
            ctx.moveTo(sz * 0.3, -sz * 0.7 + bounce);
            ctx.quadraticCurveTo(sz * 0.4, -sz * 1.1 + bounce, sz * 0.25, -sz * 1.2 + bounce);
            ctx.quadraticCurveTo(sz * 0.2, -sz * 1.0 + bounce, sz * 0.25, -sz * 0.7 + bounce);
            ctx.closePath();
            ctx.fill();

            // Devil wings (bat-like)
            ctx.fillStyle = 'rgba(139,0,0,0.6)';
            // Left wing
            ctx.beginPath();
            ctx.moveTo(-sz * 0.35, -sz * 0.2);
            ctx.quadraticCurveTo(-sz * 0.7, -sz * 0.3, -sz * 0.65, -sz * 0.05);
            ctx.quadraticCurveTo(-sz * 0.6, sz * 0.05, -sz * 0.35, 0);
            ctx.closePath();
            ctx.fill();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(sz * 0.35, -sz * 0.2);
            ctx.quadraticCurveTo(sz * 0.7, -sz * 0.3, sz * 0.65, -sz * 0.05);
            ctx.quadraticCurveTo(sz * 0.6, sz * 0.05, sz * 0.35, 0);
            ctx.closePath();
            ctx.fill();
        } else if (slimeType === 'healer') {
            // Healer: Cross Hat
            ctx.fillStyle = '#E91E63'; // Pink hat
            ctx.beginPath();
            ctx.arc(0, -sz * 0.5 + bounce, sz * 0.45, Math.PI, 0);
            ctx.fill();
            // White Cross
            ctx.fillStyle = '#FFF';
            ctx.fillRect(-sz * 0.05, -sz * 0.8 + bounce, sz * 0.1, sz * 0.2);
            ctx.fillRect(-sz * 0.1, -sz * 0.75 + bounce, sz * 0.2, sz * 0.1);
        } else if (slimeType === 'ghost') {
            // Ghost: Transparent + Spooky（save/restoreで確実に封じ込め）
            ctx.save();
            ctx.globalAlpha *= 0.6;
            // Spooky eyes (large white orbs)
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(-sz * 0.2, faceY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sz * 0.2, faceY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-sz * 0.2, faceY, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sz * 0.2, faceY, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); // ghostのglobalAlpha漏れ防止
        } else if (slimeType === 'metalking') {
            // Metal King: Large Crown + Shiny
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(-sz * 0.4, -sz * 0.8 + bounce);
            ctx.lineTo(-sz * 0.2, -sz * 1.2 + bounce);
            ctx.lineTo(0, -sz * 0.9 + bounce);
            ctx.lineTo(sz * 0.2, -sz * 1.2 + bounce);
            ctx.lineTo(sz * 0.4, -sz * 0.8 + bounce);
            ctx.fill();
            // Sparkles
            if (frame % 10 < 5) {
                ctx.fillStyle = '#FFF';
                ctx.beginPath(); ctx.arc(sz * 0.5, -sz * 0.5, 4, 0, Math.PI * 2); ctx.fill();
            }
        } else if (slimeType === 'ultimate') {
            // Ultimate: Rainbow Glow + Wings + Crown
            const hue = (frame * 5) % 360;

            // Halo + Wings ensemble
            ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, -sz * 1.2 + bounce, sz * 0.3, 0, Math.PI * 2); ctx.stroke();

        } else if (slimeType === 'special' || slimeType === 'devil_jr' || slimeType === 'demon_jr') {
            // Special: シンプルな角と翼
            // 角
            ctx.fillStyle = '#880E4F';
            ctx.lineWidth = 1.5;
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(i * sz * 0.2, -sz * 0.8 + bounce);
                ctx.quadraticCurveTo(i * sz * 0.4, -sz * 1.2 + bounce, i * sz * 0.6, -sz * 1.1 + bounce);
                ctx.lineTo(i * sz * 0.3, -sz * 0.8 + bounce);
                ctx.fill();
            }
            // 翼
            ctx.fillStyle = 'rgba(136,14,79,0.7)';
            for (let i = -1; i <= 1; i += 2) {
                ctx.save();
                ctx.translate(i * sz * 0.4, -sz * 0.3);
                ctx.scale(i, 1);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(sz * 0.5, -sz * 0.5, sz * 0.8, 0);
                ctx.quadraticCurveTo(sz * 0.4, sz * 0.2, 0, 0);
                ctx.fill();
                ctx.restore();
            }
        } else if (slimeType === 'drone') {
            // Drone: シンプルな十字プロペラ（4回のsave/restoreをなくす）
            const propAngle = frame * 0.3;
            const hubY = -sz * 0.9 + bounce;
            const bladeLen = sz * 0.2;
            ctx.strokeStyle = '#757575';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.save();
            ctx.translate(0, hubY);
            ctx.rotate(propAngle);
            ctx.beginPath();
            ctx.moveTo(-bladeLen, 0); ctx.lineTo(bladeLen, 0);
            ctx.moveTo(0, -bladeLen); ctx.lineTo(0, bladeLen);
            ctx.stroke();
            ctx.restore();
            ctx.fillStyle = '#424242';
            ctx.beginPath();
            ctx.arc(0, hubY, sz * 0.07, 0, Math.PI * 2); ctx.fill();
        } else if (slimeType === 'dragon') {
            // Dragon: 完全なドラゴンの姿！
            ctx.save();
            ctx.translate(0, -sz * 0.2); // 少し上に

            // === 体の本体（長い首と胴体） ===
            // 胴体
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, sz * 0.2, sz * 0.5, sz * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // 首（長くてしなやか）
            const neckCurve = Math.sin(frame * 0.08) * 0.1;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.2, sz * 0.1);
            ctx.quadraticCurveTo(neckCurve * sz, -sz * 0.3, 0, -sz * 0.6);
            ctx.quadraticCurveTo(-neckCurve * sz, -sz * 0.3, sz * 0.2, sz * 0.1);
            ctx.closePath();
            ctx.fill();

            // 頭部（竜らしい形）
            ctx.fillStyle = this._lighten(color, 20);
            ctx.beginPath();
            ctx.ellipse(0, -sz * 0.7, sz * 0.25, sz * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 口（開いた口）
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.arc(0, -sz * 0.65, sz * 0.15, 0.2, Math.PI - 0.2);
            ctx.fill();

            // 牙（上下）
            ctx.fillStyle = '#FFF';
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(i * sz * 0.08, -sz * 0.65);
                ctx.lineTo(i * sz * 0.05, -sz * 0.55);
                ctx.lineTo(i * sz * 0.11, -sz * 0.65);
                ctx.closePath();
                ctx.fill();
            }

            // 目（鋭い竜の目）
            ctx.fillStyle = '#FFD700';

            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.ellipse(i * sz * 0.12, -sz * 0.75, sz * 0.06, sz * 0.08, i * 0.2, 0, Math.PI * 2);
                ctx.fill();

                // 瞳孔（縦長）
                ctx.fillStyle = '#000';
                ctx.fillRect(i * sz * 0.12 - 1, -sz * 0.8, 2, sz * 0.1);
            }

            ctx.fillStyle = color;

            // 角（大きく威厳のある）
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#B8860B';
            ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(i * sz * 0.15, -sz * 0.85);
                ctx.quadraticCurveTo(i * sz * 0.25, -sz * 1.2, i * sz * 0.2, -sz * 1.35);
                ctx.lineTo(i * sz * 0.15, -sz * 1.3);
                ctx.quadraticCurveTo(i * sz * 0.2, -sz * 1.15, i * sz * 0.12, -sz * 0.85);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            // === 翼（巨大で力強い） ===
            const wingFlap = Math.sin(frame * 0.08) * 0.06; // ★修正: 自然な羽ばたきに
            ctx.fillStyle = 'rgba(139,0,0,0.9)';
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 3;

            // 左翼
            ctx.save();
            ctx.translate(-sz * 0.3, -sz * 0.1);
            ctx.rotate(-0.25 + wingFlap); // ★修正: 角度を緩やかに
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-sz * 0.6, -sz * 0.3, -sz * 0.9, -sz * 0.2, -sz * 1.0, sz * 0.1);
            ctx.bezierCurveTo(-sz * 0.85, sz * 0.25, -sz * 0.5, sz * 0.2, 0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // 右翼
            ctx.save();
            ctx.translate(sz * 0.3, -sz * 0.1);
            ctx.rotate(0.25 - wingFlap); // ★修正: 角度を緩やかに
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(sz * 0.6, -sz * 0.3, sz * 0.9, -sz * 0.2, sz * 1.0, sz * 0.1);
            ctx.bezierCurveTo(sz * 0.85, sz * 0.25, sz * 0.5, sz * 0.2, 0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // === 尻尾（長くて先が尖っている） ===
            ctx.fillStyle = color;
            const tailSway = Math.sin(frame * 0.1) * 0.2;
            ctx.beginPath();
            ctx.moveTo(0, sz * 0.5);
            ctx.quadraticCurveTo(tailSway * sz, sz * 0.8, 0, sz * 1.1);
            ctx.lineTo(sz * 0.05, sz * 1.05);
            ctx.quadraticCurveTo(tailSway * sz * 0.9, sz * 0.75, sz * 0.05, sz * 0.5);
            ctx.closePath();
            ctx.fill();

            // 尻尾の先端（矢じり型）
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.moveTo(0, sz * 1.1);
            ctx.lineTo(-sz * 0.1, sz * 1.0);
            ctx.lineTo(sz * 0.1, sz * 1.0);
            ctx.closePath();
            ctx.fill();

            // === 炎のオーラ（簡略版: 4点のみ） ===
            for (let i = 0; i < 4; i++) {
                const angle = (frame * 0.05 + i * Math.PI / 2);
                ctx.fillStyle = i % 2 === 0 ? '#FF4500' : '#FFA500';
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * sz * 0.65, Math.sin(angle) * sz * 0.45 - sz * 0.3, sz * 0.07, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        } else if (slimeType === 'titan' || slimeType === 'titan_golem') {
            // Titan: 巨人の特徴（岩のような体、筋肉質） - 「破壊者」バージョンへ強化
            // 岩のような強固な体（基本形状）

            // 巨大な岩の肩（より鋭く、トゲトゲしく）
            ctx.fillStyle = '#424242';
            ctx.strokeStyle = '#212121';
            ctx.lineWidth = 3;
            for (let i = -1; i <= 1; i += 2) {
                ctx.save();
                ctx.translate(i * sz * 0.6, -sz * 0.3);
                ctx.rotate(i * 0.4);
                // 肩の岩
                ctx.beginPath();
                ctx.moveTo(-sz * 0.2, -sz * 0.2);
                ctx.lineTo(sz * 0.2, -sz * 0.2);
                ctx.lineTo(sz * 0.3, sz * 0.2);
                ctx.lineTo(-sz * 0.3, sz * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 肩から生えるトゲ（破壊者！）
                ctx.fillStyle = '#C62828'; // 赤いトゲ
                ctx.beginPath();
                ctx.moveTo(-sz * 0.1, -sz * 0.2);
                ctx.lineTo(0, -sz * 0.5);
                ctx.lineTo(sz * 0.1, -sz * 0.2);
                ctx.fill();
                ctx.restore();
            }

            // 巨大な拳
            ctx.fillStyle = '#B71C1C';

            // 左拳
            ctx.beginPath(); ctx.arc(-sz * 0.7, 0, sz * 0.2, 0, Math.PI * 2); ctx.fill();
            // 右拳
            ctx.beginPath(); ctx.arc(sz * 0.7, 0, sz * 0.2, 0, Math.PI * 2); ctx.fill();

            // 破壊のヘルメット（角がさらに大きく）
            ctx.fillStyle = '#1B5E20';
            ctx.beginPath();
            ctx.arc(0, -sz * 0.6 + bounce, sz * 0.5, Math.PI, 0);
            ctx.lineTo(sz * 0.5, -sz * 0.4 + bounce);
            ctx.lineTo(-sz * 0.5, -sz * 0.4 + bounce);
            ctx.closePath();
            ctx.fill();

            // 巨大な2本の角（赤黒い、より威圧的）
            ctx.fillStyle = '#212121';
            ctx.strokeStyle = '#D32F2F';
            ctx.lineWidth = 3;
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(i * sz * 0.35, -sz * 0.7 + bounce);
                ctx.quadraticCurveTo(i * sz * 0.6, -sz * 1.3 + bounce, i * sz * 0.5, -sz * 1.6 + bounce);
                ctx.lineTo(i * sz * 0.25, -sz * 0.7 + bounce);
                ctx.fill();
                ctx.stroke();
            }

            // 体のヒビ割れ（溶岩が流れているような）
            ctx.strokeStyle = '#FF3D00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.2, -sz * 0.1); ctx.lineTo(-sz * 0.4, sz * 0.2); ctx.lineTo(-sz * 0.2, sz * 0.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sz * 0.1, -sz * 0.2); ctx.lineTo(sz * 0.3, 0); ctx.lineTo(sz * 0.1, sz * 0.2);
            ctx.stroke();

            // 足元の破壊オーラ（簡略）
            ctx.fillStyle = 'rgba(255, 61, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, sz * 0.5, sz * 0.8, sz * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();

        }

        // 7. プレイヤースライムスキン帽子描画
        if (slimeType === 'player') {
            const custom = window.game?.saveData?.tankCustom;
            const pSkinId = custom?.playerSkin || 'pslime_default';
            const pSkins = window.TANK_PARTS?.playerSkins;
            const pSkin = pSkins?.find(s => s.id === pSkinId);
            if (pSkin && pSkin.hat) {
                this._drawPlayerHat(ctx, sz, pSkin, frame, bounce);
            }
        }

        ctx.restore();
    },

    // プレイヤースライムの帽子を描画
    _drawPlayerHat(ctx, sz, skinDef, frame, bounce) {
        const hat = skinDef.hat;
        const topY = -sz * 1.0; // スライム頭頂部のY座標

        ctx.save();
        if (hat === 'wizard') {
            // 🧙 とんがり魔法帽子
            const brimW = sz * 0.55, brimH = sz * 0.1;
            const hatH = sz * 0.75;
            const by2 = topY + bounce * 0.8;
            // 帽子本体（三角）
            ctx.fillStyle = skinDef.hatColor;
            ctx.beginPath();
            ctx.moveTo(0, by2 - hatH);
            ctx.lineTo(-brimW * 0.55, by2);
            ctx.lineTo(brimW * 0.55, by2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = skinDef.hatBrim;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // ブリム（つば）
            ctx.fillStyle = skinDef.hatBrim;
            ctx.beginPath();
            ctx.ellipse(0, by2, brimW, brimH, 0, 0, Math.PI * 2);
            ctx.fill();
            // 星
            ctx.fillStyle = skinDef.hatStar;
            this._drawStar(ctx, 0, by2 - hatH * 0.4, 5, sz * 0.1, sz * 0.05);
            ctx.fill();

        } else if (hat === 'knight') {
            // ⚔️ 騎士の兜
            const by2 = topY + bounce * 0.6;
            ctx.fillStyle = skinDef.hatColor;
            // 兜ドーム
            ctx.beginPath();
            ctx.arc(0, by2 + sz * 0.12, sz * 0.42, Math.PI, 0);
            ctx.lineTo(sz * 0.42, by2 + sz * 0.12);
            ctx.lineTo(-sz * 0.42, by2 + sz * 0.12);
            ctx.fill();
            // トサカ
            ctx.fillStyle = skinDef.hatAccent;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.08, by2 - sz * 0.32);
            ctx.quadraticCurveTo(0, by2 - sz * 0.55, sz * 0.08, by2 - sz * 0.32);
            ctx.lineTo(sz * 0.06, by2 + sz * 0.1);
            ctx.lineTo(-sz * 0.06, by2 + sz * 0.1);
            ctx.closePath();
            ctx.fill();
            // 金のライン
            ctx.strokeStyle = skinDef.hatBrim;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, by2 + sz * 0.12, sz * 0.42, Math.PI, 0);
            ctx.stroke();

        } else if (hat === 'party') {
            // 🎉 パーティーハット
            const by2 = topY + bounce;
            const hatH = sz * 0.7;
            // 本体
            ctx.fillStyle = skinDef.hatColor;
            ctx.beginPath();
            ctx.moveTo(0, by2 - hatH);
            ctx.lineTo(-sz * 0.38, by2);
            ctx.lineTo(sz * 0.38, by2);
            ctx.closePath();
            ctx.fill();
            // ストライプ
            ctx.strokeStyle = skinDef.hatStripe;
            ctx.lineWidth = 3;
            ctx.save();
            ctx.clip();
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * sz * 0.2, by2 - hatH);
                ctx.lineTo(i * sz * 0.2 + sz * 0.4, by2);
                ctx.stroke();
            }
            ctx.restore();
            // ポンポン
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, by2 - hatH, sz * 0.1, 0, Math.PI * 2);
            ctx.fill();

        } else if (hat === 'chef') {
            // 👨‍🍳 コック帽
            const by2 = topY + bounce * 0.5;
            const hatH = sz * 0.55;
            // 膨らんだ白い帽子
            ctx.fillStyle = skinDef.hatColor;
            ctx.beginPath();
            ctx.ellipse(0, by2 - hatH * 0.6, sz * 0.38, hatH * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
            // 土台バンド
            ctx.fillStyle = skinDef.hatBrim;
            ctx.fillRect(-sz * 0.38, by2 - sz * 0.08, sz * 0.76, sz * 0.14);
            // ハイライト
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(-sz * 0.1, by2 - hatH * 0.7, sz * 0.15, sz * 0.22, -0.3, 0, Math.PI * 2);
            ctx.stroke();

        } else if (hat === 'crown') {
            // 👑 王冠
            const by2 = topY + bounce * 0.7;
            const crownH = sz * 0.4;
            ctx.fillStyle = skinDef.hatColor;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.38, by2);
            ctx.lineTo(-sz * 0.38, by2 - crownH * 0.5);
            ctx.lineTo(-sz * 0.24, by2 - crownH);
            ctx.lineTo(-sz * 0.12, by2 - crownH * 0.4);
            ctx.lineTo(0, by2 - crownH * 1.1);
            ctx.lineTo(sz * 0.12, by2 - crownH * 0.4);
            ctx.lineTo(sz * 0.24, by2 - crownH);
            ctx.lineTo(sz * 0.38, by2 - crownH * 0.5);
            ctx.lineTo(sz * 0.38, by2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = skinDef.hatAccent;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 宝石
            ctx.fillStyle = skinDef.hatGem;
            ctx.beginPath(); ctx.arc(0, by2 - crownH * 0.9, sz * 0.09, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FF8A80';
            ctx.beginPath(); ctx.arc(-sz * 0.24, by2 - crownH * 0.8, sz * 0.07, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sz * 0.24, by2 - crownH * 0.8, sz * 0.07, 0, Math.PI * 2); ctx.fill();

        } else if (hat === 'santa') {
            // 🎅 サンタ帽子
            const by2 = topY + bounce;
            const hatH = sz * 0.65;
            // 本体（赤）
            ctx.fillStyle = skinDef.hatColor;
            ctx.beginPath();
            ctx.moveTo(sz * 0.12, by2 - hatH * 0.1);
            ctx.quadraticCurveTo(sz * 0.35, by2 - hatH * 0.5, sz * 0.08, by2 - hatH);
            ctx.quadraticCurveTo(sz * 0.0, by2 - hatH * 1.15, -sz * 0.05, by2 - hatH);
            ctx.lineTo(-sz * 0.38, by2 - sz * 0.08);
            ctx.lineTo(sz * 0.12, by2 - sz * 0.08);
            ctx.closePath();
            ctx.fill();
            // ブリム（白フワフワ）
            ctx.fillStyle = skinDef.hatBrim;
            ctx.beginPath();
            ctx.ellipse(0, by2 - sz * 0.06, sz * 0.42, sz * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            // ポンポン
            ctx.fillStyle = skinDef.hatPom;
            ctx.beginPath();
            ctx.arc(-sz * 0.05 + sz * 0.08, by2 - hatH * 1.05, sz * 0.11, 0, Math.PI * 2);
            ctx.fill();

        } else if (hat === 'halo') {
            // 😇 天使の輪（光る）
            const haloY = topY - sz * 0.1 + bounce * 0.5;
            const haloR = sz * 0.32;
            // 輝き（外側）
            ctx.strokeStyle = 'rgba(255,220,50,0.35)';
            ctx.lineWidth = sz * 0.14;
            ctx.beginPath();
            ctx.arc(0, haloY, haloR, 0, Math.PI * 2);
            ctx.stroke();
            // 本体
            ctx.strokeStyle = skinDef.hatColor;
            ctx.lineWidth = sz * 0.09;
            ctx.beginPath();
            ctx.arc(0, haloY, haloR, 0, Math.PI * 2);
            ctx.stroke();
            // ハイライト
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = sz * 0.03;
            ctx.beginPath();
            ctx.arc(-haloR * 0.3, haloY - haloR * 0.2, haloR * 0.35, Math.PI * 0.8, Math.PI * 1.6);
            ctx.stroke();
        }
        ctx.restore();
    },

    // Helper function for drawing stars
    _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    },

    drawAttackSwing(ctx, x, y, w, h, dir, progress) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        ctx.beginPath();
        const startAng = -Math.PI * 0.6;
        const endAng = Math.PI * 0.6;
        const radius = 45;

        const alpha = Math.sin(progress * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        ctx.arc(10, 0, radius, startAng, endAng);
        ctx.stroke();

        // Inner sharp line
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    },


    // === Character Aliases (To ensure correct visualization in UI/Gacha) ===
    // --- END RENDERER ---

    // === HELD ITEM ===
    drawHeldItem(ctx, x, y, ammoType) {
        if (!ammoType) return;
        const type = (typeof ammoType === 'object') ? ammoType.type : ammoType;
        const info = CONFIG.AMMO_TYPES[type];
        if (!info) return;

        // Glow behind item
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.arc(x, y - 12, 12, 0, Math.PI * 2); ctx.fill();

        // Ammo Name
        const name = info.name; // Assuming 'name' property exists in info
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; // Set textBaseline here for both name and icon
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillText(name, x + 1, y - 9); // Shadow
        ctx.fillStyle = '#FFF';
        ctx.fillText(name, x, y - 10);

        ctx.font = '16px Arial'; // Reset font for icon
        ctx.fillStyle = '#FFF'; // Reset fillStyle for icon
        ctx.fillText(info.icon, x, y - 12);

    },

    // === AMMO ITEM ON GROUND (3D glow) ===
    drawAmmoItem(ctx, item) {
        let info = CONFIG.AMMO_TYPES[item.type];
        if (!info) {
            // Fallback for unknown types to prevent crash
            info = { icon: '❓', color: '#FFF' };
        }
        const bob = Math.sin(_getFrameNow() * 0.004 + item.x) * 2;
        const py = item.y + bob;

        // Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(item.x, item.y + 6, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Outer glow (★キャッシュ: item.x/py が変わるたびに作り直すのは高コスト → 固定サイズで1種だけキャッシュ)
        const glow = _getCachedGradient(ctx, 'ammo_glow_18', () => {
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
            g.addColorStop(0, 'rgba(255,255,200,0.3)');
            g.addColorStop(1, 'rgba(255,255,200,0)');
            return g;
        });
        ctx.save();
        ctx.translate(item.x, py);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Icon
        ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFF';
        ctx.fillText(info.icon, item.x, py);
    },

    drawTankExterior(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior = true, tankType = 'NORMAL', battle = null) {
        this._drawSlimeTank(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior, tankType, battle);
    },

    // === SLIME TANK (Hyper Detail) ===
    // ========================================================
    // スキン別戦車描画
    // ========================================================
    _drawSkinTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, skinId, battle, isEnemy = false) {
        switch (skinId) {
            case 'skin_ninja':   return this._drawNinjaTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_crab':    return this._drawCrabTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_maou':    return this._drawMaouTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_mecha':   return this._drawMechaTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_ghost':       return this._drawGhostTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_shakkin':     return this._drawShakkinTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle, isEnemy);
            case 'skin_true_maou':   return this._drawTrueMaouTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_legend_titan':return this._drawLegendTitanTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_dragon':  return this._drawDragonTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_seraph':  return this._drawSeraphTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            case 'skin_abyss':   return this._drawAbyssTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy);
            default: break;
        }
    },

    // 🐉 ドラゴン機械スキン（最終ボス専用: 黒金の龍機装甲・炎顎砲）
    _drawDragonTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        const t = Date.now() * 0.001;

        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now() * 0.05) * 3, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 46, treadW = tw * 0.84;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // ── キャタピラ（黒金・鱗模様）──
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY + treadH);
        tG.addColorStop(0, '#2A1500'); tG.addColorStop(0.4, '#4A2800'); tG.addColorStop(1, '#0D0800');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2; ctx.stroke();
        // 鱗ライン
        ctx.strokeStyle = 'rgba(255,165,0,0.25)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(treadX + 8, treadY + treadH * 0.5); ctx.lineTo(treadX + treadW - 8, treadY + treadH * 0.5); ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW - 44) / 3), wY = treadY + treadH * 0.55;
            const wG = ctx.createRadialGradient(wx, wY, 0, wx, wY, 14);
            wG.addColorStop(0, '#FFD700'); wG.addColorStop(0.5, '#8B6914'); wG.addColorStop(1, '#2A1500');
            ctx.fillStyle = wG; ctx.beginPath(); ctx.arc(wx, wY, 13, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#4A2800'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(wx, wY, 4, 0, Math.PI * 2); ctx.fill();
        }

        // ── ドーム本体（龍頭型・黒金装甲）──
        const dRX = tw * 0.52, dRY = th * 0.48;
        const dCX = cx, dCY = treadY - dRY * 0.88;

        // オーラ（金色）
        const aura = 0.1 + Math.sin(t * 3) * 0.06;
        ctx.strokeStyle = `rgba(255,140,0,${aura})`; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX + 14, dRY + 14, 0, 0, Math.PI * 2); ctx.stroke();

        // ドーム本体
        const domeG = ctx.createRadialGradient(dCX - dRX * 0.28, dCY - dRY * 0.28, dRX * 0.05, dCX, dCY, dRX * 1.1);
        domeG.addColorStop(0, '#4A2800'); domeG.addColorStop(0.45, '#1A0C00'); domeG.addColorStop(1, '#050200');
        ctx.beginPath(); ctx.ellipse(dCX + 6, dCY + 6, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2.5; ctx.stroke();

        // 鱗模様（金線）
        ctx.strokeStyle = 'rgba(255,165,0,0.18)'; ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX * 0.28 * i, dRY * 0.28 * i, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(dCX - dRX * 0.18, dCY - dRY * 0.28, dRX * 0.28, dRY * 0.16, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,200,0,0.1)'; ctx.fill();

        if (!showInterior) {
            // ── メカ龍翼 ──
            const wBaseY = dCY - dRY * 0.08, wTipY = dCY - dRY * 0.65;
            const wingSwing = Math.sin(t * 2.5) * 5;
            [-1, 1].forEach(s => {
                // 翼本体（黒金）
                ctx.fillStyle = '#1A0C00';
                ctx.beginPath();
                ctx.moveTo(dCX + s * (dRX - 4), wBaseY + 12);
                ctx.lineTo(dCX + s * (dRX + 26), wTipY + 10 + wingSwing * s);
                ctx.lineTo(dCX + s * (dRX + 42), wTipY - 4 + wingSwing * s);
                ctx.lineTo(dCX + s * (dRX + 22), wBaseY - 22);
                ctx.lineTo(dCX + s * (dRX - 4), wBaseY - 14);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1.5; ctx.stroke();
                // 骨格ライン（金）
                ctx.strokeStyle = 'rgba(255,165,0,0.5)'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(dCX + s * (dRX + 2), wBaseY - 4); ctx.lineTo(dCX + s * (dRX + 34), wTipY + 2 + wingSwing * s); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(dCX + s * (dRX + 2), wBaseY + 5); ctx.lineTo(dCX + s * (dRX + 20), wTipY + 8 + wingSwing * s); ctx.stroke();
                // 翼爪（金三角）
                ctx.fillStyle = '#FFD700';
                ctx.beginPath(); ctx.moveTo(dCX + s * (dRX + 38), wTipY - 1 + wingSwing * s); ctx.lineTo(dCX + s * (dRX + 52), wTipY - 12 + wingSwing * s); ctx.lineTo(dCX + s * (dRX + 36), wTipY - 14 + wingSwing * s); ctx.closePath(); ctx.fill();
            });

            // ── 龍城塔（黒金鱗鉄）──
            const drawDragonTower = (tcx) => {
                const tRad = 22, tH = th * 0.54, tTopY = treadY - tH;
                const tG2 = ctx.createLinearGradient(tcx - tRad, 0, tcx + tRad, 0);
                tG2.addColorStop(0, '#1A0C00'); tG2.addColorStop(0.4, '#2A1800'); tG2.addColorStop(1, '#0D0600');
                ctx.fillStyle = tG2;
                ctx.beginPath(); ctx.rect(tcx - tRad, tTopY, tRad * 2, tH); ctx.fill();
                // 鱗ライン
                ctx.strokeStyle = 'rgba(255,165,0,0.18)'; ctx.lineWidth = 1;
                for (let r = 1; r <= 6; r++) { const ly = tTopY + r * (tH / 7); ctx.beginPath(); ctx.moveTo(tcx - tRad + 2, ly); ctx.lineTo(tcx + tRad - 2, ly); ctx.stroke(); }
                ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1.8; ctx.strokeRect(tcx - tRad, tTopY, tRad * 2, tH);
                // 炎の窓（赤橙）
                const winA = 0.5 + Math.sin(t * 4 + tcx) * 0.25;
                ctx.fillStyle = `rgba(255,80,0,${winA})`;
                ctx.beginPath(); ctx.moveTo(tcx - 6, tTopY + tH * 0.52); ctx.lineTo(tcx - 6, tTopY + tH * 0.40);
                ctx.quadraticCurveTo(tcx - 6, tTopY + tH * 0.26, tcx, tTopY + tH * 0.22);
                ctx.quadraticCurveTo(tcx + 6, tTopY + tH * 0.26, tcx + 6, tTopY + tH * 0.40);
                ctx.lineTo(tcx + 6, tTopY + tH * 0.52); ctx.closePath(); ctx.fill();
                // 龍の銃眼（牙型）
                for (let i = 0; i < 3; i++) {
                    const mx = tcx - 14 + i * 11, mTopY = tTopY - 12;
                    ctx.fillStyle = '#1A0C00'; ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(mx, mTopY + 12); ctx.lineTo(mx, mTopY + 4); ctx.lineTo(mx + 3.5, mTopY); ctx.lineTo(mx + 7, mTopY + 4); ctx.lineTo(mx + 7, mTopY + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(tcx - tRad, tTopY); ctx.lineTo(tcx + tRad, tTopY); ctx.stroke();
                // 龍の屋根（三角＋金縁）
                ctx.fillStyle = '#2A1800';
                ctx.beginPath(); ctx.moveTo(tcx - tRad - 3, tTopY - 12); ctx.lineTo(tcx, tTopY - 12 - 38); ctx.lineTo(tcx + tRad + 3, tTopY - 12); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();
                // 炎の旗
                const fA = 0.6 + Math.sin(t * 5 + tcx) * 0.3;
                ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY - 50); ctx.lineTo(tcx, tTopY - 68); ctx.stroke();
                ctx.fillStyle = `rgba(255,80,0,${fA})`;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY - 68); ctx.lineTo(tcx + 16, tTopY - 62); ctx.lineTo(tcx, tTopY - 56); ctx.closePath(); ctx.fill();
            };
            drawDragonTower(dCX - dRX * 0.86);
            drawDragonTower(dCX + dRX * 0.86);

            // ── 頂上の龍の角（2本）──
            const hornY = dCY - dRY;
            ctx.fillStyle = '#2A1800';
            ctx.beginPath(); ctx.moveTo(dCX - 28, hornY + 8); ctx.lineTo(dCX - 18, hornY - 46); ctx.lineTo(dCX - 10, hornY + 8); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(dCX + 28, hornY + 8); ctx.lineTo(dCX + 18, hornY - 46); ctx.lineTo(dCX + 10, hornY + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
            // 角のスパイク
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.moveTo(dCX - 28, hornY + 6); ctx.lineTo(dCX - 40, hornY - 12); ctx.lineTo(dCX - 26, hornY - 10); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(dCX + 28, hornY + 6); ctx.lineTo(dCX + 40, hornY - 12); ctx.lineTo(dCX + 26, hornY - 10); ctx.closePath(); ctx.fill();

            // ── 頂上：炎の核 ──
            ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(dCX, dCY - dRY - 2); ctx.lineTo(dCX, dCY - dRY - 24); ctx.stroke();
            const coreA = 0.7 + Math.sin(t * 6) * 0.3;
            const coreG = ctx.createRadialGradient(dCX, dCY - dRY - 24, 0, dCX, dCY - dRY - 24, 16);
            coreG.addColorStop(0, `rgba(255,255,100,${coreA})`);
            coreG.addColorStop(0.5, `rgba(255,80,0,${coreA * 0.8})`);
            coreG.addColorStop(1, 'rgba(180,20,0,0)');
            ctx.fillStyle = coreG;
            ctx.beginPath(); ctx.arc(dCX, dCY - dRY - 24, 16, 0, Math.PI * 2); ctx.fill();

            // ── 砲口（龍の顎砲）──
            const cX = dCX + dir * dRX * 0.28, cY = dCY + dRY * 0.14, cR = dRX * 0.22;
            // 外縁（黒金リング）
            ctx.fillStyle = '#1A0C00'; ctx.beginPath(); ctx.arc(cX, cY, cR + 10, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#2A1800'; ctx.beginPath(); ctx.arc(cX, cY, cR + 5, 0, Math.PI * 2); ctx.fill();
            // 砲口の炎（脈動）
            const mA = 0.6 + Math.sin(t * 7) * 0.3;
            ctx.fillStyle = `rgba(255,80,0,${mA})`; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255,220,0,${mA * 0.8})`; ctx.beginPath(); ctx.arc(cX, cY, cR * 0.55, 0, Math.PI * 2); ctx.fill();
            // 砲身（黒金）
            const bR = cR * 0.62, bLen = 48;
            const bG2 = ctx.createLinearGradient(cX, cY - bR, cX, cY + bR);
            bG2.addColorStop(0, '#8B6914'); bG2.addColorStop(0.4, '#C8960A'); bG2.addColorStop(1, '#4A2800');
            ctx.fillStyle = bG2; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cX + dir * bLen * 0.5, cY, Math.abs(dir * bLen) * 0.55, bR, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1A0C00'; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY, bR + 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();
            // 炎砲口
            const tipA = 0.6 + Math.sin(t * 8) * 0.35;
            ctx.fillStyle = `rgba(255,120,0,${tipA})`; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY, bR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255,255,100,${tipA * 0.7})`; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY, bR * 0.5, 0, Math.PI * 2); ctx.fill();

            // ── 龍の目（赤く脈動する）──
            const eY = dCY - dRY * 0.28;
            [-1, 1].forEach(s => {
                const ex = dCX + s * dRX * 0.28;
                const eyeA = 0.8 + Math.sin(t * 4 + s) * 0.2;
                ctx.fillStyle = '#220000'; ctx.beginPath(); ctx.ellipse(ex, eY, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(255,0,0,${eyeA})`; ctx.beginPath(); ctx.ellipse(ex, eY, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(255,200,0,${eyeA * 0.7})`; ctx.beginPath(); ctx.ellipse(ex, eY, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(ex - 3, eY - 2, 2, 0, Math.PI * 2); ctx.fill();
                // 目の周囲のオーラ
                ctx.strokeStyle = `rgba(255,60,0,${eyeA * 0.5})`; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(ex, eY, 14, 9, 0, 0, Math.PI * 2); ctx.stroke();
            });

            // ── エンブレム（龍紋章）──
            const emX = dCX - dRX * 0.28, emY = dCY + dRY * 0.36;
            ctx.fillStyle = '#0D0600'; ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(emX, emY, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(emX, emY, 12, 0, Math.PI * 2); ctx.stroke();
            // 龍の爪（五芒星風）
            ctx.strokeStyle = `rgba(255,160,0,${0.6 + Math.sin(t * 3) * 0.3})`; ctx.lineWidth = 1.5;
            for (let i = 0; i < 5; i++) {
                const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2, a2 = (i * 4 * Math.PI / 5 + 2 * Math.PI / 5) - Math.PI / 2;
                if (i === 0) { ctx.beginPath(); ctx.moveTo(emX + Math.cos(a1) * 10, emY + Math.sin(a1) * 10); }
                ctx.lineTo(emX + Math.cos(a2) * 10, emY + Math.sin(a2) * 10);
            }
            ctx.closePath(); ctx.stroke();
            ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(emX, emY, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },

    // 🥷 忍者スキン（強化版: 黒鉄城塔・手裏剣翼・細目）
    _drawNinjaTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*2, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 42, treadW = tw * 0.80;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // キャタピラ（黒鉄）
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY+treadH);
        tG.addColorStop(0,'#2A2A2A'); tG.addColorStop(0.5,'#3A3A3A'); tG.addColorStop(1,'#0A0A0A');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.setLineDash([4,5]);
        ctx.beginPath(); ctx.moveTo(treadX+8, treadY+treadH*0.5); ctx.lineTo(treadX+treadW-8, treadY+treadH*0.5); ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW-44)/3), wY = treadY+treadH*0.55;
            ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(wx, wY, 13, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(wx, wY, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(wx, wY, 3, 0, Math.PI*2); ctx.fill();
        }

        // ドーム本体（漆黒）
        const dRX = tw * 0.50, dRY = th * 0.47;
        const dCX = cx, dCY = treadY - dRY * 0.90;
        const domeG = ctx.createRadialGradient(dCX-dRX*0.3, dCY-dRY*0.3, dRX*0.05, dCX, dCY, dRX*1.1);
        domeG.addColorStop(0,'#2A2A3A'); domeG.addColorStop(0.45,'#141420'); domeG.addColorStop(1,'#080810');
        ctx.beginPath(); ctx.ellipse(dCX+5, dCY+5, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#4A4A6A'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(dCX-dRX*0.18, dCY-dRY*0.28, dRX*0.28, dRY*0.16, -0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();

        if (!showInterior) {
            // 翼（手裏剣型の薄い黒翼）
            const wBaseY = dCY - dRY*0.1, wTipY = dCY - dRY*0.6;
            [[-1],[1]].forEach(([s]) => {
                ctx.fillStyle = '#1A1A2A';
                ctx.beginPath();
                ctx.moveTo(dCX + s*(dRX-4), wBaseY+10);
                ctx.lineTo(dCX + s*(dRX+20), wTipY+5);
                ctx.lineTo(dCX + s*(dRX+30), wTipY-10);
                ctx.lineTo(dCX + s*(dRX+14), wBaseY-18);
                ctx.lineTo(dCX + s*(dRX-4),  wBaseY-12);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#3A3A5A'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = '#444';
                ctx.beginPath();
                ctx.moveTo(dCX + s*(dRX+26), wTipY+2);
                ctx.lineTo(dCX + s*(dRX+40), wTipY-8);
                ctx.lineTo(dCX + s*(dRX+24), wTipY-12);
                ctx.closePath(); ctx.fill();
            });

            // 城塔（黒鉄）
            const drawNinjaTower = (tcx) => {
                const tRad=20, tH=th*0.52, tTopY=treadY-tH;
                const tG2 = ctx.createLinearGradient(tcx-tRad,0,tcx+tRad,0);
                tG2.addColorStop(0,'#1A1A1A'); tG2.addColorStop(0.4,'#2A2A2A'); tG2.addColorStop(1,'#111');
                ctx.fillStyle = tG2;
                ctx.beginPath(); ctx.rect(tcx-tRad, tTopY, tRad*2, tH); ctx.fill();
                ctx.strokeStyle = 'rgba(100,100,150,0.3)'; ctx.lineWidth = 1;
                for (let r=1;r<=6;r++){const ly=tTopY+r*(tH/7);ctx.beginPath();ctx.moveTo(tcx-tRad+2,ly);ctx.lineTo(tcx+tRad-2,ly);ctx.stroke();}
                ctx.strokeStyle = '#333'; ctx.lineWidth = 1.8; ctx.strokeRect(tcx-tRad, tTopY, tRad*2, tH);
                ctx.fillStyle = 'rgba(255,50,0,0.4)';
                ctx.fillRect(tcx-3, tTopY+tH*0.38, 6, 14);
                for(let i=0;i<3;i++){
                    ctx.fillStyle='#1A1A1A'; ctx.strokeStyle='#444'; ctx.lineWidth=0.8;
                    ctx.beginPath(); ctx.rect(tcx-14+i*11, tTopY-11, 7,12); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle='#333'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx-tRad, tTopY); ctx.lineTo(tcx+tRad, tTopY); ctx.stroke();
                ctx.fillStyle='#1A1A2A';
                ctx.beginPath(); ctx.moveTo(tcx-tRad-3, tTopY-11); ctx.lineTo(tcx, tTopY-11-30); ctx.lineTo(tcx+tRad+3, tTopY-11); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='rgba(100,100,150,0.4)'; ctx.lineWidth=1.5; ctx.stroke();
                ctx.strokeStyle='#555'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-42); ctx.lineTo(tcx, tTopY-60); ctx.stroke();
                ctx.fillStyle='#E8E8E0';
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-60); ctx.lineTo(tcx+12, tTopY-54); ctx.lineTo(tcx, tTopY-48); ctx.closePath(); ctx.fill();
            };
            drawNinjaTower(dCX - dRX*0.86);
            drawNinjaTower(dCX + dRX*0.86);

            // 頂上：苦無
            ctx.strokeStyle='#888'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(dCX, dCY-dRY-2); ctx.lineTo(dCX, dCY-dRY-32); ctx.stroke();
            ctx.fillStyle='#B0B0B0';
            ctx.beginPath(); ctx.moveTo(dCX-3, dCY-dRY-28); ctx.lineTo(dCX, dCY-dRY-48); ctx.lineTo(dCX+3, dCY-dRY-28); ctx.closePath(); ctx.fill();

            // 砲口（黒・二重リング）
            const cX=dCX+dir*dRX*0.28, cY=dCY+dRY*0.10, cR=dRX*0.20;
            ctx.fillStyle='#1A1A1A'; ctx.beginPath(); ctx.arc(cX, cY, cR+9, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#444'; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle='#2A2A2A'; ctx.beginPath(); ctx.arc(cX, cY, cR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#050505'; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI*2); ctx.fill();
            const bR=cR*0.62, bLen=44;
            ctx.fillStyle='#444'; ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.ellipse(cX+dir*bLen*0.5, cY, Math.abs(dir*bLen)*0.55, bR, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            const ringX2 = cX + dir*bLen*0.65;
            ctx.fillStyle='#2A2A2A'; ctx.beginPath(); ctx.ellipse(ringX2, cY, 5, bR+3, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#2A2A2A'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#050505'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR, 0, Math.PI*2); ctx.fill();

            // 目（赤スリット）
            const eY=dCY-dRY*0.28;
            ctx.fillStyle='#CC3300'; ctx.fillRect(dCX-dRX*0.45, eY-4, 16, 8); ctx.fillRect(dCX+dRX*0.10, eY-4, 16, 8);
            ctx.fillStyle='rgba(255,80,0,0.5)'; ctx.fillRect(dCX-dRX*0.44, eY-2, 14, 4); ctx.fillRect(dCX+dRX*0.11, eY-2, 14, 4);

            // エンブレム（手裏剣型）
            const emX=dCX-dRX*0.28, emY=dCY+dRY*0.36;
            ctx.save(); ctx.translate(emX, emY);
            ctx.fillStyle='#1A1A2A'; ctx.strokeStyle='#555'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(0,0,17,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#888';
            for(let i=0;i<4;i++){
                ctx.save(); ctx.rotate(i*Math.PI/2);
                ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(4,-4); ctx.lineTo(12,0); ctx.lineTo(4,4); ctx.lineTo(0,12); ctx.lineTo(-4,4); ctx.lineTo(-12,0); ctx.lineTo(-4,-4);
                ctx.closePath(); ctx.fill(); ctx.restore();
            }
            ctx.fillStyle='#AAA'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    },

    // 🦀 カニスキン（強化版: 甲羅城塔・ハサミ翼・触角）
    _drawCrabTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*2, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 42, treadW = tw * 0.80;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // キャタピラ（赤甲殻）
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY+treadH);
        tG.addColorStop(0,'#C62828'); tG.addColorStop(0.5,'#E53935'); tG.addColorStop(1,'#7F0000');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#4A0000'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#4A0000'; ctx.lineWidth = 1.2; ctx.setLineDash([4,5]);
        ctx.beginPath(); ctx.moveTo(treadX+8, treadY+treadH*0.5); ctx.lineTo(treadX+treadW-8, treadY+treadH*0.5); ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW-44)/3), wY = treadY+treadH*0.55;
            ctx.fillStyle = '#B71C1C'; ctx.beginPath(); ctx.arc(wx, wY, 13, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#4A0000'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = '#EF5350'; ctx.beginPath(); ctx.arc(wx, wY, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF8A80'; ctx.beginPath(); ctx.arc(wx, wY, 3, 0, Math.PI*2); ctx.fill();
        }

        // ドーム（甲羅）
        const dRX = tw * 0.50, dRY = th * 0.47;
        const dCX = cx, dCY = treadY - dRY * 0.90;
        const domeG = ctx.createRadialGradient(dCX-dRX*0.3, dCY-dRY*0.3, dRX*0.05, dCX, dCY, dRX*1.1);
        domeG.addColorStop(0,'#EF5350'); domeG.addColorStop(0.45,'#C62828'); domeG.addColorStop(1,'#7F0000');
        ctx.beginPath(); ctx.ellipse(dCX+5, dCY+5, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#4A0000'; ctx.lineWidth = 2.2; ctx.stroke();
        // 甲羅の年輪模様
        for (let i=1;i<=3;i++){
            ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX*0.28*i, dRY*0.28*i, 0, 0, Math.PI*2); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(dCX-dRX*0.18, dCY-dRY*0.28, dRX*0.28, dRY*0.16, -0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();

        if (!showInterior) {
            // ハサミ翼（動的に揺れる）
            const swing = Math.sin(Date.now()*0.003) * 6;
            const clawBaseY = dCY - dRY*0.05;
            [[-1],[1]].forEach(([s]) => {
                const bx = dCX + s*(dRX+4);
                // ハサミ腕（翼の代わり）
                ctx.fillStyle = '#C62828';
                ctx.beginPath();
                ctx.moveTo(bx, clawBaseY-8);
                ctx.quadraticCurveTo(bx+s*25, clawBaseY-15+swing*s, bx+s*48, clawBaseY-25+swing*s);
                ctx.lineTo(bx+s*44, clawBaseY-12+swing*s);
                ctx.quadraticCurveTo(bx+s*18, clawBaseY-6, bx, clawBaseY+8);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#7F0000'; ctx.lineWidth = 1.5; ctx.stroke();
                // ハサミの刃
                ctx.fillStyle = '#EF5350';
                ctx.beginPath(); ctx.arc(bx+s*48, clawBaseY-25+swing*s, 9, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#7F0000'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = '#C62828';
                ctx.beginPath();
                ctx.moveTo(bx+s*42, clawBaseY-22+swing*s);
                ctx.lineTo(bx+s*56, clawBaseY-20+swing*s);
                ctx.lineTo(bx+s*46, clawBaseY-32+swing*s);
                ctx.closePath(); ctx.fill();
            });

            // 城塔（赤甲殻）
            const drawCrabTower = (tcx) => {
                const tRad=21, tH=th*0.52, tTopY=treadY-tH;
                const tG2 = ctx.createLinearGradient(tcx-tRad,0,tcx+tRad,0);
                tG2.addColorStop(0,'#A52020'); tG2.addColorStop(0.4,'#C62828'); tG2.addColorStop(1,'#8A1818');
                ctx.fillStyle = tG2;
                ctx.beginPath(); ctx.rect(tcx-tRad, tTopY, tRad*2, tH); ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
                for(let r=1;r<=6;r++){const ly=tTopY+r*(tH/7);ctx.beginPath();ctx.moveTo(tcx-tRad+2,ly);ctx.lineTo(tcx+tRad-2,ly);ctx.stroke();}
                ctx.strokeStyle='#4A0000'; ctx.lineWidth=1.8; ctx.strokeRect(tcx-tRad, tTopY, tRad*2, tH);
                // アーチ窓
                ctx.fillStyle='rgba(8,8,25,0.85)';
                ctx.beginPath(); ctx.moveTo(tcx-6, tTopY+tH*0.52); ctx.lineTo(tcx-6, tTopY+tH*0.42); ctx.quadraticCurveTo(tcx-6, tTopY+tH*0.28, tcx, tTopY+tH*0.24); ctx.quadraticCurveTo(tcx+6, tTopY+tH*0.28, tcx+6, tTopY+tH*0.42); ctx.lineTo(tcx+6, tTopY+tH*0.52); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='#8A3030'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(tcx-5, tTopY+tH*0.42); ctx.quadraticCurveTo(tcx-5, tTopY+tH*0.30, tcx, tTopY+tH*0.26); ctx.quadraticCurveTo(tcx+5, tTopY+tH*0.30, tcx+5, tTopY+tH*0.42); ctx.stroke();
                // 銃眼3個
                for(let i=0;i<3;i++){
                    ctx.fillStyle='#8A1818'; ctx.strokeStyle='#4A0000'; ctx.lineWidth=0.8;
                    ctx.beginPath(); ctx.rect(tcx-14+i*11, tTopY-11, 7,12); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle='#4A0000'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx-tRad, tTopY); ctx.lineTo(tcx+tRad, tTopY); ctx.stroke();
                // 屋根（甲羅色三角）
                ctx.fillStyle='#A52020';
                ctx.beginPath(); ctx.moveTo(tcx-tRad-3, tTopY-11); ctx.lineTo(tcx, tTopY-11-32); ctx.lineTo(tcx+tRad+3, tTopY-11); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='#4A0000'; ctx.lineWidth=1.5; ctx.stroke();
                ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=2;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-42); ctx.lineTo(tcx-tRad*0.4, tTopY-14); ctx.stroke();
                // 旗ポール + 触角風の旗
                ctx.strokeStyle='#8A3030'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-43); ctx.lineTo(tcx, tTopY-60); ctx.stroke();
                ctx.fillStyle='#E53935';
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-60); ctx.lineTo(tcx+13, tTopY-54); ctx.lineTo(tcx, tTopY-48); ctx.closePath(); ctx.fill();
            };
            drawCrabTower(dCX - dRX*0.86);
            drawCrabTower(dCX + dRX*0.86);

            // 触角（頂上）
            ctx.strokeStyle='#E53935'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(dCX-14, dCY-dRY+4); ctx.quadraticCurveTo(dCX-24, dCY-dRY-20, dCX-8, dCY-dRY-34); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(dCX+14, dCY-dRY+4); ctx.quadraticCurveTo(dCX+24, dCY-dRY-20, dCX+8, dCY-dRY-34); ctx.stroke();
            ctx.fillStyle='#FF1744'; ctx.beginPath(); ctx.arc(dCX-8, dCY-dRY-34, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#FF1744'; ctx.beginPath(); ctx.arc(dCX+8, dCY-dRY-34, 5, 0, Math.PI*2); ctx.fill();

            // 砲口（赤・二重リング）
            const cX=dCX+dir*dRX*0.28, cY=dCY+dRY*0.12, cR=dRX*0.20;
            ctx.fillStyle='#8A1818'; ctx.beginPath(); ctx.arc(cX, cY, cR+9, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#4A0000'; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle='#C62828'; ctx.beginPath(); ctx.arc(cX, cY, cR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#050505'; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI*2); ctx.fill();
            const bR=cR*0.62, bLen=44;
            const bG = ctx.createLinearGradient(cX, cY-bR, cX, cY+bR);
            bG.addColorStop(0,'#90A4AE'); bG.addColorStop(0.4,'#B0BEC5'); bG.addColorStop(1,'#455A64');
            ctx.fillStyle=bG; ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.ellipse(cX+dir*bLen*0.5, cY, Math.abs(dir*bLen)*0.55, bR, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#8A1818'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#050505'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR, 0, Math.PI*2); ctx.fill();

            // 目（飛び出るカニ目）
            const eY=dCY-dRY*0.28;
            [[-1],[1]].forEach(([s]) => {
                const ex=dCX+s*dRX*0.28;
                ctx.strokeStyle='#8A1818'; ctx.lineWidth=2;
                ctx.beginPath(); ctx.moveTo(ex, eY+4); ctx.lineTo(ex, eY-8); ctx.stroke();
                ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(ex, eY-8, 9, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='#FF1744'; ctx.beginPath(); ctx.arc(ex, eY-8, 5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(ex-2, eY-10, 2, 0, Math.PI*2); ctx.fill();
            });

            // エンブレム（甲羅模様）
            const emX=dCX-dRX*0.28, emY=dCY+dRY*0.36;
            ctx.fillStyle='#7F0000'; ctx.strokeStyle='#C62828'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(emX, emY, 17, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#C62828'; ctx.strokeStyle='#EF5350'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.arc(emX, emY, 11, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            for(let i=1;i<=2;i++){ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(emX, emY, 4*i, 0, Math.PI*2); ctx.stroke();}
            ctx.fillStyle='#FF5252'; ctx.beginPath(); ctx.arc(emX, emY, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    },

    // 👿 魔王スキン（強化版: 禍々しい城塔・翼・角・紫オーラ）
    _drawMaouTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*2, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 44, treadW = tw * 0.82;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // キャタピラ（紫黒）
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY+treadH);
        tG.addColorStop(0,'#2A0A4A'); tG.addColorStop(0.5,'#3A0A5A'); tG.addColorStop(1,'#100020');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#4A0080'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#4A0080'; ctx.lineWidth = 1.2; ctx.setLineDash([4,5]);
        ctx.beginPath(); ctx.moveTo(treadX+8, treadY+treadH*0.5); ctx.lineTo(treadX+treadW-8, treadY+treadH*0.5); ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW-44)/3), wY = treadY+treadH*0.55;
            ctx.fillStyle = '#3A0060'; ctx.beginPath(); ctx.arc(wx, wY, 14, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#200040'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = '#6A00B0'; ctx.beginPath(); ctx.arc(wx, wY, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#9A00E0'; ctx.beginPath(); ctx.arc(wx, wY, 3, 0, Math.PI*2); ctx.fill();
        }

        // ドーム本体（紫黒）
        const dRX = tw * 0.50, dRY = th * 0.47;
        const dCX = cx, dCY = treadY - dRY * 0.90;
        const aura = 0.10 + Math.sin(Date.now()*0.004)*0.06;
        ctx.strokeStyle = `rgba(180,0,255,${aura})`; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX+12, dRY+12, 0, 0, Math.PI*2); ctx.stroke();
        const domeG = ctx.createRadialGradient(dCX-dRX*0.28, dCY-dRY*0.28, dRX*0.05, dCX, dCY, dRX*1.1);
        domeG.addColorStop(0,'#5A0090'); domeG.addColorStop(0.45,'#2A0050'); domeG.addColorStop(1,'#100020');
        ctx.beginPath(); ctx.ellipse(dCX+5, dCY+5, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#7700CC'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(dCX-dRX*0.18, dCY-dRY*0.28, dRX*0.28, dRY*0.16, -0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(180,0,255,0.12)'; ctx.fill();

        if (!showInterior) {
            // 悪魔翼（骨翼）
            const wBaseY = dCY - dRY*0.08, wTipY = dCY - dRY*0.62;
            [[-1],[1]].forEach(([s]) => {
                ctx.fillStyle = '#1A0030';
                ctx.beginPath();
                ctx.moveTo(dCX + s*(dRX-4), wBaseY+10);
                ctx.lineTo(dCX + s*(dRX+25), wTipY+15);
                ctx.lineTo(dCX + s*(dRX+38), wTipY-5);
                ctx.lineTo(dCX + s*(dRX+20), wBaseY-22);
                ctx.lineTo(dCX + s*(dRX-4), wBaseY-14);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#5A0090'; ctx.lineWidth = 1.5; ctx.stroke();
                // 骨のラインと先端トゲ
                ctx.strokeStyle = '#7700CC'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(dCX+s*(dRX+2), wBaseY-5); ctx.lineTo(dCX+s*(dRX+30), wTipY+4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(dCX+s*(dRX+2), wBaseY+3); ctx.lineTo(dCX+s*(dRX+22), wTipY+12); ctx.stroke();
                ctx.fillStyle = '#4A0080';
                ctx.beginPath(); ctx.moveTo(dCX+s*(dRX+34), wTipY-2); ctx.lineTo(dCX+s*(dRX+48), wTipY-14); ctx.lineTo(dCX+s*(dRX+32), wTipY-16); ctx.closePath(); ctx.fill();
            });

            // 魔王城塔（禍々しい）
            const drawMaouTower = (tcx) => {
                const tRad=21, tH=th*0.54, tTopY=treadY-tH;
                const tG2 = ctx.createLinearGradient(tcx-tRad,0,tcx+tRad,0);
                tG2.addColorStop(0,'#1A0A2A'); tG2.addColorStop(0.4,'#2A0A4A'); tG2.addColorStop(1,'#100020');
                ctx.fillStyle = tG2;
                ctx.beginPath(); ctx.rect(tcx-tRad, tTopY, tRad*2, tH); ctx.fill();
                ctx.strokeStyle = 'rgba(120,0,200,0.25)'; ctx.lineWidth = 1;
                for(let r=1;r<=6;r++){const ly=tTopY+r*(tH/7);ctx.beginPath();ctx.moveTo(tcx-tRad+2,ly);ctx.lineTo(tcx+tRad-2,ly);ctx.stroke();}
                ctx.strokeStyle='#5A0090'; ctx.lineWidth=1.8; ctx.strokeRect(tcx-tRad, tTopY, tRad*2, tH);
                // 魔法の窓（光る）
                const winA = 0.4+Math.sin(Date.now()*0.004)*0.2;
                ctx.fillStyle=`rgba(160,0,255,${winA})`;
                ctx.beginPath(); ctx.moveTo(tcx-5, tTopY+tH*0.52); ctx.lineTo(tcx-5, tTopY+tH*0.40); ctx.quadraticCurveTo(tcx-5, tTopY+tH*0.26, tcx, tTopY+tH*0.22); ctx.quadraticCurveTo(tcx+5, tTopY+tH*0.26, tcx+5, tTopY+tH*0.40); ctx.lineTo(tcx+5, tTopY+tH*0.52); ctx.closePath(); ctx.fill();
                // 銃眼3個（スパイク型）
                for(let i=0;i<3;i++){
                    const mx=tcx-14+i*11, mTopY=tTopY-12;
                    ctx.fillStyle='#1A0030'; ctx.strokeStyle='#5A0090'; ctx.lineWidth=0.8;
                    ctx.beginPath(); ctx.moveTo(mx, mTopY+12); ctx.lineTo(mx, mTopY+4); ctx.lineTo(mx+3.5, mTopY); ctx.lineTo(mx+7, mTopY+4); ctx.lineTo(mx+7, mTopY+12); ctx.closePath(); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle='#5A0090'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx-tRad, tTopY); ctx.lineTo(tcx+tRad, tTopY); ctx.stroke();
                // 禍々しい屋根（逆三角スパイク付き）
                ctx.fillStyle='#2A0050';
                ctx.beginPath(); ctx.moveTo(tcx-tRad-3, tTopY-12); ctx.lineTo(tcx, tTopY-12-36); ctx.lineTo(tcx+tRad+3, tTopY-12); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='#7700CC'; ctx.lineWidth=1.5; ctx.stroke();
                ctx.strokeStyle='rgba(180,0,255,0.3)'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-46); ctx.lineTo(tcx-tRad*0.4, tTopY-14); ctx.stroke();
                // 旗（骸骨旗）
                ctx.strokeStyle='#5A0090'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-48); ctx.lineTo(tcx, tTopY-66); ctx.stroke();
                ctx.fillStyle='#1A0030';
                ctx.fillRect(tcx, tTopY-66, 20, 14);
                ctx.strokeStyle='#7700CC'; ctx.lineWidth=1; ctx.strokeRect(tcx, tTopY-66, 20, 14);
                ctx.fillStyle='#AA00FF';
                ctx.beginPath(); ctx.arc(tcx+7, tTopY-60, 4, 0, Math.PI*2); ctx.fill();
                // ドクロ目
                ctx.fillStyle='rgba(0,0,0,0.8)';
                ctx.beginPath(); ctx.arc(tcx+5, tTopY-61, 1.5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(tcx+9, tTopY-61, 1.5, 0, Math.PI*2); ctx.fill();
            };
            drawMaouTower(dCX - dRX*0.86);
            drawMaouTower(dCX + dRX*0.86);

            // 角2本（大きく・トゲ付き）
            const hornY = dCY - dRY;
            ctx.fillStyle = '#3A0060';
            ctx.beginPath(); ctx.moveTo(dCX-32, hornY+8); ctx.lineTo(dCX-22, hornY-42); ctx.lineTo(dCX-13, hornY+8); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#7700CC'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(dCX+32, hornY+8); ctx.lineTo(dCX+22, hornY-42); ctx.lineTo(dCX+13, hornY+8); ctx.closePath(); ctx.fill();
            ctx.stroke();
            // 角のトゲ
            ctx.fillStyle = '#5A0090';
            ctx.beginPath(); ctx.moveTo(dCX-32, hornY+6); ctx.lineTo(dCX-42, hornY-10); ctx.lineTo(dCX-30, hornY-8); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(dCX+32, hornY+6); ctx.lineTo(dCX+42, hornY-10); ctx.lineTo(dCX+30, hornY-8); ctx.closePath(); ctx.fill();

            // 頂上の魔法水晶
            ctx.strokeStyle='#5A0090'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.moveTo(dCX, dCY-dRY-2); ctx.lineTo(dCX, dCY-dRY-22); ctx.stroke();
            ctx.fillStyle='#7700CC';
            ctx.beginPath(); ctx.moveTo(dCX-8, dCY-dRY-22); ctx.lineTo(dCX, dCY-dRY-38); ctx.lineTo(dCX+8, dCY-dRY-22); ctx.lineTo(dCX, dCY-dRY-10); ctx.closePath(); ctx.fill();
            ctx.strokeStyle='#AA00FF'; ctx.lineWidth=1; ctx.stroke();
            const cryA = 0.5+Math.sin(Date.now()*0.006)*0.3;
            ctx.fillStyle=`rgba(180,0,255,${cryA})`;
            ctx.beginPath(); ctx.moveTo(dCX-6, dCY-dRY-24); ctx.lineTo(dCX, dCY-dRY-36); ctx.lineTo(dCX+6, dCY-dRY-24); ctx.lineTo(dCX, dCY-dRY-12); ctx.closePath(); ctx.fill();

            // 砲口（紫魔法砲）
            const cX=dCX+dir*dRX*0.28, cY=dCY+dRY*0.12, cR=dRX*0.20;
            ctx.fillStyle='#1A0030'; ctx.beginPath(); ctx.arc(cX, cY, cR+9, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#7700CC'; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle='#2A0050'; ctx.beginPath(); ctx.arc(cX, cY, cR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#050505'; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI*2); ctx.fill();
            const mA = 0.4+Math.sin(Date.now()*0.005)*0.2;
            ctx.fillStyle=`rgba(160,0,255,${mA})`; ctx.beginPath(); ctx.arc(cX, cY, cR*0.6, 0, Math.PI*2); ctx.fill();
            const bR=cR*0.62, bLen=44;
            ctx.fillStyle='#2A0050'; ctx.strokeStyle='rgba(100,0,180,0.4)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.ellipse(cX+dir*bLen*0.5, cY, Math.abs(dir*bLen)*0.55, bR, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            const ringX3 = cX + dir*bLen*0.65;
            ctx.fillStyle='#3A0060'; ctx.beginPath(); ctx.ellipse(ringX3, cY, 5, bR+3, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1A0030'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR+5, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#7700CC'; ctx.lineWidth=1.5; ctx.stroke();
            ctx.fillStyle='#050505'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR, 0, Math.PI*2); ctx.fill();
            const tipA = 0.5+Math.sin(Date.now()*0.005)*0.3;
            ctx.fillStyle=`rgba(140,0,220,${tipA})`; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR*0.6, 0, Math.PI*2); ctx.fill();

            // 目（赤スリット）
            const eY=dCY-dRY*0.28;
            [[-1],[1]].forEach(([s]) => {
                const ex = dCX+s*dRX*0.28;
                ctx.fillStyle='#C8C8D8'; ctx.beginPath(); ctx.ellipse(ex, eY, 10, 6, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='#1A0020'; ctx.beginPath(); ctx.ellipse(ex, eY, 9, 5, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='#FF0000'; ctx.beginPath(); ctx.ellipse(ex, eY, 2.5, 4.5, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(255,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ex, eY, 8, 3, 0, 0, Math.PI*2); ctx.fill();
            });

            // エンブレム（魔法陣）
            const emX=dCX-dRX*0.28, emY=dCY+dRY*0.36;
            ctx.fillStyle='#0A0015'; ctx.strokeStyle='#5A0090'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(emX, emY, 17, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle='#7700CC'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.arc(emX, emY, 12, 0, Math.PI*2); ctx.stroke();
            // 五芒星
            ctx.strokeStyle='#AA00FF'; ctx.lineWidth=1.2;
            for(let i=0;i<5;i++){
                const a1=(i*4*Math.PI/5)-Math.PI/2, a2=(i*4*Math.PI/5+2*Math.PI/5)-Math.PI/2;
                if(i===0){ctx.beginPath(); ctx.moveTo(emX+Math.cos(a1)*10, emY+Math.sin(a1)*10);}
                ctx.lineTo(emX+Math.cos(a2)*10, emY+Math.sin(a2)*10);
            }
            ctx.closePath(); ctx.stroke();
            ctx.fillStyle='#7700CC'; ctx.beginPath(); ctx.arc(emX, emY, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    },

    // 🤖 メカスキン（強化版: SF金属城塔・ブレード翼・スキャンライン）
    _drawMechaTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*2, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 44, treadW = tw * 0.82;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // キャタピラ（メタリック）
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY+treadH);
        tG.addColorStop(0,'#546E7A'); tG.addColorStop(0.5,'#78909C'); tG.addColorStop(1,'#263238');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#1A252A'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#37474F'; ctx.lineWidth = 1.5; ctx.setLineDash([6,4]);
        ctx.beginPath(); ctx.moveTo(treadX+8, treadY+treadH*0.5); ctx.lineTo(treadX+treadW-8, treadY+treadH*0.5); ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW-44)/3), wY = treadY+treadH*0.55;
            ctx.fillStyle = '#37474F'; ctx.beginPath(); ctx.arc(wx, wY, 14, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#1A252A'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = '#607D8B'; ctx.beginPath(); ctx.arc(wx, wY, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#90A4AE'; ctx.beginPath(); ctx.arc(wx, wY, 3.5, 0, Math.PI*2); ctx.fill();
        }

        // ドーム本体（メカ角ばった楕円）
        const dRX = tw * 0.50, dRY = th * 0.47;
        const dCX = cx, dCY = treadY - dRY * 0.90;
        const domeG = ctx.createRadialGradient(dCX-dRX*0.28, dCY-dRY*0.28, dRX*0.05, dCX, dCY, dRX*1.1);
        domeG.addColorStop(0,'#546E7A'); domeG.addColorStop(0.45,'#37474F'); domeG.addColorStop(1,'#1C313A');
        ctx.beginPath(); ctx.ellipse(dCX+5, dCY+5, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#78909C'; ctx.lineWidth = 2; ctx.stroke();
        // パネルライン
        ctx.strokeStyle = 'rgba(144,164,174,0.28)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(dCX-dRX*0.4, dCY-dRY*0.6); ctx.lineTo(dCX-dRX*0.4, dCY+dRY*0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dCX+dRX*0.4, dCY-dRY*0.6); ctx.lineTo(dCX+dRX*0.4, dCY+dRY*0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dCX-dRX*0.7, dCY); ctx.lineTo(dCX+dRX*0.7, dCY); ctx.stroke();
        // スキャンライン
        const scanY = dCY - dRY + ((Date.now()*0.05) % (dRY*2));
        ctx.strokeStyle = 'rgba(0,200,255,0.22)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(dCX-dRX*0.6, scanY); ctx.lineTo(dCX+dRX*0.6, scanY); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(dCX-dRX*0.18, dCY-dRY*0.28, dRX*0.28, dRY*0.16, -0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();

        if (!showInterior) {
            // ブレード翼（SF薄板）
            const wBaseY = dCY - dRY*0.1, wTipY = dCY - dRY*0.65;
            [[-1],[1]].forEach(([s]) => {
                ctx.fillStyle = '#37474F';
                ctx.beginPath();
                ctx.moveTo(dCX + s*(dRX-4), wBaseY+8);
                ctx.lineTo(dCX + s*(dRX+22), wTipY+8);
                ctx.lineTo(dCX + s*(dRX+34), wTipY-6);
                ctx.lineTo(dCX + s*(dRX+18), wBaseY-18);
                ctx.lineTo(dCX + s*(dRX-4), wBaseY-12);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#78909C'; ctx.lineWidth = 1.5; ctx.stroke();
                // 光沢ライン
                ctx.strokeStyle = 'rgba(0,200,255,0.25)'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(dCX+s*(dRX+4), wBaseY-4); ctx.lineTo(dCX+s*(dRX+26), wTipY+1); ctx.stroke();
                // SF先端
                ctx.fillStyle = '#546E7A';
                ctx.beginPath(); ctx.moveTo(dCX+s*(dRX+30), wTipY-3); ctx.lineTo(dCX+s*(dRX+44), wTipY-10); ctx.lineTo(dCX+s*(dRX+28), wTipY-14); ctx.closePath(); ctx.fill();
                const antA = 0.4+Math.sin(Date.now()*0.008)*0.4;
                ctx.fillStyle=`rgba(0,200,255,${antA})`;
                ctx.beginPath(); ctx.arc(dCX+s*(dRX+44), wTipY-10, 3, 0, Math.PI*2); ctx.fill();
            });

            // SFメカ城塔
            const drawMechaTower = (tcx) => {
                const tRad=21, tH=th*0.54, tTopY=treadY-tH;
                const tG2 = ctx.createLinearGradient(tcx-tRad,0,tcx+tRad,0);
                tG2.addColorStop(0,'#37474F'); tG2.addColorStop(0.4,'#546E7A'); tG2.addColorStop(1,'#2A3A42');
                ctx.fillStyle = tG2;
                ctx.beginPath(); ctx.rect(tcx-tRad, tTopY, tRad*2, tH); ctx.fill();
                ctx.strokeStyle = 'rgba(144,164,174,0.3)'; ctx.lineWidth = 1;
                for(let r=1;r<=6;r++){const ly=tTopY+r*(tH/7);ctx.beginPath();ctx.moveTo(tcx-tRad+2,ly);ctx.lineTo(tcx+tRad-2,ly);ctx.stroke();}
                // パネルライン縦
                ctx.beginPath(); ctx.moveTo(tcx, tTopY+tH*0.1); ctx.lineTo(tcx, tTopY+tH*0.9); ctx.stroke();
                ctx.strokeStyle='#78909C'; ctx.lineWidth=1.8; ctx.strokeRect(tcx-tRad, tTopY, tRad*2, tH);
                // カメラ眼
                const blink = Math.floor(Date.now()/3000)%5===0 ? 2 : 8;
                ctx.fillStyle='#00BCD4'; ctx.beginPath(); ctx.arc(tcx, tTopY+tH*0.40, 9, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='#0A0A14'; ctx.beginPath(); ctx.arc(tcx, tTopY+tH*0.40, blink, 0, Math.PI*2); ctx.fill();
                const cA2 = 0.5+Math.sin(Date.now()*0.006)*0.3;
                ctx.fillStyle=`rgba(0,200,255,${cA2})`; ctx.beginPath(); ctx.arc(tcx+2, tTopY+tH*0.40-2, 2.5, 0, Math.PI*2); ctx.fill();
                // 銃眼3個（SF型）
                for(let i=0;i<3;i++){
                    ctx.fillStyle='#263238'; ctx.strokeStyle='#607D8B'; ctx.lineWidth=0.8;
                    ctx.beginPath(); ctx.rect(tcx-14+i*11, tTopY-11, 7,12); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle='#607D8B'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx-tRad, tTopY); ctx.lineTo(tcx+tRad, tTopY); ctx.stroke();
                // 角ばった屋根
                ctx.fillStyle='#37474F';
                ctx.beginPath(); ctx.moveTo(tcx-tRad-2, tTopY-11); ctx.lineTo(tcx-tRad*0.3, tTopY-11-20); ctx.lineTo(tcx+tRad*0.3, tTopY-11-20); ctx.lineTo(tcx+tRad+2, tTopY-11); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='#78909C'; ctx.lineWidth=1.5; ctx.stroke();
                // アンテナ
                const antA2 = 0.5+Math.sin(Date.now()*0.007)*0.4;
                ctx.strokeStyle='#00BCD4'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-31); ctx.lineTo(tcx, tTopY-52); ctx.stroke();
                ctx.fillStyle=`rgba(0,200,255,${antA2})`;
                ctx.beginPath(); ctx.arc(tcx, tTopY-52, 4, 0, Math.PI*2); ctx.fill();
            };
            drawMechaTower(dCX - dRX*0.86);
            drawMechaTower(dCX + dRX*0.86);

            // 頂上：回転レーダー
            ctx.strokeStyle='#607D8B'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.moveTo(dCX, dCY-dRY-2); ctx.lineTo(dCX, dCY-dRY-20); ctx.stroke();
            const radAng = (Date.now()*0.003) % (Math.PI*2);
            ctx.strokeStyle='rgba(0,200,255,0.7)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(dCX, dCY-dRY-20); ctx.lineTo(dCX+Math.cos(radAng)*18, dCY-dRY-20+Math.sin(radAng)*6); ctx.stroke();
            ctx.strokeStyle='rgba(0,200,255,0.3)'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.ellipse(dCX, dCY-dRY-20, 18, 6, 0, 0, Math.PI*2); ctx.stroke();

            // 砲口（SF・シアン）
            const cX=dCX+dir*dRX*0.28, cY=dCY+dRY*0.12, cR=dRX*0.20;
            ctx.fillStyle='#263238'; ctx.beginPath(); ctx.arc(cX, cY, cR+9, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#607D8B'; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle='#37474F'; ctx.beginPath(); ctx.arc(cX, cY, cR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#050810'; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI*2); ctx.fill();
            const bR=cR*0.62, bLen=44;
            const bG = ctx.createLinearGradient(cX, cY-bR, cX, cY+bR);
            bG.addColorStop(0,'#90A4AE'); bG.addColorStop(0.4,'#B0BEC5'); bG.addColorStop(1,'#455A64');
            ctx.fillStyle=bG; ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.ellipse(cX+dir*bLen*0.5, cY, Math.abs(dir*bLen)*0.55, bR, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#263238'; ctx.beginPath(); ctx.ellipse(cX+bLen*0.65, cY, 5, bR+3, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#263238'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR+5, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#607D8B'; ctx.lineWidth=1.5; ctx.stroke();
            const glA = 0.5+Math.sin(Date.now()*0.005)*0.3;
            ctx.fillStyle=`rgba(0,200,255,${glA})`; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR*0.7, 0, Math.PI*2); ctx.fill();

            // 目（カメラ）
            const blink2 = Math.floor(Date.now()/3000)%5===0 ? 2 : 9;
            const eY=dCY-dRY*0.28;
            [[-1],[1]].forEach(([s]) => {
                const ex=dCX+s*dRX*0.28;
                ctx.fillStyle='#00BCD4'; ctx.beginPath(); ctx.arc(ex, eY, 11, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='#0A0A14'; ctx.beginPath(); ctx.arc(ex, eY, blink2, 0, Math.PI*2); ctx.fill();
                const cA3 = 0.5+Math.sin(Date.now()*0.007)*0.3;
                ctx.fillStyle=`rgba(0,200,255,${cA3})`; ctx.beginPath(); ctx.arc(ex+3, eY-3, 3, 0, Math.PI*2); ctx.fill();
            });

            // エンブレム（回路基板風）
            const emX=dCX-dRX*0.28, emY=dCY+dRY*0.36;
            ctx.fillStyle='#1C313A'; ctx.strokeStyle='#607D8B'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(emX, emY, 17, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle='rgba(0,200,255,0.5)'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.arc(emX, emY, 12, 0, Math.PI*2); ctx.stroke();
            // 回路ライン
            ctx.strokeStyle='rgba(0,200,255,0.6)'; ctx.lineWidth=1.2;
            [-8,0,8].forEach(x => { ctx.beginPath(); ctx.moveTo(emX+x, emY-10); ctx.lineTo(emX+x, emY+10); ctx.stroke(); });
            [-8,0,8].forEach(y => { ctx.beginPath(); ctx.moveTo(emX-10, emY+y); ctx.lineTo(emX+10, emY+y); ctx.stroke(); });
            ctx.fillStyle='#00BCD4'; ctx.beginPath(); ctx.arc(emX, emY, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    },

    // 👻 ゴーストスキン（強化版: 半透明城塔・霊体翼・浮遊）
    _drawGhostTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        ctx.save();
        const ghostAlpha = 0.72 + Math.sin(Date.now()*0.003)*0.14;
        ctx.globalAlpha = ghostAlpha;
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*2, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 40, treadW = tw * 0.78;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;
        const float = Math.sin(Date.now()*0.002)*7;

        // キャタピラ（半透明）
        ctx.fillStyle = 'rgba(180,190,220,0.45)';
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(150,160,200,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW-44)/3), wY = treadY+treadH*0.55;
            ctx.fillStyle = 'rgba(160,170,210,0.5)'; ctx.beginPath(); ctx.arc(wx, wY, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(200,210,240,0.4)'; ctx.beginPath(); ctx.arc(wx, wY, 6, 0, Math.PI*2); ctx.fill();
        }

        // ドーム（幽霊船型・ひらひら）
        const dRX = tw * 0.50, dRY = th * 0.46;
        const dCX = cx, dCY = treadY - dRY * 0.88 + float;
        const ripple = Math.sin(Date.now()*0.005);
        const dG = ctx.createRadialGradient(dCX-dRX*0.2, dCY-dRY*0.3, dRX*0.05, dCX, dCY, dRX);
        dG.addColorStop(0,'rgba(220,230,255,0.88)');
        dG.addColorStop(0.5,'rgba(160,170,210,0.78)');
        dG.addColorStop(1,'rgba(80,90,150,0.62)');
        ctx.beginPath();
        ctx.moveTo(dCX-dRX, dCY);
        ctx.bezierCurveTo(dCX-dRX, dCY-dRY*1.15, dCX-dRX*0.28, dCY-dRY*1.32, dCX, dCY-dRY*1.22);
        ctx.bezierCurveTo(dCX+dRX*0.28, dCY-dRY*1.32, dCX+dRX, dCY-dRY*1.15, dCX+dRX, dCY);
        ctx.bezierCurveTo(dCX+dRX*0.78, dCY+dRY*0.52+ripple*9, dCX+dRX*0.38, dCY+dRY*0.30, dCX, dCY+dRY*0.54+ripple*7);
        ctx.bezierCurveTo(dCX-dRX*0.38, dCY+dRY*0.30, dCX-dRX*0.78, dCY+dRY*0.52+ripple*9, dCX-dRX, dCY);
        ctx.closePath();
        ctx.fillStyle = dG; ctx.fill();
        ctx.strokeStyle = 'rgba(200,210,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();

        if (!showInterior) {
            // 霊体翼（半透明のヴェール）
            [[-1],[1]].forEach(([s]) => {
                const wBaseY = dCY - dRY*0.05, wTipY = dCY - dRY*0.58;
                const veilRipple = Math.sin(Date.now()*0.004+s)*5;
                ctx.fillStyle = 'rgba(200,210,255,0.25)';
                ctx.beginPath();
                ctx.moveTo(dCX+s*(dRX-2), wBaseY+8);
                ctx.bezierCurveTo(dCX+s*(dRX+16), wTipY+12+veilRipple, dCX+s*(dRX+28), wTipY+4, dCX+s*(dRX+32), wTipY-8);
                ctx.bezierCurveTo(dCX+s*(dRX+22), wBaseY-16+veilRipple, dCX+s*(dRX+8), wBaseY-14, dCX+s*(dRX-2), wBaseY-10);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(200,220,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
            });

            // 幽霊城塔（霧の中に浮かぶ）
            const drawGhostTower = (tcx) => {
                const tRad=20, tH=th*0.50, tTopY=treadY-tH+float;
                const tG2 = ctx.createLinearGradient(tcx-tRad,0,tcx+tRad,0);
                tG2.addColorStop(0,'rgba(130,140,180,0.55)');
                tG2.addColorStop(0.4,'rgba(180,190,230,0.65)');
                tG2.addColorStop(1,'rgba(110,120,160,0.55)');
                ctx.fillStyle = tG2;
                ctx.beginPath(); ctx.rect(tcx-tRad, tTopY, tRad*2, tH); ctx.fill();
                ctx.strokeStyle='rgba(180,190,230,0.25)'; ctx.lineWidth=1;
                for(let r=1;r<=5;r++){const ly=tTopY+r*(tH/6);ctx.beginPath();ctx.moveTo(tcx-tRad+2,ly);ctx.lineTo(tcx+tRad-2,ly);ctx.stroke();}
                ctx.strokeStyle='rgba(200,210,255,0.3)'; ctx.lineWidth=1.5; ctx.strokeRect(tcx-tRad, tTopY, tRad*2, tH);
                // 窓（光る）
                const wA = 0.3+Math.sin(Date.now()*0.003+tcx)*0.2;
                ctx.fillStyle=`rgba(220,240,255,${wA})`;
                ctx.beginPath(); ctx.moveTo(tcx-5, tTopY+tH*0.52); ctx.lineTo(tcx-5, tTopY+tH*0.40); ctx.quadraticCurveTo(tcx-5, tTopY+tH*0.27, tcx, tTopY+tH*0.23); ctx.quadraticCurveTo(tcx+5, tTopY+tH*0.27, tcx+5, tTopY+tH*0.40); ctx.lineTo(tcx+5, tTopY+tH*0.52); ctx.closePath(); ctx.fill();
                // 銃眼3個
                for(let i=0;i<3;i++){
                    ctx.fillStyle='rgba(80,90,140,0.6)'; ctx.strokeStyle='rgba(160,170,210,0.4)'; ctx.lineWidth=0.8;
                    ctx.beginPath(); ctx.rect(tcx-13+i*10, tTopY-10, 6,10); ctx.fill(); ctx.stroke();
                }
                ctx.strokeStyle='rgba(180,190,230,0.3)'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx-tRad, tTopY); ctx.lineTo(tcx+tRad, tTopY); ctx.stroke();
                // 幽霊三角屋根
                ctx.fillStyle='rgba(140,150,200,0.5)';
                ctx.beginPath(); ctx.moveTo(tcx-tRad-3, tTopY-10); ctx.lineTo(tcx, tTopY-10-28); ctx.lineTo(tcx+tRad+3, tTopY-10); ctx.closePath(); ctx.fill();
                ctx.strokeStyle='rgba(200,210,255,0.3)'; ctx.lineWidth=1.5; ctx.stroke();
                // 旗（霧の旗）
                ctx.strokeStyle='rgba(150,160,200,0.5)'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-38); ctx.lineTo(tcx, tTopY-56); ctx.stroke();
                ctx.fillStyle='rgba(220,230,255,0.55)';
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-56); ctx.lineTo(tcx+13, tTopY-50); ctx.lineTo(tcx, tTopY-44); ctx.closePath(); ctx.fill();
            };
            drawGhostTower(dCX - dRX*0.86);
            drawGhostTower(dCX + dRX*0.86);

            // 頂上：幽霊の炎
            for(let i=0;i<3;i++){
                const fA = 0.3+Math.sin(Date.now()*0.005+i)*0.2;
                const fOff = Math.sin(Date.now()*0.003+i*1.1)*4;
                ctx.fillStyle=`rgba(200,220,255,${fA})`;
                ctx.beginPath(); ctx.moveTo(dCX-5+i*5, dCY-dRY*1.20+float); ctx.quadraticCurveTo(dCX-4+i*5+fOff, dCY-dRY*1.30+float, dCX-2+i*5, dCY-dRY*1.40+float); ctx.quadraticCurveTo(dCX+i*5+fOff, dCY-dRY*1.32+float, dCX+3+i*5, dCY-dRY*1.20+float); ctx.closePath(); ctx.fill();
            }

            // 砲口（霧砲）
            const cX=dCX+dir*dRX*0.28, cY=dCY+dRY*0.12, cR=dRX*0.20;
            ctx.fillStyle='rgba(130,140,190,0.5)'; ctx.beginPath(); ctx.arc(cX, cY, cR+9, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='rgba(180,190,230,0.3)'; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle='rgba(160,170,220,0.55)'; ctx.beginPath(); ctx.arc(cX, cY, cR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='rgba(20,20,60,0.7)'; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI*2); ctx.fill();
            const bR=cR*0.62, bLen=44;
            ctx.fillStyle='rgba(180,190,230,0.45)'; ctx.strokeStyle='rgba(200,210,255,0.2)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.ellipse(cX+dir*bLen*0.5, cY, Math.abs(dir*bLen)*0.55, bR, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='rgba(130,140,190,0.5)'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR+5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='rgba(20,20,60,0.7)'; ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR, 0, Math.PI*2); ctx.fill();

            // 目（大きな丸目・ゆらゆら）
            const eY=dCY-dRY*0.26;
            [[-1],[1]].forEach(([s]) => {
                const ex=dCX+s*dRX*0.28;
                ctx.fillStyle='rgba(15,15,40,0.9)'; ctx.beginPath(); ctx.arc(ex, eY, 11, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(ex-3, eY-3, 4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(200,220,255,0.9)'; ctx.beginPath(); ctx.arc(ex, eY, 5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(15,15,40,0.9)'; ctx.beginPath(); ctx.arc(ex+1, eY+1, 3, 0, Math.PI*2); ctx.fill();
            });

            // 幽霊パーティクル
            for (let i = 0; i < 6; i++) {
                const px = dCX + Math.sin(Date.now()*0.002 + i*1.05)*dRX*0.72;
                const py = dCY - dRY*0.45 + Math.cos(Date.now()*0.002 + i*1.05)*dRY*0.52 + float;
                const pa = 0.25 + Math.sin(Date.now()*0.004 + i)*0.18;
                ctx.fillStyle = `rgba(200,220,255,${pa})`;
                ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI*2); ctx.fill();
            }

            // エンブレム（幽霊紋章）
            const emX=dCX-dRX*0.28, emY=dCY+dRY*0.34;
            ctx.fillStyle='rgba(60,70,120,0.5)'; ctx.strokeStyle='rgba(180,190,230,0.4)'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(emX, emY, 17, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle='rgba(100,110,170,0.45)'; ctx.beginPath(); ctx.arc(emX, emY, 11, 0, Math.PI*2); ctx.fill();
            // 幽霊シルエット
            ctx.fillStyle='rgba(200,220,255,0.6)';
            ctx.beginPath(); ctx.arc(emX, emY-3, 6, Math.PI, 0); ctx.lineTo(emX+6, emY+5); ctx.quadraticCurveTo(emX+3, emY+2, emX, emY+5); ctx.quadraticCurveTo(emX-3, emY+2, emX-6, emY+5); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    },

    // 💰 借金王スキン（隠し＆中ボス共用）
    _drawShakkinTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*3, Math.sin(Date.now()*0.07)*2); }
        // 傾いてるボロ戦車
        ctx.rotate(Math.sin(Date.now()*0.001)*0.03);
        ctx.translate(-cx, -(ty + th));

        const treadH = 40, treadW = tw * 0.78;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // キャタピラ（ボロいゴールド）
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY+treadH);
        tG.addColorStop(0, '#B8860B'); tG.addColorStop(1, '#6B4C00');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 8); ctx.fill();
        ctx.strokeStyle = '#4A3000'; ctx.lineWidth = 2; ctx.stroke();
        // キズ
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(treadX+20, treadY+5); ctx.lineTo(treadX+40, treadY+30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(treadX+treadW-30, treadY+8); ctx.lineTo(treadX+treadW-10, treadY+25); ctx.stroke();
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 20 + i * ((treadW-40)/3);
            ctx.fillStyle = '#9A7A00'; ctx.beginPath(); ctx.arc(wx, treadY+treadH*0.55, 13, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#C8A000'; ctx.beginPath(); ctx.arc(wx, treadY+treadH*0.55, 6, 0, Math.PI*2); ctx.fill();
        }

        // 本体（ボコボコゴールドドーム）
        const dCY = treadY - th*0.37;
        const dRX = tw*0.47, dRY = th*0.41;
        const dG = ctx.createRadialGradient(cx-dRX*0.25, dCY-dRY*0.25, dRX*0.05, cx, dCY, dRX);
        dG.addColorStop(0, '#FFD740'); dG.addColorStop(0.4, '#FFA000'); dG.addColorStop(1, '#6B4C00');
        ctx.fillStyle = dG;
        ctx.beginPath(); ctx.ellipse(cx, dCY, dRX, dRY, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#4A3000'; ctx.lineWidth = 2.5; ctx.stroke();

        // ヒビ・キズ
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx-20, dCY-dRY*0.5); ctx.lineTo(cx-5, dCY-dRY*0.1); ctx.lineTo(cx-15, dCY+dRY*0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+15, dCY-dRY*0.3); ctx.lineTo(cx+25, dCY+dRY*0.2); ctx.stroke();

        // お金のマーク貼り付け
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center';
        ctx.fillText('💰', cx-5, dCY+8);

        if (!showInterior) {
            // 目（ギラギラお金目）
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(cx-18, dCY-dRY*0.22, 10, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx+18, dCY-dRY*0.22, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#1A0000';
            ctx.beginPath(); ctx.arc(cx-18, dCY-dRY*0.22, 6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx+18, dCY-dRY*0.22, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFD700'; ctx.font = 'bold 7px serif'; ctx.textAlign = 'center';
            ctx.fillText('$', cx-18, dCY-dRY*0.22+3);
            ctx.fillText('$', cx+18, dCY-dRY*0.22+3);

            // 砲身（借用書ランチャー）
            ctx.fillStyle = '#B8860B';
            ctx.fillRect(dir>0 ? cx + tw*0.1 : cx - tw*0.1 - 48, dCY + dRY*0.12, 48, 13);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(dir>0 ? cx + tw*0.1 + 43 : cx - tw*0.1 - 53, dCY + dRY*0.12 - 2, 10, 17);
            // 📝マーク
            ctx.font = '12px serif'; ctx.fillText('📝', dir>0 ? cx + tw*0.1 + 47 : cx - tw*0.1 - 43, dCY + dRY*0.12 + 10);

            // 旗（履歴書）
            ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx-5, dCY-dRY-5); ctx.lineTo(cx-5, dCY-dRY-38); ctx.stroke();
            ctx.fillStyle = '#FFFFF0';
            ctx.fillRect(cx-5, dCY-dRY-38, 28, 20);
            ctx.strokeStyle = '#CCC'; ctx.lineWidth = 1;
            ctx.strokeRect(cx-5, dCY-dRY-38, 28, 20);
            ctx.fillStyle = '#888'; ctx.font = '7px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('履歴書', cx-2, dCY-dRY-25);
        }
        ctx.restore();
    },

    // === 敵タイプ別専用描画（スキン流用） ===

    // SCOUT：素早い軽量型 → enemyColorベースの明るい配色で独自描画
    _drawEnemyScout(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle) {
        const cx = tx + tw / 2;
        const dir = -1;
        const variant = this._getStageEnemyVariant(battle);
        const baseColor = variant.base;
        const lighten = (hex, amt) => {
            const n = parseInt(hex.replace('#',''), 16);
            const r = Math.min(255, ((n>>16)&0xff) + amt);
            const g = Math.min(255, ((n>>8)&0xff) + amt);
            const b = Math.min(255, (n&0xff) + amt);
            return `rgb(${r},${g},${b})`;
        };
        const darken = (hex, amt) => lighten(hex, -amt);
        const bodyBase   = baseColor;
        const bodyHigh   = variant.high;
        const bodyShadow = variant.shadow;
        const accentColor = variant.accent;

        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(Date.now()*0.05)*2, 0); }
        ctx.scale(0.92, 1.0);
        ctx.translate(-cx, -(ty + th));

        const treadH = 38, treadW = tw * 0.78;
        const treadX = cx - treadW/2, treadY = ty + th - treadH;
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY+treadH);
        tG.addColorStop(0, darken(baseColor, 40));
        tG.addColorStop(0.5, darken(baseColor, 20));
        tG.addColorStop(1, darken(baseColor, 70));
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 8); ctx.fill();
        ctx.strokeStyle = darken(baseColor, 80); ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 18 + i * ((treadW-36)/3), wY = treadY + treadH*0.55;
            ctx.fillStyle = darken(baseColor, 50); ctx.beginPath(); ctx.arc(wx, wY, 11, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = darken(baseColor, 80); ctx.lineWidth = 1.2; ctx.stroke();
            ctx.fillStyle = darken(baseColor, 20); ctx.beginPath(); ctx.arc(wx, wY, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = accentColor; ctx.beginPath(); ctx.arc(wx, wY, 2.5, 0, Math.PI*2); ctx.fill();
        }
        const dRX = tw * 0.50, dRY = th * 0.40;
        const dCX = cx, dCY = treadY - dRY * 0.88;
        const domeG = ctx.createRadialGradient(dCX-dRX*0.3, dCY-dRY*0.35, dRX*0.05, dCX, dCY, dRX*1.1);
        domeG.addColorStop(0, bodyHigh);
        domeG.addColorStop(0.45, bodyBase);
        domeG.addColorStop(1, bodyShadow);
        ctx.beginPath(); ctx.ellipse(dCX+4, dCY+4, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI*2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = darken(baseColor, 30); ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(dCX-dRX*0.2, dCY-dRY*0.3, dRX*0.3, dRY*0.15, -0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();

        if (!showInterior) {
            ctx.strokeStyle = accentColor; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.5;
            for (let i = 0; i < 3; i++) {
                const lY = dCY - dRY*0.1 + i*10;
                ctx.beginPath(); ctx.moveTo(dCX-dRX*0.9, lY); ctx.lineTo(dCX-dRX*0.3, lY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(dCX+dRX*0.3, lY); ctx.lineTo(dCX+dRX*0.9, lY); ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
            [[dCX-dRX*0.78], [dCX+dRX*0.78]].forEach(([tcx]) => {
                const tR=14, tH=th*0.45, tTopY=treadY-tH;
                const tG2 = ctx.createLinearGradient(tcx-tR, 0, tcx+tR, 0);
                tG2.addColorStop(0, bodyShadow); tG2.addColorStop(0.5, bodyBase); tG2.addColorStop(1, bodyShadow);
                ctx.fillStyle = tG2; ctx.beginPath(); ctx.rect(tcx-tR, tTopY, tR*2, tH); ctx.fill();
                ctx.strokeStyle = darken(baseColor, 20); ctx.lineWidth = 1.5; ctx.strokeRect(tcx-tR, tTopY, tR*2, tH);
                ctx.strokeStyle = darken(baseColor, 30); ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-2); ctx.lineTo(tcx, tTopY-22); ctx.stroke();
                ctx.fillStyle = accentColor;
                ctx.beginPath(); ctx.moveTo(tcx, tTopY-22); ctx.lineTo(tcx+10, tTopY-17); ctx.lineTo(tcx, tTopY-12); ctx.closePath(); ctx.fill();
            });
            const cX = dCX+dir*dRX*0.3, cY = dCY+dRY*0.12, cR = dRX*0.19;
            ctx.fillStyle = bodyShadow; ctx.beginPath(); ctx.arc(cX, cY, cR+7, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = darken(baseColor, 20); ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = darken(baseColor, 40); ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI*2); ctx.fill();
            const bR = cR*0.6, bLen = 42;
            ctx.fillStyle = darken(baseColor, 30);
            ctx.beginPath(); ctx.ellipse(cX+dir*bLen*0.5, cY, Math.abs(dir*bLen)*0.52, bR, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = darken(baseColor, 50); ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR+4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = darken(baseColor, 80); ctx.beginPath(); ctx.arc(cX+dir*bLen, cY, bR, 0, Math.PI*2); ctx.fill();
            const eY = dCY - dRY*0.25;
            ctx.fillStyle = accentColor;
            ctx.beginPath(); ctx.arc(dCX-dRX*0.26, eY, 6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(dCX+dRX*0.10, eY, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = darken(baseColor, 60);
            ctx.beginPath(); ctx.arc(dCX-dRX*0.26, eY, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(dCX+dRX*0.10, eY, 3, 0, Math.PI*2); ctx.fill();
        }
        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.95);
        ctx.restore();
    },

    // ========================================================
    // 第二形態専用スキン
    // ========================================================

    // 真・魔王タンク 覚醒形態（stage8 第二形態）
    // 魔王スキンをベースに黒×金オーラ・3本角・紅の目・炎翼を追加
    _drawTrueMaouTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        const t = Date.now();
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(t * 0.05) * 3, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 46, treadW = tw * 0.84;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // ── 地面オーラ（黒炎の輪）──
        const auraR = 0.06 + Math.sin(t * 0.003) * 0.04;
        const auraG = ctx.createRadialGradient(cx, treadY + treadH, 0, cx, treadY + treadH, treadW * 0.7);
        auraG.addColorStop(0, `rgba(180,0,255,${auraR * 3})`);
        auraG.addColorStop(0.5, `rgba(80,0,120,${auraR})`);
        auraG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraG;
        ctx.beginPath(); ctx.ellipse(cx, treadY + treadH * 0.8, treadW * 0.7, treadH * 0.4, 0, 0, Math.PI * 2); ctx.fill();

        // ── キャタピラ（黒×金）──
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY + treadH);
        tG.addColorStop(0, '#0A0000'); tG.addColorStop(0.5, '#1A0A00'); tG.addColorStop(1, '#000000');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#AA7700'; ctx.lineWidth = 2.5; ctx.stroke();
        for (let i = 0; i < 4; i++) {
            const wx = treadX + 22 + i * ((treadW - 44) / 3), wY = treadY + treadH * 0.55;
            ctx.fillStyle = '#1A0A00'; ctx.beginPath(); ctx.arc(wx, wY, 14, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#AA7700'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#CC9900'; ctx.beginPath(); ctx.arc(wx, wY, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(wx, wY, 3, 0, Math.PI * 2); ctx.fill();
        }

        // ── ドーム本体（黒×紫×金グロー）──
        const dRX = tw * 0.52, dRY = th * 0.49;
        const dCX = cx, dCY = treadY - dRY * 0.90;
        // 外側金オーラ（脈動）
        const outerA = 0.18 + Math.sin(t * 0.005) * 0.10;
        ctx.strokeStyle = `rgba(255,180,0,${outerA})`; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX + 16, dRY + 16, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(220,0,255,${outerA * 0.6})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX + 8, dRY + 8, 0, 0, Math.PI * 2); ctx.stroke();
        // ドーム本体
        const domeG = ctx.createRadialGradient(dCX - dRX * 0.25, dCY - dRY * 0.28, dRX * 0.05, dCX, dCY, dRX * 1.1);
        domeG.addColorStop(0, '#3A0A00'); domeG.addColorStop(0.4, '#1A0000'); domeG.addColorStop(1, '#050000');
        ctx.beginPath(); ctx.ellipse(dCX + 6, dCY + 6, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2.5; ctx.stroke();

        if (!showInterior) {
            // ── 炎翼（金と赤）──
            const wFlap = Math.sin(t * 0.006) * 8;
            [[-1], [1]].forEach(([s]) => {
                // 外翼（炎色）
                ctx.fillStyle = `rgba(220,80,0,0.65)`;
                ctx.beginPath();
                ctx.moveTo(dCX + s * (dRX - 2), dCY + dRY * 0.08);
                ctx.bezierCurveTo(dCX + s * (dRX + 30), dCY - dRY * 0.5 + wFlap, dCX + s * (dRX + 55), dCY - dRY * 0.7 + wFlap, dCX + s * (dRX + 60), dCY - dRY * 0.9 + wFlap);
                ctx.bezierCurveTo(dCX + s * (dRX + 38), dCY - dRY * 0.55, dCX + s * (dRX + 14), dCY - dRY * 0.25, dCX + s * (dRX - 2), dCY - dRY * 0.12);
                ctx.closePath(); ctx.fill();
                // 内翼（金）
                ctx.fillStyle = `rgba(255,200,0,0.50)`;
                ctx.beginPath();
                ctx.moveTo(dCX + s * (dRX - 2), dCY + dRY * 0.05);
                ctx.bezierCurveTo(dCX + s * (dRX + 20), dCY - dRY * 0.4 + wFlap * 0.7, dCX + s * (dRX + 38), dCY - dRY * 0.58 + wFlap * 0.7, dCX + s * (dRX + 42), dCY - dRY * 0.75 + wFlap * 0.7);
                ctx.bezierCurveTo(dCX + s * (dRX + 26), dCY - dRY * 0.44, dCX + s * (dRX + 8), dCY - dRY * 0.2, dCX + s * (dRX - 2), dCY - dRY * 0.1);
                ctx.closePath(); ctx.fill();
            });

            // ── 3本角（中央大 + 左右小）──
            // 中央の大角
            const hornPulse = Math.sin(t * 0.008) * 3;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(dCX - 9, dCY - dRY * 0.90);
            ctx.lineTo(dCX, dCY - dRY * 1.55 + hornPulse);
            ctx.lineTo(dCX + 9, dCY - dRY * 0.90);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 1.5; ctx.stroke();
            // 左右の角
            for (const [sx, sy] of [[-22, -dRY * 0.78], [22, -dRY * 0.78]]) {
                ctx.fillStyle = '#CC8800';
                ctx.beginPath();
                ctx.moveTo(dCX + sx - 6, dCY + sy);
                ctx.lineTo(dCX + sx + (sx < 0 ? -8 : 8), dCY + sy - dRY * 0.35 + hornPulse * 0.6);
                ctx.lineTo(dCX + sx + 6, dCY + sy);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 1; ctx.stroke();
            }

            // ── 紅の目（2つ、強く光る）──
            const eyeY = dCY - dRY * 0.26;
            const eyeGlow = 0.7 + Math.sin(t * 0.008) * 0.25;
            [[-1], [1]].forEach(([s]) => {
                const ex = dCX + s * dRX * 0.30;
                // 外グロー
                ctx.fillStyle = `rgba(255,0,0,${eyeGlow * 0.35})`;
                ctx.beginPath(); ctx.arc(ex, eyeY, 18, 0, Math.PI * 2); ctx.fill();
                // 眼球
                ctx.fillStyle = '#0A0000';
                ctx.beginPath(); ctx.arc(ex, eyeY, 11, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(255,30,0,${eyeGlow})`;
                ctx.beginPath(); ctx.arc(ex, eyeY, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FF6600';
                ctx.beginPath(); ctx.arc(ex, eyeY, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath(); ctx.arc(ex - 2, eyeY - 2, 1.8, 0, Math.PI * 2); ctx.fill();
            });

            // ── 砲口（黒炎砲）──
            const cX = dCX + dir * dRX * 0.30, cY = dCY + dRY * 0.14, cR = dRX * 0.22;
            ctx.fillStyle = 'rgba(80,0,0,0.6)'; ctx.beginPath(); ctx.arc(cX, cY, cR + 10, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#1A0000'; ctx.beginPath(); ctx.arc(cX, cY, cR + 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#050000'; ctx.beginPath(); ctx.arc(cX, cY, cR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255,80,0,${0.25 + Math.sin(t * 0.01) * 0.15})`;
            ctx.beginPath(); ctx.arc(cX, cY, cR * 0.55, 0, Math.PI * 2); ctx.fill();
            const bR = cR * 0.60, bLen = 50;
            ctx.fillStyle = '#1A0A00'; ctx.strokeStyle = '#AA7700'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cX + dir * bLen * 0.5, cY, Math.abs(dir * bLen) * 0.55, bR, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#0A0000'; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY, bR + 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#050000'; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY, bR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255,60,0,${0.4 + Math.sin(t * 0.01) * 0.2})`;
            ctx.beginPath(); ctx.arc(cX + dir * bLen, cY, bR * 0.45, 0, Math.PI * 2); ctx.fill();

            // ── 魔王紋章（金の星章）──
            const emX = dCX - dir * dRX * 0.28, emY = dCY + dRY * 0.30;
            ctx.fillStyle = '#1A0000'; ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(emX, emY, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // 五芒星
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = i * Math.PI * 2 / 5 - Math.PI / 2;
                const b = (i + 0.5) * Math.PI * 2 / 5 - Math.PI / 2;
                if (i === 0) ctx.moveTo(emX + Math.cos(a) * 11, emY + Math.sin(a) * 11);
                else ctx.lineTo(emX + Math.cos(a) * 11, emY + Math.sin(a) * 11);
                ctx.lineTo(emX + Math.cos(b) * 5, emY + Math.sin(b) * 5);
            }
            ctx.closePath(); ctx.fill();

            // ── 黒炎パーティクル ──
            for (let i = 0; i < 5; i++) {
                const px = dCX + Math.sin(t * 0.002 + i * 1.26) * dRX * 0.68;
                const py = dCY - dRY * 0.3 + Math.cos(t * 0.003 + i * 1.26) * dRY * 0.45;
                const pa = 0.22 + Math.sin(t * 0.005 + i) * 0.15;
                ctx.fillStyle = `rgba(220,80,0,${pa})`;
                ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    },

    // レジェンドタイタン 覚醒形態（stage_ex2 第二形態）
    // メカスキンをベースに金×白発光・巨大砲身・プラズマオーラを追加
    _drawLegendTitanTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        const cx = tx + tw / 2;
        const dir = isEnemy ? -1 : 1;
        const t = Date.now();
        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) { ctx.translate(Math.sin(t * 0.05) * 3, 0); }
        ctx.translate(-cx, -(ty + th));

        const treadH = 48, treadW = tw * 0.86;
        const treadX = cx - treadW / 2, treadY = ty + th - treadH;

        // ── 地面プラズマ輝光 ──
        const plasmaA = 0.08 + Math.sin(t * 0.004) * 0.05;
        const plasmaG = ctx.createRadialGradient(cx, treadY + treadH, 0, cx, treadY + treadH, treadW * 0.8);
        plasmaG.addColorStop(0, `rgba(255,220,0,${plasmaA * 4})`);
        plasmaG.addColorStop(0.5, `rgba(255,255,120,${plasmaA})`);
        plasmaG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = plasmaG;
        ctx.beginPath(); ctx.ellipse(cx, treadY + treadH * 0.8, treadW * 0.75, treadH * 0.45, 0, 0, Math.PI * 2); ctx.fill();

        // ── キャタピラ（金属×金）──
        const tG = ctx.createLinearGradient(0, treadY, 0, treadY + treadH);
        tG.addColorStop(0, '#2A2000'); tG.addColorStop(0.5, '#3A3000'); tG.addColorStop(1, '#100A00');
        ctx.fillStyle = tG;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10); ctx.fill();
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5; ctx.stroke();
        for (let i = 0; i < 5; i++) {
            const wx = treadX + 20 + i * ((treadW - 40) / 4), wY = treadY + treadH * 0.55;
            ctx.fillStyle = '#2A2200'; ctx.beginPath(); ctx.arc(wx, wY, 13, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#AA8800'; ctx.beginPath(); ctx.arc(wx, wY, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFEE88'; ctx.beginPath(); ctx.arc(wx, wY, 3, 0, Math.PI * 2); ctx.fill();
        }

        // ── ドーム（金属×白金グロー）──
        const dRX = tw * 0.52, dRY = th * 0.50;
        const dCX = cx, dCY = treadY - dRY * 0.92;
        // 白金オーラ（多重リング）
        for (let ring = 3; ring >= 1; ring--) {
            const rA = (0.06 + Math.sin(t * 0.004 + ring) * 0.04) / ring;
            ctx.strokeStyle = ring === 1 ? `rgba(255,240,100,${rA * 2.5})` : `rgba(200,200,255,${rA})`;
            ctx.lineWidth = ring === 1 ? 8 : 4;
            ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX + 8 * ring, dRY + 8 * ring, 0, 0, Math.PI * 2); ctx.stroke();
        }
        // ドーム本体
        const domeG = ctx.createRadialGradient(dCX - dRX * 0.22, dCY - dRY * 0.25, dRX * 0.05, dCX, dCY, dRX * 1.1);
        domeG.addColorStop(0, '#4A3A00'); domeG.addColorStop(0.35, '#2A2200'); domeG.addColorStop(0.7, '#1A1400'); domeG.addColorStop(1, '#0A0800');
        ctx.beginPath(); ctx.ellipse(dCX + 5, dCY + 5, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = domeG; ctx.fill();
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.stroke();
        // 金属ライン
        ctx.strokeStyle = 'rgba(255,220,80,0.25)'; ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX * (0.3 + i * 0.22), dRY * (0.3 + i * 0.22), 0, 0, Math.PI * 2); ctx.stroke();
        }

        if (!showInterior) {
            // ── プラズマ翼（エネルギーウィング）──
            const wFlap = Math.sin(t * 0.007) * 10;
            [[-1], [1]].forEach(([s]) => {
                // 外翼グロー
                const wingAlpha = 0.30 + Math.sin(t * 0.005 + s) * 0.12;
                const wingG = ctx.createLinearGradient(dCX, dCY, dCX + s * (dRX + 70), dCY - dRY * 0.8);
                wingG.addColorStop(0, `rgba(255,200,0,${wingAlpha})`);
                wingG.addColorStop(0.5, `rgba(255,255,150,${wingAlpha * 0.6})`);
                wingG.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = wingG;
                ctx.beginPath();
                ctx.moveTo(dCX + s * (dRX - 2), dCY + dRY * 0.05);
                ctx.bezierCurveTo(dCX + s * (dRX + 28), dCY - dRY * 0.35 + wFlap, dCX + s * (dRX + 52), dCY - dRY * 0.55 + wFlap, dCX + s * (dRX + 68), dCY - dRY * 0.80 + wFlap);
                ctx.bezierCurveTo(dCX + s * (dRX + 40), dCY - dRY * 0.42, dCX + s * (dRX + 16), dCY - dRY * 0.20, dCX + s * (dRX - 2), dCY - dRY * 0.10);
                ctx.closePath(); ctx.fill();
                // エネルギーライン
                ctx.strokeStyle = `rgba(255,230,80,${0.55 + Math.sin(t * 0.006 + s) * 0.25})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(dCX + s * (dRX), dCY);
                ctx.quadraticCurveTo(dCX + s * (dRX + 38), dCY - dRY * 0.45 + wFlap, dCX + s * (dRX + 68), dCY - dRY * 0.80 + wFlap);
                ctx.stroke();
            });

            // ── 頭頂の王冠（伝説の証）──
            const crownY = dCY - dRY * 1.05;
            const crownGlow = 0.6 + Math.sin(t * 0.006) * 0.3;
            ctx.fillStyle = `rgba(255,200,0,${crownGlow * 0.3})`;
            ctx.beginPath(); ctx.arc(dCX, crownY - 10, 28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(dCX - 22, crownY);
            ctx.lineTo(dCX - 22, crownY - 14);
            ctx.lineTo(dCX - 12, crownY - 7);
            ctx.lineTo(dCX, crownY - 22);
            ctx.lineTo(dCX + 12, crownY - 7);
            ctx.lineTo(dCX + 22, crownY - 14);
            ctx.lineTo(dCX + 22, crownY);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();
            // 宝石3つ
            for (const [bx, bc] of [[dCX - 12, '#00FFFF'], [dCX, '#FF4444'], [dCX + 12, '#00FFFF']]) {
                ctx.fillStyle = `rgba(255,255,255,${crownGlow * 0.5})`;
                ctx.beginPath(); ctx.arc(bx, crownY - 7, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = bc;
                ctx.beginPath(); ctx.arc(bx, crownY - 7, 3.5, 0, Math.PI * 2); ctx.fill();
            }

            // ── 目（白く輝く）──
            const eyeY = dCY - dRY * 0.22;
            const eyeGlow = 0.75 + Math.sin(t * 0.007) * 0.22;
            [[-1], [1]].forEach(([s]) => {
                const ex = dCX + s * dRX * 0.28;
                ctx.fillStyle = `rgba(255,240,100,${eyeGlow * 0.4})`;
                ctx.beginPath(); ctx.arc(ex, eyeY, 18, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#0A0800';
                ctx.beginPath(); ctx.arc(ex, eyeY, 11, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(255,230,80,${eyeGlow})`;
                ctx.beginPath(); ctx.arc(ex, eyeY, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath(); ctx.arc(ex, eyeY, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FFEE00';
                ctx.beginPath(); ctx.arc(ex - 1, eyeY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
            });

            // ── 巨大砲身（二連装・金属）──
            const cX = dCX + dir * dRX * 0.28, cY = dCY + dRY * 0.14, cR = dRX * 0.24;
            // 砲台リング
            ctx.fillStyle = '#2A2200'; ctx.beginPath(); ctx.arc(cX, cY, cR + 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.fillStyle = '#1A1400'; ctx.beginPath(); ctx.arc(cX, cY, cR + 6, 0, Math.PI * 2); ctx.fill();
            // 上下2本の砲身
            for (const oy of [-7, 7]) {
                const bLen = 58, bR = cR * 0.42;
                ctx.fillStyle = '#2A2200'; ctx.strokeStyle = '#AA8800'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(cX + dir * bLen * 0.5, cY + oy, Math.abs(dir * bLen) * 0.55, bR, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#0A0800'; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY + oy, bR + 4, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = '#050500'; ctx.beginPath(); ctx.arc(cX + dir * bLen, cY + oy, bR, 0, Math.PI * 2); ctx.fill();
                // チャージグロー
                ctx.fillStyle = `rgba(255,220,0,${0.4 + Math.sin(t * 0.01 + oy) * 0.25})`;
                ctx.beginPath(); ctx.arc(cX + dir * bLen, cY + oy, bR * 0.5, 0, Math.PI * 2); ctx.fill();
            }

            // ── プラズマパーティクル ──
            for (let i = 0; i < 7; i++) {
                const px = dCX + Math.sin(t * 0.003 + i * 0.9) * dRX * 0.72;
                const py = dCY - dRY * 0.25 + Math.cos(t * 0.003 + i * 0.9) * dRY * 0.50;
                const pa = 0.18 + Math.sin(t * 0.005 + i) * 0.14;
                ctx.fillStyle = i % 2 === 0 ? `rgba(255,200,0,${pa})` : `rgba(200,255,255,${pa})`;
                ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    },

    // 🐉 竜騎士スキン（Ch.2クリア報酬）DSスタイル強化版
    _drawDragonTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        // 🐉 竜騎士スキン 完全版 ― 溶岩鱗装甲・炎翼・竜角タワー・赤スリット目
        const dir = isEnemy ? -1 : 1;
        const cx  = tx + tw / 2;
        ctx.save();
        const fl = dmgFlash > 0 ? Math.min(1, dmgFlash / 10) : 0;
        const t  = Date.now() * 0.001;
        const tH = Math.round(th * 0.27);
        const bH = th - tH;

        // ── 地面溶岩オーラ ──
        const aG = ctx.createRadialGradient(cx, ty+th, 0, cx, ty+th, tw*0.8);
        aG.addColorStop(0, 'rgba(255,80,0,0.25)');
        aG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aG;
        ctx.beginPath(); ctx.ellipse(cx, ty+th, tw*0.75, tH*0.4, 0, 0, Math.PI*2); ctx.fill();

        // ── キャタピラ（溶岩鉄甲）──
        const tg = ctx.createLinearGradient(tx, ty+bH, tx, ty+th);
        tg.addColorStop(0, fl?'#FF4400':'#3A0800');
        tg.addColorStop(1, fl?'#991100':'#100200');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(tx-14,ty+bH+2); ctx.lineTo(tx+tw+14,ty+bH+2);
        ctx.lineTo(tx+tw+18,ty+th); ctx.lineTo(tx-18,ty+th);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#0A0000'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.strokeStyle='rgba(255,100,0,0.4)'; ctx.lineWidth=1.5; ctx.setLineDash([5,7]);
        ctx.beginPath(); ctx.moveTo(tx-10,ty+bH+tH*0.5); ctx.lineTo(tx+tw+10,ty+bH+tH*0.5); ctx.stroke();
        ctx.setLineDash([]);
        for (let i=0;i<4;i++) {
            const wx=tx+16+(tw-32)/3*i, wy=ty+bH+tH*0.55;
            ctx.fillStyle='#2A0400'; ctx.beginPath(); ctx.arc(wx,wy,13,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#CC4400'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(wx,wy,13,0,Math.PI*2); ctx.stroke();
            ctx.strokeStyle='#FF6600'; ctx.lineWidth=2;
            for (let s=0;s<5;s++){const a=s*Math.PI*2/5+t*0.4;ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+Math.cos(a)*10,wy+Math.sin(a)*10);ctx.stroke();}
            ctx.fillStyle='#FF4400'; ctx.beginPath(); ctx.arc(wx,wy,5,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#FFAA00'; ctx.beginPath(); ctx.arc(wx,wy,2.5,0,Math.PI*2); ctx.fill();
        }

        // ── 本体（深紅×黒・溶岩鱗）──
        const bg = ctx.createLinearGradient(tx,ty,tx,ty+bH);
        bg.addColorStop(0, fl?'#FF6633':'#4A0A00');
        bg.addColorStop(0.4, fl?'#FF3300':'#7A1200');
        bg.addColorStop(1, fl?'#AA1100':'#2A0400');
        ctx.fillStyle=bg; Renderer._roundRect(ctx,tx,ty,tw,bH,10); ctx.fill();
        ctx.strokeStyle='#050000'; ctx.lineWidth=4; Renderer._roundRect(ctx,tx,ty,tw,bH,10); ctx.stroke();
        ctx.shadowBlur=10; ctx.shadowColor='rgba(255,80,0,0.6)';
        ctx.strokeStyle='rgba(255,100,0,0.45)'; ctx.lineWidth=2;
        Renderer._roundRect(ctx,tx+4,ty+4,tw-8,bH-8,7); ctx.stroke(); ctx.shadowBlur=0;
        // 竜鱗（菱形タイル）
        ctx.strokeStyle='rgba(255,60,0,0.25)'; ctx.lineWidth=1;
        for (let r=0;r<5;r++) for (let c=0;c<7;c++) {
            const sx=tx+10+c*(tw-20)/6+(r%2)*((tw-20)/12), sy=ty+8+r*(bH-16)/4;
            ctx.beginPath(); ctx.moveTo(sx,sy-5); ctx.lineTo(sx+8,sy); ctx.lineTo(sx,sy+5); ctx.lineTo(sx-8,sy); ctx.closePath(); ctx.stroke();
        }

        // ── 炎翼（両肩）──
        const wBaseY=ty+bH*0.10, wHt=bH*0.58;
        [[-1,tx],[1,tx+tw]].forEach(([sd,bx]) => {
            const wg=ctx.createLinearGradient(bx,wBaseY,bx+sd*65,wBaseY+wHt);
            wg.addColorStop(0,fl?'rgba(255,100,30,0.9)':'rgba(120,20,0,0.85)');
            wg.addColorStop(0.5,fl?'rgba(200,50,0,0.6)':'rgba(70,8,0,0.5)');
            wg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=wg;
            ctx.beginPath();
            ctx.moveTo(bx,wBaseY+10);
            ctx.lineTo(bx+sd*20,wBaseY-12);
            ctx.lineTo(bx+sd*52,wBaseY+wHt*0.2);
            ctx.bezierCurveTo(bx+sd*65,wBaseY+wHt*0.4,bx+sd*62,wBaseY+wHt*0.72,bx+sd*42,wBaseY+wHt);
            ctx.lineTo(bx+sd*8,wBaseY+wHt*0.85);
            ctx.lineTo(bx,wBaseY+wHt*0.5);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle='rgba(255,90,0,0.45)'; ctx.lineWidth=1.5; ctx.stroke();
            // 翼骨
            ctx.strokeStyle='rgba(255,150,0,0.55)'; ctx.lineWidth=1.5;
            [[0.15,0.28],[0.35,0.48],[0.55,0.65]].forEach(([fy,ty2])=>{
                ctx.beginPath(); ctx.moveTo(bx,wBaseY+wHt*fy); ctx.lineTo(bx+sd*55,wBaseY+wHt*ty2); ctx.stroke();
            });
            // 竜爪
            ctx.fillStyle='#CC3300';
            for (let c=0;c<3;c++){const cx2=bx+sd*(44+c*5),cy2=wBaseY+wHt*(0.2+c*0.28);
                ctx.beginPath();ctx.moveTo(cx2,cy2-4);ctx.lineTo(cx2+sd*13,cy2);ctx.lineTo(cx2,cy2+3);ctx.closePath();ctx.fill();}
        });

        if (!showInterior) {
            // ── 竜頭タワー（左右）──
            const drawDragonTower = tcx => {
                const tR=22,tTH=bH*0.54,tTopY=ty+bH-tTH;
                const tg2=ctx.createLinearGradient(tcx-tR,0,tcx+tR,0);
                tg2.addColorStop(0,'#3A0600');tg2.addColorStop(0.45,'#6A1200');tg2.addColorStop(1,'#2A0400');
                ctx.fillStyle=tg2; ctx.beginPath(); ctx.rect(tcx-tR,tTopY,tR*2,tTH); ctx.fill();
                ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1;
                for(let r=1;r<=6;r++){const ly=tTopY+r*(tTH/7);ctx.beginPath();ctx.moveTo(tcx-tR+2,ly);ctx.lineTo(tcx+tR-2,ly);ctx.stroke();}
                ctx.strokeStyle='#1A0000'; ctx.lineWidth=2; ctx.strokeRect(tcx-tR,tTopY,tR*2,tTH);
                // 炎窓
                ctx.fillStyle='rgba(255,80,0,0.55)';
                ctx.beginPath();ctx.moveTo(tcx-6,tTopY+tTH*0.52);ctx.lineTo(tcx-6,tTopY+tTH*0.36);
                ctx.quadraticCurveTo(tcx,tTopY+tTH*0.2,tcx+6,tTopY+tTH*0.36);ctx.lineTo(tcx+6,tTopY+tTH*0.52);ctx.closePath();ctx.fill();
                // 銃眼
                for(let i=0;i<3;i++){ctx.fillStyle='#2A0000';ctx.beginPath();ctx.rect(tcx-14+i*11,tTopY-11,7,12);ctx.fill();ctx.strokeStyle='#CC3300';ctx.lineWidth=0.8;ctx.stroke();}
                // 竜角屋根
                ctx.fillStyle='#880000';
                ctx.beginPath();ctx.moveTo(tcx-tR-3,tTopY-11);ctx.lineTo(tcx,tTopY-46);ctx.lineTo(tcx+tR+3,tTopY-11);ctx.closePath();ctx.fill();
                ctx.strokeStyle='#CC2200';ctx.lineWidth=1.5;ctx.stroke();
                // 2本の角
                ctx.strokeStyle='#FF4400';ctx.lineWidth=3;ctx.lineCap='round';
                ctx.beginPath();ctx.moveTo(tcx-9,tTopY-43);ctx.lineTo(tcx-18,tTopY-64);ctx.stroke();
                ctx.beginPath();ctx.moveTo(tcx+9,tTopY-43);ctx.lineTo(tcx+18,tTopY-64);ctx.stroke();
                const fa=0.35+Math.sin(t*3.2)*0.3;
                ctx.fillStyle=`rgba(255,150,0,${fa})`;
                ctx.beginPath();ctx.arc(tcx-18,tTopY-64,5,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(tcx+18,tTopY-64,5,0,Math.PI*2);ctx.fill();
                // 旗
                ctx.strokeStyle='#CC3300';ctx.lineWidth=2;
                ctx.beginPath();ctx.moveTo(tcx,tTopY-45);ctx.lineTo(tcx,tTopY-62);ctx.stroke();
                ctx.fillStyle='#FF4400';
                ctx.beginPath();ctx.moveTo(tcx,tTopY-62);ctx.lineTo(tcx+15,tTopY-55);ctx.lineTo(tcx,tTopY-48);ctx.closePath();ctx.fill();
            };
            drawDragonTower(cx-(tw/2)*0.85); drawDragonTower(cx+(tw/2)*0.85);

            // ── 溶岩二連砲口（中央）──
            const canX=cx+dir*(tw*0.28), canY=ty+bH*0.48, canR=tw*0.105;
            ctx.fillStyle='#1A0000'; ctx.beginPath();ctx.arc(canX,canY,canR+12,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#CC3300';ctx.lineWidth=2;ctx.stroke();
            ctx.fillStyle='#3A0600';ctx.beginPath();ctx.arc(canX,canY,canR+7,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=12;ctx.shadowColor='rgba(255,80,0,0.8)';
            ctx.fillStyle='#FF3300';ctx.beginPath();ctx.arc(canX,canY,canR,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            const bLen=52,bR=canR*0.55;
            const bbg=ctx.createLinearGradient(canX,canY-bR,canX,canY+bR);
            bbg.addColorStop(0,'#993300');bbg.addColorStop(0.4,'#CC4400');bbg.addColorStop(1,'#551100');
            ctx.fillStyle=bbg;
            ctx.beginPath();ctx.ellipse(canX+dir*bLen*0.5,canY,Math.abs(bLen)*0.52,bR,0,0,Math.PI*2);ctx.fill();
            const fe=0.3+Math.sin(t*4)*0.2;
            ctx.fillStyle=`rgba(255,140,0,${fe})`;ctx.beginPath();ctx.arc(canX+dir*bLen,canY,bR+6,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=`rgba(255,230,0,${fe*0.8})`;ctx.beginPath();ctx.arc(canX+dir*bLen,canY,bR+2,0,Math.PI*2);ctx.fill();

            // ── 竜の縦スリット赤目 ──
            const eBaseX=cx+dir*tw*0.12, eY=ty+bH*0.30, eR=tw*0.085;
            for (let e=0;e<2;e++) {
                const ex=eBaseX+dir*(e-0.5)*eR*2.8;
                ctx.fillStyle='#FFCCAA';ctx.beginPath();ctx.ellipse(ex,eY,eR+1.5,eR+1.5,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#BB0000';ctx.beginPath();ctx.ellipse(ex,eY,eR,eR,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#200000';ctx.beginPath();ctx.ellipse(ex,eY,eR*0.25,eR*0.92,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(255,100,0,0.6)';ctx.beginPath();ctx.arc(ex-eR*0.3,eY-eR*0.3,eR*0.25,0,Math.PI*2);ctx.fill();
            }

            // ── 竜紋エンブレム ──
            const embX=cx-dir*tw*0.26, embY=ty+bH*0.63;
            ctx.fillStyle='#1A0000';ctx.strokeStyle='#FF4400';ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(embX,embY,17,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle='#CC2200';ctx.beginPath();ctx.arc(embX,embY,11,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#FF6600';ctx.beginPath();ctx.arc(embX,embY,6,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(255,220,0,0.9)';ctx.beginPath();ctx.arc(embX,embY,2.5,0,Math.PI*2);ctx.fill();

            // ── ドーム頂上の竜角 ──
            ctx.fillStyle='#CC2200';
            ctx.beginPath();ctx.moveTo(cx-7,ty+3);ctx.lineTo(cx,ty-22);ctx.lineTo(cx+7,ty+3);ctx.closePath();ctx.fill();
            ctx.strokeStyle='#FF4400';ctx.lineWidth=1.2;ctx.stroke();
        }
        if (isEnemy) this._drawStageEnemyOverlay(ctx,tx,ty,tw,th,null,0.5);
        ctx.restore();
    },

    _drawSeraphTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        // ✨ 天門騎士スキン ― ふわふわ天使・虹オーラ・ぱっちり瞳・ハートタワー
        const dir = isEnemy ? -1 : 1;
        const cx  = tx + tw / 2;
        ctx.save();
        const fl = dmgFlash > 0 ? Math.min(1, dmgFlash / 10) : 0;
        const t  = Date.now() * 0.001;
        const tH = Math.round(th * 0.27);
        const bH = th - tH;
        const hue = (t * 55) % 360;

        // ── 虹オーラ ──
        const aA=0.11+Math.sin(t*2)*0.05;
        const aG=ctx.createRadialGradient(cx,ty+th*0.4,0,cx,ty+th*0.4,tw*0.85);
        aG.addColorStop(0,`rgba(255,230,255,${aA*2})`);aG.addColorStop(0.55,`rgba(200,180,255,${aA})`);aG.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=aG;ctx.beginPath();ctx.ellipse(cx,ty+th*0.4,tw*0.85,th*0.55,0,0,Math.PI*2);ctx.fill();

        // ── キャタピラ（パステルパープル）──
        const tg=ctx.createLinearGradient(tx,ty+bH,tx,ty+th);
        tg.addColorStop(0,fl?'#FFE0F8':'#B8A0D8');tg.addColorStop(1,fl?'#EEB8E8':'#504060');
        ctx.fillStyle=tg;
        ctx.beginPath();ctx.moveTo(tx-8,ty+bH+2);ctx.lineTo(tx+tw+8,ty+bH+2);ctx.lineTo(tx+tw+12,ty+th);ctx.lineTo(tx-12,ty+th);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#7050A8';ctx.lineWidth=2;ctx.stroke();
        ctx.strokeStyle='rgba(255,220,255,0.5)';ctx.lineWidth=1.5;
        for(let i=1;i<8;i++){const wx=tx-8+(tw+16)/8*i;ctx.beginPath();ctx.moveTo(wx,ty+bH+2);ctx.lineTo(wx+1,ty+th);ctx.stroke();}
        // 天使車輪
        for(let i=0;i<4;i++){
            const wx=tx+14+(tw-28)/3*i,wy=ty+bH+tH*0.52;
            ctx.fillStyle='#5038A0';ctx.beginPath();ctx.arc(wx,wy,12,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#FFD0FF';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(wx,wy,12,0,Math.PI*2);ctx.stroke();
            ctx.strokeStyle=`hsl(${(hue+i*30)%360},70%,75%)`;ctx.lineWidth=1.5;
            for(let s=0;s<6;s++){const a=s*Math.PI/3+t*0.5;ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+Math.cos(a)*9,wy+Math.sin(a)*9);ctx.stroke();}
            ctx.fillStyle='#FFD0FF';ctx.beginPath();ctx.arc(wx,wy,5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(wx,wy,2.5,0,Math.PI*2);ctx.fill();
        }

        // ── 本体（純白×淡紫）──
        const bg=ctx.createLinearGradient(tx,ty,tx,ty+bH);
        bg.addColorStop(0,fl?'#FFF':'#FFF5FF');bg.addColorStop(0.3,fl?'#FFF0FF':'#F0DEFF');
        bg.addColorStop(0.7,fl?'#FFE0FF':'#D8C4F8');bg.addColorStop(1,fl?'#FFCCFF':'#B0A0E8');
        ctx.fillStyle=bg; Renderer._roundRect(ctx,tx,ty,tw,bH,12); ctx.fill();
        ctx.strokeStyle='#5838A0';ctx.lineWidth=3; Renderer._roundRect(ctx,tx,ty,tw,bH,12);ctx.stroke();
        ctx.strokeStyle=`hsla(${hue},75%,78%,0.75)`;ctx.lineWidth=2;
        Renderer._roundRect(ctx,tx+4,ty+4,tw-8,bH-8,8);ctx.stroke();
        // キラキラ水玉
        ctx.fillStyle='rgba(255,255,255,0.3)';
        [[0.18,0.14],[0.72,0.11],[0.44,0.33],[0.14,0.53],[0.78,0.5],[0.36,0.68]].forEach(([rx2,ry2])=>{
            ctx.beginPath();ctx.arc(tx+tw*rx2,ty+bH*ry2,3.5+Math.sin(t*2+rx2*10)*1.5,0,Math.PI*2);ctx.fill();
        });
        // ハート模様
        const hx=cx,hy=ty+bH*0.60;
        ctx.fillStyle='rgba(255,180,220,0.45)';ctx.strokeStyle='rgba(255,120,180,0.65)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(hx,hy+5);ctx.bezierCurveTo(hx-13,hy-9,hx-21,hy-4,hx,hy+9);
        ctx.bezierCurveTo(hx+21,hy-4,hx+13,hy-9,hx,hy+5);ctx.closePath();ctx.fill();ctx.stroke();

        if (!showInterior) {
            // ── ハートタワー（左右）──
            const drawSeraphTower = tcx => {
                const tR=20,tTH=bH*0.54,tTopY=ty+bH-tTH;
                const tg2=ctx.createLinearGradient(tcx-tR,0,tcx+tR,0);
                tg2.addColorStop(0,'#C8A8E8');tg2.addColorStop(0.5,'#F0E0FF');tg2.addColorStop(1,'#C0A0E0');
                ctx.fillStyle=tg2;ctx.beginPath();ctx.rect(tcx-tR,tTopY,tR*2,tTH);ctx.fill();
                ctx.strokeStyle='rgba(160,120,200,0.35)';ctx.lineWidth=1;
                for(let r=1;r<=6;r++){const ly=tTopY+r*(tTH/7);ctx.beginPath();ctx.moveTo(tcx-tR+2,ly);ctx.lineTo(tcx+tR-2,ly);ctx.stroke();}
                ctx.strokeStyle='#7858C8';ctx.lineWidth=1.8;ctx.strokeRect(tcx-tR,tTopY,tR*2,tTH);
                // ハート窓
                ctx.fillStyle='rgba(255,180,255,0.7)';
                const winY=tTopY+tTH*0.4;
                ctx.beginPath();ctx.moveTo(tcx,winY+8);ctx.bezierCurveTo(tcx-9,winY-5,tcx-13,winY+1,tcx,winY+7);
                ctx.bezierCurveTo(tcx+13,winY+1,tcx+9,winY-5,tcx,winY+8);ctx.closePath();ctx.fill();
                // 銃眼（丸型）
                for(let i=0;i<3;i++){ctx.fillStyle='#E0C0FF';ctx.beginPath();ctx.arc(tcx-10+i*10,tTopY-7,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7858C8';ctx.lineWidth=0.8;ctx.stroke();}
                // 尖塔（パステルパープル）
                ctx.fillStyle='#8860D0';ctx.beginPath();ctx.moveTo(tcx-tR-2,tTopY-8);ctx.lineTo(tcx,tTopY-48);ctx.lineTo(tcx+tR+2,tTopY-8);ctx.closePath();ctx.fill();
                ctx.strokeStyle='#C0A0FF';ctx.lineWidth=1.5;ctx.stroke();
                // 星
                const sa=0.55+Math.sin(t*3+tcx)*0.4;
                ctx.fillStyle=`rgba(255,255,200,${sa})`;ctx.beginPath();ctx.arc(tcx,tTopY-52,5,0,Math.PI*2);ctx.fill();
                // 旗
                ctx.strokeStyle='#C080E0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(tcx,tTopY-50);ctx.lineTo(tcx,tTopY-64);ctx.stroke();
                ctx.fillStyle='#FF88CC';ctx.beginPath();ctx.moveTo(tcx,tTopY-64);ctx.lineTo(tcx+14,tTopY-58);ctx.lineTo(tcx,tTopY-52);ctx.closePath();ctx.fill();
            };
            drawSeraphTower(cx-(tw/2)*0.84); drawSeraphTower(cx+(tw/2)*0.84);

            // ── 天使砲口 ──
            const canX=cx+dir*(tw*0.28),canY=ty+bH*0.48,canR=tw*0.11;
            ctx.fillStyle='#5838A0';ctx.beginPath();ctx.arc(canX,canY,canR+10,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#FFD0FF';ctx.lineWidth=2;ctx.stroke();
            ctx.shadowBlur=10;ctx.shadowColor='rgba(220,180,255,0.85)';
            ctx.fillStyle='#E0A0FF';ctx.beginPath();ctx.arc(canX,canY,canR,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            const bLen=48,bR=canR*0.52;
            ctx.fillStyle=`hsl(${hue},55%,62%)`;
            ctx.beginPath();ctx.ellipse(canX+dir*bLen*0.5,canY,Math.abs(bLen)*0.52,bR,0,0,Math.PI*2);ctx.fill();
            const fe2=0.28+Math.sin(t*4)*0.2;
            ctx.fillStyle=`rgba(255,200,255,${fe2})`;ctx.beginPath();ctx.arc(canX+dir*bLen,canY,bR+5,0,Math.PI*2);ctx.fill();

            // ── ぱっちり大きな目（まつ毛付き）──
            const eBaseX=cx+dir*tw*0.12,eY=ty+bH*0.30,eR=tw*0.092;
            for(let e=0;e<2;e++){
                const ex=eBaseX+dir*(e-0.5)*eR*2.8;
                ctx.fillStyle='rgba(0,0,0,0.12)';ctx.beginPath();ctx.ellipse(ex+1.5,eY+1.5,eR+2,eR+2,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#FFEEFF';ctx.beginPath();ctx.ellipse(ex,eY,eR+1.5,eR+1.5,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#7850C0';ctx.beginPath();ctx.ellipse(ex,eY,eR,eR,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.75)';ctx.beginPath();ctx.arc(ex-eR*0.3,eY-eR*0.35,eR*0.38,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.5)';ctx.beginPath();ctx.arc(ex+eR*0.25,eY+eR*0.2,eR*0.18,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#4830A0';ctx.lineWidth=2;ctx.lineCap='round';
                for(let l=0;l<4;l++){const lx=ex-eR*0.6+l*eR*0.4;ctx.beginPath();ctx.moveTo(lx,eY-eR*0.85);ctx.lineTo(lx+l*0.5-1,eY-eR*1.32);ctx.stroke();}
            }

            // ── 天使の輪 ──
            const hA=0.55+Math.sin(t*2)*0.22;
            ctx.strokeStyle=`rgba(255,235,0,${hA})`;ctx.lineWidth=4;
            ctx.shadowBlur=8;ctx.shadowColor='rgba(255,220,0,0.75)';
            ctx.beginPath();ctx.ellipse(cx,ty+6,tw*0.26,th*0.04,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;

            // ── 天使の翼（大・ふわふわ）──
            [[-1,tx],[1,tx+tw]].forEach(([sd,bx])=>{
                const wy2=ty+bH*0.08,wH2=bH*0.65;
                const wg2=ctx.createLinearGradient(bx,wy2,bx+sd*72,wy2+wH2);
                wg2.addColorStop(0,'rgba(255,242,255,0.88)');wg2.addColorStop(0.5,'rgba(230,205,255,0.5)');wg2.addColorStop(1,'rgba(200,165,255,0)');
                ctx.fillStyle=wg2;
                ctx.beginPath();ctx.moveTo(bx,wy2+12);
                ctx.quadraticCurveTo(bx+sd*42,wy2-12,bx+sd*70,wy2+wH2*0.22);
                ctx.quadraticCurveTo(bx+sd*74,wy2+wH2*0.52,bx+sd*56,wy2+wH2);
                ctx.quadraticCurveTo(bx+sd*30,wy2+wH2*0.82,bx,wy2+wH2*0.5);
                ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(200,165,255,0.55)';ctx.lineWidth=1.5;
                for(let r=0;r<6;r++){const ry3=wy2+wH2*r*0.14;ctx.beginPath();ctx.moveTo(bx,ry3+15);ctx.quadraticCurveTo(bx+sd*42,ry3,bx+sd*62,ry3+12);ctx.stroke();}
                for(let r=0;r<4;r++){const sa2=0.35+Math.sin(t*3+r)*0.4;ctx.fillStyle=`rgba(255,255,200,${sa2})`;ctx.beginPath();ctx.arc(bx+sd*62,wy2+wH2*(0.12+r*0.26),3,0,Math.PI*2);ctx.fill();}
            });

            // ── 星エンブレム ──
            const embX=cx-dir*tw*0.26,embY2=ty+bH*0.62;
            ctx.fillStyle='#4828A0';ctx.strokeStyle='#FFD0FF';ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(embX,embY2,16,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle=`hsl(${(hue+120)%360},70%,78%)`;
            ctx.beginPath();
            for(let s=0;s<10;s++){const a=s*Math.PI/5-Math.PI/2;const r2=s%2===0?12:5;
                if(s===0)ctx.moveTo(embX+Math.cos(a)*r2,embY2+Math.sin(a)*r2);else ctx.lineTo(embX+Math.cos(a)*r2,embY2+Math.sin(a)*r2);}
            ctx.closePath();ctx.fill();
            ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(embX,embY2,3,0,Math.PI*2);ctx.fill();
        }
        if (isEnemy) this._drawStageEnemyOverlay(ctx,tx,ty,tw,th,null,0.5);
        ctx.restore();
    },

    _drawAbyssTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, isEnemy = false) {
        // 🌑 深淵の主スキン = エリスグール完全再現
        // 特徴: 深紺鋼鉄装甲 / 両肩六角盾 / 中央大歯車砲口(三日月コア)
        //        赤目×緑目のスライム垂れ目 / 黄三日月ホイール / 青尖塔タワー / バトメント冠
        const dir = isEnemy ? -1 : 1;
        const cx  = tx + tw / 2;
        ctx.save();
        const fl = dmgFlash > 0 ? Math.min(1, dmgFlash / 10) : 0;
        const t  = Date.now() * 0.001;
        const tH = Math.round(th * 0.27);
        const bH = th - tH;

        // ── 暗い海底オーラ ──
        const aG=ctx.createRadialGradient(cx,ty+th*0.5,0,cx,ty+th*0.5,tw*0.9);
        aG.addColorStop(0,'rgba(0,30,90,0.20)');aG.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=aG;ctx.beginPath();ctx.ellipse(cx,ty+th*0.5,tw*0.9,th*0.55,0,0,Math.PI*2);ctx.fill();

        // ── キャタピラ（深紺鋼）──
        const tg=ctx.createLinearGradient(tx,ty+bH,tx,ty+th);
        tg.addColorStop(0,fl?'#2255AA':'#0A1830');
        tg.addColorStop(0.5,fl?'#1840AA':'#060E1E');
        tg.addColorStop(1,fl?'#102060':'#030810');
        ctx.fillStyle=tg;
        ctx.beginPath();ctx.moveTo(tx-14,ty+bH+2);ctx.lineTo(tx+tw+14,ty+bH+2);ctx.lineTo(tx+tw+18,ty+th);ctx.lineTo(tx-18,ty+th);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#010810';ctx.lineWidth=2.5;ctx.stroke();
        ctx.strokeStyle='rgba(50,120,220,0.38)';ctx.lineWidth=1.5;
        for(let i=1;i<8;i++){const wx=tx-10+(tw+20)/8*i;ctx.beginPath();ctx.moveTo(wx,ty+bH+2);ctx.lineTo(wx+2,ty+th);ctx.stroke();}

        // ── 三日月ホイール（4個）──  エリスグール特徴：黄色三日月
        for(let i=0;i<4;i++){
            const wx=tx+14+(tw-28)/3*i, wy=ty+bH+tH*0.52;
            // 外枠
            ctx.fillStyle='#040E28'; ctx.beginPath();ctx.arc(wx,wy,13,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#1A4080';ctx.lineWidth=3;ctx.beginPath();ctx.arc(wx,wy,13,0,Math.PI*2);ctx.stroke();
            // 六角スポーク
            ctx.strokeStyle='rgba(60,140,255,0.65)';ctx.lineWidth=1.5;
            for(let s=0;s<6;s++){const a=s*Math.PI/3;ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+Math.cos(a)*10,wy+Math.sin(a)*10);ctx.stroke();}
            // 黄色三日月
            ctx.fillStyle='#DDAA00';ctx.beginPath();ctx.arc(wx,wy,5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#040E28';ctx.beginPath();ctx.arc(wx+3,wy,4,0,Math.PI*2);ctx.fill();
        }

        // ── 本体（深紺装甲）──
        const bg=ctx.createLinearGradient(tx,ty,tx,ty+bH);
        bg.addColorStop(0,fl?'#4477CC':'#0C1C42');
        bg.addColorStop(0.35,fl?'#3366BB':'#0A1840');
        bg.addColorStop(0.7,fl?'#2255AA':'#07122A');
        bg.addColorStop(1,fl?'#1844AA':'#040C1E');
        ctx.fillStyle=bg; Renderer._roundRect(ctx,tx,ty,tw,bH,10);ctx.fill();
        ctx.strokeStyle='#010810';ctx.lineWidth=4;Renderer._roundRect(ctx,tx,ty,tw,bH,10);ctx.stroke();
        ctx.shadowBlur=10;ctx.shadowColor='rgba(30,120,255,0.6)';
        ctx.strokeStyle='rgba(40,100,220,0.55)';ctx.lineWidth=2;
        Renderer._roundRect(ctx,tx+4,ty+4,tw-8,bH-8,7);ctx.stroke();ctx.shadowBlur=0;

        // 六角ハニカムパターン
        ctx.strokeStyle='rgba(50,100,200,0.22)';ctx.lineWidth=1;
        const hS=14;
        for(let row=0;row<5;row++) for(let col=0;col<6;col++){
            const hx2=tx+16+col*hS*1.75+(row%2)*hS*0.87, hy2=ty+10+row*hS*1.5;
            ctx.beginPath();
            for(let s=0;s<6;s++){const a=s*Math.PI/3-Math.PI/6;
                if(s===0)ctx.moveTo(hx2+Math.cos(a)*hS*0.6,hy2+Math.sin(a)*hS*0.6);
                else ctx.lineTo(hx2+Math.cos(a)*hS*0.6,hy2+Math.sin(a)*hS*0.6);}
            ctx.closePath();ctx.stroke();
        }

        // ── 両肩六角盾（エリスグール最大の特徴）──
        const shY=ty+bH*0.10, shH=bH*0.58;
        [[-1,tx],[1,tx+tw]].forEach(([sd,bx])=>{
            const sCx=bx+sd*22, sCy=shY+shH*0.42, sR=24;
            const sg=ctx.createLinearGradient(sCx,sCy-sR,sCx,sCy+sR);
            sg.addColorStop(0,fl?'#3366CC':'#14244A');sg.addColorStop(1,fl?'#1A4080':'#080E22');
            ctx.fillStyle=sg;
            ctx.beginPath();
            for(let s=0;s<6;s++){const a=s*Math.PI/3;if(s===0)ctx.moveTo(sCx+Math.cos(a)*sR,sCy+Math.sin(a)*sR);else ctx.lineTo(sCx+Math.cos(a)*sR,sCy+Math.sin(a)*sR);}
            ctx.closePath();ctx.fill();
            // 盾の縁（明るい青）
            ctx.strokeStyle='#3080FF';ctx.lineWidth=2.5;ctx.stroke();
            // 内側ひし形
            ctx.strokeStyle='rgba(100,180,255,0.55)';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.moveTo(sCx,sCy-sR*0.58);ctx.lineTo(sCx+sR*0.52,sCy);ctx.lineTo(sCx,sCy+sR*0.58);ctx.lineTo(sCx-sR*0.52,sCy);ctx.closePath();ctx.stroke();
            // 三日月マーク（黄）
            ctx.fillStyle='#DDAA00';ctx.beginPath();ctx.arc(sCx,sCy,sR*0.30,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#14244A';ctx.beginPath();ctx.arc(sCx+sR*0.13,sCy,sR*0.23,0,Math.PI*2);ctx.fill();
        });

        if (!showInterior) {
            // ── 青い尖塔タワー（左右）── エリスグール特徴的な青塔
            const drawAbyssTower = tcx => {
                const tR=20,tTH=bH*0.56,tTopY=ty+bH-tTH;
                const tg2=ctx.createLinearGradient(tcx-tR,0,tcx+tR,0);
                tg2.addColorStop(0,'#050E22');tg2.addColorStop(0.5,'#0C1E42');tg2.addColorStop(1,'#040A1A');
                ctx.fillStyle=tg2;ctx.beginPath();ctx.rect(tcx-tR,tTopY,tR*2,tTH);ctx.fill();
                ctx.strokeStyle='rgba(50,100,200,0.22)';ctx.lineWidth=1;
                for(let r=1;r<=6;r++){const ly=tTopY+r*(tTH/7);ctx.beginPath();ctx.moveTo(tcx-tR+2,ly);ctx.lineTo(tcx+tR-2,ly);ctx.stroke();}
                ctx.strokeStyle='#1A4080';ctx.lineWidth=2;ctx.strokeRect(tcx-tR,tTopY,tR*2,tTH);
                // 菱形窓（青発光）
                ctx.fillStyle='rgba(30,100,255,0.38)';
                const winY=tTopY+tTH*0.40;
                ctx.beginPath();ctx.moveTo(tcx,winY-10);ctx.lineTo(tcx+8,winY);ctx.lineTo(tcx,winY+10);ctx.lineTo(tcx-8,winY);ctx.closePath();ctx.fill();
                ctx.strokeStyle='rgba(80,160,255,0.8)';ctx.lineWidth=1;ctx.stroke();
                // 銃眼
                for(let i=0;i<3;i++){ctx.fillStyle='#0A1A32';ctx.beginPath();ctx.rect(tcx-14+i*11,tTopY-11,7,12);ctx.fill();ctx.strokeStyle='#2060C0';ctx.lineWidth=0.8;ctx.stroke();}
                // 青い尖塔本体（エリスグールの特徴的な青い尖り）
                ctx.fillStyle='#1A3A80';
                ctx.beginPath();ctx.moveTo(tcx-tR-3,tTopY-11);ctx.lineTo(tcx,tTopY-46);ctx.lineTo(tcx+tR+3,tTopY-11);ctx.closePath();ctx.fill();
                ctx.strokeStyle='#4080FF';ctx.lineWidth=2;ctx.stroke();
                ctx.shadowBlur=8;ctx.shadowColor='rgba(40,120,255,0.65)';
                ctx.fillStyle='rgba(60,140,255,0.85)';ctx.beginPath();ctx.arc(tcx,tTopY-50,4.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
                // 旗（濃紺×青）
                ctx.strokeStyle='#1A4080';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(tcx,tTopY-50);ctx.lineTo(tcx,tTopY-64);ctx.stroke();
                ctx.fillStyle='#1A3A80';ctx.beginPath();ctx.moveTo(tcx,tTopY-64);ctx.lineTo(tcx+14,tTopY-58);ctx.lineTo(tcx,tTopY-52);ctx.closePath();ctx.fill();
                ctx.strokeStyle='#4080FF';ctx.lineWidth=1;ctx.stroke();
            };
            drawAbyssTower(cx-(tw/2)*0.84); drawAbyssTower(cx+(tw/2)*0.84);

            // ── 大歯車砲口（エリスグール中央エンブレム）──
            const canX=cx+dir*(tw*0.26), canY=ty+bH*0.50, gR=tw*0.142;
            // 歯車外リング
            ctx.fillStyle='#081428';ctx.beginPath();ctx.arc(canX,canY,gR+16,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#2060B0';ctx.lineWidth=2;ctx.stroke();
            // 歯（12本・回転）
            for(let tooth=0;tooth<12;tooth++){
                const a=tooth*Math.PI/6+t*0.7;
                const bx2=canX+Math.cos(a)*(gR+7);const by2=canY+Math.sin(a)*(gR+7);
                ctx.fillStyle='#1A3E78';
                ctx.beginPath();
                ctx.moveTo(bx2+Math.cos(a+0.3)*4.5,by2+Math.sin(a+0.3)*4.5);
                ctx.lineTo(bx2+Math.cos(a)*9,by2+Math.sin(a)*9);
                ctx.lineTo(bx2+Math.cos(a-0.3)*4.5,by2+Math.sin(a-0.3)*4.5);
                ctx.closePath();ctx.fill();
                ctx.strokeStyle='#3080CC';ctx.lineWidth=0.8;ctx.stroke();
            }
            // 歯車本体
            ctx.fillStyle='#0C1C3A';ctx.beginPath();ctx.arc(canX,canY,gR+5,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#3070BB';ctx.lineWidth=2.5;ctx.stroke();
            // スポーク（8本・逆回転）
            ctx.strokeStyle='rgba(60,140,220,0.65)';ctx.lineWidth=2;
            for(let sp=0;sp<8;sp++){const a2=sp*Math.PI/4-t*0.4;
                ctx.beginPath();ctx.moveTo(canX,canY);ctx.lineTo(canX+Math.cos(a2)*gR,canY+Math.sin(a2)*gR);ctx.stroke();}
            // コアの三日月（エリスグールのシンボル）
            ctx.shadowBlur=10;ctx.shadowColor='rgba(60,160,255,0.9)';
            ctx.fillStyle='#DDAA00';ctx.beginPath();ctx.arc(canX,canY,gR*0.40,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#0C1C3A';ctx.beginPath();ctx.arc(canX+gR*0.17,canY,gR*0.32,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;
            // 砲身
            const bLen=50,bR=gR*0.46;
            const bbg=ctx.createLinearGradient(canX,canY-bR,canX,canY+bR);
            bbg.addColorStop(0,'#1A3A72');bbg.addColorStop(0.4,'#2A5AB2');bbg.addColorStop(1,'#0C1A42');
            ctx.fillStyle=bbg;
            ctx.beginPath();ctx.ellipse(canX+dir*bLen*0.5,canY,Math.abs(bLen)*0.52,bR,0,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#3080CC';ctx.lineWidth=1.5;ctx.stroke();

            // ── スライム垂れ目（エリスグール最大の特徴：赤目×緑目）──
            const eBaseX=cx+dir*tw*0.12, eY=ty+bH*0.28, eR=tw*0.088;
            for(let e=0;e<2;e++){
                const ex=eBaseX+dir*(e-0.5)*eR*2.85;
                const eyeColor=e===0?'#CC0000':'#006600';
                const eyeColorBright=e===0?'#FF2200':'#00BB00';
                // スライム目の外輪（ぷるぷる感）
                ctx.fillStyle='rgba(0,0,0,0.35)';
                ctx.beginPath();ctx.ellipse(ex+1.5,eY+1.5,eR+3,eR+3,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle=eyeColor;
                ctx.beginPath();ctx.ellipse(ex,eY,eR+2,eR+2,0,0,Math.PI*2);ctx.fill();
                // 暗い瞳孔
                ctx.fillStyle='rgba(0,0,0,0.65)';
                ctx.beginPath();ctx.ellipse(ex,eY,eR,eR,0,0,Math.PI*2);ctx.fill();
                // 光の点
                ctx.fillStyle='rgba(255,255,255,0.85)';
                ctx.beginPath();ctx.arc(ex-eR*0.3,eY-eR*0.3,eR*0.32,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.4)';
                ctx.beginPath();ctx.arc(ex+eR*0.2,eY+eR*0.15,eR*0.15,0,Math.PI*2);ctx.fill();
                // ★スライム垂れ（エリスグールの特徴的なドロドロ）
                ctx.fillStyle=eyeColor;
                ctx.beginPath();ctx.ellipse(ex,eY+eR*1.3,eR*0.38,eR*0.62,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='rgba(0,0,0,0.5)';
                ctx.beginPath();ctx.ellipse(ex,eY+eR*1.3,eR*0.32,eR*0.55,0,0,Math.PI*2);ctx.fill();
                ctx.fillStyle=eyeColorBright;
                ctx.beginPath();ctx.arc(ex-eR*0.08,eY+eR*1.0,eR*0.16,0,Math.PI*2);ctx.fill();
            }

            // ── 大きな三日月マーク（胸元）──
            const moonX=cx-dir*tw*0.27, moonY=ty+bH*0.64;
            ctx.shadowBlur=6;ctx.shadowColor='rgba(220,170,0,0.6)';
            ctx.fillStyle='#DDAA00';ctx.beginPath();ctx.arc(moonX,moonY,15,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#0C1C3A';ctx.beginPath();ctx.arc(moonX+6.5,moonY-1,12,0,Math.PI*2);ctx.fill();
            ctx.shadowBlur=0;

            // ── 城壁冠（エリスグールの頭頂・バトルメント）──
            const crY=ty+4;
            ctx.fillStyle='#1A3A80';
            ctx.beginPath();
            // バトルメント形状（ギザギザ城壁）
            const cW=tw*0.68, cX=cx-cW/2;
            ctx.moveTo(cX,crY);
            const slots=7;
            for(let i=0;i<slots;i++){
                const x1=cX+i*(cW/slots), x2=cX+(i+0.4)*(cW/slots), x3=cX+(i+0.6)*(cW/slots), x4=cX+(i+1)*(cW/slots);
                ctx.lineTo(x1,crY); ctx.lineTo(x1,crY-8);
                ctx.lineTo(x2,crY-8); ctx.lineTo(x2,crY-14);
                ctx.lineTo(x3,crY-14); ctx.lineTo(x3,crY-8);
                ctx.lineTo(x4,crY-8);
            }
            ctx.lineTo(cX+cW,crY); ctx.closePath(); ctx.fill();
            ctx.strokeStyle='#3060CC';ctx.lineWidth=1.5;ctx.stroke();
        }
        if (isEnemy) this._drawStageEnemyOverlay(ctx,tx,ty,tw,th,null,0.5);
        ctx.restore();
    },

    // HEAVY / DEFENSE：重装甲型 → カニスキン流用（どっしり重厚感）
    _drawEnemyHeavy(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle, tankType) {
        this._drawCrabTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, true);
        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.9);
    },

    // MAGICAL：魔法使い型 → 魔王スキン流用
    _drawEnemyMagical(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle) {
        this._drawMaouTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, true);
        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.9);
    },

    // BOSS：ボス型 → メカスキン流用（機械的な威圧感）
    _drawEnemyBoss(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle) {
        this._drawMechaTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, true);
        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.95);
    },

    // TRUE_BOSS：真ラスボス型 → ゴーストスキン流用（禍々しさ）
    _drawEnemyTrueBoss(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle) {
        this._drawGhostTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, true);
        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.95);
    },

    // ============================================================
    // Chapter2: メカ戦車テーマ（角ばった装甲板・リベット・電気グロー）
    // ============================================================
    _drawMechaThemeTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, tankType, battle) {
        const isPhaseTwo = battle && battle.bossPhase === 2;
        const frame = _getFrameNow();
        const cx = tx + tw / 2;
        const variant = this._getStageEnemyVariant(battle);
        const stageId = battle && battle.stageData && battle.stageData.id;
        const accent = isPhaseTwo ? '#C080FF' : variant.trim;
        const glowColor = isPhaseTwo ? 'rgba(180,80,255,0.7)' : variant.glow;
        const pulse = (Math.sin(frame * 0.06) + 1) / 2;

        // ─── スケール（タイプ別）───
        let scaleX = 1.0;
        if (tankType === 'TRUE_BOSS') scaleX = isPhaseTwo ? 1.4 : 1.25;
        else if (tankType === 'BOSS' || tankType === 'HEAVY' || tankType === 'DEFENSE') scaleX = 1.15;
        else if (tankType === 'SCOUT') scaleX = 0.9;

        ctx.save();
        if (dmgFlash > 0.5) {
            const st = frame * 0.05;
            ctx.translate(Math.sin(st * 7.3) * 3, Math.sin(st * 11.7) * 2);
        }
        ctx.translate(cx, ty + th);
        ctx.scale(scaleX, 1.0);
        ctx.translate(-cx, -(ty + th));

        // ─── 寸法 ───
        const treadH = 38;
        const treadW = tw * 0.88;
        const treadX = cx - treadW / 2;
        const treadY = ty + th - treadH;

        const bodyH = th - treadH - 6;
        const bodyW = tw * 0.80;
        const bodyX = cx - bodyW / 2;
        const bodyY = treadY - bodyH;

        const domeRX = bodyW * 0.50;
        const domeRY = bodyH * 0.60;
        const domeCX = cx;
        const domeCY = bodyY - 2;

        // ──────────────────────────────────────────────────
        // 1. 地面グロー（足元オーラ）
        // ──────────────────────────────────────────────────
        const groundGlowAlpha = 0.18 + pulse * 0.12;
        ctx.fillStyle = isPhaseTwo ? `rgba(160,60,255,${groundGlowAlpha})` : `rgba(${parseInt(variant.trim.slice(1,3),16)},${parseInt(variant.trim.slice(3,5),16)},${parseInt(variant.trim.slice(5,7),16)},${groundGlowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(cx, treadY + treadH - 4, treadW * 0.52, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // ──────────────────────────────────────────────────
        // 2. キャタピラ（角ばった装甲板・多段パネル）
        // ──────────────────────────────────────────────────
        // 外装甲
        const tG = ctx.createLinearGradient(treadX, treadY, treadX, treadY + treadH);
        tG.addColorStop(0, _lightenCached(variant.shadow, 18));
        tG.addColorStop(0.45, variant.base);
        tG.addColorStop(1, variant.shadow);
        ctx.fillStyle = tG;
        ctx.beginPath();
        ctx.moveTo(treadX + 8, treadY);
        ctx.lineTo(treadX + treadW - 8, treadY);
        ctx.lineTo(treadX + treadW + 4, treadY + treadH);
        ctx.lineTo(treadX - 4, treadY + treadH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isPhaseTwo ? '#9040CC' : variant.shadow;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // リベット線（装甲継ぎ目）
        ctx.strokeStyle = isPhaseTwo ? `rgba(180,100,255,0.5)` : `rgba(255,255,255,0.18)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(treadX + 6, treadY + treadH * 0.38);
        ctx.lineTo(treadX + treadW - 6, treadY + treadH * 0.38);
        ctx.stroke();
        ctx.setLineDash([]);

        // 装甲板セグメント縦区切り
        const segCount = 8;
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 1; i < segCount; i++) {
            const sx = treadX + (treadW / segCount) * i;
            ctx.beginPath();
            ctx.moveTo(sx, treadY + 2);
            ctx.lineTo(sx + 3, treadY + treadH - 2);
            ctx.stroke();
        }

        // 発光下辺
        ctx.shadowColor = isPhaseTwo ? '#C080FF' : accent;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = isPhaseTwo ? `rgba(180,80,255,${0.5 + pulse * 0.3})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.5 + pulse * 0.35})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(treadX, treadY + treadH - 1);
        ctx.lineTo(treadX + treadW, treadY + treadH - 1);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ホイール（四角センサー）
        const wCount = 5;
        const wSize = 14;
        const wY = treadY + treadH * 0.55;
        for (let i = 0; i < wCount; i++) {
            const wx = treadX + 10 + (treadW - 20) / (wCount - 1) * i;
            ctx.fillStyle = _lightenCached(variant.shadow, 6);
            ctx.fillRect(wx - wSize / 2, wY - wSize / 2, wSize, wSize);
            ctx.strokeStyle = isPhaseTwo ? 'rgba(180,100,255,0.7)' : accent;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx - wSize / 2, wY - wSize / 2, wSize, wSize);
            // センターLED（点滅）
            const ledBlink = (Math.sin(frame * 0.12 + i * 1.1) + 1) / 2;
            ctx.fillStyle = isPhaseTwo ? `rgba(200,120,255,${0.5 + ledBlink * 0.5})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.4 + ledBlink * 0.6})`;
            ctx.fillRect(wx - 3, wY - 3, 6, 6);
        }

        // ──────────────────────────────────────────────────
        // 3. 車体（六角形装甲プレート）
        // ──────────────────────────────────────────────────
        const bodyG = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY + bodyH);
        bodyG.addColorStop(0, isPhaseTwo ? '#3A1A5E' : _lightenCached(variant.base, 14));
        bodyG.addColorStop(0.4, isPhaseTwo ? '#5A2A8E' : variant.high);
        bodyG.addColorStop(1, isPhaseTwo ? '#1A0A2E' : variant.shadow);
        ctx.fillStyle = bodyG;

        // 六角形ぽい台形ボディ
        ctx.beginPath();
        ctx.moveTo(bodyX + 16, bodyY);
        ctx.lineTo(bodyX + bodyW - 16, bodyY);
        ctx.lineTo(bodyX + bodyW + 8, bodyY + 16);
        ctx.lineTo(bodyX + bodyW + 8, bodyY + bodyH);
        ctx.lineTo(bodyX - 8, bodyY + bodyH);
        ctx.lineTo(bodyX - 8, bodyY + 16);
        ctx.closePath();
        ctx.fill();

        // ボディ外枠グロー
        ctx.shadowColor = isPhaseTwo ? '#9040FF' : accent;
        ctx.shadowBlur = 8 + pulse * 4;
        ctx.strokeStyle = isPhaseTwo ? `rgba(160,80,255,${0.5 + pulse * 0.3})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ボディ中央スキャンライン
        ctx.strokeStyle = isPhaseTwo ? `rgba(180,100,255,${0.25 + pulse * 0.2})` : `rgba(255,255,255,${0.14 + pulse * 0.1})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(bodyX + 12, bodyY + bodyH * 0.5);
        ctx.lineTo(bodyX + bodyW - 12, bodyY + bodyH * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // リベット（四隅）
        const rivetPos = [
            [bodyX + 4, bodyY + 20], [bodyX + bodyW - 4, bodyY + 20],
            [bodyX + 4, bodyY + bodyH - 8], [bodyX + bodyW - 4, bodyY + bodyH - 8],
        ];
        rivetPos.forEach(([rx, ry]) => {
            ctx.fillStyle = _lightenCached(variant.base, 30);
            ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = variant.shadow; ctx.lineWidth = 1; ctx.stroke();
        });

        // ──────────────────────────────────────────────────
        // 4. サイドブレード翼（ステージカラーで光る）
        // ──────────────────────────────────────────────────
        const wBaseY = domeCY - domeRY * 0.08;
        const wTipY  = domeCY - domeRY * 0.62;
        [[-1], [1]].forEach(([s]) => {
            // 翼本体
            ctx.fillStyle = isPhaseTwo ? '#2A0A4A' : _lightenCached(variant.shadow, 6);
            ctx.beginPath();
            ctx.moveTo(domeCX + s * (domeRX - 2), wBaseY + 8);
            ctx.lineTo(domeCX + s * (domeRX + 24), wTipY + 6);
            ctx.lineTo(domeCX + s * (domeRX + 38), wTipY - 8);
            ctx.lineTo(domeCX + s * (domeRX + 20), wBaseY - 22);
            ctx.lineTo(domeCX + s * (domeRX - 2), wBaseY - 14);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = isPhaseTwo ? 'rgba(140,60,255,0.6)' : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},0.55)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 翼光沢ライン
            ctx.strokeStyle = isPhaseTwo ? `rgba(180,100,255,${0.35 + pulse * 0.25})` : `rgba(255,255,255,${0.22 + pulse * 0.18})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(domeCX + s * (domeRX + 2), wBaseY - 6);
            ctx.lineTo(domeCX + s * (domeRX + 28), wTipY + 0);
            ctx.stroke();

            // 翼先端LED
            const wingLedAlpha = 0.6 + Math.sin(frame * 0.1 + s) * 0.3;
            ctx.shadowColor = isPhaseTwo ? '#C080FF' : accent;
            ctx.shadowBlur = 10;
            ctx.fillStyle = isPhaseTwo ? `rgba(200,120,255,${wingLedAlpha})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${wingLedAlpha})`;
            ctx.beginPath(); ctx.arc(domeCX + s * (domeRX + 38), wTipY - 8, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // セカンドトゲ
            ctx.fillStyle = isPhaseTwo ? '#3A1060' : variant.shadow;
            ctx.beginPath();
            ctx.moveTo(domeCX + s * (domeRX + 30), wTipY - 4);
            ctx.lineTo(domeCX + s * (domeRX + 48), wTipY - 14);
            ctx.lineTo(domeCX + s * (domeRX + 28), wTipY - 17);
            ctx.closePath(); ctx.fill();
        });

        // ──────────────────────────────────────────────────
        // 5. 左右サイドタワー（アンテナ式高層搭）
        // ──────────────────────────────────────────────────
        const towerOffsetX = domeRX * 0.84;
        const _drawMechaTowerNew = (tcx) => {
            const tW = 28;
            const tH = bodyH * 0.75;
            const tTopY = treadY - tH - 4;

            // タワー本体グラデ
            const tG2 = ctx.createLinearGradient(tcx - tW/2, tTopY, tcx + tW/2, tTopY + tH);
            tG2.addColorStop(0, isPhaseTwo ? '#2A0A48' : _lightenCached(variant.shadow, 10));
            tG2.addColorStop(0.5, isPhaseTwo ? '#3A1568' : variant.base);
            tG2.addColorStop(1, isPhaseTwo ? '#160830' : variant.shadow);
            ctx.fillStyle = tG2;
            ctx.beginPath();
            ctx.moveTo(tcx - tW/2, tTopY + 6);
            ctx.lineTo(tcx - tW/2 + 4, tTopY);
            ctx.lineTo(tcx + tW/2 - 4, tTopY);
            ctx.lineTo(tcx + tW/2, tTopY + 6);
            ctx.lineTo(tcx + tW/2, tTopY + tH);
            ctx.lineTo(tcx - tW/2, tTopY + tH);
            ctx.closePath();
            ctx.fill();

            // タワー外枠光
            ctx.strokeStyle = isPhaseTwo ? 'rgba(160,80,255,0.7)' : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},0.65)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // パネルライン（横）
            ctx.strokeStyle = isPhaseTwo ? 'rgba(140,70,220,0.3)' : `rgba(255,255,255,${0.1 + pulse * 0.08})`;
            ctx.lineWidth = 1;
            for (let r = 1; r <= 4; r++) {
                const ly = tTopY + r * (tH / 5);
                ctx.beginPath(); ctx.moveTo(tcx - tW/2 + 3, ly); ctx.lineTo(tcx + tW/2 - 3, ly); ctx.stroke();
            }

            // 中央スクリーン（光るディスプレイ）
            const scA = 0.4 + Math.sin(frame * 0.05 + tcx * 0.01) * 0.2;
            ctx.fillStyle = isPhaseTwo ? `rgba(160,80,255,${scA})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${scA * 0.7})`;
            ctx.fillRect(tcx - tW/2 + 5, tTopY + tH * 0.28, tW - 10, tH * 0.22);

            // ディスプレイ内スキャンライン
            ctx.strokeStyle = `rgba(255,255,255,0.25)`;
            ctx.lineWidth = 0.8;
            const scanLine = tTopY + tH * 0.28 + ((frame * 0.8) % (tH * 0.22));
            ctx.beginPath(); ctx.moveTo(tcx - tW/2 + 6, scanLine); ctx.lineTo(tcx + tW/2 - 6, scanLine); ctx.stroke();

            // 銃眼3個（三角型）
            for (let i = 0; i < 3; i++) {
                const mx = tcx - tW/2 + 4 + i * 10;
                ctx.fillStyle = isPhaseTwo ? '#1A0030' : _lightenCached(variant.shadow, 4);
                ctx.strokeStyle = isPhaseTwo ? 'rgba(140,60,220,0.6)' : accent;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(mx, tTopY - 2);
                ctx.lineTo(mx + 4, tTopY + 8);
                ctx.lineTo(mx + 8, tTopY - 2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }

            // アンテナ（上部）
            ctx.shadowColor = isPhaseTwo ? '#C080FF' : accent;
            ctx.shadowBlur = 8 + pulse * 5;
            ctx.strokeStyle = isPhaseTwo ? `rgba(180,100,255,0.8)` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},0.85)`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tcx, tTopY - 2); ctx.lineTo(tcx, tTopY - 24); ctx.stroke();
            // アンテナ先端LED（ブリンク）
            const antBlink = (Math.sin(frame * 0.15 + tcx * 0.05) + 1) / 2;
            ctx.fillStyle = isPhaseTwo ? `rgba(200,120,255,${0.6 + antBlink * 0.4})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.7 + antBlink * 0.3})`;
            ctx.beginPath(); ctx.arc(tcx, tTopY - 26, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        };
        _drawMechaTowerNew(domeCX - towerOffsetX);
        _drawMechaTowerNew(domeCX + towerOffsetX);

        // ──────────────────────────────────────────────────
        // 6. メインドーム（コンセプトアート風六角装甲キャノピー）
        // ──────────────────────────────────────────────────
        // ドーム後光（外グロー）
        const outerGlowA = 0.08 + pulse * 0.06;
        ctx.fillStyle = isPhaseTwo ? `rgba(140,60,255,${outerGlowA * 1.5})` : glowColor.replace(')', `, ${outerGlowA})`).replace('rgba', 'rgba');
        ctx.beginPath(); ctx.ellipse(domeCX, domeCY, domeRX + 18, domeRY + 18, 0, Math.PI, 0); ctx.fill();

        // ドーム本体グラデ
        const dG = ctx.createRadialGradient(domeCX - domeRX * 0.3, domeCY - domeRY * 0.38, 0, domeCX, domeCY, domeRX);
        dG.addColorStop(0, isPhaseTwo ? '#5020A0' : variant.high);
        dG.addColorStop(0.45, isPhaseTwo ? '#301070' : variant.base);
        dG.addColorStop(1, isPhaseTwo ? '#180A30' : variant.shadow);
        ctx.fillStyle = dG;
        ctx.beginPath();
        ctx.ellipse(domeCX, domeCY, domeRX, domeRY, 0, Math.PI, 0);
        ctx.lineTo(domeCX + domeRX, domeCY);
        ctx.lineTo(domeCX - domeRX, domeCY);
        ctx.closePath();
        ctx.fill();

        // ドーム外枠グロー
        ctx.shadowColor = isPhaseTwo ? '#A050FF' : accent;
        ctx.shadowBlur = 14 + pulse * 8;
        ctx.strokeStyle = isPhaseTwo ? `rgba(160,80,255,${0.7 + pulse * 0.3})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.55 + pulse * 0.35})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(domeCX, domeCY, domeRX, domeRY, 0, Math.PI, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ドーム装甲ライン（縦横パネル分割）
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(domeCX, domeCY, domeRX - 2, domeRY - 2, 0, Math.PI, 0);
        ctx.clip();
        ctx.strokeStyle = isPhaseTwo ? 'rgba(140,70,220,0.2)' : `rgba(255,255,255,${0.12 + pulse * 0.06})`;
        ctx.lineWidth = 1;
        // 縦分割線
        [-0.45, 0, 0.45].forEach(fx => {
            ctx.beginPath(); ctx.moveTo(domeCX + fx * domeRX, domeCY - domeRY); ctx.lineTo(domeCX + fx * domeRX, domeCY); ctx.stroke();
        });
        // 横分割線
        [-0.5, -0.15].forEach(fy => {
            ctx.beginPath(); ctx.moveTo(domeCX - domeRX * 0.9, domeCY + fy * domeRY); ctx.lineTo(domeCX + domeRX * 0.9, domeCY + fy * domeRY); ctx.stroke();
        });
        // スキャンライン（動的）
        ctx.strokeStyle = isPhaseTwo ? `rgba(160,80,255,${0.22 * pulse})` : `rgba(255,255,255,${0.16 + pulse * 0.14})`;
        ctx.lineWidth = 2;
        const scanPos = domeCY - domeRY + ((frame * 1.2) % (domeRY));
        ctx.beginPath(); ctx.moveTo(domeCX - domeRX, scanPos); ctx.lineTo(domeCX + domeRX, scanPos); ctx.stroke();
        ctx.restore();

        // ハイライト（上部光沢）
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.ellipse(domeCX - domeRX * 0.2, domeCY - domeRY * 0.35, domeRX * 0.28, domeRY * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();

        // ──────────────────────────────────────────────────
        // 7. メカアイ（コンセプト風ワイドビジョン）
        // ──────────────────────────────────────────────────
        const eyeY = domeCY - domeRY * 0.48;
        const eyeW = domeRX * 1.05;
        const eyeH = 11;
        // ビジョン背景
        ctx.fillStyle = '#030810';
        ctx.beginPath();
        ctx.moveTo(domeCX - eyeW / 2 + 5, eyeY - eyeH / 2);
        ctx.lineTo(domeCX + eyeW / 2 - 5, eyeY - eyeH / 2);
        ctx.lineTo(domeCX + eyeW / 2, eyeY);
        ctx.lineTo(domeCX + eyeW / 2 - 5, eyeY + eyeH / 2);
        ctx.lineTo(domeCX - eyeW / 2 + 5, eyeY + eyeH / 2);
        ctx.lineTo(domeCX - eyeW / 2, eyeY);
        ctx.closePath();
        ctx.fill();

        // LED群
        const ledCount = isPhaseTwo ? 11 : 8;
        for (let i = 0; i < ledCount; i++) {
            const lx = domeCX - eyeW / 2 + 10 + (eyeW - 20) / (ledCount - 1) * i;
            const ledPulse = (Math.sin(frame * 0.12 + i * 0.7) + 1) / 2;
            ctx.fillStyle = isPhaseTwo
                ? `rgba(200,100,255,${0.45 + ledPulse * 0.55})`
                : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.45 + ledPulse * 0.55})`;
            ctx.beginPath(); ctx.arc(lx, eyeY, 4, 0, Math.PI * 2); ctx.fill();
        }

        // ビジョンフレームグロー
        ctx.shadowColor = isPhaseTwo ? '#B060FF' : accent;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = isPhaseTwo ? `rgba(180,80,255,${0.8 + pulse * 0.2})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.7 + pulse * 0.3})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(domeCX - eyeW / 2 + 5, eyeY - eyeH / 2);
        ctx.lineTo(domeCX + eyeW / 2 - 5, eyeY - eyeH / 2);
        ctx.lineTo(domeCX + eyeW / 2, eyeY);
        ctx.lineTo(domeCX + eyeW / 2 - 5, eyeY + eyeH / 2);
        ctx.lineTo(domeCX - eyeW / 2 + 5, eyeY + eyeH / 2);
        ctx.lineTo(domeCX - eyeW / 2, eyeY);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ──────────────────────────────────────────────────
        // 8. ステージ固有デコレーション
        // ──────────────────────────────────────────────────
        const _drawStageDecor = () => {
            const embX = domeCX;
            const embY = domeCY + domeRY * 0.28;

            if (stageId === 'c2_stage1') {
                // 廃村の番人 ─ 錆びと腐食、古い紋章
                ctx.strokeStyle = 'rgba(139,105,20,0.5)'; ctx.lineWidth = 2;
                [[domeCX - 30, domeCY - 15], [domeCX + 18, domeCY + 5], [domeCX - 10, domeCY - 30]].forEach(([rx, ry]) => {
                    ctx.beginPath();
                    ctx.moveTo(rx, ry); ctx.lineTo(rx + 8 + Math.random()*4, ry + 14); ctx.lineTo(rx + 2, ry + 22); ctx.stroke();
                });
                // 古い歯車紋章
                ctx.fillStyle = 'rgba(101,72,16,0.75)'; ctx.strokeStyle = 'rgba(180,130,40,0.55)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(embX, embY, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = 'rgba(160,110,20,0.5)'; ctx.lineWidth = 1.5;
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4;
                    ctx.beginPath(); ctx.moveTo(embX + Math.cos(a) * 9, embY + Math.sin(a) * 9); ctx.lineTo(embX + Math.cos(a) * 15, embY + Math.sin(a) * 15); ctx.stroke();
                }
                ctx.fillStyle = 'rgba(180,130,30,0.65)'; ctx.beginPath(); ctx.arc(embX, embY, 5, 0, Math.PI * 2); ctx.fill();

            } else if (stageId === 'c2_stage2') {
                // 草原の見張り ─ 自然の模様、ターゲットレティクル
                ctx.strokeStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},0.5)`;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 4]);
                ctx.beginPath(); ctx.arc(embX, embY, 18, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(embX, embY, 10, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                // 十字線
                ctx.beginPath(); ctx.moveTo(embX - 20, embY); ctx.lineTo(embX + 20, embY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(embX, embY - 20); ctx.lineTo(embX, embY + 20); ctx.stroke();
                ctx.fillStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},0.7)`;
                ctx.beginPath(); ctx.arc(embX, embY, 3.5, 0, Math.PI * 2); ctx.fill();

            } else if (stageId === 'c2_stage3') {
                // 海賊テンペスト ─ アンカー紋章、波形ライン
                // 波形ライン
                ctx.strokeStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},0.5)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let wx = domeCX - 36; wx < domeCX + 36; wx += 1) {
                    const wy = (domeCY - domeRY * 0.12) + Math.sin((wx - domeCX) * 0.25 + frame * 0.04) * 4;
                    if (wx === Math.floor(domeCX - 36)) ctx.moveTo(wx, wy);
                    else ctx.lineTo(wx, wy);
                }
                ctx.stroke();
                // アンカー
                ctx.fillStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},0.6)`;
                ctx.beginPath(); ctx.arc(embX, embY, 13, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = variant.shadow;
                ctx.font = 'bold 14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('⚓', embX, embY + 1);

            } else if (stageId === 'c2_stage4') {
                // 温泉魔導士 ─ 魔法陣・蒸気
                ctx.strokeStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},0.45)`;
                ctx.lineWidth = 1.2;
                // 回転魔法陣
                ctx.save(); ctx.translate(embX, embY); ctx.rotate(frame * 0.015);
                ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    if (i === 0) ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
                    else ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
                }
                ctx.closePath(); ctx.stroke();
                ctx.restore();
                // 蒸気パーティクル
                for (let i = 0; i < 3; i++) {
                    const sA = 0.3 + Math.sin(frame * 0.08 + i * 1.1) * 0.2;
                    const sx = domeCX - 20 + i * 18;
                    const sy = domeCY - domeRY * 0.6 + Math.sin(frame * 0.06 + i) * 6;
                    ctx.fillStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},${sA})`;
                    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
                }

            } else if (stageId === 'c2_stage5') {
                // 鉄仮面前衛 ─ 歯車紋章、スパイク
                const gearAngle = frame * 0.02;
                ctx.save(); ctx.translate(embX, embY);
                // 外歯車
                ctx.strokeStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},0.55)`;
                ctx.lineWidth = 2.5;
                ctx.rotate(gearAngle);
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4;
                    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
                // 内コア
                const coreA = 0.5 + pulse * 0.4;
                ctx.fillStyle = `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},${coreA})`;
                ctx.beginPath(); ctx.arc(embX, embY, 5, 0, Math.PI * 2); ctx.fill();

            } else if (stageId === 'c2_boss') {
                // ギア将軍 ─ 帝王の歯車王冠・三重リング
                // 外オーラ（脈動）
                const bossAura = 0.1 + pulse * 0.12;
                ctx.fillStyle = isPhaseTwo ? `rgba(140,50,255,${bossAura * 2})` : `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},${bossAura * 1.5})`;
                ctx.beginPath(); ctx.arc(embX, embY, 26, 0, Math.PI * 2); ctx.fill();
                // 三重リング
                [20, 15, 9].forEach((r, ri) => {
                    const rA = 0.35 + pulse * 0.25;
                    ctx.strokeStyle = isPhaseTwo ? `rgba(180,90,255,${rA})` : `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},${rA})`;
                    ctx.lineWidth = 2;
                    ctx.save(); ctx.translate(embX, embY); ctx.rotate(frame * (0.012 + ri * 0.008) * (ri % 2 === 0 ? 1 : -1));
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const a = i * Math.PI / 3;
                        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3)); ctx.lineTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3)); ctx.stroke();
                    }
                    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                });
                ctx.fillStyle = isPhaseTwo ? `rgba(200,120,255,${0.7 + pulse * 0.3})` : `rgba(${parseInt(variant.trim.slice(1,3)||'8B',16)},${parseInt(variant.trim.slice(3,5)||'E9',16)},${parseInt(variant.trim.slice(5,7)||'FF',16)},${0.7 + pulse * 0.3})`;
                ctx.beginPath(); ctx.arc(embX, embY, 4, 0, Math.PI * 2); ctx.fill();
            }
        };
        _drawStageDecor();

        // ──────────────────────────────────────────────────
        // 9. 砲塔（鋭角な機械キャノン）
        // ──────────────────────────────────────────────────
        const cannonDir = -1;
        const cannonW = tw * 0.16;
        const cannonL = tw * 0.44;
        const cannonX = domeCX + cannonDir * (domeRX * 0.28);
        const cannonY = domeCY - domeRY * 0.08;

        // 砲台マウント
        ctx.fillStyle = _lightenCached(variant.shadow, 6);
        ctx.strokeStyle = isPhaseTwo ? 'rgba(160,80,255,0.6)' : accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cannonX, cannonY, cannonW * 0.8, cannonW * 0.55, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 砲身（テーパー）
        ctx.fillStyle = _lightenCached(variant.shadow, 10);
        ctx.beginPath();
        ctx.moveTo(cannonX, cannonY - cannonW * 0.5);
        ctx.lineTo(cannonX + cannonDir * (domeRX * 0.4 + cannonL), cannonY - cannonW * 0.28);
        ctx.lineTo(cannonX + cannonDir * (domeRX * 0.4 + cannonL), cannonY + cannonW * 0.28);
        ctx.lineTo(cannonX, cannonY + cannonW * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isPhaseTwo ? 'rgba(160,80,255,0.5)' : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},0.5)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 砲身リングマーカー
        ctx.strokeStyle = isPhaseTwo ? 'rgba(140,60,220,0.5)' : `rgba(255,255,255,0.3)`;
        ctx.lineWidth = 2;
        const muzzleX = cannonX + cannonDir * (domeRX * 0.4 + cannonL);
        ctx.beginPath(); ctx.moveTo(muzzleX + 6 * cannonDir, cannonY - cannonW * 0.33); ctx.lineTo(muzzleX + 6 * cannonDir, cannonY + cannonW * 0.33); ctx.stroke();

        // 砲口リング（グロー）
        ctx.shadowColor = isPhaseTwo ? '#A050FF' : accent;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = isPhaseTwo ? '#C080FF' : accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(muzzleX, cannonY, cannonW * 0.4, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        // 砲口内部
        ctx.fillStyle = '#020508';
        ctx.beginPath(); ctx.arc(muzzleX, cannonY, cannonW * 0.28, 0, Math.PI * 2); ctx.fill();
        // チャージ光
        ctx.fillStyle = isPhaseTwo ? `rgba(180,90,255,${0.3 + pulse * 0.35})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${0.25 + pulse * 0.3})`;
        ctx.beginPath(); ctx.arc(muzzleX, cannonY, cannonW * 0.2, 0, Math.PI * 2); ctx.fill();

        // ──────────────────────────────────────────────────
        // 10. ダメージフラッシュ
        // ──────────────────────────────────────────────────
        if (dmgFlash > 0) {
            ctx.fillStyle = isPhaseTwo ? `rgba(180,80,255,${dmgFlash * 0.5})` : `rgba(${parseInt(accent.slice(1,3)||'8B',16)},${parseInt(accent.slice(3,5)||'E9',16)},${parseInt(accent.slice(5,7)||'FF',16)},${dmgFlash * 0.4})`;
            ctx.beginPath();
            ctx.ellipse(domeCX, domeCY, domeRX + 6, domeRY + 6, 0, Math.PI, 0);
            ctx.fill();
        }

        // ──────────────────────────────────────────────────
        // 11. フェーズ2：電気嵐エフェクト
        // ──────────────────────────────────────────────────
        if (isPhaseTwo && frame % 3 < 2) {
            ctx.strokeStyle = 'rgba(180,80,255,0.75)';
            ctx.lineWidth = 2;
            for (let e = 0; e < 4; e++) {
                const exStart = bodyX + (((Math.sin(frame * 0.07 + e * 2.9) + 1) * 0.5) * bodyW);
                ctx.beginPath(); ctx.moveTo(exStart, bodyY);
                for (let s = 0; s < 5; s++) {
                    const jitter = Math.sin(frame * 0.21 + e * 5.1 + s * 1.9) * 18;
                    ctx.lineTo(exStart + jitter, bodyY - s * 13);
                }
                ctx.stroke();
            }
        }

        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.88);
        ctx.restore();
    },


        // ============================================================
    // Chapter3: 天国戦車テーマ（丸みのある白神殿・光輪・翼・金縁）
    // ============================================================
    _drawHeavenThemeTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, tankType, battle) {
        const isPhaseTwo = battle && battle.bossPhase === 2;
        const frame = _getFrameNow();
        const cx = tx + tw / 2;
        const variant = this._getStageEnemyVariant(battle);
        const trim = variant.trim;

        ctx.save();
        if (dmgFlash > 0.5) {
            const st = frame * 0.05;
            ctx.translate(Math.sin(st * 7.3) * 3, Math.sin(st * 11.7) * 2);
        }

        // スケール
        let scaleX = 1.0;
        if (tankType === 'TRUE_BOSS') scaleX = isPhaseTwo ? 1.4 : 1.25;
        else if (tankType === 'BOSS' || tankType === 'HEAVY' || tankType === 'DEFENSE') scaleX = 1.15;
        else if (tankType === 'SCOUT') scaleX = 0.9;
        ctx.translate(cx, ty + th);
        ctx.scale(scaleX, 1.0);
        ctx.translate(-cx, -(ty + th));

        const pulse = (Math.sin(frame * 0.05) + 1) / 2; // 0〜1ゆっくり

        // ── 1. 台座（雲のようなふわっとした白い台座）──
        const treadH = 38;
        const treadW = tw * 0.88;
        const treadX = cx - treadW / 2;
        const treadY = ty + th - treadH;

        // 雲台座グラデーション
        const cloudG = ctx.createLinearGradient(treadX, treadY, treadX, treadY + treadH);
        cloudG.addColorStop(0, isPhaseTwo ? '#FFF8E0' : variant.high);
        cloudG.addColorStop(0.4, isPhaseTwo ? '#F0D890' : _lightenCached(variant.base, 10));
        cloudG.addColorStop(1, isPhaseTwo ? '#C8A830' : variant.base);
        ctx.fillStyle = cloudG;

        // 雲っぽい丸みのある形
        ctx.beginPath();
        ctx.moveTo(treadX + 20, treadY);
        // 上部に雲のでっぱり
        for (let i = 0; i < 5; i++) {
            const bx = treadX + 20 + (treadW - 40) * (i / 4);
            const br = 14 - (i % 2) * 4;
            ctx.arc(bx, treadY, br, Math.PI, 0, false);
        }
        ctx.lineTo(treadX + treadW, treadY + treadH);
        ctx.quadraticCurveTo(cx, treadY + treadH + 6, treadX, treadY + treadH);
        ctx.closePath();
        ctx.fill();

        // 金縁
        ctx.strokeStyle = isPhaseTwo ? '#FFD700' : trim;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 雲の光彩（下部）
        ctx.shadowColor = isPhaseTwo ? '#FFD700' : trim;
        ctx.shadowBlur = 12 + pulse * 8;
        ctx.strokeStyle = isPhaseTwo ? `rgba(255,215,0,${0.4 + pulse * 0.3})` : `rgba(255,255,255,${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(treadX + 10, treadY + treadH - 4);
        ctx.lineTo(treadX + treadW - 10, treadY + treadH - 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 粒子（舞う光の粒）
        for (let i = 0; i < 5; i++) {
            const px2 = treadX + ((frame * (1 + i * 0.3) + i * 60) % treadW);
            const py2 = treadY + 5 + (Math.sin(frame * 0.05 + i) + 1) * 10;
            const pa = 0.3 + Math.sin(frame * 0.08 + i * 1.3) * 0.3;
            ctx.fillStyle = `rgba(255,245,200,${pa})`;
            ctx.beginPath(); ctx.arc(px2, py2, 3, 0, Math.PI * 2); ctx.fill();
        }

        // ── 2. 車体（神殿の柱のような白い車体）──
        const bodyH = th - treadH - 8;
        const bodyW = tw * 0.74;
        const bodyX = cx - bodyW / 2;
        const bodyY = treadY - bodyH;

        // 車体グラデーション
        const bodyG = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY + bodyH);
        bodyG.addColorStop(0, isPhaseTwo ? '#FFFDE8' : variant.high);
        bodyG.addColorStop(0.5, isPhaseTwo ? '#F5E8A0' : _lightenCached(variant.base, 16));
        bodyG.addColorStop(1, isPhaseTwo ? '#D4B840' : variant.base);
        ctx.fillStyle = bodyG;

        // 神殿アーチ型の形
        ctx.beginPath();
        ctx.moveTo(bodyX + 8, bodyY + 16);
        ctx.quadraticCurveTo(cx, bodyY - 10, bodyX + bodyW - 8, bodyY + 16);
        ctx.lineTo(bodyX + bodyW + 4, bodyY + bodyH);
        ctx.lineTo(bodyX - 4, bodyY + bodyH);
        ctx.closePath();
        ctx.fill();

        // 金縁
        ctx.strokeStyle = isPhaseTwo ? '#FFD700' : trim;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 柱模様（縦ライン）
        const colCount = 4;
        for (let i = 1; i < colCount; i++) {
            const colX = bodyX + (bodyW / colCount) * i;
            ctx.strokeStyle = `rgba(180,160,100,0.3)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(colX, bodyY + 20);
            ctx.lineTo(colX, bodyY + bodyH - 4);
            ctx.stroke();
        }

        // ── 3. ドーム（丸みのある神殿ドーム）──
        const domeCX = cx;
        const domeCY = bodyY - 2;
        const domeRX = bodyW * 0.48;
        const domeRY = bodyH * 0.65;

        // 後光（ドーム背面の光輪）
        const haloR = domeRX * 1.45;
        const haloAlpha = 0.12 + pulse * 0.1;
        const haloG = ctx.createRadialGradient(domeCX, domeCY, domeRX * 0.8, domeCX, domeCY, haloR);
        haloG.addColorStop(0, isPhaseTwo ? `rgba(255,215,0,${haloAlpha * 2})` : `rgba(241,201,107,${haloAlpha * 2})`);
        haloG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = haloG;
        ctx.beginPath(); ctx.arc(domeCX, domeCY - domeRY * 0.3, haloR, 0, Math.PI * 2); ctx.fill();

        // ドーム本体
        const domeG = ctx.createRadialGradient(domeCX - domeRX * 0.3, domeCY - domeRY * 0.4, 0, domeCX, domeCY, domeRX);
        domeG.addColorStop(0, isPhaseTwo ? '#FFFBF0' : variant.high);
        domeG.addColorStop(0.5, isPhaseTwo ? '#F5E890' : _lightenCached(variant.base, 14));
        domeG.addColorStop(1, isPhaseTwo ? '#D0B040' : variant.base);
        ctx.fillStyle = domeG;
        ctx.beginPath();
        ctx.ellipse(domeCX, domeCY, domeRX, domeRY, 0, Math.PI, 0);
        ctx.lineTo(domeCX + domeRX, domeCY);
        ctx.lineTo(domeCX - domeRX, domeCY);
        ctx.closePath();
        ctx.fill();

        // 金縁グロー
        ctx.shadowColor = isPhaseTwo ? '#FFD700' : trim;
        ctx.shadowBlur = 14 + pulse * 8;
        ctx.strokeStyle = isPhaseTwo ? `rgba(255,215,0,${0.8 + pulse * 0.2})` : `rgba(255,255,255,${0.6 + pulse * 0.25})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(domeCX, domeCY, domeRX, domeRY, 0, Math.PI, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ドーム内：光の柱（ステンドグラス風）
        if (showInterior) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(domeCX, domeCY, domeRX - 3, domeRY - 3, 0, Math.PI, 0);
            ctx.clip();
            const colors = ['rgba(255,220,100,0.15)', 'rgba(200,230,255,0.15)', 'rgba(255,255,200,0.15)'];
            for (let i = 0; i < 5; i++) {
                const ang = Math.PI + (Math.PI / 5) * i;
                ctx.fillStyle = colors[i % colors.length];
                ctx.beginPath();
                ctx.moveTo(domeCX, domeCY);
                ctx.arc(domeCX, domeCY, domeRX, ang, ang + Math.PI / 5);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // 目（穏やかな大きな瞳）
        const eyeY = domeCY - domeRY * 0.5;
        [-1, 1].forEach(side => {
            const ex = domeCX + side * domeRX * 0.38;
            // 白目
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath(); ctx.ellipse(ex, eyeY, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = isPhaseTwo ? '#FFD700' : trim; ctx.lineWidth = 1.5; ctx.stroke();
            // 瞳
            ctx.fillStyle = isPhaseTwo ? '#7A5000' : '#5A4300';
            ctx.beginPath(); ctx.ellipse(ex, eyeY, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
            // ハイライト
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.ellipse(ex - 3, eyeY - 4, 3, 4, -0.3, 0, Math.PI * 2); ctx.fill();
            // 瞳のグロー
            ctx.shadowColor = isPhaseTwo ? '#FFD700' : trim;
            ctx.shadowBlur = 6;
            ctx.fillStyle = isPhaseTwo ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.ellipse(ex, eyeY, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });

        // ── 4. 光輪（頭上に浮く回転する光輪）──
        const haloHaloY = domeCY - domeRY - 18;
        const haloHaloRX = domeRX * 0.6;
        const haloHaloRY = haloHaloRX * 0.25;
        const haloRot = frame * 0.018;
        ctx.shadowColor = isPhaseTwo ? '#FFD700' : trim;
        ctx.shadowBlur = 16 + pulse * 8;
        ctx.strokeStyle = isPhaseTwo ? `rgba(255,215,0,${0.8 + pulse * 0.2})` : `rgba(255,255,255,${0.7 + pulse * 0.2})`;
        ctx.lineWidth = isPhaseTwo ? 5 : 4;
        ctx.beginPath();
        ctx.ellipse(domeCX, haloHaloY, haloHaloRX, haloHaloRY, haloRot, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // 光輪の光粒
        for (let i = 0; i < 6; i++) {
            const a = haloRot + (Math.PI * 2 / 6) * i;
            const gx = domeCX + Math.cos(a) * haloHaloRX;
            const gy = haloHaloY + Math.sin(a) * haloHaloRY;
            ctx.fillStyle = isPhaseTwo ? `rgba(255,220,80,${0.6 + pulse * 0.4})` : `rgba(255,248,180,${0.6 + pulse * 0.4})`;
            ctx.beginPath(); ctx.arc(gx, gy, 3 + pulse * 2, 0, Math.PI * 2); ctx.fill();
        }

        // ── 5. 翼（ドーム両サイドに広がる羽根）──
        [-1, 1].forEach(side => {
            const wingBaseX = domeCX + side * domeRX * 0.85;
            const wingBaseY = domeCY - domeRY * 0.3;
            const flapAngle = Math.sin(frame * 0.04) * 0.12 * side;
            ctx.save();
            ctx.translate(wingBaseX, wingBaseY);
            ctx.rotate(flapAngle);

            // 羽根（3枚重ねで奥行き感）
            const featherColors = [
                isPhaseTwo ? 'rgba(255,240,150,0.5)' : 'rgba(200,230,255,0.5)',
                isPhaseTwo ? 'rgba(255,230,100,0.7)' : 'rgba(230,245,255,0.7)',
                isPhaseTwo ? 'rgba(255,248,200,0.9)' : 'rgba(255,255,255,0.9)',
            ];
            featherColors.forEach((col, fi) => {
                const wLen = (50 + fi * 20) * (isPhaseTwo ? 1.2 : 1.0);
                const wAng = (0.25 + fi * 0.18) * side;
                ctx.fillStyle = col;
                ctx.strokeStyle = isPhaseTwo ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(
                    Math.cos(wAng) * wLen * 0.6 + Math.sin(wAng) * 10 * side,
                    Math.sin(wAng) * wLen * 0.6 - 8,
                    Math.cos(wAng) * wLen,
                    Math.sin(wAng) * wLen
                );
                ctx.quadraticCurveTo(
                    Math.cos(wAng) * wLen * 0.5,
                    Math.sin(wAng) * wLen * 0.5 + 12,
                    0, 8
                );
                ctx.closePath();
                ctx.fill(); ctx.stroke();
            });
            ctx.restore();
        });

        // ── 6. 砲塔（エレガントな曲線キャノン）──
        const cannonDir = -1;
        const cannonBaseX = domeCX + cannonDir * domeRX * 0.3;
        const cannonBaseY = domeCY - domeRY * 0.1;
        const cannonLen = tw * 0.4;
        const cannonW2 = 10;

        // 砲身（テーパー）
        ctx.fillStyle = isPhaseTwo ? '#F5E080' : '#E8F2FF';
        ctx.beginPath();
        ctx.moveTo(cannonBaseX, cannonBaseY - cannonW2);
        ctx.lineTo(cannonBaseX + cannonDir * (domeRX * 0.6 + cannonLen), cannonBaseY - cannonW2 * 0.5);
        ctx.lineTo(cannonBaseX + cannonDir * (domeRX * 0.6 + cannonLen), cannonBaseY + cannonW2 * 0.5);
        ctx.lineTo(cannonBaseX, cannonBaseY + cannonW2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isPhaseTwo ? '#FFD700' : trim;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 砲口の光輪
        const muzzleX = cannonBaseX + cannonDir * (domeRX * 0.6 + cannonLen);
        ctx.shadowColor = isPhaseTwo ? '#FFD700' : trim;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = isPhaseTwo ? '#FFD700' : '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(muzzleX, cannonBaseY, cannonW2, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // ── 7. ダメージフラッシュ ──
        if (dmgFlash > 0) {
            ctx.fillStyle = isPhaseTwo ? `rgba(255,245,150,${dmgFlash * 0.5})` : variant.glow;
            ctx.beginPath();
            ctx.ellipse(domeCX, domeCY, domeRX + 6, domeRY + 6, 0, Math.PI, 0);
            ctx.fill();
        }

        // ── 8. フェーズ2：後光が強まり光柱が出る ──
        if (isPhaseTwo) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20 + pulse * 15;
            ctx.strokeStyle = `rgba(255,215,0,${0.3 + pulse * 0.2})`;
            ctx.lineWidth = 2;
            for (let r = 0; r < 8; r++) {
                const ra = (Math.PI * 2 / 8) * r + frame * 0.01;
                ctx.beginPath();
                ctx.moveTo(domeCX, domeCY - domeRY * 0.5);
                ctx.lineTo(domeCX + Math.cos(ra) * domeRX * 2.5, domeCY - domeRY * 0.5 + Math.sin(ra) * domeRY * 2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.92);
        ctx.restore();
    },

    // 🌑 Ch.4 混沌テーマ描画（深淵スタイル）
    _drawChaosThemeTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, tankType, battle) {
        ctx.save();
        const t = Date.now();
        const isPhaseTwo = battle && battle.bossPhase === 2;
        const flash = dmgFlash > 0 ? Math.min(1, dmgFlash / 10) : 0;

        // スケール調整（tankTypeごと）
        let scaleX = 1.0;
        if (tankType === 'TRUE_BOSS') scaleX = isPhaseTwo ? 1.4 : 1.25;
        else if (tankType === 'BOSS' || tankType === 'HEAVY' || tankType === 'DEFENSE') scaleX = 1.15;
        else if (tankType === 'SCOUT') scaleX = 0.9;
        const scaledTW = tw * scaleX;
        const scaledTX = tx - (scaledTW - tw) / 2;

        // 本体グラデ（漆黒×深紫）
        const bodyGrad = ctx.createLinearGradient(scaledTX, ty, scaledTX, ty + th);
        if (flash > 0) {
            bodyGrad.addColorStop(0, '#AA66FF'); bodyGrad.addColorStop(1, '#660099');
        } else if (isPhaseTwo) {
            bodyGrad.addColorStop(0, '#1A0040'); bodyGrad.addColorStop(0.4, '#2D0060'); bodyGrad.addColorStop(1, '#060010');
        } else {
            bodyGrad.addColorStop(0, '#0D0020'); bodyGrad.addColorStop(0.4, '#1A0035'); bodyGrad.addColorStop(1, '#060015');
        }
        ctx.fillStyle = bodyGrad;
        Renderer._roundRect(ctx, scaledTX, ty, scaledTW, th, 10);
        ctx.fill();

        // 発光クラック（混沌の亀裂）
        const crackAlpha = (isPhaseTwo ? 0.7 : 0.45) + Math.sin(t * 0.004) * 0.15;
        ctx.strokeStyle = `rgba(${isPhaseTwo ? '220,80,255' : '160,40,220'},${crackAlpha})`;
        ctx.lineWidth = isPhaseTwo ? 2 : 1.5;
        const cx = scaledTX + scaledTW * 0.5, cy = ty + th * 0.5;
        ctx.beginPath(); ctx.moveTo(cx - 8, ty + 8); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx - 5, ty + th - 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 10, ty + 12); ctx.lineTo(cx - 2, cy - 5); ctx.lineTo(cx + 8, ty + th - 10); ctx.stroke();

        // 中央虚無オーブ
        const orbR = (isPhaseTwo ? 9 : 6) + Math.sin(t * 0.005) * 2;
        const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2.5);
        orbGrad.addColorStop(0, isPhaseTwo ? 'rgba(255,150,255,0.95)' : 'rgba(200,80,255,0.9)');
        orbGrad.addColorStop(0.5, 'rgba(100,0,180,0.6)');
        orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = orbGrad;
        ctx.beginPath(); ctx.arc(cx, cy, orbR * 2.5, 0, Math.PI * 2); ctx.fill();

        // 砲台（深淵砲）
        const barrelCY = ty + th * 0.38;
        const barrelW = scaledTW * (tankType === 'TRUE_BOSS' ? 0.62 : 0.52);
        ctx.fillStyle = '#0A0018';
        Renderer._roundRect(ctx, scaledTX - barrelW, barrelCY - 7, barrelW, 14, 4);
        ctx.fill();
        ctx.strokeStyle = `rgba(180,60,255,${0.65 + Math.sin(t * 0.005) * 0.2})`;
        ctx.lineWidth = 1.5;
        Renderer._roundRect(ctx, scaledTX - barrelW, barrelCY - 7, barrelW, 14, 4);
        ctx.stroke();
        // 砲口エネルギー
        const bTipX = scaledTX - barrelW - 8;
        ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(180,0,255,0.7)';
        ctx.fillStyle = `rgba(200,80,255,${0.75 + Math.sin(t * 0.007) * 0.2})`;
        ctx.beginPath(); ctx.arc(bTipX, barrelCY, 9, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // 触手（TRUE_BOSSのみ）
        if (tankType === 'TRUE_BOSS') {
            ctx.strokeStyle = `rgba(140,0,220,${0.5 + Math.sin(t * 0.003) * 0.2})`; ctx.lineWidth = 2.5;
            for (let i = 0; i < 4; i++) {
                const bx2 = scaledTX + scaledTW * (0.2 + i * 0.2);
                const wave = Math.sin(t * 0.004 + i * 1.8) * 7;
                ctx.beginPath();
                ctx.moveTo(bx2, ty);
                ctx.quadraticCurveTo(bx2 + wave, ty - 14, bx2 + wave * 0.5, ty - 24);
                ctx.stroke();
            }
        }

        // 縁取り
        ctx.shadowBlur = isPhaseTwo ? 12 : 6;
        ctx.shadowColor = isPhaseTwo ? 'rgba(220,80,255,0.8)' : 'rgba(140,0,220,0.5)';
        ctx.strokeStyle = flash > 0 ? '#FF88FF' : `rgba(${isPhaseTwo ? '220,80,255' : '160,40,220'},${0.7 + Math.sin(t * 0.004) * 0.2})`;
        ctx.lineWidth = isPhaseTwo ? 2.5 : 2;
        Renderer._roundRect(ctx, scaledTX, ty, scaledTW, th, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;

        this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.88);
        ctx.restore();
    },

    _drawSlimeTank(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior, tankType = 'NORMAL', battle = null) {
        const wt = CONFIG.TANK.WALL_THICKNESS;
        const dir = isEnemy ? -1 : 1;
        const enemyTheme = isEnemy && battle && battle.stageData ? battle.stageData.enemyTankTheme : null;
        const variant = isEnemy ? this._getStageEnemyVariant(battle) : null;

        // === スキン判定（プレイヤーのみ）===
        if (!isEnemy) {
            const _skinCustom = window.game && window.game.saveData && window.game.saveData.tankCustom;
            const _skinId = (_skinCustom && _skinCustom.skin) || 'skin_default';
            if (_skinId !== 'skin_default') {
                return this._drawSkinTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, _skinId, battle, false);
            }
        }

        // === 借金王（敵スキン）===
        if (isEnemy && tankType === 'SHAKKIN') {
            return this._drawShakkinTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle, true);
        }

        // === Chapter2/3 テーマ専用描画 ===
        // 第二形態スキン（enemySkinPhase2）が発動中の場合のみスキン優先、それ以外はテーマ+tankTypeで描画
        const _isPhaseTwo = battle && battle.bossPhase === 2;
        const _hasPhase2Skin = _isPhaseTwo && battle.stageData && battle.stageData.enemySkinPhase2;
        if (isEnemy && enemyTheme === 'mecha' && !_hasPhase2Skin) {
            return this._drawMechaThemeTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, tankType, battle);
        }
        if (isEnemy && enemyTheme === 'heaven' && !_hasPhase2Skin) {
            return this._drawHeavenThemeTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, tankType, battle);
        }
        if (isEnemy && enemyTheme === 'chaos' && !_hasPhase2Skin) {
            return this._drawChaosThemeTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, tankType, battle);
        }

        // === 敵スキン描画（enemySkinPhase2発動時 or Ch1スキン設定ステージ）===
        if (isEnemy && battle && battle.enemySkinType) {
            return this._drawSkinTank(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle.enemySkinType, battle, true);
        }

        // === 敵タイプ別専用デザイン ===
        if (isEnemy) {
            if (tankType === 'SCOUT') {
                return this._drawEnemyScout(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle);
            } else if (tankType === 'HEAVY' || tankType === 'DEFENSE') {
                return this._drawEnemyHeavy(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle, tankType);
            } else if (tankType === 'MAGICAL') {
                return this._drawEnemyMagical(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle);
            } else if (tankType === 'BOSS') {
                return this._drawEnemyBoss(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle);
            } else if (tankType === 'TRUE_BOSS') {
                return this._drawEnemyTrueBoss(ctx, tx, ty, tw, th, dmgFlash, showInterior, battle);
            }
        }

        // Colors Setup
        let bodyBase, bodyHigh, bodyShadow, panelColor;

        // 第二形態かどうかをチェック
        const isPhaseTwo = battle && battle.bossPhase === 2;

        if (isEnemy) {
            if (enemyTheme === 'mecha') {
                bodyBase = '#50606E'; bodyHigh = '#A9BBC7'; bodyShadow = '#1B242B'; panelColor = '#5ED3FF';
            } else if (enemyTheme === 'heaven') {
                bodyBase = '#DCE9F6'; bodyHigh = '#FFFFFF'; bodyShadow = '#97ABC2'; panelColor = '#F1C96B';
            } else if (tankType === 'HEAVY' || tankType === 'DEFENSE') {
                bodyBase = '#444'; bodyHigh = '#666'; bodyShadow = '#222'; panelColor = '#555';
            } else if (tankType === 'SCOUT') {
                bodyBase = '#388E3C'; bodyHigh = '#4CAF50'; bodyShadow = '#1B5E20'; panelColor = '#2E7D32';
            } else if (tankType === 'MAGICAL') {
                bodyBase = '#7B1FA2'; bodyHigh = '#9C27B0'; bodyShadow = '#4A148C'; panelColor = '#6A1B9A';
            } else if (tankType === 'BOSS') {
                bodyBase = '#1A1A1A'; bodyHigh = '#333'; bodyShadow = '#000'; panelColor = '#222';
            } else if (tankType === 'TRUE_BOSS') {
                // 第二形態はより派手でいかつい色に
                if (isPhaseTwo) {
                    bodyBase = '#8B0000'; bodyHigh = '#FF0000'; bodyShadow = '#4A0000'; panelColor = '#A00000';
                } else {
                    bodyBase = '#2A0A4A'; bodyHigh = '#4A148C'; bodyShadow = '#1A0030'; panelColor = '#3A0A5A';
                }
            } else { // Normal
                bodyBase = variant.base; bodyHigh = variant.high; bodyShadow = variant.shadow; panelColor = variant.trim;
            }
        } else {
            // プレイヤータンク：カスタムカラー対応
            const custom = window.game && window.game.saveData && window.game.saveData.tankCustom;
            const colorId = (custom && custom.color) || 'color_blue';
            const parts = window.TANK_PARTS;
            const colorDef = parts && parts.colors.find(c => c.id === colorId);
            if (colorDef && colorDef.isRainbow) {
                // レインボー：フレームで色相回転
                const hue = (_getFrameNow() * 0.5) % 360;
                bodyBase   = `hsl(${hue},70%,35%)`;
                bodyHigh   = `hsl(${(hue+40)%360},80%,60%)`;
                bodyShadow = `hsl(${(hue+20)%360},70%,20%)`;
                panelColor = `hsl(${(hue+20)%360},70%,40%)`;
            } else if (colorDef && colorDef.base) {
                bodyBase = colorDef.base; bodyHigh = colorDef.high;
                bodyShadow = colorDef.shadow; panelColor = colorDef.panel;
            } else {
                bodyBase = '#0277BD'; bodyHigh = '#29B6F6'; bodyShadow = '#01579B'; panelColor = '#0288D1';
            }
        }

        const cx = tx + tw / 2;
        const cy = ty + th / 2;

        ctx.save();
        ctx.translate(cx, ty + th);
        if (dmgFlash > 0.5) {
            // Math.random()の代わりにフレーム時刻ベースのシェイク（再現性あり、GC不要）
            const st = _getFrameNow() * 0.05;
            ctx.translate(Math.sin(st * 7.3) * 2, Math.sin(st * 11.7) * 1);
        }

        // Scale & Transform (DEFENSE/TRUE_BOSSはより大きく重々しく)
        let scaleX = 1.0;
        if (tankType === 'HEAVY' || tankType === 'DEFENSE' || tankType === 'BOSS') scaleX = 1.15;
        if (tankType === 'TRUE_BOSS') scaleX = isPhaseTwo ? 1.4 : 1.25; // 第二形態はさらに大きく
        if (tankType === 'SCOUT') scaleX = 0.95; // SCOUTは少し小さく
        ctx.scale(scaleX, 1.0);
        ctx.translate(-cx, -(ty + th));

        // 1. TREADS - 画像3スタイル: タイヤをはっきり見せる
        const treadH = 44;               // 高さアップ
        const treadW = tw * 0.80;
        const treadX = cx - treadW / 2;
        const treadY = ty + th - treadH;

        // キャタピラ本体
        const treadGrad = ctx.createLinearGradient(0, treadY, 0, treadY + treadH);
        treadGrad.addColorStop(0, '#4A5060');
        treadGrad.addColorStop(0.4, '#6A7080');
        treadGrad.addColorStop(1, '#252830');
        ctx.fillStyle = treadGrad;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 10);
        ctx.fill();
        ctx.strokeStyle = '#1A1C20';
        ctx.lineWidth = 2;
        ctx.stroke();

        // キャタピラの溝（点線）
        ctx.strokeStyle = '#1A1C20';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(treadX + 10, treadY + treadH * 0.5);
        ctx.lineTo(treadX + treadW - 10, treadY + treadH * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // ホイール（4個しっかり見える）
        const wheelCount = 4;
        const wRad = 14;
        const wY = treadY + treadH * 0.55;
        const wSpan = treadW - 50;
        for (let i = 0; i < wheelCount; i++) {
            const wx = treadX + 25 + i * (wSpan / (wheelCount - 1));
            // ホイール外周
            ctx.fillStyle = '#37474F';
            ctx.beginPath(); ctx.arc(wx, wY, wRad, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#1A252A'; ctx.lineWidth = 1.5; ctx.stroke();
            // ホイール内周
            ctx.fillStyle = '#546E7A';
            ctx.beginPath(); ctx.arc(wx, wY, wRad * 0.55, 0, Math.PI * 2); ctx.fill();
            // ハブ
            ctx.fillStyle = '#78909C';
            ctx.beginPath(); ctx.arc(wx, wY, wRad * 0.22, 0, Math.PI * 2); ctx.fill();
        }

        // 2. MAIN BODY (Dome) - ★原作準拠: 横広まん丸ドーム
        const bw = tw;
        const bh = th * 0.85;
        const by = treadY - bh + 25;

        // 原作に合わせて横幅広め・縦はやや抑えてまん丸感を出す
        const dRX = bw * 0.50;   // 横: 広め
        const dRY = bh * 0.48;   // 縦: やや抑えてまん丸に
        const dCX = cx;
        const dCY = treadY - dRY * 0.90; // ドーム中心をタイヤ直上に

        // ── ドーム影（奥行き感）──
        ctx.beginPath();
        ctx.ellipse(dCX + 6, dCY + 6, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fill();

        // ── ドーム本体 ──
        ctx.beginPath();
        ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.closePath();
        const domeKey = `dome2_${bodyBase}_${bodyHigh}_${bodyShadow}_${cx | 0}_${dCY | 0}`;
        const domeGrad = _getCachedGradient(ctx, domeKey, () => {
            const g = ctx.createRadialGradient(dCX - dRX * 0.35, dCY - dRY * 0.35, dRX * 0.08, dCX, dCY, dRX * 1.1);
            g.addColorStop(0,   bodyHigh);
            g.addColorStop(0.4, bodyBase);
            g.addColorStop(1,   bodyShadow);
            return g;
        });
        ctx.fillStyle = domeGrad;
        ctx.fill();

        // ── レンガ模様（横線＋縦目地）──
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(dCX, dCY, dRX - 1, dRY - 1, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1.5;
        const brickRows = 7;
        const brickH = (dRY * 1.8) / brickRows;
        for (let row = 0; row <= brickRows; row++) {
            const lineY = (dCY - dRY * 0.9) + row * brickH;
            ctx.beginPath();
            ctx.moveTo(dCX - dRX, lineY);
            ctx.lineTo(dCX + dRX, lineY);
            ctx.stroke();
            // 縦目地（段ごとにオフセット）
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(0,0,0,0.10)';
            const brickW = 32;
            const offset = (row % 2 === 0) ? 0 : brickW / 2;
            for (let bx2 = dCX - dRX + offset; bx2 < dCX + dRX; bx2 += brickW) {
                ctx.beginPath();
                ctx.moveTo(bx2, lineY);
                ctx.lineTo(bx2, lineY + brickH);
                ctx.stroke();
            }
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        }
        ctx.restore();

        // ── ドーム輪郭線 ──
        ctx.beginPath();
        ctx.ellipse(dCX, dCY, dRX, dRY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.30)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── ハイライト（上部の光沢）──
        ctx.beginPath();
        ctx.ellipse(dCX - dRX * 0.18, dCY - dRY * 0.3, dRX * 0.32, dRY * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();

        // 3. ── 塔2本・翼アーマー・中央大砲口・顔（強化版）──
        if (!showInterior) {

        // ── 翼アーマー（左右）: Image1インスパイアの金属翼板 ──
        const drawWings = (wingColor, wingHighlight, spiked) => {
            const wBaseY = dCY - dRY * 0.15;
            const wTipY  = dCY - dRY * 0.65;
            // 左翼
            ctx.fillStyle = wingColor;
            ctx.beginPath();
            ctx.moveTo(dCX - dRX + 4,  wBaseY + 10);
            ctx.lineTo(dCX - dRX - 22, wTipY + 10);
            ctx.lineTo(dCX - dRX - 35, wTipY - 8);
            ctx.lineTo(dCX - dRX - 18, wBaseY - 20);
            ctx.lineTo(dCX - dRX + 4,  wBaseY - 15);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = wingHighlight;
            ctx.beginPath();
            ctx.moveTo(dCX - dRX + 2,  wBaseY + 5);
            ctx.lineTo(dCX - dRX - 18, wTipY + 8);
            ctx.lineTo(dCX - dRX - 28, wTipY - 4);
            ctx.lineTo(dCX - dRX - 14, wBaseY - 16);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(dCX - dRX - 8, wBaseY - 5); ctx.lineTo(dCX - dRX - 26, wTipY); ctx.stroke();
            if (spiked) {
                ctx.fillStyle = wingColor;
                ctx.beginPath(); ctx.moveTo(dCX - dRX - 30, wTipY - 2); ctx.lineTo(dCX - dRX - 44, wTipY - 14); ctx.lineTo(dCX - dRX - 28, wTipY - 16); ctx.closePath(); ctx.fill();
            }
            // 右翼
            ctx.fillStyle = wingColor;
            ctx.beginPath();
            ctx.moveTo(dCX + dRX - 4,  wBaseY + 10);
            ctx.lineTo(dCX + dRX + 22, wTipY + 10);
            ctx.lineTo(dCX + dRX + 35, wTipY - 8);
            ctx.lineTo(dCX + dRX + 18, wBaseY - 20);
            ctx.lineTo(dCX + dRX - 4,  wBaseY - 15);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = wingHighlight;
            ctx.beginPath();
            ctx.moveTo(dCX + dRX - 2,  wBaseY + 5);
            ctx.lineTo(dCX + dRX + 18, wTipY + 8);
            ctx.lineTo(dCX + dRX + 28, wTipY - 4);
            ctx.lineTo(dCX + dRX + 14, wBaseY - 16);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(dCX + dRX + 8, wBaseY - 5); ctx.lineTo(dCX + dRX + 26, wTipY); ctx.stroke();
            if (spiked) {
                ctx.fillStyle = wingColor;
                ctx.beginPath(); ctx.moveTo(dCX + dRX + 30, wTipY - 2); ctx.lineTo(dCX + dRX + 44, wTipY - 14); ctx.lineTo(dCX + dRX + 28, wTipY - 16); ctx.closePath(); ctx.fill();
            }
        };

        // ── 城塔を左右に描く（強化版: 銃眼3個・アーチ窓・詳細石目）──
        const drawTower = (tcx, roofColor) => {
            const tRad = 22;
            const tH   = bh * 0.54;
            const tTopY = treadY - tH;

            // 塔本体グラデ
            const tG = ctx.createLinearGradient(tcx - tRad, 0, tcx + tRad, 0);
            tG.addColorStop(0,   '#8A6A38');
            tG.addColorStop(0.28,'#C8A060');
            tG.addColorStop(0.65,'#D4AA70');
            tG.addColorStop(1,   '#9A7A48');
            ctx.fillStyle = tG;
            ctx.beginPath(); ctx.rect(tcx - tRad, tTopY, tRad * 2, tH); ctx.fill();

            // 横の石目線
            ctx.strokeStyle = 'rgba(0,0,0,0.17)'; ctx.lineWidth = 1;
            for (let r = 1; r <= 6; r++) {
                const ly = tTopY + r * (tH / 7);
                ctx.beginPath(); ctx.moveTo(tcx - tRad + 2, ly); ctx.lineTo(tcx + tRad - 2, ly); ctx.stroke();
            }
            // 縦目地（互い違い）
            ctx.strokeStyle = 'rgba(0,0,0,0.09)'; ctx.lineWidth = 1;
            for (let r = 0; r <= 6; r++) {
                const ly = tTopY + r * (tH / 7);
                const offset = (r % 2 === 0) ? 0 : tRad;
                for (let vx = tcx - tRad + offset; vx < tcx + tRad; vx += tRad) {
                    ctx.beginPath(); ctx.moveTo(vx, ly); ctx.lineTo(vx, ly + tH / 7); ctx.stroke();
                }
            }
            // 輪郭
            ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 1.8;
            ctx.strokeRect(tcx - tRad, tTopY, tRad * 2, tH);

            // アーチ窓（尖頭アーチ）
            const winY = tTopY + tH * 0.42;
            ctx.fillStyle = 'rgba(8,8,25,0.85)';
            ctx.beginPath();
            ctx.moveTo(tcx - 7, winY + 10);
            ctx.lineTo(tcx - 7, winY);
            ctx.quadraticCurveTo(tcx - 7, winY - 12, tcx, winY - 16);
            ctx.quadraticCurveTo(tcx + 7, winY - 12, tcx + 7, winY);
            ctx.lineTo(tcx + 7, winY + 10);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#9A7A50'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tcx - 6, winY);
            ctx.quadraticCurveTo(tcx - 6, winY - 10, tcx, winY - 14);
            ctx.quadraticCurveTo(tcx + 6, winY - 10, tcx + 6, winY);
            ctx.stroke();
            // 窓の光
            ctx.fillStyle = 'rgba(255,220,80,0.18)';
            ctx.beginPath(); ctx.arc(tcx, winY - 4, 5, 0, Math.PI*2); ctx.fill();

            // 銃眼 x3（バトルメント）
            const mW = 7, mH = 11, mGap = 5;
            const mTotalW = 3 * mW + 2 * mGap;
            ctx.fillStyle = '#C8A060'; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const mx = tcx - mTotalW / 2 + i * (mW + mGap);
                ctx.beginPath(); ctx.rect(mx, tTopY - mH, mW, mH + 2); ctx.fill(); ctx.stroke();
            }
            // 天板ライン
            ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(tcx - tRad, tTopY); ctx.lineTo(tcx + tRad, tTopY); ctx.stroke();

            // 円錐屋根
            ctx.fillStyle = roofColor || (isEnemy ? '#BF360C' : '#C62828');
            ctx.beginPath();
            ctx.moveTo(tcx - tRad - 3, tTopY - mH);
            ctx.lineTo(tcx, tTopY - mH - 32);
            ctx.lineTo(tcx + tRad + 3, tTopY - mH);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tcx, tTopY - mH - 30); ctx.lineTo(tcx - tRad * 0.4, tTopY - mH - 3); ctx.stroke();

            // 旗ポール
            ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(tcx, tTopY - mH - 32); ctx.lineTo(tcx, tTopY - mH - 50); ctx.stroke();
            ctx.fillStyle = roofColor || (isEnemy ? '#E53935' : '#43A047');
            ctx.beginPath();
            ctx.moveTo(tcx, tTopY - mH - 50); ctx.lineTo(tcx + 12, tTopY - mH - 43);
            ctx.lineTo(tcx, tTopY - mH - 36); ctx.closePath(); ctx.fill();
        };

        // ── エンブレム（胸元の歯車メダル）共通ヘルパー ──
        const drawEmblem = (ex, ey, innerColor, gemColor) => {
            ctx.fillStyle = '#1A2838'; ctx.strokeStyle = '#4A7090'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(ex, ey, 17, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = innerColor; ctx.strokeStyle = 'rgba(70,120,160,0.7)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(ex, ey, 11, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // 歯車の歯 x8
            for (let t = 0; t < 8; t++) {
                const ang = t * Math.PI / 4;
                const tx1 = ex + Math.cos(ang) * 14, ty1 = ey + Math.sin(ang) * 14;
                const tx2 = ex + Math.cos(ang) * 19, ty2 = ey + Math.sin(ang) * 19;
                ctx.strokeStyle = '#4A7090'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2); ctx.stroke();
            }
            ctx.fillStyle = gemColor;
            ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(ex - 2, ey - 2, 2, 0, Math.PI*2); ctx.fill();
        };

        // タイプ別に翼・塔・砲口・顔・エンブレムを描く
        if (!isEnemy) {
            // ── プレイヤー: ロイヤルブルー翼 ──
            drawWings('#5070A0', '#7090C0', false);
            const towerOffsetX = dRX * 0.86;
            drawTower(dCX - towerOffsetX, '#C62828');
            drawTower(dCX + towerOffsetX, '#C62828');
        } else if (enemyTheme === 'mecha') {
            drawWings('#324654', '#5ED3FF', true);
            const towerOffsetX = dRX * 0.84;
            const drawMechaThemeTower = (tcx) => {
                const towerW = 32;
                const towerH = 88;
                const towerX = tcx - towerW / 2;
                const towerY = dCY - dRY - 18;
                const g = ctx.createLinearGradient(towerX, towerY, towerX + towerW, towerY);
                g.addColorStop(0, '#1A232B');
                g.addColorStop(0.5, '#50606E');
                g.addColorStop(1, '#24313A');
                ctx.fillStyle = g;
                ctx.fillRect(towerX, towerY, towerW, towerH);
                ctx.strokeStyle = 'rgba(94,211,255,0.75)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(towerX, towerY, towerW, towerH);
                for (let i = 0; i < 3; i++) {
                    const ly = towerY + 20 + i * 18;
                    ctx.strokeStyle = 'rgba(160,220,255,0.55)';
                    ctx.beginPath();
                    ctx.moveTo(towerX + 5, ly);
                    ctx.lineTo(towerX + towerW - 5, ly);
                    ctx.stroke();
                }
                ctx.fillStyle = '#8BE9FF';
                ctx.fillRect(towerX + towerW / 2 - 3, towerY - 14, 6, 14);
                ctx.beginPath(); ctx.arc(towerX + towerW / 2, towerY - 18, 5, 0, Math.PI * 2); ctx.fill();
            };
            drawMechaThemeTower(dCX - towerOffsetX);
            drawMechaThemeTower(dCX + towerOffsetX);
        } else if (enemyTheme === 'heaven') {
            drawWings('#F6FBFF', '#F1C96B', false);
            const towerOffsetX = dRX * 0.84;
            const drawHeavenThemeTower = (tcx) => {
                const towerW = 30;
                const towerH = 84;
                const towerX = tcx - towerW / 2;
                const towerY = dCY - dRY - 16;
                const g = ctx.createLinearGradient(towerX, towerY, towerX, towerY + towerH);
                g.addColorStop(0, '#FFFFFF');
                g.addColorStop(0.5, '#E8F1FB');
                g.addColorStop(1, '#C4D4E6');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.roundRect(towerX, towerY, towerW, towerH, 10);
                ctx.fill();
                ctx.strokeStyle = 'rgba(241,201,107,0.9)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = '#F1C96B';
                ctx.beginPath();
                ctx.moveTo(towerX - 4, towerY + 8);
                ctx.lineTo(towerX + towerW / 2, towerY - 18);
                ctx.lineTo(towerX + towerW + 4, towerY + 8);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(towerX + towerW / 2, towerY + 12);
                ctx.lineTo(towerX + towerW / 2, towerY + towerH - 14);
                ctx.stroke();
            };
            drawHeavenThemeTower(dCX - towerOffsetX);
            drawHeavenThemeTower(dCX + towerOffsetX);
        } else if (tankType === 'SCOUT') {
            // ── SCOUT: 軽量グリーン翼（細くてスリム）──
            drawWings('#2E6030', '#4CAF50', false);
            const towerOffsetX = dRX * 0.84;
            drawTower(dCX - towerOffsetX, '#2E7D32');
            drawTower(dCX + towerOffsetX, '#2E7D32');
        } else if (tankType === 'HEAVY' || tankType === 'DEFENSE') {
            // ── HEAVY: 重装甲グレー翼（スパイク付き）──
            drawWings('#333', '#555', true);
            const towerOffsetX = dRX * 0.86;
            drawTower(dCX - towerOffsetX, '#8B0000');
            drawTower(dCX + towerOffsetX, '#8B0000');
        } else if (tankType === 'MAGICAL') {
            // ── MAGICAL: 魔法クリスタル翼 ──
            drawWings('#5A0090', '#9C27B0', false);
            const towerOffsetX = dRX * 0.84;
            drawTower(dCX - towerOffsetX, '#6A1B9A');
            drawTower(dCX + towerOffsetX, '#6A1B9A');
        } else if (tankType === 'BOSS') {
            // ── BOSS: ゴールド装甲翼（スパイク付き）──
            drawWings('#664400', '#AA7700', true);
            const towerOffsetX = dRX * 0.86;
            drawTower(dCX - towerOffsetX, '#B8860B');
            drawTower(dCX + towerOffsetX, '#B8860B');
        } else if (tankType === 'TRUE_BOSS') {
            // ── TRUE_BOSS: 禍々しい紫黒翼（スパイク付き）──
            drawWings('#2A0050', '#6A00C0', true);
            const towerOffsetX = dRX * (isPhaseTwo ? 0.90 : 0.86);
            drawTower(dCX - towerOffsetX, isPhaseTwo ? '#C00000' : '#4A0080');
            drawTower(dCX + towerOffsetX, isPhaseTwo ? '#C00000' : '#4A0080');
        } else {
            // ── NORMAL: 標準レッド翼 ──
            drawWings('#882020', '#BB4040', false);
            const towerOffsetX = dRX * 0.84;
            drawTower(dCX - towerOffsetX, '#BF360C');
            drawTower(dCX + towerOffsetX, '#BF360C');
        }

        // ── ドーム頂上の旗 ──
        const domeTopX = dCX;
        const domeTopY = dCY - dRY;
        ctx.fillStyle = '#C8A060';
        ctx.beginPath(); ctx.ellipse(domeTopX, domeTopY, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#D4AA70';
        ctx.beginPath(); ctx.rect(domeTopX - 5, domeTopY - 12, 10, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = isEnemy ? '#BF360C' : '#C62828';
        ctx.beginPath();
        ctx.moveTo(domeTopX - 8, domeTopY - 12); ctx.lineTo(domeTopX, domeTopY - 24);
        ctx.lineTo(domeTopX + 8, domeTopY - 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(domeTopX, domeTopY - 24); ctx.lineTo(domeTopX, domeTopY - 38); ctx.stroke();
        ctx.fillStyle = isEnemy ? '#E53935' : '#43A047';
        ctx.beginPath();
        ctx.moveTo(domeTopX, domeTopY - 38); ctx.lineTo(domeTopX + 12, domeTopY - 32);
        ctx.lineTo(domeTopX, domeTopY - 26); ctx.closePath(); ctx.fill();

        // ── 中央の大砲口（強化版：二重リング＋砲身リング装飾）──
        const cannonSide = isEnemy ? -1 : 1;
        const bigCannonX = dCX + cannonSide * dRX * 0.30;
        const bigCannonY = dCY + dRY * 0.10;
        const bigCannonR = dRX * 0.20;

        // 外枠リング（二重）
        ctx.fillStyle = '#2A3540';
        ctx.beginPath(); ctx.arc(bigCannonX, bigCannonY, bigCannonR + 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#37474F';
        ctx.beginPath(); ctx.arc(bigCannonX, bigCannonY, bigCannonR + 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(100,140,160,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        // 砲口の穴
        ctx.fillStyle = '#050810';
        ctx.beginPath(); ctx.arc(bigCannonX, bigCannonY, bigCannonR, 0, Math.PI * 2); ctx.fill();
        // 穴の内部ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.ellipse(bigCannonX - bigCannonR*0.3, bigCannonY - bigCannonR*0.3, bigCannonR*0.4, bigCannonR*0.25, -0.5, 0, Math.PI*2); ctx.fill();
        // 砲身（穴から突き出る）
        const barrelLen = 44;
        const barrelR   = bigCannonR * 0.62;
        const barrelGrad = ctx.createLinearGradient(
            bigCannonX, bigCannonY - barrelR,
            bigCannonX, bigCannonY + barrelR
        );
        barrelGrad.addColorStop(0, '#90A4AE');
        barrelGrad.addColorStop(0.4, '#B0BEC5');
        barrelGrad.addColorStop(1, '#455A64');
        ctx.fillStyle = barrelGrad;
        ctx.beginPath();
        ctx.ellipse(bigCannonX + cannonSide * barrelLen * 0.5, bigCannonY,
                    Math.abs(cannonSide * barrelLen) * 0.55, barrelR, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        // 砲身リング装飾
        const ringX = bigCannonX + cannonSide * barrelLen * 0.65;
        ctx.fillStyle = '#3A4858'; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(ringX, bigCannonY, 5, barrelR + 3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // 砲口先端リング（二重）
        const tipX = bigCannonX + cannonSide * barrelLen;
        ctx.fillStyle = '#2A3540';
        ctx.beginPath(); ctx.arc(tipX, bigCannonY, barrelR + 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#37474F';
        ctx.beginPath(); ctx.arc(tipX, bigCannonY, barrelR + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#050810';
        ctx.beginPath(); ctx.arc(tipX, bigCannonY, barrelR, 0, Math.PI * 2); ctx.fill();

        // ── タイプ別：目の形・固有装飾 ──
        const eyeCY    = dCY - dRY * 0.28;
        const eyeR     = dRX * 0.09;
        const eyeGap   = eyeR * 3.0;
        const eyeBaseX = dCX + cannonSide * dRX * 0.18;

        // 目を2個描くヘルパー
        const drawEyes = (style, color = '#0A0A14', scaleY = 1) => {
            for (let e = 0; e < 2; e++) {
                const ex = eyeBaseX + cannonSide * (e - 0.5) * eyeGap;
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.beginPath(); ctx.ellipse(ex+1, eyeCY+1, eyeR+2, (eyeR+2)*scaleY, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#C8C8D8';
                ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR+1.5, (eyeR+1.5)*scaleY, 0, 0, Math.PI*2); ctx.fill();
                if (style === 'slit') {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR, eyeR*scaleY, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR*0.28, eyeR*scaleY*0.9, 0, 0, Math.PI*2); ctx.fill();
                } else if (style === 'star') {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR, eyeR*scaleY, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#FFD700';
                    ctx.save(); ctx.translate(ex, eyeCY);
                    ctx.beginPath();
                    for (let s = 0; s < 5; s++) {
                        const a = (s*4*Math.PI/5) - Math.PI/2;
                        const b = (s*4*Math.PI/5 + 2*Math.PI/5) - Math.PI/2;
                        if (s===0) ctx.moveTo(Math.cos(a)*eyeR*0.7, Math.sin(a)*eyeR*0.7*scaleY);
                        else       ctx.lineTo(Math.cos(a)*eyeR*0.7, Math.sin(a)*eyeR*0.7*scaleY);
                        ctx.lineTo(Math.cos(b)*eyeR*0.3, Math.sin(b)*eyeR*0.3*scaleY);
                    }
                    ctx.closePath(); ctx.fill(); ctx.restore();
                } else if (style === 'angry') {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR, eyeR*scaleY, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.55)';
                    ctx.beginPath(); ctx.arc(ex - eyeR*0.28, eyeCY - eyeR*0.3*scaleY, eyeR*0.28, 0, Math.PI*2); ctx.fill();
                    const eySign = (e === 0) ? 1 : -1;
                    ctx.strokeStyle = '#1A0000'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(ex - eyeR*0.8, eyeCY - eyeR*1.1*scaleY);
                    ctx.lineTo(ex + eyeR*0.8*eySign*cannonSide, eyeCY - eyeR*1.5*scaleY);
                    ctx.stroke();
                } else if (style === 'narrow') {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR, eyeR*scaleY, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.beginPath(); ctx.arc(ex - eyeR*0.28, eyeCY - eyeR*0.3*scaleY, eyeR*0.28, 0, Math.PI*2); ctx.fill();
                } else {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.ellipse(ex, eyeCY, eyeR, eyeR*scaleY, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.beginPath(); ctx.arc(ex - eyeR*0.28, eyeCY - eyeR*0.32, eyeR*0.3, 0, Math.PI*2); ctx.fill();
                }
            }
        };

        // ── タイプ別：目・固有装飾 ──
        if (!isEnemy) {
            // プレイヤー: 黒目＋歯車エンブレム（ブルー）
            drawEyes('normal', '#0A0A14', 1.0);
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#0A1520', '#5A90B0');
        } else if (tankType === 'SCOUT') {
            // SCOUT: 細い目＋アンテナ＋緑エンブレム
            drawEyes('narrow', '#0A2A0A', 0.55);
            ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(dCX - 16, dCY - dRY * 0.72); ctx.lineTo(dCX - 26, dCY - dRY - 22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(dCX + 16, dCY - dRY * 0.72); ctx.lineTo(dCX + 26, dCY - dRY - 22); ctx.stroke();
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath(); ctx.arc(dCX - 26, dCY - dRY - 22, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(dCX + 26, dCY - dRY - 22, 5, 0, Math.PI*2); ctx.fill();
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#0A200A', '#4CAF50');
        } else if (tankType === 'HEAVY' || tankType === 'DEFENSE') {
            // HEAVY: 怒り眉大きな目＋スパイク装甲＋グレーエンブレム
            drawEyes('angry', '#1A0000', 1.15);
            ctx.fillStyle = '#444';
            for (let s = 0; s < 4; s++) {
                const sy = dCY - dRY * 0.35 + s * dRY * 0.24;
                ctx.beginPath();
                ctx.moveTo(dCX - dRX + 3, sy); ctx.lineTo(dCX - dRX - 15, sy + 7); ctx.lineTo(dCX - dRX + 3, sy + 14); ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(dCX + dRX - 3, sy); ctx.lineTo(dCX + dRX + 15, sy + 7); ctx.lineTo(dCX + dRX - 3, sy + 14); ctx.closePath(); ctx.fill();
            }
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#1A0A0A', '#888');
        } else if (tankType === 'MAGICAL') {
            // MAGICAL: 星形の目＋クリスタル＋紫エンブレム
            drawEyes('star', '#1A0030', 1.0);
            [[dCX - 38, dCY - dRY + 8], [dCX, dCY - dRY - 8], [dCX + 38, dCY - dRY + 8]].forEach(([cx2, cy2]) => {
                ctx.fillStyle = '#CE93D8';
                ctx.beginPath(); ctx.moveTo(cx2, cy2 - 12); ctx.lineTo(cx2+6, cy2); ctx.lineTo(cx2, cy2+12); ctx.lineTo(cx2-6, cy2); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#9C27B0'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath(); ctx.moveTo(cx2-2, cy2-9); ctx.lineTo(cx2+1, cy2); ctx.lineTo(cx2-2, cy2+9); ctx.closePath(); ctx.fill();
            });
            const auraA = 0.12 + Math.sin((_getFrameNow() || 0) * 0.04) * 0.06;
            ctx.strokeStyle = `rgba(180,0,255,${auraA})`; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX + 6, dRY + 6, 0, 0, Math.PI*2); ctx.stroke();
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#150025', '#AB47BC');
        } else if (tankType === 'BOSS') {
            // BOSS: 赤目＋豪華王冠＋ゴールドエンブレム
            drawEyes('normal', '#8B0000', 1.1);
            ctx.fillStyle = '#FFD700';
            const crownY = dCY - dRY - 6;
            ctx.beginPath();
            ctx.moveTo(dCX - 32, crownY);
            ctx.lineTo(dCX - 22, crownY - 18); ctx.lineTo(dCX - 11, crownY - 8);
            ctx.lineTo(dCX,      crownY - 23); ctx.lineTo(dCX + 11, crownY - 8);
            ctx.lineTo(dCX + 22, crownY - 18); ctx.lineTo(dCX + 32, crownY);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1.5; ctx.stroke();
            // 宝石 x3
            ctx.fillStyle = '#FF1744'; ctx.beginPath(); ctx.arc(dCX, crownY - 20, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#00BCD4'; ctx.beginPath(); ctx.arc(dCX - 21, crownY - 15, 3.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#00BCD4'; ctx.beginPath(); ctx.arc(dCX + 21, crownY - 15, 3.5, 0, Math.PI*2); ctx.fill();
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#1A1000', '#FFD700');
        } else if (tankType === 'TRUE_BOSS') {
            // TRUE_BOSS: 縦スリット目＋大きな角2本＋脈動オーラ＋暗黒エンブレム
            drawEyes('slit', '#200020', 0.9);
            const hornColor = isPhaseTwo ? '#8B0000' : '#4A0080';
            const hornAccent = isPhaseTwo ? '#FF0000' : '#6A00B0';
            ctx.fillStyle = hornColor;
            ctx.beginPath(); ctx.moveTo(dCX - 38, dCY - dRY + 6); ctx.lineTo(dCX - 26, dCY - dRY - 38); ctx.lineTo(dCX - 17, dCY - dRY + 6); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = hornAccent; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(dCX + 38, dCY - dRY + 6); ctx.lineTo(dCX + 26, dCY - dRY - 38); ctx.lineTo(dCX + 17, dCY - dRY + 6); ctx.closePath(); ctx.fill();
            ctx.stroke();
            // 角の小トゲ
            ctx.fillStyle = hornAccent;
            ctx.beginPath(); ctx.moveTo(dCX - 38, dCY - dRY + 4); ctx.lineTo(dCX - 44, dCY - dRY - 10); ctx.lineTo(dCX - 36, dCY - dRY - 6); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(dCX + 38, dCY - dRY + 4); ctx.lineTo(dCX + 44, dCY - dRY - 10); ctx.lineTo(dCX + 36, dCY - dRY - 6); ctx.closePath(); ctx.fill();
            const auraAlpha = 0.15 + Math.sin((_getFrameNow() || 0) * 0.04) * 0.08;
            const auraColor = isPhaseTwo ? `rgba(255,0,0,${auraAlpha})` : `rgba(150,0,255,${auraAlpha})`;
            ctx.strokeStyle = auraColor; ctx.lineWidth = 9;
            ctx.beginPath(); ctx.ellipse(dCX, dCY, dRX + 10, dRY + 10, 0, 0, Math.PI*2); ctx.stroke();
            const emblemGem = isPhaseTwo ? '#FF1744' : '#9C27B0';
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#0A0010', emblemGem);
        } else {
            // NORMAL: 標準目＋シンプルエンブレム
            drawEyes('normal', '#0A0A14', 1.0);
            drawEmblem(dCX - cannonSide * dRX * 0.28, dCY + dRY * 0.38, '#150808', '#E64A19');
        }

        } // end if (!showInterior) - tower, flag, face, battlements

        // 4. INTERIOR FRAME (外観時はエンブレム非表示・顔で代用済み)
        if (!showInterior) {
            // 外観時: 顔で表現済みのためエンブレムは描かない
        } else {
            // INTERIOR VIEW CUTOUT
            // Darken inside background
            const ix = CONFIG.TANK.OFFSET_X + wt;
            const iy = CONFIG.TANK.OFFSET_Y + wt + 20; // Align with logic
            const iw = CONFIG.TANK.INTERIOR_W - wt * 2;
            const ih = CONFIG.TANK.INTERIOR_H - wt * 2; // Approximate

            // We need to draw the "Frame" around the interior since the interior is drawn separately
            // Actually, game.js draws tank.draw() which uses this function.
            // But tank.draw() ALSO draws the internal platforms/machines ON TOP of this.
            // So we just need to draw the "Container" here.

            const frameColor = '#5D4037'; // Wood/Metal mixed interior
            ctx.fillStyle = frameColor;
            // Left Wall
            ctx.fillRect(tx + 5, ty + 20, wt + 10, th - 30);
            // Right Wall
            ctx.fillRect(tx + tw - wt - 15, ty + 20, wt + 10, th - 30);
            // Bottom Floor
            ctx.fillRect(tx + 5, ty + th - 25, tw - 10, 25);

            // Rivets on frame
            ctx.fillStyle = '#8D6E63';
            for (let y = ty + 40; y < ty + th - 40; y += 30) {
                ctx.beginPath(); ctx.arc(tx + 15, y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(tx + tw - 15, y, 4, 0, Math.PI * 2); ctx.fill();
            }
        }

        // === プレイヤータンク：エフェクトオーラ（周回オブジェクト） ===
        if (!isEnemy) {
            const _efxCustom2 = window.game && window.game.saveData && window.game.saveData.tankCustom;
            const _efxId2 = (_efxCustom2 && _efxCustom2.effect) || 'effect_normal';
            if (_efxId2 !== 'effect_normal') {
                // ★修正: カスタマイズ画面ではプレビュー用スケール(0.55)がかかるためエフェクト非表示
                const _isCustomizePreview = window.game && window.game.state === 'customize';
                if (_isCustomizePreview) { /* skip orbit in customize preview */ } else {
                // タンク中心・周回半径
                const orbitCx = cx;
                const orbitCy = ty + th * 0.45;
                const orbitRx = tw * 0.58;  // 横半径
                const orbitRy = th * 0.30;  // 縦半径（楕円で奥行き感）

                ctx.save();
                // ★修正: 上画面（y < OFFSET_Y）にのみ描画するようクリッピング
                const _upperH = (window.CONFIG && window.CONFIG.TANK && window.CONFIG.TANK.OFFSET_Y) || 420;
                ctx.beginPath();
                ctx.rect(0, 0, ctx.canvas.width, _upperH);
                ctx.clip();

                // --- 共通描画ヘルパー ---
                // 火の玉を描く
                const drawFireball = (ox, oy, r) => {
                    ctx.fillStyle = 'rgba(255,60,0,0.9)';
                    ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,200,0,0.85)';
                    ctx.beginPath(); ctx.arc(ox - r * 0.25, oy - r * 0.25, r * 0.55, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,180,0.7)';
                    ctx.beginPath(); ctx.arc(ox - r * 0.35, oy - r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.fill();
                };
                // 雪の結晶を描く
                const drawSnowflake = (ox, oy, r) => {
                    ctx.strokeStyle = 'rgba(180,240,255,0.95)'; ctx.lineWidth = 1.8;
                    for (let li = 0; li < 3; li++) {
                        const a = (li * Math.PI / 3);
                        ctx.beginPath();
                        ctx.moveTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
                        ctx.lineTo(ox - Math.cos(a) * r, oy - Math.sin(a) * r);
                        ctx.stroke();
                        // 枝
                        const bx1 = ox + Math.cos(a) * r * 0.5, by1 = oy + Math.sin(a) * r * 0.5;
                        const bx2 = ox - Math.cos(a) * r * 0.5, by2 = oy - Math.sin(a) * r * 0.5;
                        for (const [bx, by] of [[bx1,by1],[bx2,by2]]) {
                            ctx.beginPath();
                            ctx.moveTo(bx + Math.cos(a + Math.PI/2)*r*0.3, by + Math.sin(a + Math.PI/2)*r*0.3);
                            ctx.lineTo(bx - Math.cos(a + Math.PI/2)*r*0.3, by - Math.sin(a + Math.PI/2)*r*0.3);
                            ctx.stroke();
                        }
                    }
                    ctx.fillStyle = 'rgba(220,248,255,0.95)';
                    ctx.beginPath(); ctx.arc(ox, oy, r * 0.22, 0, Math.PI * 2); ctx.fill();
                };
                // 稲妻マークを描く
                const drawBolt = (ox, oy, r) => {
                    ctx.fillStyle = 'rgba(255,230,0,0.95)';
                    ctx.strokeStyle = 'rgba(255,255,150,0.8)'; ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(ox + r*0.2, oy - r);
                    ctx.lineTo(ox - r*0.2, oy - r*0.05);
                    ctx.lineTo(ox + r*0.15, oy - r*0.05);
                    ctx.lineTo(ox - r*0.2, oy + r);
                    ctx.lineTo(ox + r*0.2, oy + r*0.05);
                    ctx.lineTo(ox - r*0.15, oy + r*0.05);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                };
                // ハートを描く
                const drawHeart = (ox, oy, r) => {
                    ctx.fillStyle = 'rgba(255,100,160,0.95)';
                    ctx.strokeStyle = 'rgba(255,180,210,0.8)'; ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(ox, oy + r * 0.8);
                    ctx.bezierCurveTo(ox - r * 1.1, oy + r * 0.2, ox - r * 1.1, oy - r * 0.7, ox, oy - r * 0.25);
                    ctx.bezierCurveTo(ox + r * 1.1, oy - r * 0.7, ox + r * 1.1, oy + r * 0.2, ox, oy + r * 0.8);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                    // ハイライト
                    ctx.fillStyle = 'rgba(255,220,235,0.7)';
                    ctx.beginPath(); ctx.ellipse(ox - r*0.3, oy - r*0.1, r*0.25, r*0.15, -0.5, 0, Math.PI*2); ctx.fill();
                };
                // 月を描く
                const drawMoon = (ox, oy, r) => {
                    ctx.fillStyle = 'rgba(200,160,255,0.95)';
                    ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
                    // 欠け部分（三日月）
                    ctx.fillStyle = 'rgba(30,0,50,0.92)';
                    ctx.beginPath(); ctx.arc(ox + r * 0.35, oy - r * 0.1, r * 0.78, 0, Math.PI * 2); ctx.fill();
                    // 星のきらめき
                    ctx.fillStyle = 'rgba(230,200,255,0.9)';
                    ctx.beginPath(); ctx.arc(ox - r * 0.5, oy - r * 0.6, r * 0.12, 0, Math.PI * 2); ctx.fill();
                };

                // エフェクト別設定（個数・サイズ・描画関数）
                const efxConfig = {
                    effect_fire:    { count: 3, r: 9,  draw: drawFireball },
                    effect_ice:     { count: 4, r: 10, draw: drawSnowflake },
                    effect_thunder: { count: 3, r: 9,  draw: drawBolt },
                    effect_holy:    { count: 4, r: 8,  draw: drawHeart },
                    effect_dark:    { count: 3, r: 10, draw: drawMoon },
                };
                const cfg = efxConfig[_efxId2];
                if (cfg) {
                    for (let oi = 0; oi < cfg.count; oi++) {
                        // ★修正: 時間を使わず固定角度で配置（動き回らない）
                        const angle = (oi / cfg.count) * Math.PI * 2;
                        const ox = orbitCx + Math.cos(angle) * orbitRx;
                        const oy = orbitCy + Math.sin(angle) * orbitRy;
                        cfg.draw(ox, oy, cfg.r);
                    }
                }

                ctx.restore();
                } // end if (!_isCustomizePreview)
            }
        }

        // === プレイヤータンク：装甲オーバーレイ ===
        if (!isEnemy) {
            const custom = window.game && window.game.saveData && window.game.saveData.tankCustom;
            const armorId = (custom && custom.armor) || 'armor_normal';
            const bx = tx + 15, bw2 = tw - 30;
            const by2 = ty + 20;

            if (armorId === 'armor_spike') {
                // スパイク装甲：左右＋上部にトゲ（より大きく・目立つ色）
                const spikeColor = '#E0E0E0';
                const spikeStroke = '#999';
                ctx.fillStyle = spikeColor;
                ctx.strokeStyle = spikeStroke; ctx.lineWidth = 1.2;
                // 左右のトゲ（大きめ）
                for (let i = 0; i < 5; i++) {
                    const sy = by2 + 15 + i * 26;
                    // 左
                    ctx.beginPath();
                    ctx.moveTo(tx + 20, sy); ctx.lineTo(tx - 18, sy + 6); ctx.lineTo(tx + 20, sy + 12);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                    // 右
                    ctx.beginPath();
                    ctx.moveTo(tx + tw - 20, sy); ctx.lineTo(tx + tw + 18, sy + 6); ctx.lineTo(tx + tw - 20, sy + 12);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                }
                // 上部プレート＋上向きトゲ3本
                ctx.fillStyle = bodyBase;
                ctx.fillRect(cx - 75, by2, 150, 14);
                ctx.strokeStyle = spikeColor; ctx.lineWidth = 1.5;
                ctx.strokeRect(cx - 75, by2, 150, 14);
                ctx.fillStyle = spikeColor;
                ctx.strokeStyle = spikeStroke; ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const spx = cx - 40 + i * 40;
                    ctx.beginPath();
                    ctx.moveTo(spx - 8, by2); ctx.lineTo(spx, by2 - 18); ctx.lineTo(spx + 8, by2);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                }

            } else if (armorId === 'armor_shield') {
                // シールド型：大型の盾＋紋章（より存在感を出す）
                const shieldX = (dir === 1 ? tx + tw - 8 : tx - 36);
                const shieldW = 36, shieldH = 100;
                const shieldTop = ty + 55;
                // 盾の外枠グロー
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = bodyHigh;
                ctx.beginPath();
                ctx.moveTo(shieldX - 4, shieldTop - 4);
                ctx.lineTo(shieldX + shieldW + 4, shieldTop - 4);
                ctx.lineTo(shieldX + shieldW + 4, shieldTop + shieldH * 0.65);
                ctx.lineTo(shieldX + shieldW / 2, shieldTop + shieldH + 4);
                ctx.lineTo(shieldX - 4, shieldTop + shieldH * 0.65);
                ctx.closePath(); ctx.fill();
                ctx.restore();
                // 盾本体
                ctx.fillStyle = bodyHigh;
                ctx.beginPath();
                ctx.moveTo(shieldX, shieldTop);
                ctx.lineTo(shieldX + shieldW, shieldTop);
                ctx.lineTo(shieldX + shieldW, shieldTop + shieldH * 0.65);
                ctx.lineTo(shieldX + shieldW / 2, shieldTop + shieldH);
                ctx.lineTo(shieldX, shieldTop + shieldH * 0.65);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
                // 盾の縦ライン
                ctx.strokeStyle = bodyBase; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(shieldX + shieldW / 2, shieldTop + 6);
                ctx.lineTo(shieldX + shieldW / 2, shieldTop + shieldH - 10);
                ctx.stroke();
                // 盾の中央紋章（星形）
                const embX = shieldX + shieldW / 2, embY = shieldTop + 38, embR = 11;
                ctx.fillStyle = bodyBase;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
                    const b = (i * 4 * Math.PI / 5 + 2 * Math.PI / 5) - Math.PI / 2;
                    if (i === 0) ctx.moveTo(embX + Math.cos(a) * embR, embY + Math.sin(a) * embR);
                    else ctx.lineTo(embX + Math.cos(a) * embR, embY + Math.sin(a) * embR);
                    ctx.lineTo(embX + Math.cos(b) * embR * 0.42, embY + Math.sin(b) * embR * 0.42);
                }
                ctx.closePath(); ctx.fill();

            } else if (armorId === 'armor_wings') {
                // 天使の翼：大型化＋羽毛ライン追加
                const t = _getFrameNow() * 0.012;
                const flapY = Math.sin(t) * 8;
                const flapX = Math.sin(t * 0.7) * 3;
                // 翼の影（奥行き感）
                ctx.save();
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = '#FFD700';
                // 左翼影
                ctx.beginPath();
                ctx.moveTo(tx + 14, ty + 70 + flapY + 5);
                ctx.bezierCurveTo(tx - 52, ty + 30 + flapY, tx - 65, ty + 130 + flapY, tx + 10, ty + 175 + flapY);
                ctx.bezierCurveTo(tx - 18, ty + 140 + flapY, tx - 10, ty + 95 + flapY, tx + 14, ty + 70 + flapY + 5);
                ctx.fill();
                // 右翼影
                ctx.beginPath();
                ctx.moveTo(tx + tw - 14, ty + 70 + flapY + 5);
                ctx.bezierCurveTo(tx + tw + 52, ty + 30 + flapY, tx + tw + 65, ty + 130 + flapY, tx + tw - 10, ty + 175 + flapY);
                ctx.bezierCurveTo(tx + tw + 18, ty + 140 + flapY, tx + tw + 10, ty + 95 + flapY, tx + tw - 14, ty + 70 + flapY + 5);
                ctx.fill();
                ctx.restore();
                // 翼本体
                ctx.fillStyle = 'rgba(255,255,210,0.88)';
                ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
                // 左翼
                ctx.beginPath();
                ctx.moveTo(tx + 14 + flapX, ty + 70 + flapY);
                ctx.bezierCurveTo(tx - 50 + flapX, ty + 25 + flapY, tx - 62 + flapX, ty + 125 + flapY, tx + 10 + flapX, ty + 172 + flapY);
                ctx.bezierCurveTo(tx - 16 + flapX, ty + 135 + flapY, tx - 8 + flapX, ty + 90 + flapY, tx + 14 + flapX, ty + 70 + flapY);
                ctx.fill(); ctx.stroke();
                // 左翼の羽毛ライン3本
                ctx.strokeStyle = 'rgba(255,220,100,0.7)'; ctx.lineWidth = 1;
                for (let fi = 0; fi < 3; fi++) {
                    const fp = 0.3 + fi * 0.25;
                    const fx1 = tx + 14 + flapX + (tx - 50 + flapX - tx - 14 - flapX) * fp;
                    const fy1 = ty + 70 + flapY + (ty + 25 + flapY - ty - 70 - flapY) * fp;
                    ctx.beginPath();
                    ctx.moveTo(fx1, fy1);
                    ctx.lineTo(tx + 10 + flapX, ty + 172 + flapY - fi * 28);
                    ctx.stroke();
                }
                // 右翼
                ctx.fillStyle = 'rgba(255,255,210,0.88)';
                ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tx + tw - 14 - flapX, ty + 70 + flapY);
                ctx.bezierCurveTo(tx + tw + 50 - flapX, ty + 25 + flapY, tx + tw + 62 - flapX, ty + 125 + flapY, tx + tw - 10 - flapX, ty + 172 + flapY);
                ctx.bezierCurveTo(tx + tw + 16 - flapX, ty + 135 + flapY, tx + tw + 8 - flapX, ty + 90 + flapY, tx + tw - 14 - flapX, ty + 70 + flapY);
                ctx.fill(); ctx.stroke();
                // 右翼の羽毛ライン3本
                ctx.strokeStyle = 'rgba(255,220,100,0.7)'; ctx.lineWidth = 1;
                for (let fi = 0; fi < 3; fi++) {
                    const fp = 0.3 + fi * 0.25;
                    const fx1 = tx + tw - 14 - flapX + (tx + tw + 50 - flapX - (tx + tw - 14 - flapX)) * fp;
                    const fy1 = ty + 70 + flapY + (ty + 25 + flapY - ty - 70 - flapY) * fp;
                    ctx.beginPath();
                    ctx.moveTo(fx1, fy1);
                    ctx.lineTo(tx + tw - 10 - flapX, ty + 172 + flapY - fi * 28);
                    ctx.stroke();
                }
            } else if (armorId === 'armor_crab') {
                // 🦀 カニ装甲：両サイドに大きなハサミ＋目玉
                const ft2 = _getFrameNow();
                const clawSnap = Math.sin(ft2 * 0.04) * 0.18; // ハサミのパチパチ
                const clawColor = '#E53935';
                const clawDark  = '#B71C1C';
                const clawHigh  = '#FF7043';

                // ── 左ハサミ ──
                ctx.save();
                ctx.translate(tx - 10, ty + th * 0.38);
                // 腕の根元
                ctx.fillStyle = clawDark;
                ctx.beginPath(); ctx.ellipse(14, 0, 14, 9, -0.2, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = clawColor;
                ctx.beginPath(); ctx.ellipse(12, -1, 12, 7, -0.2, 0, Math.PI*2); ctx.fill();
                // 上ハサミ（パチパチ）
                ctx.fillStyle = clawColor;
                ctx.save(); ctx.rotate(-clawSnap);
                ctx.beginPath();
                ctx.moveTo(22, -2);
                ctx.bezierCurveTo(30, -14, 48, -16, 52, -8);
                ctx.bezierCurveTo(48, -4, 32, -2, 22, -2);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = clawHigh;
                ctx.beginPath(); ctx.ellipse(44, -10, 6, 3, -0.4, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                // 下ハサミ（固定）
                ctx.fillStyle = clawDark;
                ctx.beginPath();
                ctx.moveTo(22, 2);
                ctx.bezierCurveTo(30, 10, 46, 12, 50, 6);
                ctx.bezierCurveTo(46, 2, 32, 2, 22, 2);
                ctx.closePath(); ctx.fill();
                ctx.restore();

                // ── 右ハサミ ──
                ctx.save();
                ctx.translate(tx + tw + 10, ty + th * 0.38);
                ctx.scale(-1, 1); // 左右反転
                // 腕の根元
                ctx.fillStyle = clawDark;
                ctx.beginPath(); ctx.ellipse(14, 0, 14, 9, -0.2, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = clawColor;
                ctx.beginPath(); ctx.ellipse(12, -1, 12, 7, -0.2, 0, Math.PI*2); ctx.fill();
                // 上ハサミ（パチパチ）
                ctx.fillStyle = clawColor;
                ctx.save(); ctx.rotate(-clawSnap);
                ctx.beginPath();
                ctx.moveTo(22, -2);
                ctx.bezierCurveTo(30, -14, 48, -16, 52, -8);
                ctx.bezierCurveTo(48, -4, 32, -2, 22, -2);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = clawHigh;
                ctx.beginPath(); ctx.ellipse(44, -10, 6, 3, -0.4, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                // 下ハサミ（固定）
                ctx.fillStyle = clawDark;
                ctx.beginPath();
                ctx.moveTo(22, 2);
                ctx.bezierCurveTo(30, 10, 46, 12, 50, 6);
                ctx.bezierCurveTo(46, 2, 32, 2, 22, 2);
                ctx.closePath(); ctx.fill();
                ctx.restore();

                // ── タンク上部の目玉2つ ──
                const eyeY = ty + 28;
                for (const ex of [cx - 22, cx + 22]) {
                    // 目の柄（細い棒）
                    ctx.fillStyle = clawDark;
                    ctx.fillRect(ex - 3, eyeY - 12, 6, 14);
                    // 白目
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath(); ctx.arc(ex, eyeY - 12, 9, 0, Math.PI*2); ctx.fill();
                    // 黒目
                    ctx.fillStyle = '#111';
                    ctx.beginPath(); ctx.arc(ex + 2, eyeY - 13, 5, 0, Math.PI*2); ctx.fill();
                    // ハイライト
                    ctx.fillStyle = '#FFF';
                    ctx.beginPath(); ctx.arc(ex + 4, eyeY - 15, 2, 0, Math.PI*2); ctx.fill();
                    // 目の縁
                    ctx.strokeStyle = clawDark; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(ex, eyeY - 12, 9, 0, Math.PI*2); ctx.stroke();
                }
            }
            // armor_normal は装飾なし
        }

        // Damage Overlay (composite=overplayは重いのでsource-overで代替)
        if (dmgFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.5, dmgFlash * 0.04)})`;
            ctx.fillRect(tx - 20, ty - 20, tw + 40, th + 40);
        }

        // === TANK TYPE SPECIFIC DECORATIONS (敵のみ) ===
        if (isEnemy && tankType !== 'NORMAL') {
            const decorY = by + 30; // 装飾の基準Y座標

            if (enemyTheme === 'mecha') {
                ctx.fillStyle = 'rgba(94,211,255,0.22)';
                ctx.fillRect(cx - 64, decorY - 10, 128, 12);
                ctx.strokeStyle = 'rgba(94,211,255,0.75)';
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - 64, decorY - 10, 128, 12);
                [-54, -18, 18, 54].forEach(offset => {
                    ctx.fillStyle = '#324654';
                    ctx.fillRect(cx + offset - 8, decorY + 10, 16, 18);
                    ctx.strokeStyle = '#8EB7CC';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(cx + offset - 8, decorY + 10, 16, 18);
                });
            } else if (enemyTheme === 'heaven') {
                ctx.strokeStyle = 'rgba(241,201,107,0.95)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 52, decorY + 8);
                ctx.quadraticCurveTo(cx - 24, decorY - 12, cx, decorY + 2);
                ctx.quadraticCurveTo(cx + 24, decorY - 12, cx + 52, decorY + 8);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,248,220,0.85)';
                ctx.beginPath(); ctx.arc(cx, decorY + 22, 10, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.stroke();
            } else if (tankType === 'SCOUT') {
                // アンテナ（速度センサー的な）
                ctx.strokeStyle = bodyBase;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx - 40, decorY);
                ctx.lineTo(cx - 50, decorY - 40);
                ctx.moveTo(cx + 40, decorY);
                ctx.lineTo(cx + 50, decorY - 40);
                ctx.stroke();

                // アンテナ先端
                ctx.fillStyle = '#4CAF50';
                ctx.beginPath();
                ctx.arc(cx - 50, decorY - 40, 5, 0, Math.PI * 2);
                ctx.arc(cx + 50, decorY - 40, 5, 0, Math.PI * 2);
                ctx.fill();

                // スピードライン（稲妻マーク）
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 20, decorY + 20);
                ctx.lineTo(cx - 10, decorY + 30);
                ctx.lineTo(cx - 15, decorY + 30);
                ctx.lineTo(cx - 5, decorY + 40);
                ctx.stroke();
            }

            if (tankType === 'DEFENSE' || tankType === 'BOSS') {
                // 装甲トゲ（左右）
                const spikeCount = 4;
                ctx.fillStyle = bodyShadow;
                for (let i = 0; i < spikeCount; i++) {
                    const sy = (dCY - dRY * 0.3) + i * 30;
                    // 左側のトゲ
                    ctx.beginPath();
                    ctx.moveTo(cx - bw / 2 + 25, sy);
                    ctx.lineTo(cx - bw / 2 - 5, sy + 5);
                    ctx.lineTo(cx - bw / 2 + 25, sy + 10);
                    ctx.closePath();
                    ctx.fill();
                    // 右側のトゲ
                    ctx.beginPath();
                    ctx.moveTo(cx + bw / 2 - 25, sy);
                    ctx.lineTo(cx + bw / 2 + 5, sy + 5);
                    ctx.lineTo(cx + bw / 2 - 25, sy + 10);
                    ctx.closePath();
                    ctx.fill();
                }

                // 上部に重装甲プレート
                ctx.fillStyle = bodyBase;
                ctx.fillRect(cx - 80, dCY - dRY + 5, 160, 15);
                ctx.strokeStyle = bodyShadow;
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - 80, dCY - dRY + 5, 160, 15);
            }

            if (tankType === 'MAGICAL') {
                // 魔法のクリスタル（上部）
                const crystals = [
                    { x: cx - 50, y: dCY - dRY + 20 },
                    { x: cx, y: dCY - dRY - 5 },
                    { x: cx + 50, y: dCY - dRY + 20 }
                ];

                crystals.forEach((crystal, i) => {
                    // クリスタルの輝き

                    // クリスタル本体（ひし形）
                    ctx.fillStyle = bodyHigh;
                    ctx.beginPath();
                    ctx.moveTo(crystal.x, crystal.y - 12);
                    ctx.lineTo(crystal.x + 6, crystal.y);
                    ctx.lineTo(crystal.x, crystal.y + 12);
                    ctx.lineTo(crystal.x - 6, crystal.y);
                    ctx.closePath();
                    ctx.fill();

                    // クリスタルのハイライト
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.beginPath();
                    ctx.moveTo(crystal.x - 2, crystal.y - 6);
                    ctx.lineTo(crystal.x + 2, crystal.y);
                    ctx.lineTo(crystal.x - 2, crystal.y + 6);
                    ctx.closePath();
                    ctx.fill();

                });

                // 魔法陣（装飾）
                ctx.strokeStyle = bodyHigh;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(cx, dCY, 40, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (tankType === 'BOSS') {
                // 王冠（ボスの証）
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                const crownY = dCY - dRY + 5;
                ctx.moveTo(cx - 30, crownY - 5);
                ctx.lineTo(cx - 20, crownY - 20);
                ctx.lineTo(cx - 10, crownY - 5);
                ctx.lineTo(cx, crownY - 25);
                ctx.lineTo(cx + 10, crownY - 5);
                ctx.lineTo(cx + 20, crownY - 20);
                ctx.lineTo(cx + 30, crownY - 5);
                ctx.lineTo(cx + 25, crownY + 5);
                ctx.lineTo(cx - 25, crownY + 5);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#FFA500';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 王冠の宝石
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(cx, dCY - dRY - 10, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            if (tankType === 'TRUE_BOSS' && !showInterior) {
                // 全ての装飾を統合した究極形態（外観のみ・下画面には表示しない）

                // 第二形態の追加装飾
                if (isPhaseTwo) {
                    // 赤いオーラ（簡略化：1つの大きなグラデーションか少ない円で表現）
                    const time = _getFrameNow() * 0.001;
                    ctx.save();
                    ctx.globalAlpha = 0.3 + Math.sin(time * 5) * 0.1;
                    ctx.strokeStyle = '#F00';
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 90 + Math.sin(time * 10) * 10, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();

                    // 巨大な角（両側）
                    ctx.strokeStyle = '#8B0000';
                    ctx.lineWidth = 8;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(cx - 60, dCY - dRY + 50);
                    ctx.quadraticCurveTo(cx - 80, dCY - dRY - 20, cx - 70, dCY - dRY - 60);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(cx + 60, dCY - dRY + 50);
                    ctx.quadraticCurveTo(cx + 80, dCY - dRY - 20, cx + 70, dCY - dRY - 60);
                    ctx.stroke();

                    // 角の先端
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(cx - 70, dCY - dRY - 60, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx + 70, dCY - dRY - 60, 8, 0, Math.PI * 2);
                    ctx.fill();

                    // トゲ（全身）
                    ctx.fillStyle = '#8B0000';
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 * i) / 8;
                        const spikeX = cx + Math.cos(angle) * (bw / 2 - 10);
                        const spikeY = cy + Math.sin(angle) * (bh / 2);
                        ctx.beginPath();
                        ctx.moveTo(spikeX, spikeY);
                        ctx.lineTo(spikeX + Math.cos(angle) * 25, spikeY + Math.sin(angle) * 25);
                        ctx.lineTo(spikeX + Math.cos(angle + 0.3) * 15, spikeY + Math.sin(angle + 0.3) * 15);
                        ctx.closePath();
                        ctx.fill();
                    }
                }

                // オーラリング（簡略化：3重を1重に）
                const time = _getFrameNow() * 0.001;
                const alpha = 0.2 + Math.sin(time * 3) * 0.1;
                ctx.strokeStyle = isPhaseTwo ? `rgba(255, 0, 0, ${alpha})` : `rgba(138, 43, 226, ${alpha})`;
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.arc(cx, cy - 20, 80 + Math.sin(time * 2) * 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // 巨大クリスタル（頂上）
                ctx.save();
                ctx.translate(cx, dCY - dRY - 30);

                ctx.fillStyle = isPhaseTwo ? '#8B0000' : '#4A148C';
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(12, 0);
                ctx.lineTo(8, 15);
                ctx.lineTo(-8, 15);
                ctx.lineTo(-12, 0);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.moveTo(-3, -15);
                ctx.lineTo(3, -5);
                ctx.lineTo(-3, 5);
                ctx.closePath();
                ctx.fill();

                ctx.restore();

                // 邪悪な目（両側）
                [-45, 45].forEach(offsetX => {
                    const eyeX = cx + offsetX;
                    const eyeY = dCY - dRY * 0.2;

                    // 白目
                    ctx.fillStyle = '#8B0000';
                    ctx.beginPath();
                    ctx.ellipse(eyeX, eyeY, 12, 8, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // 瞳
                    ctx.fillStyle = isPhaseTwo ? '#FFFF00' : '#FF0000'; // 第二形態は黄色い瞳
                    ctx.beginPath();
                    ctx.arc(eyeX + Math.sin(time * 2) * 2, eyeY, 5, 0, Math.PI * 2);
                    ctx.fill();

                    // ハイライト
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.beginPath();
                    ctx.arc(eyeX - 2, eyeY - 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                });

                // 翼のような装飾
                ctx.strokeStyle = isPhaseTwo ? '#8B0000' : '#4A148C';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(cx - bw / 2 + 20, dCY - dRY * 0.1);
                ctx.quadraticCurveTo(cx - bw / 2 - 30, dCY - dRY * 0.3, cx - bw / 2 - 20, dCY - dRY * 0.5);
                ctx.moveTo(cx + bw / 2 - 20, dCY - dRY * 0.1);
                ctx.quadraticCurveTo(cx + bw / 2 + 30, dCY - dRY * 0.3, cx + bw / 2 + 20, dCY - dRY * 0.5);
                ctx.stroke();
            }
        }

        if (isEnemy) this._drawStageEnemyOverlay(ctx, tx, ty, tw, th, battle, 0.9);
        ctx.restore();
    },

    _drawTower(ctx, x, y, w, h, color, roofColor) {
        ctx.fillStyle = color; ctx.strokeStyle = this._darkenHex(color, 20); ctx.lineWidth = 2;
        ctx.fillRect(x, y + 20, w, h - 20); ctx.strokeRect(x, y + 20, w, h - 20);

        // Roof
        ctx.fillStyle = roofColor; ctx.beginPath();
        ctx.moveTo(x - 5, y + 20); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w + 5, y + 20); ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Windows
        ctx.fillStyle = '#333';
        ctx.fillRect(x + w / 2 - 5, y + 30, 10, 10);
    },

    // === TOP-DOWN WALL (Platform) ===
    drawPlatform(ctx, x, y, w, h) {
        // Wall with Shadow
        ctx.save();

        ctx.shadowOffsetY = 5;

        // Wall Body (Top surface)
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(x, y, w, h);
        ctx.restore(); // Restore shadow settings before drawing details

        // Wall Detail (Face/Depth)
        const depth = 8;
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(x, y + h - depth, w, depth);

        // Highlights
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    },

    // === CANNON (Top-Down Style) ===
    drawCannon(ctx, x, y, w, h, dir, loaded, loadProgress) {
        const custom = window.game && window.game.saveData && window.game.saveData.tankCustom;
        const cannonId = (custom && custom.cannon) || 'cannon_normal';

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        const angle = (dir === 1) ? 0 : Math.PI;

        // ── 丸い砲台マウント（ロケットスライム風）──
        // 台座（楕円ベース）
        ctx.fillStyle = '#4A5060';
        ctx.beginPath(); ctx.ellipse(0, 4, w * 0.42, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        // マウント本体（丸）
        const mountGrad = ctx.createRadialGradient(-w*0.1, -h*0.1, 2, 0, 0, w * 0.38);
        mountGrad.addColorStop(0, '#8A9BB0');
        mountGrad.addColorStop(0.5, '#5A6A80');
        mountGrad.addColorStop(1, '#2A3A50');
        ctx.fillStyle = mountGrad;
        ctx.beginPath(); ctx.arc(0, 0, w * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2A3040'; ctx.lineWidth = 2; ctx.stroke();
        // マウントのリベット
        ctx.fillStyle = '#8A9BB0';
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath(); ctx.arc(Math.cos(a)*w*0.28, Math.sin(a)*w*0.28, 2.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.rotate(angle);
        const tubeL = w * 0.7;
        const tubeW = h * 0.6;

        if (cannonId === 'cannon_double') {
            // 二連装砲：上下2本
            for (const oy of [-tubeW * 0.55, tubeW * 0.15]) {
                ctx.fillStyle = '#666';
                ctx.fillRect(0, oy, tubeL * 0.9, tubeW * 0.45);
                ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
                ctx.strokeRect(0, oy, tubeL * 0.9, tubeW * 0.45);
                ctx.fillStyle = '#222';
                ctx.fillRect(tubeL * 0.9 - 4, oy - 1, 6, tubeW * 0.45 + 2);
            }
        } else if (cannonId === 'cannon_magic') {
            // 魔法杖砲：細長い杖 + 先端に★
            ctx.fillStyle = '#9C27B0';
            ctx.fillRect(0, -tubeW * 0.2, tubeL * 0.85, tubeW * 0.4);
            ctx.strokeStyle = '#CE93D8'; ctx.lineWidth = 1; ctx.strokeRect(0, -tubeW * 0.2, tubeL * 0.85, tubeW * 0.4);
            // 先端の星
            ctx.fillStyle = loaded ? '#FFD700' : '#CE93D8';
            const sx = tubeL * 0.85, sy = 0, sr = tubeW * 0.45;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
                const b = (i * 4 * Math.PI / 5 + 2 * Math.PI / 5) - Math.PI / 2;
                if (i === 0) ctx.moveTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr);
                else ctx.lineTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr);
                ctx.lineTo(sx + Math.cos(b) * sr * 0.4, sy + Math.sin(b) * sr * 0.4);
            }
            ctx.closePath(); ctx.fill();
        } else if (cannonId === 'cannon_laser') {
            // レーザー砲：細長くスリムな砲身
            ctx.fillStyle = '#37474F';
            ctx.fillRect(0, -tubeW * 0.18, tubeL * 1.1, tubeW * 0.36);
            ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 1.5;
            ctx.strokeRect(0, -tubeW * 0.18, tubeL * 1.1, tubeW * 0.36);
            // グロー
            if (loaded) {
                ctx.fillStyle = 'rgba(0,229,255,0.3)';
                ctx.fillRect(0, -tubeW * 0.25, tubeL * 1.1, tubeW * 0.5);
            }
            // 先端の点
            ctx.fillStyle = loaded ? '#00E5FF' : '#78909C';
            ctx.beginPath(); ctx.arc(tubeL * 1.1, 0, tubeW * 0.2, 0, Math.PI * 2); ctx.fill();
        } else if (cannonId === 'cannon_rainbow') {
            // 🌈 レインボー砲：固定7色ストライプ（色相固定でちかちかなし）
            const rainbowColors = ['#FF4444', '#FF9900', '#FFEE00', '#44CC44', '#2299FF', '#7744EE', '#FF44CC'];
            const stripeCount = rainbowColors.length;
            const stripeW = tubeL / stripeCount;
            for (let si = 0; si < stripeCount; si++) {
                ctx.fillStyle = rainbowColors[si];
                ctx.fillRect(si * stripeW, -tubeW * 0.45, stripeW + 1, tubeW * 0.9);
            }
            // 砲身の輪郭（白）
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
            ctx.strokeRect(0, -tubeW * 0.45, tubeL, tubeW * 0.9);
            // 砲口のリング（固定色：白）
            ctx.fillStyle = loaded ? '#FFFFFF' : '#888';
            ctx.beginPath(); ctx.arc(tubeL, 0, tubeW * 0.52, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(200,200,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
            // 砲口の穴（固定色）
            ctx.fillStyle = loaded ? '#FFD700' : '#222';
            ctx.beginPath(); ctx.arc(tubeL, 0, tubeW * 0.28, 0, Math.PI * 2); ctx.fill();
            if (loaded) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath(); ctx.arc(tubeL, 0, tubeW * 0.9, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        } else {
            // スタンダード砲（丸い砲身・ロケットスライム風）
            const tubeGrad = ctx.createLinearGradient(0, -tubeW/2, 0, tubeW/2);
            tubeGrad.addColorStop(0, '#8A9BB0');
            tubeGrad.addColorStop(0.35, '#6A7A90');
            tubeGrad.addColorStop(1, '#2A3A50');
            ctx.fillStyle = tubeGrad;
            // 砲身を角丸に
            ctx.beginPath();
            Renderer._roundRect(ctx, 0, -tubeW/2, tubeL, tubeW, tubeW/2);
            ctx.fill();
            ctx.strokeStyle = '#1A2A3A'; ctx.lineWidth = 1.5;
            Renderer._roundRect(ctx, 0, -tubeW/2, tubeL, tubeW, tubeW/2);
            ctx.stroke();
            // 砲口のリング
            ctx.fillStyle = '#2A3A50';
            ctx.beginPath(); ctx.arc(tubeL, 0, tubeW/2 + 2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#1A2A3A'; ctx.lineWidth = 1.5; ctx.stroke();
            // 砲口の穴
            ctx.fillStyle = loaded ? '#FFD700' : '#0A0A1A';
            ctx.beginPath(); ctx.arc(tubeL, 0, tubeW/2 - 3, 0, Math.PI*2); ctx.fill();
            if (loaded) {
                ctx.fillStyle = 'rgba(255,200,0,0.3)';
                ctx.beginPath(); ctx.arc(tubeL, 0, tubeW/2 + 6, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.restore();
    },

    // === ENGINE CORE (3D glowing sphere) ===
    drawEngineCore(ctx, x, y, w, h, hp, maxHp) {
        ctx.save();
        const cx = x + w / 2, cy = y + h / 2;
        const t = _getFrameNow();

        // === 外側グロー（拡張オーラ）===
        const pulse = 0.3 + Math.sin(t * 0.003) * 0.2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = pulse * 0.6;
        const outerGlow = _getCachedGradient(ctx, `ec_outer2_${w|0}`, () => {
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.5);
            g.addColorStop(0, 'rgba(255,160,0,1)');
            g.addColorStop(0.5, 'rgba(255,80,0,0.5)');
            g.addColorStop(1, 'rgba(255,30,0,0)');
            return g;
        });
        ctx.fillStyle = outerGlow;
        ctx.beginPath(); ctx.arc(0, 0, w * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // === ハウジング（3Dメタリックボックス）===
        const hGrad = _getCachedGradient(ctx, `ec_housing2_${w|0}_${h|0}`, () => {
            const g = ctx.createLinearGradient(x, y, x, y + h);
            g.addColorStop(0, '#888');
            g.addColorStop(0.4, '#555');
            g.addColorStop(1, '#222');
            return g;
        });
        ctx.fillStyle = hGrad;
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        // 発光アウトライン
        ctx.strokeStyle = `rgba(255,${100 + (pulse * 155)|0},0,${0.8 + pulse * 0.2})`;
        ctx.lineWidth = 2.5;
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.stroke();
        // メタルのエッジハイライト
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + 4); ctx.stroke();

        // === コアオーブ（クリスタル風）===
        ctx.save();
        ctx.translate(cx, cy);
        const coreGrad = _getCachedGradient(ctx, `ec_core2_${w|0}`, () => {
            const g = ctx.createRadialGradient(-w*0.1, -w*0.1, 0, 0, 0, w * 0.38);
            g.addColorStop(0, '#FFFDE0');
            g.addColorStop(0.25, '#FFD040');
            g.addColorStop(0.6, '#FF6600');
            g.addColorStop(0.85, '#CC2200');
            g.addColorStop(1, '#550000');
            return g;
        });
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(0, 0, w * 0.38, 0, Math.PI * 2); ctx.fill();
        // 十字ハイライト光線
        ctx.save();
        ctx.globalAlpha = pulse * 0.7;
        ctx.strokeStyle = 'rgba(255,220,80,0.9)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        for (let a = 0; a < 4; a++) {
            ctx.save();
            ctx.rotate(a * Math.PI / 2 + t * 0.001);
            ctx.beginPath(); ctx.moveTo(0, -w * 0.38); ctx.lineTo(0, -w * 0.65); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        // 鏡面ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(-w*0.1, -w*0.12, w*0.12, w*0.07, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // === HP バー（強化版）===
        const barW = w + 14, barH = 8;
        const barX = x - 7, barY = y - 16;
        // 背景
        ctx.fillStyle = '#1A1A1A';
        this._roundRect(ctx, barX, barY, barW, barH, 4);
        ctx.fill();
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        this._roundRect(ctx, barX, barY, barW, barH, 4);
        ctx.stroke();
        // HP値
        const ratio = Math.max(0, hp / maxHp);
        const barColor = ratio > 0.5 ? CONFIG.COLORS.HP_GREEN : (ratio > 0.25 ? CONFIG.COLORS.HP_YELLOW : CONFIG.COLORS.HP_RED);
        const barGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        barGrad.addColorStop(0, barColor);
        barGrad.addColorStop(1, barColor.replace('#', '#66').slice(0, 7));
        ctx.fillStyle = barColor;
        this._roundRect(ctx, barX + 1, barY + 1, (barW - 2) * ratio, barH - 2, 3);
        ctx.fill();
        // ラベル
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', cx, barY - 2);

        ctx.restore();
    },

    // === PROJECTILE (3D with trail) ===
    drawProjectile(ctx, xOrProj, y, type, dir, angle = 0, scale = 1.0) {
        let x = xOrProj;
        let pY = y;
        let pType = type;
        let pDir = dir;
        let pAngle = angle;
        let pScale = scale;
        let pColor = '#FFF';
        let pVx = 0;

        // Polymorphic check: Is the second argument a projectile object or a coordinate?
        if (typeof xOrProj === 'object' && xOrProj !== null) {
            const p = xOrProj;
            x = p.x;
            pY = p.y;
            pType = p.type;
            pDir = p.dir || 1;
            pAngle = p.angle || 0;
            pScale = p.scale || 1.0;
            pColor = p.color || '#FFF';
            pVx = p.vx || 0;
        }

        const info = CONFIG.AMMO_TYPES[pType] || CONFIG.AMMO_TYPES.rock || { icon: '?' };

        // Validate pDir to prevent NaN errors
        if (!isFinite(pDir) || pDir === 0) {
            pDir = 1; // Default direction
        }

        ctx.save();
        ctx.translate(x, pY);
        ctx.rotate(pAngle);
        ctx.scale(pScale, pScale); // Apply level scaling

        // Logic merging from both versions
        if (pType === 'shuriken') {
            const rot = (_getFrameNow() * 0.03) * 0.5;
            ctx.rotate(rot);
            ctx.fillStyle = '#888';
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.moveTo(0, -8);
                ctx.lineTo(3, -2);
                ctx.lineTo(3, 2);
                ctx.lineTo(0, 8);
                ctx.lineTo(-3, 2);
                ctx.lineTo(-3, -2);
            }
            ctx.fill();
            // Hole
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();

        } else if (pType === 'magic') {
            ctx.fillStyle = pColor || '#F0F';
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
            // Tail
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.lineTo(-pVx * 3, 0); // Note: may be 0 if using argument-based call
            ctx.lineTo(0, -6);
            ctx.fill();

        } else if (pType === 'player') {
            // Draw Player Slime flying!
            ctx.rotate(-pAngle); // Counter-rotate to keep slime upright? 
            // Actually, first version's restore() approach was cleaner.
            Renderer.drawSlime(ctx, -15, -15, 30, 30, CONFIG.COLORS.PLAYER, CONFIG.COLORS.PLAYER_DARK, pDir, _getFrameNow() * 0.01, 0);

        } else if (pType === 'fire') {
            // Fire Effect（軽量版：グラデーションなし）
            const size = 10;
            ctx.fillStyle = 'rgba(255,100,0,0.8)';
            ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,210,50,0.9)';
            ctx.beginPath(); ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2); ctx.fill();

        } else if (pType === 'ice') {
            // Ice Crystal（軽量版）
            ctx.fillStyle = '#E0F7FA';
            ctx.strokeStyle = '#4FC3F7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(10, 0); ctx.lineTo(0, 8); ctx.lineTo(-10, 0); ctx.lineTo(0, -8);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

        } else if (pType === 'thunder') {
            // Thunder（軽量版：ラインのみ）
            ctx.strokeStyle = '#FFEB3B';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-5, -8); ctx.lineTo(0, 8); ctx.lineTo(5, -5); ctx.lineTo(10, 0);
            ctx.stroke();

        } else {
            // Standard Projectiles（軽量版：グラデーション廃止→ソリッドカラー）
            // トレイル
            ctx.fillStyle = 'rgba(255,140,0,0.28)';
            ctx.beginPath();
            ctx.ellipse(-pDir * 14, 0, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            // グロー（単色）
            ctx.fillStyle = 'rgba(255,190,80,0.22)';
            ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

            // Icon
            ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(info.icon, 0, 0);
        }

        ctx.restore();
    },

    // === SPLIT SCREEN BACKGROUND ===
    drawSplitBackground(ctx, w, h, stageData) {
        const splitY = h * 0.5; // Split at center (400px)

        // === UPPER SCREEN (Battle View) ===
        // === UPPER SCREEN (Battle View) ===
        // Sky
        let skyColors = ['#2A60A0', '#4A90D0', '#78B8E8', '#A8D8F8'];
        if (stageData && stageData.skyColors) skyColors = stageData.skyColors;

        // Theme Overrides for Sky if not set
        if (stageData && !stageData.skyColors) {
            if (stageData.theme === 'forest') skyColors = ['#1B5E20', '#2E7D32', '#43A047', '#66BB6A']; // Greenish
            else if (stageData.theme === 'desert') skyColors = ['#E65100', '#F57C00', '#FF9800', '#FFB74D']; // Orange
            else if (stageData.theme === 'volcano') skyColors = ['#3E2723', '#5D4037', '#8D6E63', '#BCAAA4']; // Smoky
        }

        const skyGradKey = `sky_${skyColors.join(',')}_${splitY | 0}`;
        const skyGrad = _getCachedGradient(ctx, skyGradKey, () => {
            const g = ctx.createLinearGradient(0, 0, 0, splitY);
            g.addColorStop(0, skyColors[0]);
            g.addColorStop(0.5, skyColors[1]);
            g.addColorStop(1, skyColors[3]);
            return g;
        });
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, splitY);

        // Clouds (Upper) - 3フレームおきに更新（さらなる軽量化）
        const t = _getFrameNow() * 0.005;
        if (_frameNow % 3 !== 0 && this._cloudCache && this._cloudCache.width === w) {
            ctx.drawImage(this._cloudCache, 0, 0);
        } else {
            if (!this._cloudCache || this._cloudCache.width !== w) {
                try {
                    this._cloudCache = document.createElement('canvas');
                    this._cloudCache.width = w; this._cloudCache.height = 120;
                } catch(e) { this._cloudCache = null; }
            }
            if (this._cloudCache && typeof this._cloudCache.getContext === 'function') {
                const cc = this._cloudCache.getContext('2d');
                if (cc) {
                    cc.clearRect(0, 0, w, 120);
                    for (let i = 0; i < 2; i++) {
                        const cx = ((t * 20 + i * 280) % (w + 200)) - 100;
                        const cy = 40 + i * 50 + Math.sin(i * 1.5) * 10;
                        this._draw3DCloud(cc, cx, cy, 28 + i * 6);
                    }
                    ctx.drawImage(this._cloudCache, 0, 0);
                }
            }
        }

        // Background Landscape (Themed) - 静的部分はオフスクリーンキャッシュで高速化
        const theme = stageData ? stageData.theme : 'default';
        const bgKey = `landscape_${theme}_${w}_${splitY | 0}`;
        const bgCanvas = _getCachedBg(bgKey, w, splitY, (bctx) => {
            this._drawLandscape(bctx, w, splitY, theme);
        });
        if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0);

        // Ground (Upper)
        const gndY = splitY - 40;

        let groundColor = '#5A8A2A'; // Grass
        if (stageData) {
            if (stageData.theme === 'desert') groundColor = '#FDD835'; // Sand
            else if (stageData.theme === 'volcano') groundColor = '#3E2723'; // Dark Rock
            else if (stageData.theme === 'forest') groundColor = '#1B5E20'; // Dark Grass
        }

        ctx.fillStyle = groundColor;
        ctx.beginPath();
        ctx.moveTo(0, gndY);
        ctx.bezierCurveTo(w * 0.3, gndY - 10, w * 0.7, gndY + 10, w, gndY);
        ctx.lineTo(w, splitY); ctx.lineTo(0, splitY);
        ctx.fill();

        // === LOWER SCREEN (Interior View) ===
        // 🚀 改善: 下画面の背景を塗りつぶし（上画面の風景が透けるバグを完全に修正）
        ctx.fillStyle = '#222'; // ベースとなる暗い色
        ctx.fillRect(0, splitY, w, h - splitY);

        // Depth/Perimeter Walls
        const wt = CONFIG.TANK.WALL_THICKNESS;
        const ox = CONFIG.TANK.OFFSET_X;
        const oy = CONFIG.TANK.OFFSET_Y + wt + 20;
        const iw = CONFIG.TANK.INTERIOR_W;
        const ih = CONFIG.TANK.INTERIOR_H - 40;

        // Draw side wall thickness for perspective
        ctx.fillStyle = '#A17A4B';
        ctx.fillRect(ox, oy, wt, ih); // Left wall depth
        ctx.fillRect(ox + iw - wt, oy, wt, ih); // Right wall depth

        // Inner wall shading
        const wallGrad = _getCachedGradient(ctx, `wall_${ox}_${oy}`, () => {
            const g = ctx.createLinearGradient(ox, oy, ox, oy + 25);
            g.addColorStop(0, 'rgba(0,0,0,0.3)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
        });
        ctx.fillStyle = wallGrad;
        ctx.fillRect(ox + wt, oy, iw - wt * 2, 25);

        // Screen Divider / HUD Border
        ctx.fillStyle = '#111';
        ctx.fillRect(0, splitY - 6, w, 12);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, splitY - 1, w, 2);
    },

    // Landscape decoration for upper screen
    _drawLandscape(ctx, w, h, theme) {
        const groundY = h - 40;

        if (theme === 'desert') {
            // DESERT THEME
            // Pyramids
            ctx.fillStyle = '#D4AF37'; // Dull Gold
            ctx.beginPath(); ctx.moveTo(w * 0.2, groundY); ctx.lineTo(w * 0.3, groundY - 100); ctx.lineTo(w * 0.4, groundY); ctx.fill();
            ctx.fillStyle = '#C49F27'; // Shadow side
            ctx.beginPath(); ctx.moveTo(w * 0.3, groundY - 100); ctx.lineTo(w * 0.3, groundY); ctx.lineTo(w * 0.4, groundY); ctx.fill();

            ctx.fillStyle = '#D4AF37';
            ctx.beginPath(); ctx.moveTo(w * 0.7, groundY); ctx.lineTo(w * 0.8, groundY - 150); ctx.lineTo(w * 0.9, groundY); ctx.fill();
            ctx.fillStyle = '#C49F27';
            ctx.beginPath(); ctx.moveTo(w * 0.8, groundY - 150); ctx.lineTo(w * 0.8, groundY); ctx.lineTo(w * 0.9, groundY); ctx.fill();

            // Sun (Big Hot Sun)
            const sunG = ctx.createRadialGradient(w * 0.5, 80, 0, w * 0.5, 80, 60);
            sunG.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
            sunG.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = sunG;
            ctx.beginPath(); ctx.arc(w * 0.5, 80, 60, 0, Math.PI * 2); ctx.fill();

            // Cacti
            ctx.fillStyle = '#2E7D32';
            for (let i = 0; i < 5; i++) {
                const cx = (i * 150 + 50) % w;
                ctx.fillRect(cx, groundY - 40, 10, 40); // Trunk
                ctx.fillRect(cx - 10, groundY - 30, 10, 5); // Arm L
                ctx.fillRect(cx - 10, groundY - 40, 5, 15); // Arm L Up
                ctx.fillRect(cx + 10, groundY - 25, 10, 5); // Arm R
                ctx.fillRect(cx + 15, groundY - 35, 5, 15); // Arm R Up
            }

        } else if (theme === 'volcano') {
            // VOLCANO THEME
            // Dark Mountains
            ctx.fillStyle = '#212121';
            this._drawMountains(ctx, w, h);

            // Lava flow
            ctx.fillStyle = '#D50000';
            ctx.beginPath();
            ctx.moveTo(w * 0.5, groundY - 100); // peak
            ctx.quadraticCurveTo(w * 0.6, groundY - 50, w * 0.55, groundY);
            ctx.lineTo(w * 0.45, groundY);
            ctx.quadraticCurveTo(w * 0.4, groundY - 50, w * 0.5, groundY - 100);
            ctx.fill();

            // Ash particles usually handled by particle system, but draw some static smoke
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            for (let i = 0; i < 5; i++) {
                this._draw3DCloud(ctx, w * 0.5 + (i - 2) * 30, groundY - 150 - i * 20, 20 + i * 5);
            }

        } else if (theme === 'forest') {
            // FOREST THEME
            // Deep forest background
            ctx.fillStyle = '#004D40'; // Deep Green
            this._drawMountains(ctx, w, h); // Use as hills

            // Lots of Trees (step 60 for performance)
            for (let i = 0; i < w; i += 60) {
                const th = 80 + Math.sin(i * 0.23) * 30 + Math.sin(i * 0.07 + 1.1) * 30;
                // Trunk
                ctx.fillStyle = '#3E2723';
                ctx.fillRect(i + 10, groundY - 20, 10, 20);
                // Leaves
                ctx.fillStyle = (i % 60 === 0) ? '#1B5E20' : '#2E7D32';
                ctx.beginPath();
                ctx.moveTo(i, groundY - 20);
                ctx.lineTo(i + 15, groundY - th);
                ctx.lineTo(i + 30, groundY - 20);
                ctx.fill();
            }

        } else {
            // DEFAULT (Castle/Grassy)
            // Distant Mountains
            ctx.fillStyle = '#1A3A5A';
            this._drawMountains(ctx, w, h);
            ctx.fillStyle = '#2A5A8A';
            this._drawMountains(ctx, w, h - 20);

            // Sun
            const sunG = ctx.createRadialGradient(w * 0.8, 60, 0, w * 0.8, 60, 50);
            sunG.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
            sunG.addColorStop(0.5, 'rgba(255, 255, 100, 0.2)');
            sunG.addColorStop(1, 'rgba(255, 255, 100, 0)');
            ctx.fillStyle = sunG;
            ctx.beginPath(); ctx.arc(w * 0.8, 60, 50, 0, Math.PI * 2); ctx.fill();

            // ★バグ修正: 左下の青い城オブジェクト（プレイヤー戦車と重なり「青い置物」に見えていた）を削除
        }
    },

    // Upper screen battle visualization
    drawUpperBattle(ctx, w, h, battle, state) {
        const splitY = h * 0.5;
        const groundY = splitY - 20;

        // Player Tank (Left, huge)
        // Adjusted for battle movement
        const playerX = 10 + (battle.playerTankX || 0);
        const playerY = groundY - 260 + (battle.playerTankY || 0);
        const playerFlash = battle.dodgeTimer > 0 ? 30 : 0; // Visual flash for dodge
        this.drawTankExterior(ctx, playerX, playerY, 240, 280, false, playerFlash, false);

        // Enemy Tank (Right, huge)
        // Adjusted for battle movement
        const enemyX = w - 250 + (battle.enemyTankX || 0);
        const enemyY = groundY - 260 + (battle.enemyTankY || 0);
        const enemyFlash = (battle.enemyDamageFlash || 0) + (battle.enemyDodgeTimer > 0 ? 20 : 0);
        this.drawTankExterior(ctx, enemyX, enemyY, 240, 280, true, enemyFlash, false, battle.enemyTankType, battle);

        // === PROJECTILE VISUALIZATION (Corrected for Upper Screen) ===
        if (battle.projectiles) {
            for (const p of battle.projectiles) {
                if (!p.active) continue;

                // Case 1: Standard Arcing Projectile
                if (p.phase === 'flying' && p.totalTime) {
                    // Use progress (t) to interpolate between VISUAL tank positions
                    // This ensures shots look like they originate/land correctly regardless of logical coords
                    const t = Math.min(1, Math.max(0, p.timer / p.totalTime));

                    // Visual Start/End Points
                    let vsx, vsy, vtx, vty;

                    if (p.dir === 1) {
                        // Player -> Enemy
                        vsx = playerX + 180; // Cannon mouth approx
                        vsy = playerY + 120;
                        vtx = enemyX + 60;   // Enemy body hit
                        vty = enemyY + 140;
                    } else {
                        // Enemy -> Player
                        vsx = enemyX + 60;
                        vsy = enemyY + 140; // Enemy cannon approx
                        vtx = playerX + 100;
                        vty = playerY + 100;
                    }

                    // Linear X
                    const dx = vtx - vsx;
                    const vx = vsx + dx * t;

                    // Parabolic Y
                    const dy = vty - vsy;
                    const arcH = (p.arcHeight || 150) * 0.8; // Scale arc for visual
                    const linearY = vsy + dy * t;
                    const arcY = 4 * arcH * t * (1 - t);
                    const vy = linearY - arcY;

                    // Rotation (Angle)
                    const nextT = t + 0.05;
                    const nvx = vsx + dx * nextT;
                    const nlinearY = vsy + dy * nextT;
                    const narcY = 4 * arcH * nextT * (1 - nextT);
                    const nvy = nlinearY - narcY;
                    const vAngle = Math.atan2(nvy - vy, nvx - vx);

                    this.drawProjectile(ctx, vx, vy, p.type, p.dir, vAngle);
                }
                // Case 2: Simple/Ally Projectile (Linear)
                else if (p.vx !== undefined && p.vy !== undefined) {
                    // These exist in logical battle coordinates (e.g. Ally inside tank firing at Invader)
                    // BUT if they are "Ally Turret" projectiles (fired into battle.projectiles), 
                    // they are meant for the upper screen battle?
                    // Ally.js (Stacked) pushes to window.game.battle.projectiles.
                    // Let's assume their x/y are logical tank coords.
                    // Wait, Ally Turret logic: x,y are relative to Ally position in TANK INTERIOR.
                    // But they are battling an INVADER in the interior logic?
                    // OR are they firing at the enemy tank outside?

                    // Re-reading Ally.js:
                    // If stacked on gunner, it fires 'bullet' with simple velocity.
                    // If target is invader, it shoots at invader (Interior).

                    // IF the user says "Ally projectile disappear on collision with enemy projectile",
                    // they mean the upper screen battle interception mechanics.
                    // The standard game doesn't seem to have "Ally firing at Enemy Tank" logic 
                    // other than loading the cannon (which creates a standard Projectile).

                    // Maybe the user is referring to the "Ally Missile" special move?
                    // Or maybe the user THINKS the allies shooting at invaders should appear on top?
                    // No, "enemy ball" implies enemy tank shells.

                    // User said: "Ally ball disappears when hitting enemy ball? And ally ball not visible on upper screen?"
                    // This implies the player is firing CANNONS loaded by allies, or Allies are firing SOMETHING into the upper screen.

                    // If allies load cannons, they trigger `playerFire(type)` in `battle.js`.
                    // This creates a standard `Projectile` with `isPlayer=true` (implicitly, dir=1).
                    // This uses Case 1 logic above. Standard projectiles ARE visible.

                    // So why "not visible"? 
                    // Maybe the projectile type is not handled in `drawProjectile`?
                    // Or maybe `playerFire` isn't setting `active` or `phase` correctly?
                    // `Projectile` constructor sets `active=true`, `phase='flying'`.

                    // Let's look at `SimpleProjectile` usage again.
                    // Search results might show where it's used.
                    // If `SimpleProjectile` is used for "Ally Turret" (gunner/defender) shooting at INVADERS,
                    // those are INTERIOR projectiles. They should NOT be on the upper screen.

                    // However, if the user sees "Ally ball" blocking "Enemy ball", they might mean
                    // PLAYER PROJECTILES (rocks) blocking ENEMY PROJECTILES (rocks).
                    // And they say "Ally ball" -> maybe they mean projectiles loaded by allies?

                    // Let's assume standard interaction:
                    // Player/Ally loads cannon -> Projectile fired -> Visible on upper screen -> Can collide with enemy projectile.

                    // Logic for collision is in proper `battle.js`.

                    // If "Ally projectile not visible", maybe they mean the SPECIAL ALLY MISSILE?
                    // `launchAllyMissile` in `battle.js`?
                    // Let's check `battle.js` for `launchAllyMissile`.

                }
            }
        }

        // === STATUS EFFECTS（軽量版：ループ数・fillRect化で負荷削減）===
        // Fire Effect (Burn) - 5ループ→3に削減
        if (battle.fireEffect > 0) {
            const t = _getFrameNow() * 0.01;
            ctx.save();
            for (let i = 0; i < 3; i++) {
                const fx = enemyX + 90 + Math.cos(t * 1.3 + i * 2.1) * 55;
                const fy = enemyY + 175 + Math.sin(t * 1.7 + i * 1.5) * 45;
                const size = 28 + Math.sin(t + i) * 8;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255,120,0,0.42)' : 'rgba(255,60,0,0.38)';
                ctx.beginPath(); ctx.arc(fx, fy, size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
        // Ice Effect (Freeze) - 単純fillRect
        if (battle.iceEffect > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(100,220,255,0.28)';
            ctx.fillRect(enemyX + 20, enemyY + 20, 200, 240);
            ctx.strokeStyle = 'rgba(200,240,255,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(enemyX + 20, enemyY + 20, 200, 240);
            ctx.restore();
        }
        // Thunder Flash
        if (battle.thunderFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255,255,200,${battle.thunderFlash * 0.08})`;
            ctx.fillRect(enemyX - 50, enemyY - 50, 340, 380);
            ctx.restore();
        }
        // Wind Effect - 4ループ→2に削減
        if (battle.windEffect > 0) {
            const t = _getFrameNow() * 0.015;
            ctx.save();
            for (let i = 0; i < 2; i++) {
                const wx = enemyX + 50 + Math.cos(t * 2.1 + i * 3.14) * 65;
                const wy = enemyY + 110 + Math.sin(t * 1.8 + i * 3.14) * 50;
                ctx.strokeStyle = `rgba(130,200,130,${0.32 + Math.sin(t + i) * 0.12})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(wx - 18, wy);
                ctx.bezierCurveTo(wx, wy - 12, wx + 10, wy - 7, wx + 18, wy);
                ctx.stroke();
            }
            ctx.restore();
        }
        // Burn DoT Effect - 4ループ→2に削減
        if (battle.burnEffect > 0) {
            const t = _getFrameNow() * 0.012;
            ctx.save();
            for (let i = 0; i < 2; i++) {
                const bx = enemyX + 70 + Math.cos(t * 1.6 + i * 3.14) * 50;
                const by = enemyY + 165 + Math.sin(t * 2.0 + i * 2.0) * 35;
                const sz = 16 + Math.sin(t * 2 + i) * 5;
                ctx.fillStyle = `rgba(255,150,0,0.38)`;
                ctx.beginPath(); ctx.arc(bx, by, sz, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // ===== プレイヤー砲口フラッシュ（発砲時）軽量版 =====
        if (battle.playerMuzzleFlash > 0) {
            const pmAlpha = battle.playerMuzzleFlash / 8;
            const pmfX = playerX + 185;
            const pmfY = playerY + 130;
            // カスタムエフェクト色
            const _efxCustom = window.game && window.game.saveData && window.game.saveData.tankCustom;
            const _efxId = (_efxCustom && _efxCustom.effect) || 'effect_normal';
            const _efxParts = window.TANK_PARTS && window.TANK_PARTS.effects;
            const _efxDef = _efxParts && _efxParts.find(e => e.id === _efxId);
            const efxColor = (_efxDef && _efxDef.color) || '#AADDFF';
            ctx.save();
            // エフェクト種別ごとの特殊フラッシュ
            if (_efxId === 'effect_fire') {
                // 炎：大きめのオレンジ放射＋リング
                ctx.globalAlpha = pmAlpha * 0.9;
                const fgrad = ctx.createRadialGradient(pmfX, pmfY, 0, pmfX, pmfY, 60);
                fgrad.addColorStop(0, 'rgba(255,220,50,1)');
                fgrad.addColorStop(0.4, 'rgba(255,80,0,0.7)');
                fgrad.addColorStop(1, 'rgba(255,40,0,0)');
                ctx.fillStyle = fgrad;
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 60, 0, Math.PI * 2); ctx.fill();
            } else if (_efxId === 'effect_ice') {
                // 氷：シャープな放射線＋青白いフラッシュ
                ctx.globalAlpha = pmAlpha * 0.85;
                ctx.fillStyle = 'rgba(150,230,255,0.7)';
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 50, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(200,245,255,0.9)'; ctx.lineWidth = 2;
                for (let si = 0; si < 6; si++) {
                    const sa = (si / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(pmfX + Math.cos(sa) * 10, pmfY + Math.sin(sa) * 10);
                    ctx.lineTo(pmfX + Math.cos(sa) * 55, pmfY + Math.sin(sa) * 55);
                    ctx.stroke();
                }
            } else if (_efxId === 'effect_thunder') {
                // 雷：ビリビリした放電フラッシュ
                ctx.globalAlpha = pmAlpha * 0.95;
                ctx.fillStyle = 'rgba(255,240,0,0.8)';
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 48, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,150,1)'; ctx.lineWidth = 2.5;
                for (let li2 = 0; li2 < 5; li2++) {
                    const la = (li2 / 5) * Math.PI * 2;
                    const lx1 = pmfX + Math.cos(la) * 15, ly1 = pmfY + Math.sin(la) * 15;
                    const lx2 = pmfX + Math.cos(la + 0.3) * 35, ly2 = pmfY + Math.sin(la + 0.3) * 35;
                    const lx3 = pmfX + Math.cos(la) * 58, ly3 = pmfY + Math.sin(la) * 58;
                    ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.lineTo(lx3, ly3); ctx.stroke();
                }
            } else if (_efxId === 'effect_holy') {
                // 聖光：十字の光芒＋白いリング
                ctx.globalAlpha = pmAlpha * 0.85;
                const hgrad = ctx.createRadialGradient(pmfX, pmfY, 0, pmfX, pmfY, 55);
                hgrad.addColorStop(0, 'rgba(255,255,230,1)');
                hgrad.addColorStop(1, 'rgba(255,255,200,0)');
                ctx.fillStyle = hgrad;
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 55, 0, Math.PI * 2); ctx.fill();
                // 十字
                ctx.fillStyle = 'rgba(255,255,240,0.9)';
                ctx.fillRect(pmfX - 4, pmfY - 60, 8, 120);
                ctx.fillRect(pmfX - 60, pmfY - 4, 120, 8);
            } else if (_efxId === 'effect_dark') {
                // 暗黒：紫の波紋
                ctx.globalAlpha = pmAlpha * 0.9;
                const dgrad = ctx.createRadialGradient(pmfX, pmfY, 0, pmfX, pmfY, 58);
                dgrad.addColorStop(0, 'rgba(220,50,255,0.9)');
                dgrad.addColorStop(0.5, 'rgba(100,0,180,0.6)');
                dgrad.addColorStop(1, 'rgba(40,0,80,0)');
                ctx.fillStyle = dgrad;
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 58, 0, Math.PI * 2); ctx.fill();
                // 波紋リング
                ctx.strokeStyle = 'rgba(200,100,255,0.7)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 58 * pmAlpha, 0, Math.PI * 2); ctx.stroke();
            } else {
                // ノーマル（デフォルト）
                ctx.globalAlpha = pmAlpha * 0.85;
                ctx.fillStyle = efxColor;
                ctx.beginPath(); ctx.arc(pmfX, pmfY, 40, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = pmAlpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(pmfX, pmfY, 12, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // ===== 敵砲口フラッシュ（発砲時）軽量版 =====
        if (battle.enemyMuzzleFlash > 0) {
            const mAlpha = battle.enemyMuzzleFlash / 8;
            const mfX = enemyX + 55;
            const mfY = enemyY + 130;
            ctx.save();
            ctx.globalAlpha = mAlpha * 0.85;
            ctx.fillStyle = '#FFAA44';
            ctx.beginPath(); ctx.arc(mfX, mfY, 44, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = mAlpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(mfX, mfY, 14, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // ===== 低HP時の危機演出: 画面四隅に赤いオーバーレイ（グラデなし・軽量）=====
        const playerHPRatio = battle.playerTankMaxHP > 0 ? battle.playerTankHP / battle.playerTankMaxHP : 1;
        if (playerHPRatio < 0.3) {
            const fn = _getFrameNow ? _getFrameNow() : 0;
            const dangerAlpha = (0.3 - playerHPRatio) / 0.3;
            // 10フレームに1回だけ点滅（Math.sin廃止）
            const blink = Math.floor(fn / 10) % 2 === 0;
            const pulseAlpha = dangerAlpha * (blink ? 0.18 : 0.08);
            ctx.save();
            ctx.globalAlpha = pulseAlpha;
            ctx.fillStyle = '#CC0000';
            // 四隅だけ塗る（fillRect全体より負荷が低い）
            const edgeW = w * 0.18, edgeH = h * 0.18;
            ctx.fillRect(0, 0, w, edgeH);           // 上
            ctx.fillRect(0, h - edgeH, w, edgeH);   // 下
            ctx.fillRect(0, edgeH, edgeW, h - edgeH * 2);  // 左
            ctx.fillRect(w - edgeW, edgeH, edgeW, h - edgeH * 2); // 右
            ctx.restore();
        }
    },

    drawBoss(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Cape (Behind)
        ctx.fillStyle = '#C00';
        ctx.beginPath();
        ctx.moveTo(-10, 5);
        ctx.quadraticCurveTo(-20, 20, -15, 25);
        ctx.lineTo(15, 25);
        ctx.quadraticCurveTo(20, 20, 10, 5);
        ctx.fill();

        // Body (Big Slime)
        ctx.fillStyle = color; // Usually King Slime Blue or Metal
        ctx.beginPath();
        ctx.moveTo(-20, 20);
        ctx.quadraticCurveTo(-25, -20, 0, -20);
        ctx.quadraticCurveTo(25, -20, 20, 20);
        ctx.fill();

        // Crown (Ornate)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-12, -18);
        ctx.lineTo(-8, -30);
        ctx.lineTo(0, -22); // Middle Dip
        ctx.lineTo(8, -30);
        ctx.lineTo(12, -18);
        ctx.fill();
        // Jewels on Crown
        ctx.fillStyle = '#F00'; ctx.beginPath(); ctx.arc(0, -25, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0F0'; ctx.beginPath(); ctx.arc(-8, -24, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00F'; ctx.beginPath(); ctx.arc(8, -24, 1.5, 0, Math.PI * 2); ctx.fill();

        // Face (Slightly menacing / proud)
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(6, -6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-6, -6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(7, -6, 2, 0, Math.PI * 2); ctx.fill(); // Looking side
        ctx.beginPath(); ctx.arc(-5, -6, 2, 0, Math.PI * 2); ctx.fill();

        // Moustache / Cheek (King feel)
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(10, 2, 3, 0, Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(-10, 2, 3, 0, Math.PI); ctx.stroke();

        ctx.restore();
    },

    drawNinja(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body (Dark Suit)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Scarf (Fluttering)
        ctx.fillStyle = '#D32F2F'; // Red Scarf
        ctx.beginPath();
        const flutter = Math.sin(frame * 0.2) * 5;
        ctx.moveTo(-10, 5);
        ctx.quadraticCurveTo(-20, 10 + flutter, -30, 5 + flutter);
        ctx.lineTo(-25, 0 + flutter);
        ctx.fill();

        // Eyes (Sharp)
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.moveTo(5, -5); ctx.lineTo(15, -8); ctx.lineTo(15, -2); ctx.fill();

        // Headband
        ctx.fillStyle = '#EEE';
        ctx.fillRect(-12, -15, 24, 4);

        ctx.restore();
    },

    // ハンゾー: 忍者ベース + 白い仮面マーク + 青い鉢巻
    drawNinjaHanzo(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        // Body（濃い紺色）
        ctx.fillStyle = '#1A237E';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 青い鉢巻
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(-12, -15, 24, 5);
        // 白い仮面（目の部分）
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.ellipse(0, -2, w * 0.25, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        // 目（赤）
        ctx.fillStyle = '#EF5350';
        ctx.beginPath();
        ctx.ellipse(-5, -2, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5, -2, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        // 青スカーフ
        ctx.fillStyle = '#1565C0';
        ctx.beginPath();
        const fl = Math.sin(frame * 0.2) * 5;
        ctx.moveTo(-10, 5);
        ctx.quadraticCurveTo(-20, 10 + fl, -30, 5 + fl);
        ctx.lineTo(-25, 0 + fl); ctx.fill();
        ctx.restore();
    },

    // マーマン: 忍者ベース + 水色 + ヒレ
    drawNinjaMerman(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        // Body（水色）
        ctx.fillStyle = '#00838F';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 背びれ
        ctx.fillStyle = '#006064';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.4);
        ctx.lineTo(-6, -h * 0.65 - Math.sin(frame * 0.15) * 4);
        ctx.lineTo(6, -h * 0.65 - Math.sin(frame * 0.15) * 4);
        ctx.closePath(); ctx.fill();
        // 目（黄緑）
        ctx.fillStyle = '#AEEA00';
        ctx.beginPath();
        ctx.ellipse(-6, -4, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(6, -4, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-6, -4, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(6, -4, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        // 水飛沫スカーフ
        ctx.fillStyle = 'rgba(0,188,212,0.7)';
        ctx.beginPath();
        const fl2 = Math.sin(frame * 0.25) * 6;
        ctx.moveTo(-8, 5);
        ctx.quadraticCurveTo(-20, 8 + fl2, -28, 3 + fl2);
        ctx.lineTo(-22, -1 + fl2); ctx.fill();
        ctx.restore();
    },

    drawDragon(ctx, x, y, w, h, color, dir, frame) {
        // drawSlime の dragon ブランチと完全統一（戦闘画面と同じ見た目）
        this.drawSlime(ctx, x, y, w, h, color, '#8B0000', dir, frame, 0, 'dragon');
    },

    drawGhost(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        this.drawSlime(ctx, x, y, w, h, '#F5F5F5', '#999', dir, frame + Math.sin(frame * 0.1) * 5, 0);
        ctx.translate(x + w / 2, y + h);
        ctx.scale(dir, 1);
        // Tail
        ctx.fillStyle = '#F5F5F5';
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.quadraticCurveTo(0, 20 + Math.sin(frame * 0.1) * 10, 20, 10);
        ctx.lineTo(10, -5);
        ctx.fill();
        ctx.restore();
    },

    // どろろん改: ゴーストベース + 紫がかった色 + 黒いオーラ
    drawGhostKai(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        // 本体は紫がかった暗い色
        this.drawSlime(ctx, x, y, w, h, '#7B1FA2', '#4A148C', dir, frame + Math.sin(frame * 0.1) * 5, 0);
        ctx.translate(x + w / 2, y + h);
        ctx.scale(dir, 1);
        // 尻尾（紫）
        ctx.fillStyle = '#9C27B0';
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.quadraticCurveTo(0, 22 + Math.sin(frame * 0.12) * 12, 20, 10);
        ctx.lineTo(10, -5); ctx.fill();
        // オーラ（黒い粒子的な演出）
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#212121';
        for (let i = 0; i < 4; i++) {
            const angle = frame * 0.07 + i * Math.PI / 2;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * 18, -8 + Math.sin(angle) * 10, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    },

    drawMetalking(ctx, x, y, w, h, color, dir, frame) {
        this.drawSlime(ctx, x, y, w * 1.2, h * 1.2, '#B0BEC5', '#546E7A', dir, frame, 0);
        ctx.save();
        ctx.translate(x + (w * 1.2) / 2, y + (h * 1.2) / 2);
        ctx.scale(dir, 1);
        // Large Crown
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-20, -35);
        ctx.lineTo(-25, -55); ctx.lineTo(-10, -45); ctx.lineTo(0, -65);
        ctx.lineTo(10, -45); ctx.lineTo(25, -55); ctx.lineTo(20, -35);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    },

    // メタキン (metalking_ex): クロームキングより輝かしい金+銀の王
    drawMetalkingEx(ctx, x, y, w, h, color, dir, frame) {
        // 本体：金色ベース
        this.drawSlime(ctx, x, y, w * 1.25, h * 1.25, '#FFD700', '#E65100', dir, frame, 0);
        ctx.save();
        ctx.translate(x + (w * 1.25) / 2, y + (h * 1.25) / 2);
        ctx.scale(dir, 1);
        // 豪華な二重王冠
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-22, -37);
        ctx.lineTo(-28, -60); ctx.lineTo(-12, -47); ctx.lineTo(0, -70);
        ctx.lineTo(12, -47); ctx.lineTo(28, -60); ctx.lineTo(22, -37);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#E65100'; ctx.lineWidth = 2; ctx.stroke();
        // 宝石（赤）
        ctx.fillStyle = '#E53935';
        ctx.beginPath(); ctx.arc(0, -50, 5, 0, Math.PI * 2); ctx.fill();
        // キラキラ（回転）
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        const a = frame * 0.1;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 20, Math.sin(a) * 10 - 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    drawHealer(ctx, x, y, w, h, color, dir, frame) {
        const floatY = Math.sin(frame * 0.15) * 8;
        this.drawSlime(ctx, x, y + floatY, w * 0.8, h * 0.8, '#42A5F5', '#0D47A1', dir, frame, 0);
        ctx.save();
        ctx.translate(x + w / 2, y + h + floatY);
        ctx.scale(dir, 1);
        // Tentacles
        ctx.fillStyle = '#FFCCBC';
        for (let i = -2; i <= 2; i++) {
            const tx = i * 8;
            const ty = 5 + Math.sin(frame * 0.2 + i) * 5;
            ctx.beginPath();
            ctx.ellipse(tx, ty, 4, 15, Math.sin(frame * 0.1 + i) * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    },

    // リカバリス (healer_recov): ヒーラーベース + ピンク + 十字マーク
    drawHealerRecov(ctx, x, y, w, h, color, dir, frame) {
        const floatY = Math.sin(frame * 0.15) * 8;
        // ピンク系の本体
        this.drawSlime(ctx, x, y + floatY, w * 0.8, h * 0.8, '#EC407A', '#880E4F', dir, frame, 0);
        ctx.save();
        ctx.translate(x + w / 2, y + h + floatY);
        ctx.scale(dir, 1);
        // 触手（ピンク）
        ctx.fillStyle = '#F48FB1';
        for (let i = -2; i <= 2; i++) {
            const tx = i * 8;
            const ty = 5 + Math.sin(frame * 0.2 + i) * 5;
            ctx.beginPath();
            ctx.ellipse(tx, ty, 4, 15, Math.sin(frame * 0.1 + i) * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        // 十字マーク（ヒール能力の強調）
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-3, -h * 0.8 - 12, 6, 16);
        ctx.fillRect(-8, -h * 0.8 - 7, 16, 6);
        ctx.restore();
    },

    drawWizard(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body (Robe)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.4);
        ctx.lineTo(w * 0.4, h * 0.5);
        ctx.lineTo(-w * 0.4, h * 0.5);
        ctx.fill();

        // Hat (Pointy)
        ctx.fillStyle = '#4A148C'; // Dark Purple
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(15, -10);
        const tipSway = Math.sin(frame * 0.1) * 5;
        ctx.lineTo(tipSway, -45);
        ctx.fill();
        // Hat Brim
        ctx.beginPath(); ctx.ellipse(0, -10, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(5, 0, 3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    drawAngel(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Wings (Fluttering)
        const wingY = Math.sin(frame * 0.2) * 5;
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(-20, -10 + wingY, 15, 8, -0.2, 0, Math.PI * 2); // Back wing
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(20, -10 + wingY, 15, 8, 0.2, 0, Math.PI * 2); // Front wing
        ctx.fill();

        // Body (Glowing)

        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2); ctx.fill();

        // Halo
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -25 + wingY * 0.5, 12, 4, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Face (Peaceful)
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText('^ ^', -6, 2);

        ctx.restore();
    },

    // レジェンドスライム専用（angel_legendタイプ）: 金色・大きな翼・星の輝き
    drawAngelLegend(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        const sz = Math.min(w, h) * 0.42;
        const wingY = Math.sin(frame * 0.15) * 6;
        const hue = (frame * 3) % 360;

        // 外側オーラリング
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.4)`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, sz * 1.5, 0, Math.PI * 2); ctx.stroke();

        // 大きな金の翼（4枚）
        ctx.fillStyle = 'rgba(255,215,0,0.85)';
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.ellipse(i * sz * 1.1, -sz * 0.2 + wingY, sz * 0.55, sz * 0.22, i * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(i * sz * 0.8, -sz * 0.6 + wingY * 0.7, sz * 0.4, sz * 0.16, i * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // ボディ（輝く金色）
        const bodyGrad = ctx.createRadialGradient(-sz * 0.2, -sz * 0.3, 0, 0, 0, sz);
        bodyGrad.addColorStop(0, '#FFF9C4');
        bodyGrad.addColorStop(0.5, '#FFD700');
        bodyGrad.addColorStop(1, '#FF8F00');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.arc(0, 0, sz, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 虹色ハロー（二重リング）
        ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, -sz * 1.4 + wingY * 0.4, sz * 0.4, sz * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `hsl(${(hue + 120) % 360}, 100%, 75%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, -sz * 1.4 + wingY * 0.4, sz * 0.3, sz * 0.08, 0, 0, Math.PI * 2); ctx.stroke();

        // 星のきらめき
        if (frame % 20 < 10) {
            ctx.fillStyle = '#FFF';
            for (const [sx, sy] of [[sz * 1.3, -sz * 0.8], [-sz * 1.2, -sz * 0.5], [sz * 0.9, sz * 0.7]]) {
                ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 顔（大きな丸い目）
        const eyeR = sz * 0.22;
        const eyeX = sz * 0.35;
        const eyeY = sz * 0.05;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E';
        ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-eyeX - eyeR * 0.18, eyeY - eyeR * 0.2, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX - eyeR * 0.18, eyeY - eyeR * 0.2, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
        // 笑顔
        ctx.strokeStyle = '#7B3F00';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, eyeY + sz * 0.2, sz * 0.2, 0.2, Math.PI - 0.2); ctx.stroke();

        ctx.restore();
    },

    drawDefender(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body (Spiky but heavier)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Armor Plate
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(0, 0, w / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Helmet
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, -5, w / 2, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#EEE'; // Spike center
        ctx.beginPath(); ctx.moveTo(0, -w / 2); ctx.lineTo(-4, -w / 2 - 10); ctx.lineTo(4, -w / 2 - 10); ctx.fill();

        // Eyes (Visor look)
        ctx.fillStyle = '#000';
        ctx.fillRect(-10, -5, 20, 6);
        ctx.fillStyle = '#FFEB3B'; // Glowing eye slit
        ctx.fillRect(-8, -3, 16, 2);

        // Shield (Held in front)
        ctx.fillStyle = '#CCC';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(5, 0, 15, 20);
        ctx.restore();
    },

    // ゴーレムA (defender_golem): ディフェンダーベース + 石造り感 + 緑の目
    drawDefenderGolem(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        // 本体（石色）
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
        // 石の質感（ひび割れ）
        ctx.strokeStyle = '#546E7A'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(2, 2); ctx.stroke();
        // 兜（角付き）
        ctx.fillStyle = '#455A64';
        ctx.beginPath();
        ctx.arc(0, -5, w / 2, Math.PI, 0); ctx.fill();
        // 角
        ctx.fillStyle = '#37474F';
        ctx.beginPath(); ctx.moveTo(-12, -w/2+2); ctx.lineTo(-18, -w/2-14); ctx.lineTo(-6, -w/2-2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(12, -w/2+2); ctx.lineTo(18, -w/2-14); ctx.lineTo(6, -w/2-2); ctx.fill();
        // 目（緑）
        ctx.fillStyle = '#76FF03';
        ctx.fillRect(-10, -5, 8, 5);
        ctx.fillRect(2, -5, 8, 5);
        ctx.restore();
    },

    // エリート兵 (defender_elite): ディフェンダーベース + 金の装甲 + 赤マント
    drawDefenderElite(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        // 本体（金色）
        ctx.fillStyle = '#F9A825';
        ctx.beginPath();
        ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
        // 金の鎧
        ctx.fillStyle = '#FF8F00';
        ctx.beginPath();
        ctx.arc(0, 0, w / 2 - 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#E65100'; ctx.lineWidth = 2; ctx.stroke();
        // 兜
        ctx.fillStyle = '#E65100';
        ctx.beginPath();
        ctx.arc(0, -5, w / 2, Math.PI, 0); ctx.fill();
        // 兜の飾り羽（赤）
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath(); ctx.moveTo(0, -w/2-2); ctx.lineTo(-5, -w/2-16); ctx.lineTo(5, -w/2-16); ctx.fill();
        // 目（赤く光る）
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(-10, -5, 20, 6);
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(-8, -3, 16, 2);
        ctx.restore();
    },

    // --- REVOLUTION: UNIQUE SLIME VARIANTS ---
    drawSlimeBlue(ctx, x, y, w, h, color, dir, frame) {
        // Base Slime
        this.drawSlime(ctx, x, y, w, h, color, '#0D47A1', dir, frame, 0);

        // Goggles
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        ctx.fillStyle = '#4FC3F7'; // Glass
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        // Left lens
        ctx.beginPath(); ctx.arc(-6, -2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Right lens
        ctx.beginPath(); ctx.arc(6, -2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Strap
        ctx.fillStyle = '#333';
        ctx.fillRect(-12, -3, 3, 2);
        ctx.fillRect(9, -3, 3, 2);
        ctx.restore();
    },

    // アクアスライム (slime_aqua): 水色透明ボディ + 水泡 + きらきら
    drawSlimeAqua(ctx, x, y, w, h, color, dir, frame) {
        // 水色ベース
        this.drawSlime(ctx, x, y, w, h, '#26C6DA', '#00838F', dir, frame, 0);

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 透明感（白いハイライト）
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(-w * 0.12, -h * 0.18, w * 0.14, h * 0.1, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // 浮かぶ水泡（小さな円）
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        const bubbles = [{ox: -12, oy: 8, r: 3, sp: 0.08}, {ox: 6, oy: 12, r: 4, sp: 0.06}, {ox: 10, oy: 4, r: 2, sp: 0.12}];
        bubbles.forEach(b => {
            const by = b.oy - ((frame * b.sp * 20) % (h * 0.8));
            ctx.globalAlpha = Math.max(0, 0.8 - Math.abs(by) / (h * 0.6));
            ctx.beginPath();
            ctx.arc(b.ox, by, b.r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    drawSlimeRed(ctx, x, y, w, h, color, dir, frame) {
        // Base Slime
        this.drawSlime(ctx, x, y, w, h, color, '#B71C1C', dir, frame, 0);

        // Horn
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        ctx.fillStyle = '#EEE';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(3, -2);
        ctx.lineTo(-3, -2);
        ctx.fill();
        ctx.restore();
    },

    drawSlimePurple(ctx, x, y, w, h, color, dir, frame) {
        // パープルスライム: ブルー×レッドの配合産。魔力の紫オーラと双角を持つ
        this.drawSlime(ctx, x, y, w, h, color, '#6A1B9A', dir, frame, 0);

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 双角（左右に小さい角）
        ctx.fillStyle = '#CE93D8';
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(i * 4, -10);
            ctx.lineTo(i * 7, -17);
            ctx.lineTo(i * 2, -10);
            ctx.fill();
        }

        // 魔力オーラリング（脈動）
        const auraAlpha = 0.18 + Math.sin(frame * 0.1) * 0.08;
        ctx.globalAlpha = auraAlpha;
        ctx.strokeStyle = '#CE93D8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.52, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    drawSlimeMetal(ctx, x, y, w, h, color, dir, frame) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2 + 5); // Low profile
        ctx.scale(dir, 1);

        // Liquid Body
        ctx.fillStyle = color;
        ctx.beginPath();
        // Wider, flatter
        ctx.ellipse(0, 0, w * 0.5, h * 0.25, 0, Math.PI, 0);
        ctx.lineTo(w * 0.5, h * 0.25);
        ctx.quadraticCurveTo(0, h * 0.4, -w * 0.5, h * 0.25);
        ctx.fill();

        // Face
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-6, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -2, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    drawKingSlime(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        // Base Slime (Huge)
        this.drawSlime(ctx, x, y, w, h, color, '#2A9FD6', dir, frame, 0);

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // CROWN
        const crownY = -h * 0.45 + Math.sin(frame * 0.1) * 2;
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, crownY);
        ctx.lineTo(-20, crownY - 15); // Left point
        ctx.lineTo(-10, crownY - 8);
        ctx.lineTo(0, crownY - 20);   // Center point
        ctx.lineTo(10, crownY - 8);
        ctx.lineTo(20, crownY - 15);  // Right point
        ctx.lineTo(15, crownY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Facs (Mustacho?)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(0, 5, 10, 5, 0, 0, Math.PI * 2); // Mouth area?
        ctx.fill();

        ctx.restore();
    },

    // ★ typeが 'kingslime' のとき _uiDrawAllyIcon が drawKingslime を探すためエイリアスを追加
    drawKingslime(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        this.drawKingSlime(ctx, x, y, w, h, color, dir, frame);
    },

    drawSlimeGold(ctx, x, y, w, h, color, dir, frame) {
        // slimeTypeを渡してdrawSlime内のslime_goldブランチ（王冠付き）を使う
        // 以前は slimeType未指定→王冠なし+別途ズレた座標でクラウン描画という二重バグがあった
        this.drawSlime(ctx, x, y, w, h, color, '#FFA000', dir, frame, 0, 'slime_gold');
    },

    drawGolem(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body (Blocky Stone)
        ctx.fillStyle = color; // Stone Brown
        const sway = Math.sin(frame * 0.05) * 2;
        ctx.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.7);

        // Head
        ctx.fillRect(-w * 0.25, -h * 0.6 + sway, w * 0.5, h * 0.3);

        // Arms (Long)
        const armAng = Math.sin(frame * 0.1) * 0.2;
        ctx.save();
        ctx.translate(-w * 0.4, -h * 0.3);
        ctx.rotate(armAng);
        ctx.fillRect(-10, 0, 20, h * 0.6); // Left Arm
        ctx.restore();

        ctx.save();
        ctx.translate(w * 0.4, -h * 0.3);
        ctx.rotate(-armAng);
        ctx.fillRect(-10, 0, 20, h * 0.6); // Right Arm
        ctx.restore();

        // Eyes (Glowing)
        ctx.fillStyle = '#0FF'; // Blue magic eyes

        ctx.fillRect(-10, -h * 0.5 + sway, 6, 4);
        ctx.fillRect(4, -h * 0.5 + sway, 6, 4);

        // Cracks/Texture
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(-5, 10); ctx.lineTo(-15, 15);
        ctx.stroke();

        ctx.restore();
    },

    // サンドゴーレム (golem_sand): 砂漠の色 + 砂嵐エフェクト + 眼が赤い
    drawGolemSand(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 砂色の体
        const sway = Math.sin(frame * 0.05) * 2;
        ctx.fillStyle = '#D4A017';
        ctx.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.7);

        // 頭（ざらざら感）
        ctx.fillStyle = '#C8960C';
        ctx.fillRect(-w * 0.25, -h * 0.6 + sway, w * 0.5, h * 0.3);

        // 腕
        const armAng = Math.sin(frame * 0.1) * 0.2;
        ctx.fillStyle = '#B8860B';
        ctx.save();
        ctx.translate(-w * 0.4, -h * 0.3);
        ctx.rotate(armAng);
        ctx.fillRect(-10, 0, 20, h * 0.6);
        ctx.restore();
        ctx.save();
        ctx.translate(w * 0.4, -h * 0.3);
        ctx.rotate(-armAng);
        ctx.fillRect(-10, 0, 20, h * 0.6);
        ctx.restore();

        // 目（赤熱）
        ctx.fillStyle = '#FF1744';
        ctx.fillRect(-10, -h * 0.5 + sway, 6, 4);
        ctx.fillRect(4,  -h * 0.5 + sway, 6, 4);

        // 砂粒パーティクル（ふわふわ舞う）
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#FFD54F';
        for (let i = 0; i < 5; i++) {
            const a = frame * 0.09 + i * 1.26;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * (w * 0.55), Math.sin(a * 0.7) * (h * 0.45) - 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // ひび割れ
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 2); ctx.lineTo(-3, 12); ctx.lineTo(-12, 18);
        ctx.stroke();

        ctx.restore();
    },

    drawMaster(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        const bob = Math.sin(frame * 0.06) * 2;

        // Aura glow (wise elder energy)
        ctx.save();
        ctx.globalAlpha = 0.18 + Math.sin(frame * 0.04) * 0.08;
        const auraGrad = ctx.createRadialGradient(0, bob, 2, 0, bob, w * 0.72);
        auraGrad.addColorStop(0, '#FFD700');
        auraGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, bob, w * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Body (Elder Slime - deep magenta)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, bob, w * 0.42, Math.PI, 0);
        ctx.lineTo(w * 0.42, h * 0.42 + bob);
        ctx.quadraticCurveTo(0, h * 0.55 + bob, -w * 0.42, h * 0.42 + bob);
        ctx.fill();

        // Dark robe overlay
        ctx.fillStyle = 'rgba(80,0,40,0.45)';
        ctx.beginPath();
        ctx.arc(0, bob, w * 0.38, Math.PI * 0.15, Math.PI * 0.85);
        ctx.lineTo(w * 0.38, h * 0.42 + bob);
        ctx.quadraticCurveTo(0, h * 0.52 + bob, -w * 0.38, h * 0.42 + bob);
        ctx.fill();

        // Long white beard
        ctx.fillStyle = '#F0EDE8';
        ctx.beginPath();
        ctx.moveTo(-14, 4 + bob);
        ctx.quadraticCurveTo(-8, 26 + bob, 0, 28 + bob);
        ctx.quadraticCurveTo(8, 26 + bob, 14, 4 + bob);
        ctx.quadraticCurveTo(0, -2 + bob, -14, 4 + bob);
        ctx.fill();

        // Wise white eyebrows
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#F0EDE8';
        ctx.beginPath();
        ctx.moveTo(-13, -14 + bob); ctx.lineTo(-5, -11 + bob);
        ctx.moveTo(13, -14 + bob); ctx.lineTo(5, -11 + bob);
        ctx.stroke();

        // Eyes (small, wise)
        ctx.fillStyle = '#4A0020';
        ctx.beginPath();
        ctx.arc(-6, -6 + bob, 2.5, 0, Math.PI * 2);
        ctx.arc(6, -6 + bob, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Golden hat / halo hint
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.6 + Math.sin(frame * 0.05) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -18 + bob, 13, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Staff (right side, animated sway)
        ctx.save();
        ctx.translate(w * 0.44, -4 + bob);
        const sway = Math.sin(frame * 0.08) * 0.12;
        ctx.rotate(sway);
        // Staff pole
        ctx.fillStyle = '#6D4C41';
        ctx.fillRect(-2.5, -32, 5, 62);
        // Gold tip
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, -34, 7, 0, Math.PI * 2);
        ctx.fill();
        // Gem shine
        const gemGlow = 0.5 + Math.sin(frame * 0.07) * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${gemGlow})`;
        ctx.beginPath();
        ctx.arc(-2, -36, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    },

    // 老師（旧報酬）(master_old): 老師ベース + 白髪 + 黒い禅ローブ + 青い杖宝石
    drawMasterOld(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 体（黒のローブ）
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.4, Math.PI, 0);
        ctx.lineTo(w * 0.4, h * 0.4);
        ctx.quadraticCurveTo(0, h * 0.5, -w * 0.4, h * 0.4);
        ctx.fill();

        // 白い長い髭
        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.quadraticCurveTo(0, 28, 16, 0);
        ctx.quadraticCurveTo(0, -5, -16, 0);
        ctx.fill();

        // 白い太い眉
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#FAFAFA';
        ctx.beginPath();
        ctx.moveTo(-13, -16); ctx.lineTo(-5, -13);
        ctx.moveTo(13, -16); ctx.lineTo(5, -13);
        ctx.stroke();

        // 杖（黒い木）
        ctx.save();
        ctx.translate(w * 0.4, 0);
        ctx.rotate(Math.sin(frame * 0.1) * 0.1);
        ctx.fillStyle = '#37474F';
        ctx.fillRect(-2, -30, 4, 60);
        // 青い宝石
        ctx.fillStyle = '#29B6F6';
        ctx.beginPath(); ctx.arc(0, -32, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(-2, -34, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
    },

    // 次元スライム (master_dim): 老師ベース + 虹色オーラ + 次元の歪みエフェクト
    drawMasterDim(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 体（深紫）
        ctx.fillStyle = '#4A148C';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.4, Math.PI, 0);
        ctx.lineTo(w * 0.4, h * 0.4);
        ctx.quadraticCurveTo(0, h * 0.5, -w * 0.4, h * 0.4);
        ctx.fill();

        // 次元の歪みオーラ（回転する虹リング）
        const hues = [0, 60, 120, 180, 240, 300];
        hues.forEach((hue, i) => {
            const a = frame * 0.06 + i * (Math.PI / 3);
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(Math.cos(a) * 4, Math.sin(a) * 3, w * 0.48, h * 0.48, a, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // 白髭
        ctx.fillStyle = '#CE93D8';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.quadraticCurveTo(0, 22, 14, 0);
        ctx.quadraticCurveTo(0, -4, -14, 0);
        ctx.fill();

        // 眉
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#CE93D8';
        ctx.beginPath();
        ctx.moveTo(-12, -15); ctx.lineTo(-5, -12);
        ctx.moveTo(12, -15); ctx.lineTo(5, -12);
        ctx.stroke();

        // 次元の杖（虹色宝石）
        ctx.save();
        ctx.translate(w * 0.4, 0);
        ctx.rotate(Math.sin(frame * 0.1) * 0.15);
        ctx.fillStyle = '#6A1B9A';
        ctx.fillRect(-2, -30, 4, 60);
        const gemHue = (frame * 3) % 360;
        ctx.fillStyle = `hsl(${gemHue}, 100%, 60%)`;
        ctx.beginPath(); ctx.arc(0, -32, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(-2, -34, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
    },

    drawDrone(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        const yOffset = Math.sin(frame * 0.1) * 3;
        ctx.translate(0, yOffset);
        ctx.scale(dir, 1);

        // Propeller (Blurry when moving)
        ctx.fillStyle = '#AAA';
        ctx.fillRect(-16, -20, 32, 4);
        const propSpeed = frame * 1.5;
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(propSpeed) * 0.3})`;
        ctx.beginPath(); ctx.ellipse(0, -22, 25, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#555'; // Shaft
        ctx.fillRect(-2, -20, 4, 8);

        // Body (Metallic sphere)
        const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 15);
        grad.addColorStop(0, '#EEE');
        grad.addColorStop(1, '#777');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();

        // Eye (Camera Lens)
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(6, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = frame % 60 < 30 ? '#F00' : '#800'; // Blinking recording light
        ctx.beginPath(); ctx.arc(6, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; // Lens reflection
        ctx.beginPath(); ctx.arc(7, -2, 1.5, 0, Math.PI * 2); ctx.fill();

        // Arms / Claw
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 12); ctx.lineTo(-5, 20); ctx.lineTo(5, 20); // Claw
        ctx.stroke();

        ctx.restore();
    },

    _draw3DCloud(ctx, x, y, size) {
        // パフォーマンス改善: save/restore廃止、3楕円を1パスに統合
        ctx.fillStyle = 'rgba(240,248,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.28, 0, 0, Math.PI * 2);
        ctx.ellipse(x - size * 0.3, y + 3, size * 0.55, size * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(x + size * 0.35, y + 2, size * 0.45, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    _drawMountains(ctx, w, h) {
        const mtnY = h * 0.7;
        // Far mountains (blueish, lighter) - step 15 for perf (mountains don't need pixel precision)
        ctx.fillStyle = 'rgba(80,110,150,0.35)';
        ctx.beginPath(); ctx.moveTo(0, mtnY);
        for (let x = 0; x <= w; x += 15) {
            const my = mtnY - 40 - Math.sin(x * 0.005) * 30 - Math.sin(x * 0.013) * 15;
            ctx.lineTo(x, my);
        }
        ctx.lineTo(w, mtnY); ctx.closePath(); ctx.fill();

        // Near mountains (darker)
        ctx.fillStyle = 'rgba(60,90,50,0.4)';
        ctx.beginPath(); ctx.moveTo(0, mtnY);
        for (let x = 0; x <= w; x += 15) {
            const my = mtnY - 20 - Math.sin(x * 0.008 + 1) * 25 - Math.sin(x * 0.02 + 2) * 10;
            ctx.lineTo(x, my);
        }
        ctx.lineTo(w, mtnY); ctx.closePath(); ctx.fill();
    },

    // === UTILITY ===
    // Map logical battle/interior coordinates to upper screen visualization coordinates
    _toUpperCoord(lx, ly, w, h) {
        // ★バグ修正: 引数が null / undefined / NaN の場合はデフォルト値にフォールバック
        // NaN のまま演算すると描画座標が全て NaN になりキャンバス描画が無効化される
        if (!isFinite(lx)) lx = 40;
        if (!isFinite(ly)) ly = 420;
        if (!isFinite(w)  || w  <= 0) w  = 800;
        if (!isFinite(h)  || h  <= 0) h  = 400;

        // Logical X: typically 40 (player) to 800 (enemy)
        // Upper Screen X mapping:
        // Player tank visual center: ~80
        // Enemy tank visual center: ~w - 80
        const margin = 120;
        const ux = margin + ((lx - 40) / (800 - 40)) * (w - margin * 2);

        // Logical Y: typically OFFSET_Y + ...
        // Upper Screen Y mapping (around ground line):
        const groundY = h - 60;
        const uy = groundY - 150 + ((ly - 420) / 360) * 100;

        return {
            x: isFinite(ux) ? ux : w / 2,
            y: isFinite(uy) ? uy : h / 2,
        };
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _parseColor(c) {
        if (!c || typeof c !== 'string') return [0, 0, 0];
        if (c.startsWith('#')) {
            let hex = c.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            return [parseInt(hex.substr(0, 2), 16) || 0, parseInt(hex.substr(2, 2), 16) || 0, parseInt(hex.substr(4, 2), 16) || 0];
        }
        if (c.startsWith('rgb')) {
            const m = c.match(/\d+/g);
            if (m && m.length >= 3) return [parseInt(m[0]) || 0, parseInt(m[1]) || 0, parseInt(m[2]) || 0];
        }
        return [0, 0, 0];
    },

    _lighten(color, amt) {
        const [r, g, b] = this._parseColor(color);
        return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
    },

    _darkenHex(color, amt) {
        const [r, g, b] = this._parseColor(color);
        return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
    },

    // === SPECIAL MOVE VISUALS ===
    drawSpecialCutin(ctx, W, H, frame) {
        // frame: 55→0 カウントダウン
        // Phase1 (55-40): フラッシュ＋テキスト登場
        // Phase2 (40-20): スライム突撃アニメ
        // Phase3 (20-0):  爆発・衝撃波フェードアウト
        const alpha = frame > 48 ? (55 - frame) / 7 : frame < 8 ? frame / 8 : 1.0;
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha);

        // ── 背景：黒に赤グラデ ──
        const bg = ctx.createRadialGradient(W * 0.72, H * 0.28, 0, W * 0.72, H * 0.28, W * 0.9);
        bg.addColorStop(0, 'rgba(180,0,0,0.85)');
        bg.addColorStop(0.5, 'rgba(60,0,0,0.75)');
        bg.addColorStop(1, 'rgba(0,0,0,0.92)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // ── 斜線エフェクト（スピード感） ──
        ctx.strokeStyle = 'rgba(255,80,0,0.25)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 14; i++) {
            const lx = (W * i / 14 + frame * 18) % (W + 80) - 40;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx - 80, H);
            ctx.stroke();
        }

        // ── Phase2: 複数スライムが右上の敵に向かって突撃 ──
        if (frame <= 42 && frame > 8) {
            const rushProgress = 1 - (frame - 8) / 34; // 0→1
            const slimeCount = 5;
            const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#FFD700'];
            for (let i = 0; i < slimeCount; i++) {
                const delay = i * 0.15;
                const prog = Math.max(0, Math.min(1, rushProgress - delay));
                if (prog <= 0) continue;

                // 左下から右上の敵位置へ
                const startX = W * 0.1 + i * 18;
                const startY = H * 0.75;
                const endX = W * 0.72;
                const endY = H * 0.28;

                const sx = startX + (endX - startX) * prog;
                const sy = startY + (endY - startY) * prog;
                const sz = 28 + i * 4;

                if (prog >= 0.92) continue; // 衝突したら消える

                // 残像トレイル
                for (let t = 1; t <= 3; t++) {
                    const tp = Math.max(0, prog - t * 0.06);
                    const tx2 = startX + (endX - startX) * tp;
                    const ty2 = startY + (endY - startY) * tp;
                    ctx.globalAlpha = alpha * (0.25 - t * 0.07);
                    ctx.fillStyle = colors[i];
                    ctx.beginPath();
                    ctx.arc(tx2, ty2, sz * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = Math.min(1, alpha);

                // スライム本体
                ctx.save();
                ctx.translate(sx, sy);
                // 進行方向に傾ける
                const angle = Math.atan2(endY - startY, endX - startX);
                ctx.rotate(angle + Math.PI / 2);
                if (window.Renderer) {
                    window.Renderer.drawSlime(ctx, -sz / 2, -sz / 2, sz, sz, colors[i], '#1B5E20', 1, frame + i * 7, 0, 'slime');
                }
                ctx.restore();
            }
        }

        // ── Phase3: 爆発エフェクト ──
        if (frame <= 22) {
            const phase = 1 - frame / 22;
            // 爆発リング（複数）
            const rings = [
                { r: phase * W * 0.55, c: '#FF6600', lw: 8 * (1 - phase) },
                { r: phase * W * 0.38, c: '#FFD700', lw: 5 * (1 - phase) },
                { r: phase * W * 0.22, c: '#FFF',    lw: 3 * (1 - phase) },
            ];
            for (const ring of rings) {
                ctx.globalAlpha = alpha * (1 - phase) * 0.9;
                ctx.strokeStyle = ring.c;
                ctx.lineWidth = Math.max(0.5, ring.lw);
                ctx.beginPath();
                ctx.arc(W * 0.72, H * 0.28, ring.r, 0, Math.PI * 2);
                ctx.stroke();
            }
            // 爆発フラッシュ
            ctx.globalAlpha = alpha * (1 - phase) * 0.6;
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(W * 0.72, H * 0.28, phase * W * 0.18, 0, Math.PI * 2);
            ctx.fill();

            // 破片パーティクル
            const shards = 10;
            ctx.globalAlpha = alpha * (1 - phase);
            for (let i = 0; i < shards; i++) {
                const angle = (i / shards) * Math.PI * 2;
                const dist = phase * 120;
                const px2 = W * 0.72 + Math.cos(angle) * dist;
                const py2 = H * 0.28 + Math.sin(angle) * dist;
                ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF4400';
                ctx.beginPath();
                ctx.arc(px2, py2, 5 * (1 - phase * 0.5), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = Math.min(1, alpha);

        // ── テキスト（上部） ──
        const textScale = frame > 45 ? (55 - frame) / 10 : 1 + (frame < 12 ? (12 - frame) * 0.03 : 0);
        ctx.save();
        ctx.translate(W / 2, H * 0.12);
        ctx.scale(textScale, textScale);
        ctx.font = 'bold italic 52px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // アウトライン
        ctx.strokeStyle = '#FF4400';
        ctx.lineWidth = 8;
        ctx.strokeText('SLIME RUSH!!!', 0, 0);
        // メインテキスト（グラデ）
        const tg = ctx.createLinearGradient(-120, -30, 120, 30);
        tg.addColorStop(0, '#FFD700');
        tg.addColorStop(0.5, '#FFF');
        tg.addColorStop(1, '#FF9800');
        ctx.fillStyle = tg;
        ctx.fillText('SLIME RUSH!!!', 0, 0);
        ctx.restore();

        // ── サブテキスト ──
        if (frame < 44) {
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 4;
            ctx.strokeText('全員突撃ーーっ！！', W / 2, H * 0.88);
            ctx.fillStyle = '#FFF';
            ctx.fillText('全員突撃ーーっ！！', W / 2, H * 0.88);
        }

        ctx.restore();
    },

    // ===================================================================
    // ★ タイタンゴーレム 連携技カットイン【天崩地裂】 (妖怪ウォッチ風・強化版)
    // frame: 100→0
    // Phase1 (100-80): 暗転 & 地響きラインが走る
    // Phase2 (80-55): タイタンが下から飛び込んでくる（スライドイン）
    // Phase3 (55-25): キャラ顔アップ & 名前パネル登場 & 技名ズームイン
    // Phase4 (25-10): 技名フラッシュ・震え
    // Phase5 (10-0):  ズームアウト＆フェードアウト
    // ===================================================================
    drawTitanSpecialCutin(ctx, W, H, frame) {
        const MAX = 100;
        const t = MAX - frame; // t: 0→100 (経過フレーム)
        const alpha = frame > (MAX - 8) ? (MAX - frame) / 8 : frame < 12 ? frame / 12 : 1.0;
        ctx.save();

        // ── Phase1: 暗転フラッシュ（t=0-20）──
        const bgAlpha = Math.min(1, t / 15) * alpha;
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d0d1a');
        bg.addColorStop(0.5, '#1a1a2e');
        bg.addColorStop(1, '#3d1a00');
        ctx.globalAlpha = bgAlpha * 0.98;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // ── 地響きラインエフェクト（t=5-40）──
        if (t > 5 && t < 55) {
            const lineP = Math.min(1, (t - 5) / 20);
            ctx.save();
            ctx.globalAlpha = alpha * lineP * 0.6;
            for (let i = 0; i < 8; i++) {
                const ly = H * (0.1 + i * 0.11);
                const lw = W * lineP * (0.3 + Math.sin(i * 1.7) * 0.2);
                const lx = (i % 2 === 0) ? -lw + W * lineP * 0.8 : W - W * lineP * 0.8;
                ctx.fillStyle = i % 3 === 0 ? '#FF8C00' : (i % 3 === 1 ? '#FFD700' : '#FF4500');
                ctx.fillRect(lx, ly - 2, lw, 4 + (i % 3) * 2);
            }
            ctx.restore();
        }

        // ── Phase2: タイタンが下から飛び込む（t=20-50）──
        const slideT = Math.max(0, Math.min(1, (t - 20) / 30));
        const easeSlide = slideT < 0.5 ? 4 * slideT * slideT * slideT : 1 - Math.pow(-2 * slideT + 2, 3) / 2; // ease in-out cubic
        const splitX = W * 0.54 * easeSlide;

        // 左パネル（キャラ側）
        if (easeSlide > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(splitX, 0);
            ctx.lineTo(splitX - H * 0.22, H);
            ctx.lineTo(0, H);
            ctx.closePath();
            const panelBg = ctx.createLinearGradient(0, 0, splitX, H);
            panelBg.addColorStop(0, '#2a3a4a');
            panelBg.addColorStop(1, '#1a2030');
            ctx.fillStyle = panelBg;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.restore();
        }

        // ── キャラクター描画（大きく、左パネル中央）──
        if (slideT > 0.3) {
            const charAlpha = Math.min(1, (slideT - 0.3) / 0.5);
            ctx.save();
            ctx.globalAlpha = alpha * charAlpha;

            // Phase4の技名フラッシュ時にキャラも揺れる
            const shakeX = (t > 25 && t < 55) ? Math.sin(t * 1.8) * 3 * (1 - (t - 25) / 30) : 0;
            const shakeY = (t > 25 && t < 55) ? Math.cos(t * 2.3) * 2 * (1 - (t - 25) / 30) : 0;

            // フェードアウト時ズームアウト
            const charScale = frame < 14 ? 1 + (14 - frame) * 0.012 : 1.0;
            // ズームイン演出（Phase3入場時）
            const zoomIn = t > 20 && t < 50 ? 1 + (1 - easeSlide) * 0.3 : 1.0;
            const finalScale = charScale * zoomIn;

            const cw = W * 0.44 * finalScale;
            const ch = H * 0.80 * finalScale;
            const cx = W * 0.22 - cw / 2 + shakeX;
            const cy = H * 0.5 - ch / 2 - H * 0.03 + shakeY;

            // クリップして左パネル内に収める
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(splitX + 10, 0);
            ctx.lineTo(splitX - H * 0.22 + 10, H); ctx.lineTo(0, H);
            ctx.closePath(); ctx.clip();

            // タイタンゴーレム本体を大きく描画（アニメーションフレームを使う）
            const animFrame = t * 3;
            this.drawTitanGolem(ctx, cx, cy, cw, ch, '#546E7A', 1, animFrame);

            // 足元のオーラ（パルスアニメ）
            const auraSize = 1 + Math.sin(t * 0.35) * 0.25;
            ctx.globalAlpha = (0.4 + Math.sin(t * 0.3) * 0.2) * charAlpha * alpha;
            const auraGrd = ctx.createRadialGradient(W*0.22, H*0.9, 0, W*0.22, H*0.9, cw*0.5*auraSize);
            auraGrd.addColorStop(0, 'rgba(255,140,0,0.8)');
            auraGrd.addColorStop(0.5, 'rgba(255,80,0,0.4)');
            auraGrd.addColorStop(1, 'rgba(255,40,0,0)');
            ctx.fillStyle = auraGrd;
            ctx.beginPath();
            ctx.ellipse(W * 0.22, H * 0.9, cw * 0.5 * auraSize, H * 0.07, 0, 0, Math.PI * 2);
            ctx.fill();

            // 衝撃波リング（入場時: t=20-40）
            if (t > 22 && t < 42) {
                const ringP = (t - 22) / 20;
                ctx.globalAlpha = (1 - ringP) * charAlpha * alpha * 0.7;
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(W*0.22, H*0.7, cw*0.3*ringP*2, H*0.04*ringP*2, 0, 0, Math.PI*2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // ── 右パネル（名前＆技名）t=30から登場 ──
        if (t > 30) {
            const txtT = Math.min(1, (t - 30) / 20);
            const easeT = txtT * txtT * (3 - 2 * txtT); // smooth step
            ctx.save();
            ctx.globalAlpha = alpha * easeT;

            // キャラ名プレート（右からスライドイン）
            const nameX = W * 0.56;
            const nameY = H * 0.26;
            const plateOffX = (1 - easeT) * W * 0.5; // 右からスライドイン

            ctx.save();
            ctx.translate(plateOffX, 0);

            // プレート背景
            ctx.fillStyle = '#FF8C00';
            ctx.beginPath();
            this._roundRect(ctx, nameX, nameY - 18, W * 0.38, 38, 4);
            ctx.fill();
            // プレート左の三角装飾
            ctx.beginPath();
            ctx.moveTo(nameX, nameY - 18);
            ctx.lineTo(nameX - 12, nameY + 1);
            ctx.lineTo(nameX, nameY + 20);
            ctx.closePath(); ctx.fill();

            // プレート右の光沢
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            this._roundRect(ctx, nameX + 2, nameY - 16, W * 0.36, 16, 2);
            ctx.fill();

            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'left';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            _setShadowBlur(ctx, 4);
            ctx.fillText('タイタンゴーレム', nameX + 10, nameY + 8);
            ctx.shadowBlur = 0;
            ctx.restore();

            // ── 技名テキスト（t=40からズームイン）──
            if (t > 40) {
                const skillT = Math.min(1, (t - 40) / 15);
                const skillEase = skillT < 0.5 ? 2 * skillT * skillT : 1 - Math.pow(-2 * skillT + 2, 2) / 2;
                const skillScale = 1 + (1 - skillEase) * 0.8; // 大→通常サイズにズームイン
                const skillY = H * 0.50;
                const skillCX = nameX + W * 0.19;

                // フラッシュ（Phase4: t=45-60）
                const flashAlpha = (t > 45 && t < 60) ? Math.sin((t - 45) / 15 * Math.PI) * 0.5 : 0;

                ctx.save();
                ctx.globalAlpha = alpha * skillEase;
                ctx.translate(skillCX, skillY);
                ctx.scale(skillScale, skillScale);
                ctx.translate(-skillCX, -skillY);

                // フラッシュ効果
                if (flashAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = flashAlpha;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(nameX - 10, skillY - 45, W * 0.42, 65);
                    ctx.restore();
                }

                // 技名アウトライン
                ctx.font = 'bold italic 42px Arial';
                ctx.strokeStyle = '#4a1500';
                ctx.lineWidth = 8;
                ctx.textAlign = 'center';
                ctx.strokeText('天崩地裂', skillCX, skillY);

                // 技名グラデ（フラッシュ時は白くなる）
                const tg = ctx.createLinearGradient(skillCX - 85, skillY - 35, skillCX + 85, skillY + 10);
                tg.addColorStop(0, flashAlpha > 0.2 ? '#FFFFFF' : '#FFD700');
                tg.addColorStop(0.5, flashAlpha > 0.2 ? '#FFFFFF' : '#FFF');
                tg.addColorStop(1, flashAlpha > 0.2 ? '#FFFFFF' : '#FF8C00');
                ctx.fillStyle = tg;
                ctx.fillText('天崩地裂', skillCX, skillY);

                // サブテキスト（英字）
                ctx.font = 'bold 19px Arial';
                ctx.fillStyle = 'rgba(255,220,150,0.9)';
                ctx.fillText('GRAND  QUAKE', skillCX, skillY + 30);

                ctx.restore();

                // 区切り線（t=50から）
                if (t > 50) {
                    const lineT = Math.min(1, (t - 50) / 15);
                    ctx.save();
                    ctx.globalAlpha = alpha * lineT;
                    ctx.strokeStyle = 'rgba(255,140,0,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    const lineLeft = nameX;
                    const lineRight = nameX + W * 0.38 * lineT;
                    ctx.moveTo(lineLeft, H * 0.63); ctx.lineTo(lineRight, H * 0.63);
                    ctx.stroke();
                    ctx.restore();
                }

                // 効果説明（t=55から）
                if (t > 55) {
                    const descT = Math.min(1, (t - 55) / 12);
                    ctx.save();
                    ctx.globalAlpha = alpha * descT;
                    ctx.font = '14px Arial';
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.textAlign = 'left';
                    ctx.fillText('敵に超大ダメージ', nameX + 6, H * 0.72);
                    ctx.fillText('プレイヤーを回復・無敵化', nameX + 6, H * 0.77);
                    ctx.restore();
                }
            }

            ctx.restore();
        }

        // ── 小石・地割れパーティクル（t=35-65）──
        if (t > 35 && t < 70) {
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            for (let i = 0; i < 6; i++) {
                const seed = i * 173.1;
                const px = (seed * 0.3 % (W * 0.5));
                const py = H * 0.85 + Math.sin(t * 0.2 + seed) * H * 0.08;
                const pr = 3 + (seed % 5);
                ctx.fillStyle = i % 2 === 0 ? '#8B6914' : '#A0522D';
                ctx.beginPath();
                ctx.arc(px, py + (t - 35) * 0.5, pr, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── 斜めラインのキラリ光（パネル境界）──
        if (easeSlide > 0.8) {
            const glowAlpha = alpha * 0.8 * Math.min(1, (easeSlide - 0.8) / 0.2);
            ctx.save();
            ctx.globalAlpha = glowAlpha;
            const grd = ctx.createLinearGradient(splitX - 20, 0, splitX + 5, 0);
            grd.addColorStop(0, 'rgba(255,200,80,0)');
            grd.addColorStop(0.5, 'rgba(255,200,80,0.95)');
            grd.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(splitX - 18, 0); ctx.lineTo(splitX + 4, 0);
            ctx.lineTo(splitX - H * 0.22 + 4, H); ctx.lineTo(splitX - H * 0.22 - 18, H);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }

        // ── コーナー装飾（四隅の三角）──
        if (t > 45) {
            const cornT = Math.min(1, (t - 45) / 15);
            ctx.save();
            ctx.globalAlpha = alpha * cornT * 0.6;
            ctx.fillStyle = '#FF8C00';
            const cs = 18; // corner size
            // 右上
            ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - cs, 0); ctx.lineTo(W, cs); ctx.fill();
            // 右下
            ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W - cs, H); ctx.lineTo(W, H - cs); ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    },

    // ===================================================================
    // ★ ドラゴンロード 連携技カットイン【覇竜炎】 (妖怪ウォッチ風・強化版)
    // frame: 105→0
    // Phase1 (105-85): 燃え上がる暗転 & 炎が下から這い上がる
    // Phase2 (85-60): ドラゴンが右から降臨（羽ばたきアニメ付き）
    // Phase3 (60-25): 名前パネル & 技名ズームイン & 炎エフェクト
    // Phase4 (25-12): 技名フラッシュ＋画面震え
    // Phase5 (12-0):  ドラゴン突進→フェードアウト
    // ===================================================================
    drawDragonSpecialCutin(ctx, W, H, frame) {
        const MAX = 105;
        const t = MAX - frame; // t: 0→105 (経過フレーム)
        const alpha = frame > (MAX - 8) ? (MAX - frame) / 8 : frame < 12 ? frame / 12 : 1.0;
        ctx.save();

        // ── Phase1: 背景（深紅＋黒、徐々に明るく）──
        const bgAlpha = Math.min(1, t / 18) * alpha;
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1a0000');
        bg.addColorStop(0.4, '#2d0000');
        bg.addColorStop(1, '#600000');
        ctx.globalAlpha = bgAlpha * 0.98;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // ── 炎が下から這い上がる（t=0-50）──
        if (t > 3) {
            const fireP = Math.min(1, (t - 3) / 40);
            ctx.save();
            ctx.globalAlpha = alpha * Math.min(0.6, fireP * 0.6);
            const maxFlameH = H * 0.5 * fireP;
            for (let i = 0; i < 7; i++) {
                const fx = W * (i / 7) + W * 0.07;
                const fBase = H * (0.15 + Math.sin(t * 0.18 + i * 0.9) * 0.08);
                const fh = maxFlameH * fBase / H;
                // 炎グラデ
                const flameGrd = ctx.createLinearGradient(fx, H, fx, H - fh * H);
                flameGrd.addColorStop(0, 'rgba(255,60,0,0.9)');
                flameGrd.addColorStop(0.4, 'rgba(255,120,0,0.6)');
                flameGrd.addColorStop(1, 'rgba(255,200,0,0)');
                ctx.fillStyle = flameGrd;
                const fw = W * 0.13;
                ctx.beginPath();
                ctx.moveTo(fx - fw/2, H);
                ctx.quadraticCurveTo(fx - fw*0.3, H - fh*H*0.5, fx + Math.sin(t*0.2+i)*fw*0.3, H - fh*H);
                ctx.quadraticCurveTo(fx + fw*0.5, H - fh*H*0.5, fx + fw/2, H);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // ── Phase2: 斜め分割スライドイン（t=20-55）──
        const slideT = Math.max(0, Math.min(1, (t - 20) / 35));
        const easeSlide = slideT < 0.5 ? 4 * slideT * slideT * slideT : 1 - Math.pow(-2 * slideT + 2, 3) / 2;
        const splitX = W - W * 0.52 * easeSlide;

        if (easeSlide > 0) {
            // 右パネル（キャラ側）
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(splitX + H * 0.22, 0);
            ctx.lineTo(W, 0); ctx.lineTo(W, H);
            ctx.lineTo(splitX, H);
            ctx.closePath();
            const panelBg = ctx.createLinearGradient(splitX, 0, W, H);
            panelBg.addColorStop(0, '#3d0808');
            panelBg.addColorStop(1, '#600000');
            ctx.fillStyle = panelBg;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.restore();
        }

        // ── ドラゴンロード描画（右パネル）──
        if (slideT > 0.25) {
            const charAlpha = Math.min(1, (slideT - 0.25) / 0.55);

            // Phase5: 突進エフェクト（frame < 12）
            const rushOffX = frame < 12 ? -(12 - frame) * 15 : 0;
            const rushOffY = frame < 12 ? (12 - frame) * 5 : 0;

            // Phase4の震え（t=25-45）
            const shakeX = (t > 25 && t < 50) ? Math.sin(t * 2.1) * 4 * Math.min(1, (50 - t) / 25) : 0;
            const shakeY = (t > 25 && t < 50) ? Math.cos(t * 1.7) * 3 * Math.min(1, (50 - t) / 25) : 0;

            ctx.save();
            ctx.globalAlpha = alpha * charAlpha;

            const zoomIn = (slideT < 0.8) ? 1 + (1 - slideT) * 0.35 : 1.0;
            const charScale = frame < 14 ? 1 + (14 - frame) * 0.012 : 1.0;
            const finalScale = charScale * zoomIn;

            const cw = W * 0.43 * finalScale;
            const ch = H * 0.80 * finalScale;
            const cx = W * 0.79 - cw / 2 + shakeX + rushOffX;
            const cy = H * 0.5 - ch / 2 - H * 0.03 + shakeY + rushOffY;

            // 右パネルでクリップ
            ctx.beginPath();
            ctx.moveTo(splitX + H * 0.22 - 12, 0);
            ctx.lineTo(W, 0); ctx.lineTo(W, H);
            ctx.lineTo(splitX - 12, H);
            ctx.closePath(); ctx.clip();

            // ドラゴンロード（左向きで描画）
            const animFrame = t * 3;
            this.drawDragonLord(ctx, cx, cy, cw, ch, '#C62828', -1, animFrame);

            // 足元の炎オーラ（大きく脈動）
            const auraSize = 1 + Math.sin(t * 0.3) * 0.3;
            ctx.globalAlpha = (0.5 + Math.sin(t * 0.2) * 0.2) * charAlpha * alpha;
            const flameAura = ctx.createRadialGradient(W*0.79, H*0.9, 0, W*0.79, H*0.9, cw*0.55*auraSize);
            flameAura.addColorStop(0, 'rgba(255,100,0,0.85)');
            flameAura.addColorStop(0.4, 'rgba(200,30,0,0.5)');
            flameAura.addColorStop(1, 'rgba(150,0,0,0)');
            ctx.fillStyle = flameAura;
            ctx.beginPath();
            ctx.ellipse(W*0.79, H*0.9, cw*0.52*auraSize, H*0.07, 0, 0, Math.PI*2);
            ctx.fill();

            // 衝撃波リング（入場時: t=22-45）
            if (t > 22 && t < 48) {
                const ringP = (t - 22) / 26;
                ctx.globalAlpha = (1 - ringP) * charAlpha * alpha * 0.7;
                ctx.strokeStyle = '#FF4500';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(W*0.79, H*0.72, cw*0.3*ringP*2.2, H*0.04*ringP*2, 0, 0, Math.PI*2);
                ctx.stroke();
                // 2つ目のリング（少し遅れて）
                if (t > 30 && t < 50) {
                    const r2p = (t - 30) / 20;
                    ctx.globalAlpha = (1 - r2p) * charAlpha * alpha * 0.4;
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(W*0.79, H*0.72, cw*0.4*r2p*2, H*0.05*r2p*1.8, 0, 0, Math.PI*2);
                    ctx.stroke();
                }
            }

            // 突進トレイル（frame < 12）
            if (frame < 12) {
                ctx.globalAlpha = (frame / 12) * 0.5;
                for (let i = 1; i <= 3; i++) {
                    ctx.globalAlpha = (frame / 12) * 0.3 / i;
                    this.drawDragonLord(ctx, cx + i * 20, cy + i * 5, cw, ch, '#FF4500', -1, animFrame);
                }
            }

            ctx.restore();
        }

        // ── 左パネル（名前＆技名）t=35から登場 ──
        if (t > 35) {
            const txtT = Math.min(1, (t - 35) / 22);
            const easeT = txtT * txtT * (3 - 2 * txtT);
            ctx.save();
            ctx.globalAlpha = alpha * easeT;

            const nameX = W * 0.05;
            const nameY = H * 0.26;
            const plateOffX = -(1 - easeT) * W * 0.5; // 左からスライドイン

            ctx.save();
            ctx.translate(plateOffX, 0);

            // キャラ名プレート（深紅）
            const plateBg = ctx.createLinearGradient(nameX, nameY - 18, nameX + W * 0.40, nameY + 20);
            plateBg.addColorStop(0, '#B71C1C');
            plateBg.addColorStop(1, '#7f0000');
            ctx.fillStyle = plateBg;
            ctx.beginPath();
            this._roundRect(ctx, nameX, nameY - 18, W * 0.40, 38, 4);
            ctx.fill();
            // プレート右の三角装飾
            ctx.beginPath();
            const rx = nameX + W * 0.40;
            ctx.moveTo(rx, nameY - 18);
            ctx.lineTo(rx + 12, nameY + 1);
            ctx.lineTo(rx, nameY + 20);
            ctx.closePath(); ctx.fill();

            // 光沢
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            this._roundRect(ctx, nameX + 2, nameY - 16, W * 0.38, 16, 2);
            ctx.fill();

            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'left';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            _setShadowBlur(ctx, 5);
            ctx.fillText('ドラゴンロード', nameX + 10, nameY + 8);
            ctx.shadowBlur = 0;
            ctx.restore();

            // ── 技名テキスト（t=48からズームイン）──
            if (t > 48) {
                const skillT = Math.min(1, (t - 48) / 18);
                const skillEase = skillT < 0.5 ? 2 * skillT * skillT : 1 - Math.pow(-2 * skillT + 2, 2) / 2;
                const skillScale = 1 + (1 - skillEase) * 1.0; // 大→通常サイズ
                const skillY = H * 0.50;
                const skillCX = nameX + W * 0.20;

                // フラッシュ（t=55-72）
                const flashAlpha = (t > 55 && t < 72) ? Math.sin((t - 55) / 17 * Math.PI) * 0.5 : 0;

                ctx.save();
                ctx.globalAlpha = alpha * skillEase;
                ctx.translate(skillCX, skillY);
                ctx.scale(skillScale, skillScale);
                ctx.translate(-skillCX, -skillY);

                if (flashAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = flashAlpha;
                    ctx.fillStyle = '#FF4500';
                    ctx.fillRect(nameX - 5, skillY - 50, W * 0.42, 75);
                    ctx.restore();
                }

                // 技名アウトライン
                ctx.font = 'bold italic 44px Arial';
                ctx.strokeStyle = '#200000';
                ctx.lineWidth = 9;
                ctx.textAlign = 'center';
                ctx.strokeText('覇竜炎', skillCX, skillY);

                // 技名グラデ
                const tg2 = ctx.createLinearGradient(skillCX - 80, skillY - 35, skillCX + 80, skillY + 10);
                tg2.addColorStop(0, flashAlpha > 0.3 ? '#FFFFFF' : '#FF4500');
                tg2.addColorStop(0.4, flashAlpha > 0.3 ? '#FFFF88' : '#FFD700');
                tg2.addColorStop(1, flashAlpha > 0.3 ? '#FFFFFF' : '#FF1500');
                ctx.fillStyle = tg2;
                ctx.fillText('覇竜炎', skillCX, skillY);

                // サブテキスト
                ctx.font = 'bold 19px Arial';
                ctx.fillStyle = 'rgba(255,180,80,0.95)';
                ctx.fillText('INFERNO  BURST', skillCX, skillY + 32);

                ctx.restore();

                // 区切り線（t=60から左から伸びる）
                if (t > 60) {
                    const lineT = Math.min(1, (t - 60) / 15);
                    ctx.save();
                    ctx.globalAlpha = alpha * lineT;
                    ctx.strokeStyle = 'rgba(200,50,0,0.7)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(nameX, H * 0.63); ctx.lineTo(nameX + W * 0.40 * lineT, H * 0.63);
                    ctx.stroke();
                    ctx.restore();
                }

                // 効果説明（t=68から）
                if (t > 68) {
                    const descT = Math.min(1, (t - 68) / 12);
                    ctx.save();
                    ctx.globalAlpha = alpha * descT;
                    ctx.font = '14px Arial';
                    ctx.fillStyle = 'rgba(255,200,150,0.82)';
                    ctx.textAlign = 'left';
                    ctx.fillText('5方向炎弾＋敵タンクに炎', nameX + 6, H * 0.72);
                    ctx.fillText('全味方の攻撃力を強化！', nameX + 6, H * 0.77);
                    ctx.restore();
                }
            }

            ctx.restore();
        }

        // ── 炎の火花パーティクル（t=30-80）──
        if (t > 30 && t < 85) {
            ctx.save();
            for (let i = 0; i < 8; i++) {
                const seed = i * 211.3 + t * 0.7;
                const px = (seed * 0.45 % (W * 0.48)) + W * 0.03;
                const py = H * 0.75 - ((t - 30) * (0.5 + (seed % 1.5))) % (H * 0.6);
                const pr = 2 + (seed % 4);
                ctx.globalAlpha = alpha * (0.4 + Math.sin(seed) * 0.3);
                ctx.fillStyle = i % 3 === 0 ? '#FF6000' : (i % 3 === 1 ? '#FFD700' : '#FF2000');
                ctx.beginPath();
                ctx.arc(px, py, pr, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── 斜めラインのキラリ光（境界）──
        if (easeSlide > 0.8) {
            const glowAlpha = alpha * 0.75 * Math.min(1, (easeSlide - 0.8) / 0.2);
            ctx.save();
            ctx.globalAlpha = glowAlpha;
            const grd = ctx.createLinearGradient(splitX - 5, 0, splitX + 22, 0);
            grd.addColorStop(0, 'rgba(255,100,0,0)');
            grd.addColorStop(0.5, 'rgba(255,150,50,0.95)');
            grd.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(splitX + H * 0.22 - 3, 0); ctx.lineTo(splitX + H * 0.22 + 20, 0);
            ctx.lineTo(splitX + 20, H); ctx.lineTo(splitX - 3, H);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }

        // ── コーナー装飾（t=55から）──
        if (t > 55) {
            const cornT = Math.min(1, (t - 55) / 12);
            ctx.save();
            ctx.globalAlpha = alpha * cornT * 0.7;
            ctx.fillStyle = '#FF4500';
            const cs = 20;
            // 左上
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cs, 0); ctx.lineTo(0, cs); ctx.fill();
            // 左下
            ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(cs, H); ctx.lineTo(0, H - cs); ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    },


    // ============================================================
    // プラチナゴーレム 必殺技カットイン 【聖光天罰・DIVINE JUDGEMENT】
    // 妖怪ウォッチ風：左キャラ＋右ネームプレート、神聖な白金オーラ演出
    // ============================================================
    drawPlatinumSpecialCutin(ctx, W, H, frame) {
        const MAX = 110;
        const t = MAX - frame; // 0→110 経過フレーム
        const alpha = frame > (MAX - 8) ? (MAX - frame) / 8 : frame < 12 ? frame / 12 : 1.0;
        ctx.save();

        // ── Phase1: 背景（白銀→深紺グラデ）──
        const bgAlpha = Math.min(1, t / 16) * alpha;
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0a0a1f');
        bg.addColorStop(0.4, '#141428');
        bg.addColorStop(1, '#1a1a3d');
        ctx.globalAlpha = bgAlpha * 0.97;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // ── 天から降り注ぐ光の柱（t=0-60）──
        if (t > 2) {
            const lightP = Math.min(1, (t - 2) / 40);
            ctx.save();
            ctx.globalAlpha = alpha * lightP * 0.45;
            for (let i = 0; i < 6; i++) {
                const lx = W * (0.08 + i * 0.17) + Math.sin(t * 0.07 + i) * 15;
                const lh = H * lightP * (0.5 + Math.sin(i * 1.3) * 0.3);
                const pillarGrd = ctx.createLinearGradient(lx, 0, lx, lh);
                pillarGrd.addColorStop(0, 'rgba(255,255,220,0.9)');
                pillarGrd.addColorStop(0.5, 'rgba(200,230,255,0.5)');
                pillarGrd.addColorStop(1, 'rgba(180,200,255,0)');
                ctx.fillStyle = pillarGrd;
                const lw = 18 + (i % 3) * 10;
                ctx.fillRect(lx - lw / 2, 0, lw, lh);
            }
            ctx.restore();
        }

        // ── Phase2: 斜めパネルスライドイン（t=18-52）──
        const slideT = Math.max(0, Math.min(1, (t - 18) / 34));
        const easeSlide = slideT < 0.5 ? 4 * slideT * slideT * slideT : 1 - Math.pow(-2 * slideT + 2, 3) / 2;
        const splitX = W * 0.56 * easeSlide;

        if (easeSlide > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(splitX, 0);
            ctx.lineTo(splitX - H * 0.20, H);
            ctx.lineTo(0, H);
            ctx.closePath();
            const panelBg = ctx.createLinearGradient(0, 0, splitX, H);
            panelBg.addColorStop(0, '#1e2a3a');
            panelBg.addColorStop(1, '#0d1520');
            ctx.fillStyle = panelBg;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.restore();
        }

        // ── プラチナゴーレム描画（左パネル）──
        if (slideT > 0.25) {
            const charAlpha = Math.min(1, (slideT - 0.25) / 0.5);
            const shakeX = (t > 28 && t < 55) ? Math.sin(t * 1.9) * 3 * (1 - (t - 28) / 27) : 0;
            const shakeY = (t > 28 && t < 55) ? Math.cos(t * 2.5) * 2 * (1 - (t - 28) / 27) : 0;
            const zoomIn = slideT < 0.8 ? 1 + (1 - slideT) * 0.3 : 1.0;
            const charScale = frame < 14 ? 1 + (14 - frame) * 0.012 : 1.0;
            const finalScale = charScale * zoomIn;

            const cw = W * 0.44 * finalScale;
            const ch = H * 0.80 * finalScale;
            const cx = W * 0.22 - cw / 2 + shakeX;
            const cy = H * 0.5 - ch / 2 - H * 0.03 + shakeY;

            ctx.save();
            ctx.globalAlpha = alpha * charAlpha;

            // クリップ（左パネル内）
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(splitX + 10, 0);
            ctx.lineTo(splitX - H * 0.20 + 10, H); ctx.lineTo(0, H);
            ctx.closePath(); ctx.clip();

            // プラチナゴーレム本体
            const animFrame = t * 3;
            this.drawPlatinumGolem(ctx, cx, cy, cw, ch, '#CFD8DC', 1, animFrame);

            // 足元の聖なるオーラ（白金、脈動）
            const auraSize = 1 + Math.sin(t * 0.28) * 0.22;
            ctx.globalAlpha = (0.45 + Math.sin(t * 0.25) * 0.2) * charAlpha * alpha;
            const auraGrd = ctx.createRadialGradient(W*0.22, H*0.9, 0, W*0.22, H*0.9, cw*0.5*auraSize);
            auraGrd.addColorStop(0, 'rgba(220,240,255,0.9)');
            auraGrd.addColorStop(0.4, 'rgba(150,200,255,0.45)');
            auraGrd.addColorStop(1, 'rgba(100,150,255,0)');
            ctx.fillStyle = auraGrd;
            ctx.beginPath();
            ctx.ellipse(W*0.22, H*0.9, cw*0.5*auraSize, H*0.07, 0, 0, Math.PI*2);
            ctx.fill();

            // 神聖リング（入場 t=20-45）
            if (t > 20 && t < 46) {
                const ringP = (t - 20) / 26;
                ctx.globalAlpha = (1 - ringP) * charAlpha * alpha * 0.75;
                ctx.strokeStyle = '#E3F2FD';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(W*0.22, H*0.7, cw*0.3*ringP*2, H*0.04*ringP*2, 0, 0, Math.PI*2);
                ctx.stroke();
                // 内側光輪
                if (t > 28 && t < 46) {
                    const r2 = (t - 28) / 18;
                    ctx.globalAlpha = (1 - r2) * charAlpha * alpha * 0.4;
                    ctx.strokeStyle = '#BBDEFB';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(W*0.22, H*0.7, cw*0.2*r2*2.5, H*0.035*r2*2, 0, 0, Math.PI*2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // ── 右パネル（名前＆技名）t=32から ──
        if (t > 32) {
            const txtT = Math.min(1, (t - 32) / 22);
            const easeT = txtT * txtT * (3 - 2 * txtT);
            ctx.save();
            ctx.globalAlpha = alpha * easeT;

            const nameX = W * 0.56;
            const nameY = H * 0.26;
            const plateOffX = (1 - easeT) * W * 0.5; // 右からスライドイン

            ctx.save();
            ctx.translate(plateOffX, 0);

            // プレート（銀白グラデ）
            const plateBg = ctx.createLinearGradient(nameX, nameY-18, nameX + W*0.38, nameY+20);
            plateBg.addColorStop(0, '#455A64');
            plateBg.addColorStop(0.5, '#607D8B');
            plateBg.addColorStop(1, '#78909C');
            ctx.fillStyle = plateBg;
            ctx.beginPath();
            this._roundRect(ctx, nameX, nameY - 18, W * 0.38, 38, 4);
            ctx.fill();
            // 三角装飾
            ctx.beginPath();
            ctx.moveTo(nameX, nameY - 18);
            ctx.lineTo(nameX - 12, nameY + 1);
            ctx.lineTo(nameX, nameY + 20);
            ctx.closePath(); ctx.fill();
            // 光沢
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            this._roundRect(ctx, nameX + 2, nameY - 16, W*0.36, 16, 2);
            ctx.fill();

            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#E3F2FD';
            ctx.textAlign = 'left';
            ctx.shadowColor = 'rgba(100,180,255,0.8)';
            _setShadowBlur(ctx, 8);
            ctx.fillText('プラチナゴーレム', nameX + 10, nameY + 8);
            ctx.shadowBlur = 0;
            ctx.restore();

            // ── 技名テキスト（t=50からズームイン）──
            if (t > 50) {
                const skillT = Math.min(1, (t - 50) / 18);
                const skillEase = skillT < 0.5 ? 2 * skillT * skillT : 1 - Math.pow(-2 * skillT + 2, 2) / 2;
                const skillScale = 1 + (1 - skillEase) * 1.0;
                const skillY = H * 0.50;
                const skillCX = nameX + W * 0.19;

                // フラッシュ（t=58-75）白銀フラッシュ
                const flashAlpha = (t > 58 && t < 75) ? Math.sin((t - 58) / 17 * Math.PI) * 0.55 : 0;

                ctx.save();
                ctx.globalAlpha = alpha * skillEase;
                ctx.translate(skillCX, skillY);
                ctx.scale(skillScale, skillScale);
                ctx.translate(-skillCX, -skillY);

                if (flashAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = flashAlpha;
                    ctx.fillStyle = '#B0BEC5';
                    ctx.fillRect(nameX - 5, skillY - 50, W*0.40, 75);
                    ctx.restore();
                }

                // 技名アウトライン
                ctx.font = 'bold italic 40px Arial';
                ctx.strokeStyle = '#001030';
                ctx.lineWidth = 9;
                ctx.textAlign = 'center';
                ctx.strokeText('聖光天罰', skillCX, skillY);

                // 技名グラデ（白→水色→白金）
                const tg = ctx.createLinearGradient(skillCX - 80, skillY - 35, skillCX + 80, skillY + 10);
                tg.addColorStop(0,   flashAlpha > 0.3 ? '#FFFFFF' : '#E3F2FD');
                tg.addColorStop(0.4, flashAlpha > 0.3 ? '#FFFDE7' : '#B3E5FC');
                tg.addColorStop(1,   flashAlpha > 0.3 ? '#FFFFFF' : '#CFD8DC');
                ctx.fillStyle = tg;
                ctx.fillText('聖光天罰', skillCX, skillY);

                // サブテキスト
                ctx.font = 'bold 17px Arial';
                ctx.fillStyle = 'rgba(200,230,255,0.92)';
                ctx.fillText('DIVINE  JUDGEMENT', skillCX, skillY + 32);

                ctx.restore();

                // 区切り線
                if (t > 63) {
                    const lineT = Math.min(1, (t - 63) / 14);
                    ctx.save();
                    ctx.globalAlpha = alpha * lineT;
                    ctx.strokeStyle = 'rgba(150,200,255,0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(nameX, H*0.63); ctx.lineTo(nameX + W*0.40*lineT, H*0.63);
                    ctx.stroke();
                    ctx.restore();
                }

                // 効果説明（t=70から）
                if (t > 70) {
                    const descT = Math.min(1, (t - 70) / 12);
                    ctx.save();
                    ctx.globalAlpha = alpha * descT;
                    ctx.font = '14px Arial';
                    ctx.fillStyle = 'rgba(200,230,255,0.82)';
                    ctx.textAlign = 'left';
                    ctx.fillText('聖なる光弾×7＋全体回復', nameX + 6, H*0.72);
                    ctx.fillText('味方全員のHPを回復！', nameX + 6, H*0.77);
                    ctx.restore();
                }
            }

            ctx.restore();
        }

        // ── 光の粒子が舞い上がる（t=28-90）──
        if (t > 28 && t < 92) {
            ctx.save();
            for (let i = 0; i < 9; i++) {
                const seed = i * 173.7 + t * 0.65;
                const px = (seed * 0.37 % (W * 0.50)) + W * 0.02;
                const py = H * 0.85 - ((t - 28) * (0.4 + (seed % 1.2))) % (H * 0.65);
                const pr = 1.5 + (seed % 3.5);
                ctx.globalAlpha = alpha * (0.35 + Math.sin(seed) * 0.3);
                ctx.fillStyle = i % 3 === 0 ? '#E3F2FD' : (i % 3 === 1 ? '#BBDEFB' : '#CFD8DC');
                ctx.beginPath();
                ctx.arc(px, py, pr, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // ── 境界の輝き ──
        if (easeSlide > 0.8) {
            const glowAlpha = alpha * 0.8 * Math.min(1, (easeSlide - 0.8) / 0.2);
            ctx.save();
            ctx.globalAlpha = glowAlpha;
            const grd = ctx.createLinearGradient(splitX - 5, 0, splitX + 20, 0);
            grd.addColorStop(0, 'rgba(200,230,255,0)');
            grd.addColorStop(0.5, 'rgba(220,240,255,0.95)');
            grd.addColorStop(1, 'rgba(200,230,255,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(splitX + H*0.20 - 3, 0); ctx.lineTo(splitX + H*0.20 + 18, 0);
            ctx.lineTo(splitX + 18, H); ctx.lineTo(splitX - 3, H);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }

        // ── コーナー装飾（t=58から）──
        if (t > 58) {
            const cornT = Math.min(1, (t - 58) / 12);
            ctx.save();
            ctx.globalAlpha = alpha * cornT * 0.65;
            ctx.fillStyle = '#90CAF9';
            const cs = 18;
            // 四隅の三角
            [[0,0,cs,0,0,cs], [W,0,W-cs,0,W,cs], [0,H,cs,H,0,H-cs], [W,H,W-cs,H,W,H-cs]].forEach(([x1,y1,x2,y2,x3,y3]) => {
                ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.closePath(); ctx.fill();
            });
            ctx.restore();
        }

        ctx.restore();
    },

    drawSlimeRush(ctx, W, H, frame) {
        // Draw many small slimes flying from left to right
        const count = 30;
        for (let i = 0; i < count; i++) {
            // Pseudo-random based on index and frame
            const seed = i * 137.5;
            const speed = 15 + (seed % 10);
            const x = ((frame * speed) + seed * 10) % (W + 200) - 100;
            const y = (seed % (H * 0.6)) + H * 0.1; // Upper screen area mostly

            // Only draw if on screen
            if (x > -50 && x < W + 50) {
                const size = 30 + (seed % 30);
                const color = (seed % 2 > 1) ? '#44AAFF' : ((seed % 3 > 2) ? '#FF8844' : '#4CAF50'); // Random colors
                const dark = this._darkenHex(color, 20);

                this.drawSlime(ctx, x, y, size, size, color, dark, 1, frame + i);

                // Trail
                ctx.fillStyle = `rgba(255,255,255,0.3)`;
                ctx.beginPath();
                ctx.ellipse(x - 20, y + size / 2, 30, 10, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    // === INVASION GIMMICKS ===
    drawSecuritySwitch(ctx, x, y, w, h, activated, label) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        const t = _getFrameNow();

        // === 外側グロー（未起動: 赤点滅 / 起動: 緑パルス）===
        const glowAlpha = activated
            ? 0.25 + Math.sin(t * 0.004) * 0.15
            : 0.15 + Math.sin(t * 0.008) * 0.15;
        const glowColor = activated ? 'rgba(76,175,80,' : 'rgba(231,76,60,';
        ctx.fillStyle = glowColor + glowAlpha + ')';
        ctx.beginPath(); ctx.arc(0, 0, w * 0.85, 0, Math.PI * 2); ctx.fill();

        // === ベース（メタリックボックス）===
        const bgGrad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
        bgGrad.addColorStop(0, '#555');
        bgGrad.addColorStop(0.5, '#3A3A3A');
        bgGrad.addColorStop(1, '#222');
        ctx.fillStyle = bgGrad;
        this._roundRect(ctx, -w / 2, -h / 2, w, h, 5);
        ctx.fill();
        ctx.strokeStyle = activated ? '#4CAF50' : '#E74C3C';
        ctx.lineWidth = 2;
        this._roundRect(ctx, -w / 2, -h / 2, w, h, 5);
        ctx.stroke();

        // === スイッチスロット ===
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(-w * 0.18, -h * 0.28, w * 0.36, h * 0.56);

        // === レバー ===
        const leverLen = h * 0.45;
        const angle = activated ? -Math.PI * 0.22 : Math.PI * 0.22;
        const lx = Math.sin(angle) * leverLen;
        const ly = Math.cos(angle) * leverLen;
        ctx.strokeStyle = activated ? '#81C784' : '#EF5350';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lx, ly); ctx.stroke();

        // === ノブ（起動時はチェックアイコン）===
        ctx.fillStyle = activated ? '#4CAF50' : '#C0392B';
        ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = activated ? '#A5D6A7' : '#EF5350'; ctx.lineWidth = 1.5; ctx.stroke();
        // ハイライト
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(lx - 2, ly - 2, 2.5, 0, Math.PI * 2); ctx.fill();

        // 起動済みなら中央にチェックマーク
        if (activated) {
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(-4, 0); ctx.lineTo(-1, 4); ctx.lineTo(6, -4);
            ctx.stroke();
        }

        // === ラベル ===
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(label, 1, h / 2 + 14);
        ctx.fillStyle = activated ? '#81C784' : '#EF5350';
        ctx.fillText(label, 0, h / 2 + 13);

        ctx.restore();
    },

    drawBarrier(ctx, x, y, w, h) {
        ctx.save();
        // ★バグ修正: _getFrameNow()はDate.now()を返すため * 0.003 でゆっくりした脈動に
        const pulse = 0.35 + Math.sin(_getFrameNow() * 0.003) * 0.2;
        const alpha = pulse * 0.85;

        // クリップ領域を設定してはみ出し防止
        ctx.save();
        this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 12);
        ctx.clip();

        // ハニカム（六角形）パターン描画
        const hexR = 12; // 六角形の半径
        const hexW = hexR * Math.sqrt(3);
        const hexH = hexR * 2;
        ctx.strokeStyle = `rgba(0,220,255,${alpha * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let row = -1; row * hexH * 0.75 < h + hexH; row++) {
            for (let col = -1; col * hexW < w + hexW; col++) {
                const hx = x + col * hexW + (row % 2 === 0 ? 0 : hexW / 2);
                const hy = y + row * hexH * 0.75;
                ctx.moveTo(hx + hexR, hy);
                for (let i = 1; i <= 6; i++) {
                    const a = (Math.PI / 3) * i;
                    ctx.lineTo(hx + hexR * Math.cos(a), hy + hexR * Math.sin(a));
                }
            }
        }
        ctx.stroke();
        ctx.restore();

        // 外側フィル（半透明シアン）
        ctx.fillStyle = `rgba(0, 200, 255, ${pulse * 0.18})`;
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.fill();

        // アウトライン（脈動）
        ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
        ctx.lineWidth = 2.5;
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.stroke();

        ctx.restore();
    },

    drawDragonNinja(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const floatY = Math.sin(frame * 0.15) * 3;
        ctx.translate(0, floatY);

        // Wings
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0); ctx.lineTo(-w, -h / 2); ctx.lineTo(-w / 2, -h / 4); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w / 2, 0); ctx.lineTo(w, -h / 2); ctx.lineTo(w / 2, -h / 4); ctx.fill();

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        ctx.fill();

        // Horns
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(-15, -20); ctx.lineTo(-5, -12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(15, -20); ctx.lineTo(5, -12); ctx.fill();

        // Ninja Scarf
        ctx.fillStyle = '#D32F2F';
        const scarfX = Math.sin(frame * 0.2) * 20 - 10;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 5); ctx.lineTo(-w / 2 - 25, 5 + scarfX); ctx.lineTo(-w / 2, 12); ctx.fill();

        // Eyes (Sharp)
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.ellipse(-8, -2, 6, 2, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, -2, 6, 2, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(-8, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },
    drawAngelGolem(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body (Stony)
        ctx.fillStyle = '#795548';
        this._roundRect(ctx, -w / 2, -h / 2, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Angel Wings
        ctx.fillStyle = '#FFF';
        const wingW = Math.sin(frame * 0.1) * 10;
        ctx.beginPath(); ctx.ellipse(-w / 2 - 10, -5, 15 + wingW, 8, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w / 2 + 10, -5, 15 + wingW, 8, 0.5, 0, Math.PI * 2); ctx.fill();

        // Halo
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, -h / 2 - 15, 15, 5, 0, 0, Math.PI * 2); ctx.stroke();

        // Eyes (Glowing)
        ctx.fillStyle = '#00BCD4';

        ctx.fillRect(-12, -8, 6, 4);
        ctx.fillRect(6, -8, 6, 4);
        ctx.restore();
    },

    drawLegendMetal(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Metallic Glow

        ctx.fillStyle = '#B0BEC5';
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // Golden Crown (Majestic)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 3); ctx.lineTo(-w / 2 - 5, -h); ctx.lineTo(-w / 4, -h / 1.5);
        ctx.lineTo(0, -h - 5); ctx.lineTo(w / 4, -h / 1.5); ctx.lineTo(w / 2 + 5, -h);
        ctx.lineTo(w / 2, -h / 3); ctx.fill();

        // Face (Wise eyes)
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-7, -3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -3, 3, 0, Math.PI * 2); ctx.fill();
        // Eyebrows (Elder look)
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-11, -9); ctx.lineTo(-4, -7);
        ctx.moveTo(11, -9);  ctx.lineTo(4, -7);
        ctx.stroke();
        ctx.restore();
    },

    // === 秘密コマンド・配合キャラの描画関数 ===

    drawAngelSeraph(ctx, x, y, w, h, color, dir, frame) {
        // セラフィム: 天使の上位種、6枚翼
        this.drawAngel(ctx, x, y, w, h, color, dir, frame);
        // Extra wings
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(dir, 1);
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? 1 : -1;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(side * w * 0.9, -h * 0.3); ctx.lineTo(side * w * 0.7, h * 0.2);
            ctx.fill();
        }
        ctx.globalAlpha = 0.4 + Math.sin(frame * 0.08) * 0.2;
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -h * 0.6, w * 0.25, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    },

    drawUltimate(ctx, x, y, w, h, color, dir, frame) {
        // アルティメットスライム: 全形態の合体・虹色マグナム
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(dir, 1);
        const hue = (frame * 4) % 360;
        // Outer glow rings
        for (let i = 3; i >= 0; i--) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = `hsl(${(hue + i * 30) % 360}, 100%, 60%)`;
            ctx.beginPath(); ctx.arc(0, 0, w / 2 + i * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();
        // Star crown
        ctx.fillStyle = '#FFD700'; ctx.font = `${w * 0.45}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 0);
        ctx.restore();
    },

    // === 配合専用キャラクターの描画関数 ===

    // シャドウメイジ (ニンジャ + 魔法使い): 暗黒のローブ、影のオーラ、紫の炎眼
    drawShadowMage(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const floatY = Math.sin(frame * 0.08) * 4;
        ctx.translate(0, floatY);

        // 影のオーラ（脈動）
        const auraAlpha = 0.2 + Math.sin(frame * 0.12) * 0.1;
        for (let i = 3; i >= 1; i--) {
            ctx.globalAlpha = auraAlpha / i;
            ctx.fillStyle = '#5E35B1';
            ctx.beginPath();
            ctx.arc(0, 0, w / 2 + i * 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 体（ダークローブ）
        ctx.fillStyle = '#1A0030';
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5E35B1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // ローブの裾（三角）
        ctx.fillStyle = '#2D1B5A';
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * w * 0.3, h * 0.3);
            ctx.lineTo(i * w * 0.5, h * 0.7 + Math.sin(frame * 0.1 + i) * 3);
            ctx.lineTo((i + (i >= 0 ? 0.5 : -0.5)) * w * 0.3, h * 0.35);
            ctx.fill();
        }

        // フード（忍者頭巾風）
        ctx.fillStyle = '#0D001A';
        ctx.beginPath();
        ctx.arc(0, -h * 0.1, w * 0.42, Math.PI, 0);
        ctx.fill();
        // 額の符（魔法紋様）
        ctx.fillStyle = '#CE93D8';
        ctx.font = `bold ${w * 0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('魔', 0, -h * 0.1);

        // 瞳（紫炎）
        const eyeGlow = 0.7 + Math.sin(frame * 0.15) * 0.3;
        ctx.globalAlpha = eyeGlow;
        ctx.fillStyle = '#CE93D8';
        ctx.beginPath(); ctx.ellipse(-8, 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(-8, 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // 手裏剣（周囲に浮遊）
        ctx.fillStyle = '#B0BEC5';
        for (let i = 0; i < 4; i++) {
            const ang = frame * 0.07 + i * Math.PI / 2;
            const sx = Math.cos(ang) * w * 0.75;
            const sy = Math.sin(ang) * w * 0.55;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(ang * 2);
            ctx.beginPath();
            ctx.moveTo(0, -5); ctx.lineTo(2, -1); ctx.lineTo(5, 0);
            ctx.lineTo(1, 2); ctx.lineTo(0, 5); ctx.lineTo(-2, 1);
            ctx.lineTo(-5, 0); ctx.lineTo(-1, -2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    },

    // スティールニンジャ (メタルスライム + ニンジャ): 鋼鉄の鎧忍者、クロームボディ
    drawSteelNinja(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const bounce = Math.abs(Math.sin(frame * 0.15)) * 2;

        // 金属光沢ボディ
        const grad = ctx.createRadialGradient(-w * 0.2, -h * 0.2, 1, 0, 0, w * 0.55);
        grad.addColorStop(0, '#ECEFF1');
        grad.addColorStop(0.5, '#90A4AE');
        grad.addColorStop(1, '#455A64');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, bounce * 0.3, w / 2, 0, Math.PI * 2);
        ctx.fill();

        // 鎧プレート（胸当て）
        ctx.fillStyle = '#546E7A';
        ctx.strokeStyle = '#B0BEC5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.05);
        ctx.lineTo(w * 0.3, -h * 0.05);
        ctx.lineTo(w * 0.2, h * 0.25);
        ctx.lineTo(-w * 0.2, h * 0.25);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 頭巾（忍者マスク）
        ctx.fillStyle = '#37474F';
        ctx.beginPath();
        ctx.arc(0, -h * 0.05 + bounce * 0.3, w * 0.42, Math.PI, 0);
        ctx.fill();

        // 目（細いスリット）
        ctx.fillStyle = '#B0BEC5';
        ctx.fillRect(-10, -h * 0.18 + bounce * 0.3, 20, 3);
        // スリットのハイライト
        ctx.fillStyle = '#E0F2F1';
        ctx.fillRect(-8, -h * 0.18 + bounce * 0.3, 6, 1);
        ctx.fillRect(2, -h * 0.18 + bounce * 0.3, 6, 1);

        // 手裏剣（腰に装備）
        ctx.fillStyle = '#CFD8DC';
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 1;
        for (let side = -1; side <= 1; side += 2) {
            ctx.save();
            ctx.translate(side * w * 0.48, h * 0.1);
            ctx.rotate(Math.PI / 4 + frame * 0.03 * side);
            ctx.beginPath();
            ctx.moveTo(0, -6); ctx.lineTo(2, -1); ctx.lineTo(6, 0);
            ctx.lineTo(1, 2); ctx.lineTo(0, 6); ctx.lineTo(-2, 1);
            ctx.lineTo(-6, 0); ctx.lineTo(-1, -2);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        // クロームの反射ライン
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-w * 0.1, -h * 0.15, w * 0.25, Math.PI * 1.1, Math.PI * 1.7);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ウォーマシン (ドローン + ボス): 重装甲メカ、砲台付き
    drawWarMachine(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const rumble = Math.sin(frame * 0.3) * 1;

        // 脚部（キャタピラ）
        ctx.fillStyle = '#212121';
        ctx.fillRect(-w * 0.55, h * 0.2 + rumble, w * 1.1, h * 0.3);
        // キャタピラのコマ
        ctx.fillStyle = '#424242';
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(i * w * 0.16 - 4, h * 0.22 + rumble, 8, h * 0.25);
        }

        // メインボディ（装甲）
        ctx.fillStyle = '#37474F';
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-w * 0.45, h * 0.2);
        ctx.lineTo(-w * 0.5, -h * 0.1);
        ctx.lineTo(-w * 0.35, -h * 0.4);
        ctx.lineTo(w * 0.35, -h * 0.4);
        ctx.lineTo(w * 0.5, -h * 0.1);
        ctx.lineTo(w * 0.45, h * 0.2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 装甲プレートのライン
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.1); ctx.lineTo(w * 0.3, -h * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w * 0.25, h * 0.05); ctx.lineTo(w * 0.25, h * 0.05);
        ctx.stroke();

        // 砲台（左右）
        const gunAngle = Math.sin(frame * 0.04) * 0.2;
        for (let side = -1; side <= 1; side += 2) {
            ctx.save();
            ctx.translate(side * w * 0.5, -h * 0.15);
            ctx.rotate(gunAngle * side);
            ctx.fillStyle = '#212121';
            ctx.fillRect(side > 0 ? 0 : -w * 0.4, -5, w * 0.4, 10);
            // 砲口の光（発射エフェクト）
            if (frame % 60 < 5) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#FF6F00';
                ctx.beginPath();
                ctx.arc(side > 0 ? w * 0.4 : -w * 0.4, 0, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        }

        // センサーアイ（スキャン中）
        const scanX = Math.sin(frame * 0.06) * w * 0.15;
        ctx.fillStyle = '#000';
        ctx.fillRect(-w * 0.25, -h * 0.32, w * 0.5, h * 0.18);
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(scanX, -h * 0.23, 5, 0, Math.PI * 2);
        ctx.fill();
        // スキャンライン
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w * 0.25, -h * 0.23);
        ctx.lineTo(w * 0.25, -h * 0.23);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    // フォートレスゴーレム (ディフェンダー + ゴーレム): 要塞ゴーレム、城壁の鎧
    drawFortressGolem(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const sway = Math.sin(frame * 0.04) * 1.5;

        // 腕（城の塔のように四角く）
        ctx.fillStyle = '#455A64';
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 2;
        for (let side = -1; side <= 1; side += 2) {
            ctx.fillRect(side * w * 0.55, -h * 0.3, w * 0.22, h * 0.65);
            // 城壁の凸凹（胸壁）
            for (let j = 0; j < 3; j++) {
                ctx.fillRect(side * w * 0.55 + j * w * 0.07, -h * 0.3 - h * 0.12, w * 0.05, h * 0.12);
            }
        }

        // メインボディ
        const bodyGrad = ctx.createLinearGradient(-w * 0.4, -h * 0.5, w * 0.4, h * 0.4);
        bodyGrad.addColorStop(0, '#546E7A');
        bodyGrad.addColorStop(1, '#263238');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-w * 0.4, h * 0.4);
        ctx.lineTo(-w * 0.45, -h * 0.2);
        ctx.lineTo(-w * 0.3, -h * 0.5);
        ctx.lineTo(w * 0.3, -h * 0.5);
        ctx.lineTo(w * 0.45, -h * 0.2);
        ctx.lineTo(w * 0.4, h * 0.4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 城壁の凸凹（頭頂）
        ctx.fillStyle = '#455A64';
        for (let j = -2; j <= 2; j++) {
            ctx.fillRect(j * w * 0.12 - 5, -h * 0.5, 10, h * 0.15);
        }

        // 盾（正面に装備）
        ctx.fillStyle = '#37474F';
        ctx.strokeStyle = '#B0BEC5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.25);
        ctx.lineTo(w * 0.22, -h * 0.05);
        ctx.lineTo(w * 0.18, h * 0.25);
        ctx.lineTo(0, h * 0.32);
        ctx.lineTo(-w * 0.18, h * 0.25);
        ctx.lineTo(-w * 0.22, -h * 0.05);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // 盾の紋章
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${w * 0.22}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔', 0, h * 0.04);

        // 目（要塞の窓のように細長い）
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(-w * 0.22, -h * 0.3 + sway, w * 0.16, h * 0.08);
        ctx.fillRect(w * 0.06, -h * 0.3 + sway, w * 0.16, h * 0.08);
        // 目の輝き
        const eyeGlow = 0.6 + Math.sin(frame * 0.1) * 0.4;
        ctx.globalAlpha = eyeGlow;
        ctx.fillStyle = '#42A5F5';
        ctx.fillRect(-w * 0.2, -h * 0.28 + sway, w * 0.12, h * 0.04);
        ctx.fillRect(w * 0.08, -h * 0.28 + sway, w * 0.12, h * 0.04);
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    // プラチナスライム (クロームスライム + ゴールデンスライム): 白金の輝き
    drawPlatinumSlime(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2 + 4);
        ctx.scale(dir, 1);

        // 輝きのオーラ
        for (let i = 4; i >= 1; i--) {
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#E5E4E2';
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.5 + i * 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 金属光沢ボディ（白金グラデーション）
        const grad = ctx.createRadialGradient(-w * 0.25, -h * 0.25, 2, 0, 0, w * 0.55);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, '#E5E4E2');
        grad.addColorStop(0.7, '#A8A8A8');
        grad.addColorStop(1, '#757575');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.52, h * 0.4, 0, Math.PI, 0);
        ctx.lineTo(w * 0.52, h * 0.25);
        ctx.quadraticCurveTo(0, h * 0.5, -w * 0.52, h * 0.25);
        ctx.fill();

        // 表面の光沢スパーク
        const sparkTime = (frame * 7) % 360;
        for (let i = 0; i < 5; i++) {
            const sx = Math.cos((sparkTime + i * 72) * Math.PI / 180) * w * 0.3;
            const sy = Math.sin((sparkTime + i * 72) * Math.PI / 180) * h * 0.2;
            const ss = Math.max(0, Math.sin((sparkTime + i * 72) * Math.PI / 180)) * 3;
            ctx.globalAlpha = ss / 3;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 顔（高貴な表情）
        ctx.fillStyle = '#757575';
        ctx.beginPath(); ctx.arc(-7, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        // 王冠（小さめ）
        ctx.fillStyle = '#E5E4E2';
        ctx.strokeStyle = '#A8A8A8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -h * 0.28);
        ctx.lineTo(-13, -h * 0.42); ctx.lineTo(-7, -h * 0.35);
        ctx.lineTo(0, -h * 0.45); ctx.lineTo(7, -h * 0.35);
        ctx.lineTo(13, -h * 0.42); ctx.lineTo(10, -h * 0.28);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // 王冠の宝石
        ctx.fillStyle = '#B2EBF2';
        ctx.beginPath(); ctx.arc(0, -h * 0.38, 3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    // プラチナゴーレム (プラチナスライム + フォートレスゴーレム): 究極の防御形態
    drawPlatinumGolem(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const t = frame;
        const pulse = Math.sin(t * 0.07) * 0.5 + 0.5;
        const sway = Math.sin(t * 0.04) * 1.5;

        // ── 白金オーラ（2重リング） ──
        for (let ring = 2; ring >= 1; ring--) {
            ctx.globalAlpha = (0.08 + pulse * 0.06) / ring;
            ctx.fillStyle = ring === 1 ? '#E5E4E2' : '#B2EBF2';
            ctx.beginPath(); ctx.arc(0, 0, w * (0.62 + ring * 0.18), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // ── 脚部（厚めの装甲プレート・歩行アニメ） ──
        for (const side of [-1, 1]) {
            // 左右で逆位相の歩行ボブ（±4px）
            const stepOffset = Math.sin(t * 0.10 + side * Math.PI) * 4;
            // 足の踏み込み角（±5度）
            const stepAngle = Math.sin(t * 0.10 + side * Math.PI) * 0.09;
            ctx.save();
            ctx.translate(side * w * 0.21, h * 0.38); // 脚の付け根を基点に回転
            ctx.rotate(stepAngle);
            // すね当て
            const lg = ctx.createLinearGradient(0, -h * 0.16 + stepOffset, w * 0.22, h * 0.20 + stepOffset);
            lg.addColorStop(0, '#CFD8DC');
            lg.addColorStop(0.5, '#90A4AE');
            lg.addColorStop(1, '#546E7A');
            ctx.fillStyle = lg;
            this._roundRect(ctx, -w * 0.11, -h * 0.16, w * 0.22, h * 0.38, 4);
            ctx.fill();
            ctx.strokeStyle = '#B0BEC5'; ctx.lineWidth = 1.5; ctx.stroke();
            // ひざアーマー
            ctx.fillStyle = '#ECEFF1';
            ctx.beginPath(); ctx.ellipse(0, -h * 0.10, w * 0.1, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
            // 足先アーマー（ブーツ）
            ctx.fillStyle = '#B0BEC5';
            this._roundRect(ctx, -w * 0.12, h * 0.18, w * 0.24, h * 0.07, 3); ctx.fill();
            ctx.strokeStyle = '#78909C'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }

        // ── 肩アーマー（翼状・大型） ──
        for (const side of [-1, 1]) {
            ctx.save();
            const sg = ctx.createLinearGradient(side * w * 0.3, -h * 0.35, side * w * 0.75, -h * 0.05);
            sg.addColorStop(0, '#ECEFF1');
            sg.addColorStop(0.4, '#B0BEC5');
            sg.addColorStop(1, '#546E7A');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.moveTo(side * w * 0.28, -h * 0.3);
            ctx.lineTo(side * w * 0.72, -h * 0.38);
            ctx.lineTo(side * w * 0.78, -h * 0.1);
            ctx.lineTo(side * w * 0.62, h * 0.05);
            ctx.lineTo(side * w * 0.32, h * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
            // 肩リベット
            ctx.fillStyle = '#CFD8DC';
            ctx.beginPath(); ctx.arc(side * w * 0.6, -h * 0.2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // ── 腕（円柱状・ガントレット付き） ──
        for (const side of [-1, 1]) {
            const ag = ctx.createLinearGradient(side * w * 0.38, 0, side * w * 0.65, 0);
            ag.addColorStop(0, '#B0BEC5');
            ag.addColorStop(1, '#455A64');
            ctx.fillStyle = ag;
            ctx.beginPath();
            ctx.moveTo(side * w * 0.36, -h * 0.18);
            ctx.lineTo(side * w * 0.65, -h * 0.12);
            ctx.lineTo(side * w * 0.65, h * 0.22);
            ctx.lineTo(side * w * 0.36, h * 0.22);
            ctx.closePath();
            ctx.fill(); ctx.strokeStyle = '#78909C'; ctx.lineWidth = 1.5; ctx.stroke();
            // ガントレット（拳部分）
            const gg = ctx.createRadialGradient(side * w * 0.63, h * 0.25, 2, side * w * 0.63, h * 0.25, w * 0.18);
            gg.addColorStop(0, '#ECEFF1'); gg.addColorStop(1, '#546E7A');
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.ellipse(side * w * 0.63, h * 0.28, w * 0.12, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        }

        // ── メインボディ（白金装甲・台形） ──
        const bodyG = ctx.createLinearGradient(-w * 0.36, -h * 0.48, w * 0.36, h * 0.26);
        bodyG.addColorStop(0, '#ECEFF1');
        bodyG.addColorStop(0.3, '#CFD8DC');
        bodyG.addColorStop(0.7, '#90A4AE');
        bodyG.addColorStop(1, '#455A64');
        ctx.fillStyle = bodyG;
        ctx.beginPath();
        ctx.moveTo(-w * 0.34, h * 0.28);
        ctx.lineTo(-w * 0.38, -h * 0.12);
        ctx.lineTo(-w * 0.25, -h * 0.48);
        ctx.lineTo(w * 0.25, -h * 0.48);
        ctx.lineTo(w * 0.38, -h * 0.12);
        ctx.lineTo(w * 0.34, h * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#CFD8DC'; ctx.lineWidth = 2; ctx.stroke();

        // ボディ縦ライン（装甲の継ぎ目）
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -h * 0.44); ctx.lineTo(0, h * 0.24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-w * 0.18, -h * 0.42); ctx.lineTo(-w * 0.16, h * 0.22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.18, -h * 0.42); ctx.lineTo(w * 0.16, h * 0.22); ctx.stroke();

        // ── 目（白金の電磁アイ） ──
        const eyeY = -h * 0.28 + sway;
        for (const ex of [-w * 0.14, w * 0.06]) {
            // 外枠
            ctx.fillStyle = '#102027';
            ctx.fillRect(ex, eyeY, w * 0.14, h * 0.1);
            // 内側グロー（pulse）
            const eyeGlow = `rgba(${176 + Math.floor(pulse * 79)}, 240, 255, ${0.8 + pulse * 0.2})`;
            ctx.fillStyle = eyeGlow;
            ctx.fillRect(ex + w * 0.01, eyeY + h * 0.015, w * 0.12, h * 0.07);
        }

        // ── 胸のクリスタルコア（メインギミック） ──
        const coreGlow = 0.6 + pulse * 0.4;
        // 外リング
        ctx.strokeStyle = `rgba(178, 235, 242, ${coreGlow})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, h * 0.04, w * 0.17, 0, Math.PI * 2); ctx.stroke();
        // 内リング（回転）
        ctx.save();
        ctx.rotate(t * 0.03);
        ctx.strokeStyle = `rgba(255,255,255,${coreGlow * 0.6})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * w * 0.1, h * 0.04 + Math.sin(a) * w * 0.1);
            ctx.lineTo(Math.cos(a) * w * 0.17, h * 0.04 + Math.sin(a) * w * 0.17);
            ctx.stroke();
        }
        ctx.restore();
        // コア本体（六角形ダイヤモンド）
        ctx.fillStyle = `rgba(${100 + Math.floor(pulse * 80)}, 230, 255, ${0.9 + pulse * 0.1})`;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            if (i === 0) ctx.moveTo(Math.cos(a) * w * 0.09, h * 0.04 + Math.sin(a) * w * 0.09);
            else ctx.lineTo(Math.cos(a) * w * 0.09, h * 0.04 + Math.sin(a) * w * 0.09);
        }
        ctx.closePath(); ctx.fill();
        // 中心の輝点
        ctx.globalAlpha = coreGlow;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(0, h * 0.04, w * 0.03, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    },

    drawArchAngel(ctx, x, y, w, h, color, dir, frame) {
        // アークエンジェル: 真っ白な8枚翼の大天使。セラフィムより大きく神々しい
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const beat = Math.sin(frame * 0.12) * 6;

        // 8枚翼（外側から内側へ順に描画）
        const wingDefs = [
            { span: w * 1.2, vy: -h * 0.1, rot: 0.4, alpha: 0.3, col: '#E3F2FD' },
            { span: w * 1.0, vy: -h * 0.2, rot: 0.2, alpha: 0.5, col: '#FFF9C4' },
            { span: w * 0.75, vy: -h * 0.3, rot: 0.1, alpha: 0.8, col: '#FFFFFF' },
            { span: w * 0.55, vy: -h * 0.35, rot: 0.0, alpha: 1.0, col: '#FFD700' },
        ];
        wingDefs.forEach(wd => {
            const wBeat = beat * (wd.alpha);
            for (const side of [-1, 1]) {
                ctx.save();
                ctx.globalAlpha = wd.alpha;
                ctx.fillStyle = wd.col;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(side * wd.span * 0.7, wd.vy + wBeat - 10, side * wd.span, wd.vy + wBeat);
                ctx.quadraticCurveTo(side * wd.span * 0.5, wd.vy + wBeat + 20, 0, 10);
                ctx.fill();
                ctx.restore();
            }
        });

        // 体（白い楕円 + 金のライン）
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFDE7';
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.ellipse(0, 0, w * 0.38, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // 胸の聖印
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10);
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
        ctx.stroke();

        // 輪光（大きめの二重円）
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7 + Math.sin(frame * 0.06) * 0.2;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.55 + beat * 0.3, w * 0.3, w * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.55 + beat * 0.3, w * 0.4, w * 0.13, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;

        // 顔（穏やかな微笑み）
        ctx.fillStyle = '#B8860B';
        ctx.beginPath(); ctx.arc(-7, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 2, 5, 0.1, Math.PI - 0.1); ctx.stroke();

        ctx.restore();
    },

    drawDragonLord(ctx, x, y, w, h, color, dir, frame) {
        // ドラゴンロード: ドラゴンより大柄で鎧を纏い、金の王冠と溶岩オーラ
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const roar = Math.sin(frame * 0.08) * 3;

        // 溶岩オーラ（脈動する外縁）
        const auraAlpha = 0.15 + Math.sin(frame * 0.1) * 0.08;
        ctx.globalAlpha = auraAlpha;
        ctx.fillStyle = '#FF5722';
        ctx.beginPath(); ctx.ellipse(0, 0, w * 0.65, h * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // 尾（太く長い）
        ctx.fillStyle = this._darkenHex(color, 20);
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.2);
        ctx.quadraticCurveTo(w * 0.7, h * 0.5 + roar, w * 0.55, h * 0.65);
        ctx.quadraticCurveTo(w * 0.4, h * 0.6, w * 0.1, h * 0.3);
        ctx.fill();

        // 体（ずっしりした楕円、鎧色）
        const armorColor = '#880000';
        ctx.fillStyle = armorColor;
        ctx.beginPath(); ctx.ellipse(0, h * 0.08, w * 0.42, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();

        // 鎧のリベット
        ctx.fillStyle = '#FFD700';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.arc(i * 8, h * 0.1, 2, 0, Math.PI * 2); ctx.fill();
        }

        // 翼（大型・ギザギザ）
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.scale(side, 1);
            ctx.fillStyle = '#4A0000';
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.moveTo(w * 0.3, -h * 0.2);
            ctx.lineTo(w * 0.9, -h * 0.55 + roar * 0.5);
            ctx.lineTo(w * 0.7, -h * 0.3);
            ctx.lineTo(w * 0.85, -h * 0.1 + roar * 0.3);
            ctx.lineTo(w * 0.5, h * 0.1);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // 頭
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.32 + roar, w * 0.28, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();

        // 角（2本）
        ctx.fillStyle = '#FFF176';
        for (const sx of [-8, 8]) {
            ctx.beginPath();
            ctx.moveTo(sx, -h * 0.44 + roar);
            ctx.lineTo(sx - 3, -h * 0.62 + roar);
            ctx.lineTo(sx + 3, -h * 0.62 + roar);
            ctx.fill();
        }

        // 王冠（ドラゴンロードの証）
        ctx.fillStyle = '#FFD700';
        const cx = 0, cy = -h * 0.58 + roar;
        ctx.beginPath();
        ctx.moveTo(-14, cy); ctx.lineTo(-14, cy - 8);
        ctx.lineTo(-8, cy - 4); ctx.lineTo(0, cy - 12);
        ctx.lineTo(8, cy - 4); ctx.lineTo(14, cy - 8);
        ctx.lineTo(14, cy); ctx.closePath(); ctx.fill();
        // 宝石
        ctx.fillStyle = '#F44336';
        ctx.beginPath(); ctx.arc(0, cy - 6, 3, 0, Math.PI * 2); ctx.fill();

        // 眼（赤く光る）
        ctx.fillStyle = '#FF1744';
        // shadowColor removed for perf ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(-7, -h * 0.3 + roar, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -h * 0.3 + roar, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // 牙
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.moveTo(-5, -h * 0.22 + roar); ctx.lineTo(-3, -h * 0.15 + roar); ctx.lineTo(-7, -h * 0.15 + roar);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -h * 0.22 + roar); ctx.lineTo(3, -h * 0.15 + roar); ctx.lineTo(7, -h * 0.15 + roar);
        ctx.fill();

        ctx.restore();
    },

    drawTitan(ctx, x, y, w, h, color, dir, frame) {
        this.drawSlime(ctx, x, y, w, h, color, this._darkenHex(color, 40), dir, frame, 0, 'titan');
    },

    drawTitanGolem(ctx, x, y, w, h, color, dir, frame) {
        // タイタンゴーレム: 鉄と魔石でできた超巨大機械ゴーレム。タイタンとは別物
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const rumble = Math.sin(frame * 0.07) * 2;

        // 地面振動エフェクト
        ctx.globalAlpha = 0.1 + Math.sin(frame * 0.15) * 0.05;
        ctx.fillStyle = '#78909C';
        ctx.beginPath(); ctx.ellipse(0, h * 0.45, w * 0.55, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // 脚（がっしりした柱）
        ctx.fillStyle = this._darkenHex(color, 30);
        ctx.fillRect(-w * 0.3, h * 0.2 + rumble, w * 0.22, h * 0.3);
        ctx.fillRect(w * 0.08, h * 0.2 - rumble, w * 0.22, h * 0.3);

        // 胴体（重厚な四角）
        ctx.fillStyle = color;
        ctx.strokeStyle = '#455A64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this._roundRect(ctx, -w * 0.38, -h * 0.15, w * 0.76, h * 0.45, 4);
        ctx.fill(); ctx.stroke();

        // 胸の魔力コア（脈動）
        const coreGlow = 0.6 + Math.sin(frame * 0.1) * 0.3;
        ctx.fillStyle = `rgba(0, 200, 255, ${coreGlow})`;
        // shadowColor removed for perf ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, h * 0.08, w * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // コア内側
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(0, h * 0.08, w * 0.06, 0, Math.PI * 2); ctx.fill();

        // パネルライン（メカ感）
        ctx.strokeStyle = '#546E7A'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w * 0.35, h * 0.05); ctx.lineTo(-w * 0.12, h * 0.05);
        ctx.moveTo(w * 0.12, h * 0.05); ctx.lineTo(w * 0.35, h * 0.05);
        ctx.moveTo(-w * 0.35, h * 0.2); ctx.lineTo(w * 0.35, h * 0.2);
        ctx.stroke();

        // 腕（巨大なハンマー状）
        const armSway = Math.sin(frame * 0.08) * 0.15;
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(side * w * 0.42, 0);
            ctx.rotate(side * armSway);
            ctx.fillStyle = this._darkenHex(color, 15);
            ctx.strokeStyle = '#455A64'; ctx.lineWidth = 1;
            // 上腕
            this._roundRect(ctx, -7, -h * 0.12, 14, h * 0.3, 3); ctx.fill(); ctx.stroke();
            // 拳（大きめ）
            ctx.fillStyle = '#37474F';
            this._roundRect(ctx, -10, h * 0.15, 20, 18, 4); ctx.fill(); ctx.stroke();
            // ナックル
            for (let k = 0; k < 3; k++) {
                ctx.fillStyle = '#78909C';
                ctx.beginPath(); ctx.arc(-6 + k * 6, h * 0.15, 2.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // 肩アーマー（四角い突起）
        ctx.fillStyle = '#546E7A';
        ctx.strokeStyle = '#37474F'; ctx.lineWidth = 1;
        for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(sx * w * 0.28, -h * 0.12);
            ctx.lineTo(sx * w * 0.45, -h * 0.22);
            ctx.lineTo(sx * w * 0.48, -h * 0.05);
            ctx.lineTo(sx * w * 0.32, h * 0.0);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }

        // 頭（四角く重い）
        ctx.fillStyle = this._darkenHex(color, 10);
        ctx.strokeStyle = '#455A64'; ctx.lineWidth = 2;
        this._roundRect(ctx, -w * 0.24, -h * 0.5 + rumble, w * 0.48, h * 0.38, 5);
        ctx.fill(); ctx.stroke();

        // バイザー（横長一直線の目）
        const vizGlow = 0.7 + Math.sin(frame * 0.2) * 0.2;
        ctx.fillStyle = `rgba(0, 230, 118, ${vizGlow})`;
        // shadowColor removed for perf ctx.shadowBlur = 0;
        ctx.fillRect(-w * 0.18, -h * 0.35 + rumble, w * 0.36, 6);
        ctx.shadowBlur = 0;

        // アンテナ
        ctx.strokeStyle = '#90A4AE'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -h * 0.5 + rumble); ctx.lineTo(0, -h * 0.65 + rumble); ctx.stroke();
        ctx.fillStyle = '#EF5350';
        ctx.beginPath(); ctx.arc(0, -h * 0.67 + rumble, 3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    drawSpecial(ctx, x, y, w, h, color, dir, frame) {
        this.drawSlime(ctx, x, y, w, h, color, this._darkenHex(color, 40), dir, frame, 0, 'special');
    },
    drawRoyalGuard(ctx, x, y, w, h, color, dir, frame) {
        // ロイヤルガード: 金の甲冑に赤いマントの近衛騎士。ディフェンダーとは別格
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const march = Math.sin(frame * 0.1) * 2;

        // マント（後ろに揺れる）
        const capeWave = Math.sin(frame * 0.08) * 5;
        ctx.fillStyle = '#B71C1C';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(-w * 0.2, -h * 0.35 + march);
        ctx.quadraticCurveTo(-w * 0.5, h * 0.1, -w * 0.4 + capeWave, h * 0.45);
        ctx.lineTo(w * 0.05, h * 0.45);
        ctx.quadraticCurveTo(w * 0.1, h * 0.0, w * 0.2, -h * 0.35 + march);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 脚（プレートアーマー）
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1;
        this._roundRect(ctx, -w * 0.25, h * 0.18 + march, w * 0.2, h * 0.28, 3); ctx.fill(); ctx.stroke();
        this._roundRect(ctx, w * 0.05, h * 0.18 - march, w * 0.2, h * 0.28, 3); ctx.fill(); ctx.stroke();

        // 胴体アーマー
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 2;
        this._roundRect(ctx, -w * 0.32, -h * 0.18, w * 0.64, h * 0.42, 6); ctx.fill(); ctx.stroke();

        // 胸の紋章
        ctx.fillStyle = '#B71C1C';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.12); ctx.lineTo(-8, -h * 0.0); ctx.lineTo(-6, h * 0.1);
        ctx.lineTo(0, h * 0.14); ctx.lineTo(6, h * 0.1); ctx.lineTo(8, -h * 0.0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${w * 0.18}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('R', 0, h * 0.02);

        // 肩プレート
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#FFC107';
            ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(sx * w * 0.36, -h * 0.12, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        // 盾（大型）
        ctx.fillStyle = '#CFD8DC';
        ctx.strokeStyle = '#90A4AE'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.15, -h * 0.2);
        ctx.lineTo(w * 0.45, -h * 0.2);
        ctx.lineTo(w * 0.45, h * 0.15);
        ctx.lineTo(w * 0.3, h * 0.28);
        ctx.lineTo(w * 0.15, h * 0.15);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // 盾の紋
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(w * 0.3, -h * 0.15); ctx.lineTo(w * 0.3, h * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.18, 0); ctx.lineTo(w * 0.42, 0); ctx.stroke();

        // 頭（フルフェイスヘルム）
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 2;
        this._roundRect(ctx, -w * 0.22, -h * 0.55 + march, w * 0.44, h * 0.4, 8);
        ctx.fill(); ctx.stroke();

        // バイザー（T字スリット）
        ctx.fillStyle = '#1A237E';
        // shadowColor removed for perf ctx.shadowBlur = 0;
        ctx.fillRect(-w * 0.16, -h * 0.42 + march, w * 0.32, 5);
        ctx.fillRect(-3, -h * 0.5 + march, 6, 14);
        ctx.shadowBlur = 0;

        // 兜の飾り羽（赤）
        ctx.fillStyle = '#EF5350';
        for (let i = 0; i < 3; i++) {
            const px = (i - 1) * 7;
            ctx.beginPath(); ctx.ellipse(px, -h * 0.6 + march + Math.sin(frame * 0.12 + i) * 3, 3, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    drawSageSlime(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // Wizard Hat (Mini)
        ctx.fillStyle = '#4A148C';
        ctx.beginPath(); ctx.moveTo(-10, -h / 2); ctx.lineTo(10, -h / 2); ctx.lineTo(0, -h / 2 - 20); ctx.fill();

        // Tentacles (Healer)
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(-6 + i * 6, h / 2 - 2); ctx.lineTo(-6 + i * 6, h / 2 + 8); ctx.stroke();
        }

        // Magic Aura
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = (frame % 60 < 30) ? '#F44336' : '#2196F3';
        ctx.beginPath(); ctx.arc(0, 0, w / 2 + 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    // === ALIASES FOR COMPATIBILITY ===
    drawPhantom(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const floatY = Math.sin(frame * 0.1) * 5;
        ctx.translate(0, floatY);

        // 影のオーラ
        ctx.globalAlpha = 0.2 + Math.sin(frame * 0.08) * 0.1;
        ctx.fillStyle = '#1A0033';
        ctx.beginPath(); ctx.arc(0, 0, w * 0.65, 0, Math.PI * 2); ctx.fill();

        // 半透明ボディ
        ctx.globalAlpha = 0.6 + Math.sin(frame * 0.12) * 0.15;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // 忍者マスク
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#1A0033';
        ctx.beginPath();
        ctx.arc(0, -h * 0.05, w * 0.4, Math.PI, 0); ctx.fill();

        // 光る目（紫）
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#CE93D8';
        ctx.beginPath(); ctx.arc(-7, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -2, 3, 0, Math.PI * 2); ctx.fill();

        // スカーフ（幽霊のように揺れる）
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#4A148C';
        const scarfW = Math.sin(frame * 0.15) * 15;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 5);
        ctx.lineTo(-w / 2 - 20, scarfW);
        ctx.lineTo(-w / 2, 12);
        ctx.fill();

        ctx.restore();
    },

    // パラディン (ヒーラー+重装兵): 聖騎士、光の盾と回復オーラ
    drawPaladin(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 聖なるオーラ
        ctx.globalAlpha = 0.15 + Math.sin(frame * 0.06) * 0.08;
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath(); ctx.arc(0, 0, w * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // ボディ（装甲）
        ctx.fillStyle = color;
        ctx.strokeStyle = '#7CB342';
        ctx.lineWidth = 2;
        this._roundRect(ctx, -w / 2, -h / 2, w, h, 8);
        ctx.fill(); ctx.stroke();

        // 十字盾
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-3, -h * 0.25, 6, h * 0.35);
        ctx.fillRect(-w * 0.15, -h * 0.1, w * 0.3, 6);

        // ヘルメット
        ctx.fillStyle = '#9E9D24';
        ctx.beginPath();
        ctx.arc(0, -h * 0.15, w * 0.35, Math.PI, 0); ctx.fill();

        // 目（正義の光）
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-7, -5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#33691E';
        ctx.beginPath(); ctx.arc(-7, -5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -5, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    // 錬金術師 (ゴールド+ウィザード): 黄金のローブ、フラスコを持つ
    drawAlchemist(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // ボディ
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // 三角帽子（錬金術師）
        ctx.fillStyle = '#E65100';
        ctx.beginPath();
        ctx.moveTo(-12, -h / 2 + 5);
        ctx.lineTo(12, -h / 2 + 5);
        ctx.lineTo(0, -h / 2 - 18);
        ctx.fill();
        // 帽子の星
        ctx.fillStyle = '#FFD700';
        ctx.font = `${w * 0.2}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, -h / 2 - 5);

        // フラスコ（前に浮遊）
        const flaskBob = Math.sin(frame * 0.12) * 3;
        ctx.fillStyle = 'rgba(76,175,80,0.6)';
        ctx.beginPath();
        ctx.moveTo(w * 0.35, h * 0.1 + flaskBob);
        ctx.lineTo(w * 0.45, h * 0.3 + flaskBob);
        ctx.lineTo(w * 0.25, h * 0.3 + flaskBob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(139,195,74,0.8)';
        ctx.beginPath(); ctx.arc(w * 0.35, h * 0.25 + flaskBob, 5, 0, Math.PI * 2); ctx.fill();

        // 目
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-6, -3, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -3, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-6, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -3, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    // ワイバーンロード (ボス+ドラゴン): 翼を持つ王冠付きスライム
    drawWyvernLord(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const floatY = Math.sin(frame * 0.12) * 4;
        ctx.translate(0, floatY);

        // 翼（大きめ）
        ctx.fillStyle = '#880E4F';
        const wingFlap = Math.sin(frame * 0.15) * 10;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, 0);
        ctx.lineTo(-w, -h * 0.6 + wingFlap);
        ctx.lineTo(-w * 0.5, -h * 0.1);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w * 0.3, 0);
        ctx.lineTo(w, -h * 0.6 + wingFlap);
        ctx.lineTo(w * 0.5, -h * 0.1);
        ctx.fill();

        // ボディ
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // 王冠
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-12, -h * 0.35);
        ctx.lineTo(-15, -h * 0.6); ctx.lineTo(-6, -h * 0.45);
        ctx.lineTo(0, -h * 0.65); ctx.lineTo(6, -h * 0.45);
        ctx.lineTo(15, -h * 0.6); ctx.lineTo(12, -h * 0.35);
        ctx.fill();

        // ドラゴンの角
        ctx.fillStyle = '#4E342E';
        ctx.beginPath(); ctx.moveTo(-10, -h * 0.3); ctx.lineTo(-16, -h * 0.5); ctx.lineTo(-6, -h * 0.3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, -h * 0.3); ctx.lineTo(16, -h * 0.5); ctx.lineTo(6, -h * 0.3); ctx.fill();

        // 厳つい目
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.ellipse(-8, -3, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, -3, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(-8, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -3, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

};

window.Renderer = Renderer;
