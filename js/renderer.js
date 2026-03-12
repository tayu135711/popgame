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
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        drawFn(c.getContext('2d'));
        _bgCache.set(key, c);
    }
    return _bgCache.get(key);
}

// === _getFrameNow() フレームキャッシュ ===
// 同じフレーム内で何十回も _getFrameNow() を呼ぶのを1回にまとめる
let _frameNow = 0;
function _getFrameNow() { return _frameNow; }
function _tickFrameNow() { _frameNow = Date.now(); }

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
    // Utilities will be consolidated from the versions at the bottom of the object.

    // Cloud and Mountain drawing will be consolidated from the versions at the bottom.


    // === SLIME (High Quality 3D Style v2 - Optimized) ===
    drawSlime(ctx, x, y, w, h, color, darkColor, dir = 1, frame = 0, vy = 0, slimeType = 'slime') {
        ctx.save();
        ctx.translate(Math.round(x + w / 2), Math.round(y + h));

        // Animation: Squash & Stretch (Simplified, performance)
        const squash = vy > 3 ? 0.85 : vy < -3 ? 1.15 : 1;

        ctx.scale(dir * (1 / squash), squash);

        const sz = Math.min(w, h) * 0.95;
        const bounce = Math.sin(frame * 0.05) * 3;

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

        // (glossy reflection removed for performance)

        // 5. Face (Cute style)
        // Eye Position calculation
        const faceY = -sz * 0.45;
        const eyeSpace = sz * 0.18;

        // Eyes - (^^) スタイル統一（全タイプ共通）
        const eyeW = sz * 0.13;
        const eyeH = sz * 0.11;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (frame % 120 > 115) {
            // Blink: 横線
            ctx.moveTo(-eyeSpace - eyeW, faceY); ctx.lineTo(-eyeSpace + eyeW, faceY);
            ctx.moveTo(eyeSpace - eyeW, faceY); ctx.lineTo(eyeSpace + eyeW, faceY);
        } else {
            // ^^ 目（左）
            ctx.moveTo(-eyeSpace - eyeW, faceY + eyeH);
            ctx.lineTo(-eyeSpace, faceY - eyeH);
            ctx.lineTo(-eyeSpace + eyeW, faceY + eyeH);
            // ^^ 目（右）
            ctx.moveTo(eyeSpace - eyeW, faceY + eyeH);
            ctx.lineTo(eyeSpace, faceY - eyeH);
            ctx.lineTo(eyeSpace + eyeW, faceY + eyeH);
        }
        ctx.stroke();

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
            // Player: ふつうのかわいい笑顔
            ctx.arc(0, faceY + 5, 4, 0.2, Math.PI - 0.2);
        } else {
            // 通常の笑顔
            ctx.arc(0, faceY + 5, 4, 0.2, Math.PI - 0.2);
        }
        ctx.stroke();

        // 6. Accessories / Role Indicators - 大幅拡張
        if (color === CONFIG.COLORS.PLAYER || slimeType === 'player') {
            // Player: カッコいい鎧 + ヘルメット + ソード
            const armorColor = '#1565C0';   // 深い青鎧
            const armorShine = '#42A5F5';   // 鎧の光沢
            const armorDark = '#0D47A1';   // 鎧の影
            const swordColor = '#E0E0E0';   // 剣の刃
            const swordGold = '#FFD700';   // 剣のガード

            // === ヘルメット ===
            ctx.fillStyle = armorColor;
            ctx.beginPath();
            ctx.arc(0, -sz * 0.5 + bounce, sz * 0.42, Math.PI, 0);
            ctx.lineTo(sz * 0.42, -sz * 0.5 + bounce);
            ctx.lineTo(-sz * 0.42, -sz * 0.5 + bounce);
            ctx.fill();
            // ヘルメットのバイザー（縦スリット）
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.rect(-sz * 0.06, -sz * 0.7 + bounce, sz * 0.12, sz * 0.22);
            ctx.fill();
            // ヘルメット光沢
            ctx.fillStyle = armorShine;
            ctx.beginPath();
            ctx.arc(-sz * 0.12, -sz * 0.78 + bounce, sz * 0.08, 0, Math.PI * 2);
            ctx.fill();
            // トップのプルーム（かざり羽根）
            ctx.strokeStyle = '#F44336';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-sz * 0.05, -sz * 0.92 + bounce);
            ctx.bezierCurveTo(-sz * 0.18, -sz * 1.3 + bounce, sz * 0.18, -sz * 1.25 + bounce, sz * 0.05, -sz * 0.92 + bounce);
            ctx.stroke();

            // === 胸鎧（肩パッド） ===
            ctx.fillStyle = armorColor;
            // 左肩パッド
            ctx.beginPath();
            ctx.ellipse(-sz * 0.38, -sz * 0.3, sz * 0.16, sz * 0.1, -0.5, 0, Math.PI * 2);
            ctx.fill();
            // 右肩パッド
            ctx.beginPath();
            ctx.ellipse(sz * 0.38, -sz * 0.3, sz * 0.16, sz * 0.1, 0.5, 0, Math.PI * 2);
            ctx.fill();
            // 胸の紋章（星）
            ctx.fillStyle = swordGold;
            ctx.beginPath();
            const starPoints = 5;
            const starR = sz * 0.1;
            const starInner = sz * 0.05;
            for (let i = 0; i < starPoints * 2; i++) {
                const angle = (i * Math.PI) / starPoints - Math.PI / 2;
                const r = i % 2 === 0 ? starR : starInner;
                const sx2 = Math.cos(angle) * r;
                const sy2 = Math.sin(angle) * r + (-sz * 0.15);
                if (i === 0) ctx.moveTo(sx2, sy2); else ctx.lineTo(sx2, sy2);
            }
            ctx.closePath();
            ctx.fill();

            // === 剣（右側に浮遊） ===
            const swordX = sz * 0.6;
            const swordOsc = Math.sin(frame * 0.07) * 3; // ゆらゆら浮遊
            ctx.save();
            ctx.translate(swordX, -sz * 0.5 + swordOsc);
            ctx.rotate(0.4);
            // 刃
            ctx.fillStyle = swordColor;
            ctx.beginPath();
            ctx.rect(-3, -sz * 0.45, 6, sz * 0.4);
            ctx.fill();
            // 刃の光沢
            ctx.fillStyle = '#FFF';
            ctx.fillRect(-1, -sz * 0.44, 2, sz * 0.35);
            // ガード（十字鍔）
            ctx.fillStyle = swordGold;
            ctx.fillRect(-sz * 0.15, -sz * 0.05, sz * 0.3, 6);
            // 柄
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(-3, -sz * 0.05 + 6, 6, sz * 0.2);
            // 柄頭
            ctx.fillStyle = swordGold;
            ctx.beginPath();
            ctx.arc(0, -sz * 0.05 + 6 + sz * 0.2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
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
        } else if (slimeType === 'devil' || slimeType === 'master') {
            // Devil/Master: Demon Horns + Wings
            // Horns
            ctx.fillStyle = slimeType === 'master' ? '#00FFFF' : '#8B0000';
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
            ctx.fillStyle = slimeType === 'master' ? 'rgba(0,255,255,0.4)' : 'rgba(139,0,0,0.6)';
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
            // Ghost: Transparent + Spooky
            ctx.globalAlpha *= 0.6;
            // Spooky eyes (large white orbs)
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(-sz * 0.2, faceY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sz * 0.2, faceY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-sz * 0.2, faceY, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(sz * 0.2, faceY, 2, 0, Math.PI * 2); ctx.fill();
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
            const wingFlap = Math.sin(frame * 0.12) * 0.15;
            ctx.fillStyle = 'rgba(139,0,0,0.9)';
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 3;

            // 左翼
            ctx.save();
            ctx.translate(-sz * 0.3, -sz * 0.1);
            ctx.rotate(-0.4 + wingFlap);
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
            ctx.rotate(0.4 - wingFlap);
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

        // Outer glow
        const glow = ctx.createRadialGradient(item.x, py, 0, item.x, py, 18);
        glow.addColorStop(0, 'rgba(255,255,200,0.3)');
        glow.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(item.x, py, 18, 0, Math.PI * 2); ctx.fill();

        // Icon
        ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFF';
        ctx.fillText(info.icon, item.x, py);
    },

    drawTankExterior(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior = true, tankType = 'NORMAL', battle = null) {
        this._drawSlimeTank(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior, tankType, battle);
    },

    // === SLIME TANK (Hyper Detail) ===
    _drawSlimeTank(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior, tankType = 'NORMAL', battle = null) {
        const wt = CONFIG.TANK.WALL_THICKNESS;
        // Colors Setup
        let bodyBase, bodyHigh, bodyShadow, panelColor;

        // 第二形態かどうかをチェック
        const isPhaseTwo = battle && battle.bossPhase === 2;

        if (isEnemy) {
            if (tankType === 'HEAVY' || tankType === 'DEFENSE') {
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
                bodyBase = '#D84315'; bodyHigh = '#FF5722'; bodyShadow = '#BF360C'; panelColor = '#E64A19';
            }
        } else {
            // Player Hero Blue
            bodyBase = '#0277BD'; bodyHigh = '#29B6F6'; bodyShadow = '#01579B'; panelColor = '#0288D1';
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

        // 1. TREADS (Caterpillar Tracks)
        const treadW = tw * 0.85;
        const treadH = 45;
        const treadX = cx - treadW / 2;
        const treadY = ty + th - 30;

        // Track Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this._roundRect(ctx, treadX + 5, treadY + 5, treadW - 10, treadH, 10);
        ctx.fill();

        // Track Main
        // キャッシュ: treadGradは色が固定なのでサイズが変わらない限り再生成不要
        const treadKey = `tread_${treadY | 0}_${treadH}`;
        const treadGrad = _getCachedGradient(ctx, treadKey, () => {
            const g = ctx.createLinearGradient(0, treadY, 0, treadY + treadH);
            g.addColorStop(0, '#424242');
            g.addColorStop(0.5, '#616161');
            g.addColorStop(1, '#212121');
            return g;
        });
        ctx.fillStyle = treadGrad;
        this._roundRect(ctx, treadX, treadY, treadW, treadH, 8);
        ctx.fill();

        // Wheels
        const wheelCount = 6;
        const wheelY = treadY + treadH / 2;
        const startX = treadX + 20;
        const endX = treadX + treadW - 20;
        const step = (endX - startX) / (wheelCount - 1);

        for (let i = 0; i < wheelCount; i++) {
            const wx = startX + i * step;
            // Wheel Rim
            ctx.fillStyle = '#37474F';
            ctx.beginPath(); ctx.arc(wx, wheelY, 14, 0, Math.PI * 2); ctx.fill();
            // Wheel Inner
            ctx.fillStyle = '#546E7A';
            ctx.beginPath(); ctx.arc(wx, wheelY, 8, 0, Math.PI * 2); ctx.fill();
        }

        // Track Lines
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(treadX + 5, treadY + 2); ctx.lineTo(treadX + treadW - 5, treadY + 2);
        ctx.moveTo(treadX + 5, treadY + treadH - 2); ctx.lineTo(treadX + treadW - 5, treadY + treadH - 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. MAIN BODY (Dome)
        const bw = tw;
        const bh = th * 0.85;
        const by = treadY - bh + 25; // Overlap treads slightly

        // Dome Shape
        ctx.beginPath();
        const arch = 80;
        ctx.moveTo(cx - bw / 2 + 20, by + bh);
        ctx.lineTo(cx - bw / 2 + 30, by + arch); // side slope
        ctx.quadraticCurveTo(cx - bw / 2 + 50, by, cx, by); // top-left arch
        ctx.quadraticCurveTo(cx + bw / 2 - 50, by, cx + bw / 2 - 30, by + arch); // top-right arch
        ctx.lineTo(cx + bw / 2 - 20, by + bh);
        ctx.closePath();

        // Body Gradient
        // キャッシュ: tankType+フェーズが変わった時だけ再生成
        const domeKey = `dome_${bodyBase}_${bodyHigh}_${bodyShadow}_${cx | 0}_${by | 0}_${bw}`;
        const domeGrad = _getCachedGradient(ctx, domeKey, () => {
            const g = ctx.createRadialGradient(cx - 50, by + 50, 20, cx, by + bh, bw);
            g.addColorStop(0, bodyHigh);
            g.addColorStop(0.5, bodyBase);
            g.addColorStop(1, bodyShadow);
            return g;
        });
        ctx.fillStyle = domeGrad;
        ctx.fill();

        // 3. ARMOR PLATES & DETAILS
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;

        // Center Plate
        ctx.beginPath();
        ctx.rect(cx - 60, by + 40, 120, bh - 80);
        ctx.stroke();
        // Rivets
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const rivetPoints = [
            [cx - 50, by + 50], [cx + 50, by + 50],
            [cx - 50, by + bh - 50], [cx + 50, by + bh - 50]
        ];
        rivetPoints.forEach(p => {
            ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
        });

        // 4. EMBLEM AREA
        if (!showInterior) {
            const emblemY = by + bh * 0.45;

            if (isEnemy) {
                // Enemy Skull Emblem
                ctx.fillStyle = '#212121';
                this._roundRect(ctx, cx - 35, emblemY - 25, 70, 50, 10);
                ctx.fill();

                // Skull Eye
                ctx.fillStyle = '#FF5252';

                ctx.beginPath(); ctx.arc(cx, emblemY, 15, 0, Math.PI * 2); ctx.fill();

            } else {
                // Player Hero Emblem
                ctx.fillStyle = '#ECEFF1';
                ctx.beginPath(); ctx.arc(cx, emblemY, 40, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#FFC107'; ctx.lineWidth = 4; ctx.stroke();

                // Slime Face Icon
                ctx.fillStyle = '#29B6F6';
                ctx.beginPath();
                ctx.arc(cx, emblemY + 5, 25, Math.PI, 0); // half circle top
                ctx.bezierCurveTo(cx + 25, emblemY + 15, cx + 15, emblemY + 25, cx, emblemY + 25);
                ctx.bezierCurveTo(cx - 15, emblemY + 25, cx - 25, emblemY + 15, cx - 25, emblemY + 5);
                ctx.fill();
            }
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

        // Damage Overlay (composite=overplayは重いのでsource-overで代替)
        if (dmgFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.5, dmgFlash * 0.04)})`;
            ctx.fillRect(tx - 20, ty - 20, tw + 40, th + 40);
        }

        // === TANK TYPE SPECIFIC DECORATIONS (敵のみ) ===
        if (isEnemy && tankType !== 'NORMAL') {
            const decorY = by + 30; // 装飾の基準Y座標

            if (tankType === 'SCOUT') {
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
                    const sy = by + 40 + i * 30;
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
                ctx.fillRect(cx - 80, by + 5, 160, 15);
                ctx.strokeStyle = bodyShadow;
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - 80, by + 5, 160, 15);
            }

            if (tankType === 'MAGICAL') {
                // 魔法のクリスタル（上部）
                const crystals = [
                    { x: cx - 50, y: by + 20 },
                    { x: cx, y: by - 10 },
                    { x: cx + 50, y: by + 20 }
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
                ctx.arc(cx, by + bh / 2, 40, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (tankType === 'BOSS') {
                // 王冠（ボスの証）
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(cx - 30, by - 5);
                ctx.lineTo(cx - 20, by - 20);
                ctx.lineTo(cx - 10, by - 5);
                ctx.lineTo(cx, by - 25);
                ctx.lineTo(cx + 10, by - 5);
                ctx.lineTo(cx + 20, by - 20);
                ctx.lineTo(cx + 30, by - 5);
                ctx.lineTo(cx + 25, by + 5);
                ctx.lineTo(cx - 25, by + 5);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#FFA500';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 王冠の宝石
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(cx, by - 15, 4, 0, Math.PI * 2);
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
                    ctx.moveTo(cx - 60, by + 30);
                    ctx.quadraticCurveTo(cx - 80, by - 20, cx - 70, by - 60);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(cx + 60, by + 30);
                    ctx.quadraticCurveTo(cx + 80, by - 20, cx + 70, by - 60);
                    ctx.stroke();

                    // 角の先端
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(cx - 70, by - 60, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx + 70, by - 60, 8, 0, Math.PI * 2);
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
                ctx.translate(cx, by - 30);

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
                    const eyeY = by + 50;

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
                ctx.moveTo(cx - bw / 2 + 20, by + 60);
                ctx.quadraticCurveTo(cx - bw / 2 - 30, by + 40, cx - bw / 2 - 20, by + 20);
                ctx.moveTo(cx + bw / 2 - 20, by + 60);
                ctx.quadraticCurveTo(cx + bw / 2 + 30, by + 40, cx + bw / 2 + 20, by + 20);
                ctx.stroke();
            }
        }

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
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);

        // Cannon Base/Mount
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#444'; ctx.lineWidth = 3; ctx.stroke();

        // Cannon Tube
        const angle = (dir === 1) ? 0 : Math.PI;
        ctx.rotate(angle);

        const tubeL = w * 0.7;
        const tubeW = h * 0.6;

        const tubeG = ctx.createLinearGradient(0, -tubeW / 2, 0, tubeW / 2);
        tubeG.addColorStop(0, '#555'); tubeG.addColorStop(0.5, '#777'); tubeG.addColorStop(1, '#444');
        ctx.fillStyle = tubeG;
        ctx.fillRect(0, -tubeW / 2, tubeL, tubeW);
        ctx.strokeStyle = '#333'; ctx.strokeRect(0, -tubeW / 2, tubeL, tubeW);

        // Muzzle
        ctx.fillStyle = '#222';
        ctx.fillRect(tubeL - 5, -tubeW / 2 - 2, 8, tubeW + 4);

        if (loaded) {
            // Shiny glow if loaded

            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(tubeL - 10, 0, 5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    },

    // === ENGINE CORE (3D glowing sphere) ===
    drawEngineCore(ctx, x, y, w, h, hp, maxHp) {
        ctx.save();
        const cx = x + w / 2, cy = y + h / 2;

        // Outer glow pulse
        const pulse = 0.15 + Math.sin(_getFrameNow() * 0.006) * 0.08;
        const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w);
        outerGlow.addColorStop(0, `rgba(255,120,0,${pulse})`);
        outerGlow.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath(); ctx.arc(cx, cy, w, 0, Math.PI * 2); ctx.fill();

        // Core housing (3D metallic box)
        const hGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        hGrad.addColorStop(0, '#777');
        hGrad.addColorStop(0.5, '#555');
        hGrad.addColorStop(1, '#333');
        ctx.fillStyle = hGrad;
        this._roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
        this._roundRect(ctx, x, y, w, h, 6);
        ctx.stroke();

        // Inner core (glowing orb - 3D sphere)
        const coreGrad = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, w * 0.3);
        coreGrad.addColorStop(0, '#FFDD88');
        coreGrad.addColorStop(0.4, '#FF8800');
        coreGrad.addColorStop(0.8, '#CC3300');
        coreGrad.addColorStop(1, '#881100');
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2); ctx.fill();

        // Core specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.ellipse(cx - 3, cy - 5, w * 0.1, w * 0.06, -0.3, 0, Math.PI * 2); ctx.fill();

        // HP bar
        const barW = w + 10, barH = 6;
        const barX = x - 5, barY = y - 14;
        ctx.fillStyle = '#222';
        this._roundRect(ctx, barX, barY, barW, barH, 3);
        ctx.fill();
        const ratio = Math.max(0, hp / maxHp);
        const barColor = ratio > 0.5 ? CONFIG.COLORS.HP_GREEN : (ratio > 0.25 ? CONFIG.COLORS.HP_YELLOW : CONFIG.COLORS.HP_RED);
        ctx.fillStyle = barColor;
        this._roundRect(ctx, barX + 1, barY + 1, (barW - 2) * ratio, barH - 2, 2);
        ctx.fill();

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
            // Fire Effect
            const t = _getFrameNow() * 0.02;
            const size = 10 + Math.sin(t) * 2;
            ctx.fillStyle = `rgba(255, 100, 0, 0.8)`;
            ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255, 200, 50, 0.9)`;
            ctx.beginPath(); ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2); ctx.fill();
            // Tail
            ctx.fillStyle = `rgba(255, 50, 0, 0.4)`;
            ctx.beginPath(); ctx.ellipse(-pDir * 15, 0, 25, 8, 0, 0, Math.PI * 2); ctx.fill();

        } else if (pType === 'ice') {
            // Ice Crystal
            ctx.fillStyle = '#E0F7FA';
            ctx.strokeStyle = '#4FC3F7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(10, 0); ctx.lineTo(0, 8); ctx.lineTo(-10, 0); ctx.lineTo(0, -8);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Cold Trail
            ctx.fillStyle = `rgba(200, 240, 255, 0.4)`;
            ctx.beginPath(); ctx.ellipse(-pDir * 15, 0, 25, 6, 0, 0, Math.PI * 2); ctx.fill();

        } else if (pType === 'thunder') {
            // Thunder jagged line
            ctx.strokeStyle = '#FFEB3B';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-5, -8); ctx.lineTo(0, 8); ctx.lineTo(5, -5); ctx.lineTo(10, 0);
            ctx.stroke();

        } else {
            // Standard Projectiles (Rock, etc)
            // Motion trail (gradient fade)
            const trailGrad = ctx.createLinearGradient(-pDir * 30, 0, 0, 0);
            trailGrad.addColorStop(0, 'rgba(255,150,0,0)');
            trailGrad.addColorStop(1, 'rgba(255,150,0,0.4)');
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.ellipse(-pDir * 15, 0, 20, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Hot glow around projectile
            const hotGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
            hotGlow.addColorStop(0, 'rgba(255,200,100,0.3)');
            hotGlow.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = hotGlow;
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();

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
                this._cloudCache = document.createElement('canvas');
                this._cloudCache.width = w; this._cloudCache.height = 120;
            }
            const cc = this._cloudCache.getContext('2d');
            cc.clearRect(0, 0, w, 120);
            for (let i = 0; i < 2; i++) {
                const cx = ((t * 20 + i * 280) % (w + 200)) - 100;
                const cy = 40 + i * 50 + Math.sin(i * 1.5) * 10;
                this._draw3DCloud(cc, cx, cy, 28 + i * 6);
            }
            ctx.drawImage(this._cloudCache, 0, 0);
        }

        // Background Landscape (Themed) - 静的部分はオフスクリーンキャッシュで高速化
        const theme = stageData ? stageData.theme : 'default';
        const bgKey = `landscape_${theme}_${w}_${splitY | 0}`;
        const bgCanvas = _getCachedBg(bgKey, w, splitY, (bctx) => {
            this._drawLandscape(bctx, w, splitY, theme);
        });
        ctx.drawImage(bgCanvas, 0, 0);

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

        // Depth/Perimeter Walls
        ctx.fillStyle = '#C19A6B'; // Wall thickness color
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
        ctx.fillStyle = '#222';
        ctx.fillRect(0, splitY - 4, w, 8);
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

            // Castle (Left - Player Base) - Blue Theme dome style
            ctx.fillStyle = '#7A9ACF';
            // Base
            ctx.fillRect(-10, h - 160, 100, 120);
            // Tower Dome
            ctx.beginPath();
            ctx.arc(40, h - 160, 50, Math.PI, 0);
            ctx.fillStyle = '#5A7ABF';
            ctx.fill();
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.stroke();
            // Spire
            ctx.fillStyle = '#FFAA00';
            ctx.fillRect(35, h - 240, 10, 40);
            ctx.beginPath(); ctx.moveTo(30, h - 240); ctx.lineTo(40, h - 260); ctx.lineTo(50, h - 240); ctx.fill();

            // Windows
            ctx.fillStyle = '#2A3A5A';
            ctx.fillRect(15, h - 130, 20, 25);
            ctx.fillRect(45, h - 130, 20, 25);
            // Castle Flag
            ctx.fillStyle = '#5BA3E6';
            ctx.beginPath(); ctx.moveTo(30, h - 260); ctx.lineTo(30, h - 290); ctx.lineTo(60, h - 275); ctx.fill();
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, h - 260); ctx.lineTo(30, h - 290); ctx.stroke();
        }
    },

    // Upper screen battle visualization
    drawUpperBattle(ctx, w, h, battle, state) {
        const splitY = h * 0.5;
        const groundY = splitY - 20;

        // Player Tank (Left, huge)
        // Adjusted for battle movement
        const playerX = -50 + (battle.playerTankX || 0);
        const playerY = groundY - 280 + (battle.playerTankY || 0);
        const playerFlash = battle.dodgeTimer > 0 ? 30 : 0; // Visual flash for dodge
        this.drawTankExterior(ctx, playerX, playerY, 240, 280, false, playerFlash, false);

        // Enemy Tank (Right, huge)
        // Adjusted for battle movement
        const enemyX = w - 190 + (battle.enemyTankX || 0);
        const enemyY = groundY - 280 + (battle.enemyTankY || 0);
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

        // === STATUS EFFECTS ===
        // Fire Effect (Burn) - composite='screen'は重いのでsource-overで代替
        if (battle.fireEffect > 0) {
            const t = _getFrameNow() * 0.01;
            ctx.save();
            for (let i = 0; i < 5; i++) {
                // Math.random() の代わりに sin/cos でフレームごとに位置をずらす（GC負荷なし）
                const fx = enemyX + 90 + Math.cos(t * 1.3 + i * 1.2) * 60;
                const fy = enemyY + 175 + Math.sin(t * 1.7 + i * 0.9) * 50;
                const size = 30 + Math.sin(t + i) * 10;
                const r = 200 + (Math.sin(t * 2 + i) * 0.5 + 0.5) * 55 | 0;
                ctx.fillStyle = `rgba(255, ${r}, 0, 0.45)`;
                ctx.beginPath(); ctx.arc(fx, fy, size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
        // Ice Effect (Freeze)
        if (battle.iceEffect > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(100, 220, 255, 0.3)';
            this._roundRect(ctx, enemyX + 20, enemyY + 20, 200, 240, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        // Thunder Flash
        if (battle.thunderFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 200, ${battle.thunderFlash * 0.1})`;
            ctx.fillRect(enemyX - 50, enemyY - 50, 340, 380);
            ctx.restore();
        }

        // Projectiles in flight (Fake visualization based on battle state could go here)
        // For now, projectiles are drawn in Game.drawBattleScene which overlays on the whole screen.
        // If we want "upper screen only" projectiles, we'd draw them here.
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

    drawMaster(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // Body (Small Elder Slime)
        ctx.fillStyle = color; // Red/Pinkish
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.4, Math.PI, 0);
        ctx.lineTo(w * 0.4, h * 0.4);
        ctx.quadraticCurveTo(0, h * 0.5, -w * 0.4, h * 0.4);
        ctx.fill();

        // White Beard
        ctx.fillStyle = '#EEE';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(0, 20, 15, 0); // Beard curve
        ctx.quadraticCurveTo(0, -5, -15, 0);
        ctx.fill();

        // Eyebrows (Busy)
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#EEE';
        ctx.beginPath();
        ctx.moveTo(-12, -15); ctx.lineTo(-5, -12);
        ctx.moveTo(12, -15); ctx.lineTo(5, -12);
        ctx.stroke();

        // Staff
        ctx.save();
        ctx.translate(w * 0.4, 0);
        ctx.rotate(Math.sin(frame * 0.1) * 0.1);
        ctx.fillStyle = '#8D6E63'; // Wood
        ctx.fillRect(-2, -30, 4, 60);
        // Gem on top
        ctx.fillStyle = '#00E676';

        ctx.beginPath(); ctx.arc(0, -32, 6, 0, Math.PI * 2); ctx.fill();

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

        return { x: ux, y: uy };
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
            ctx.shadowBlur = 4;
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
            ctx.shadowBlur = 5;
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

        // Base (Box)
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        this._roundRect(ctx, -w / 2, -h / 2, w, h, 4);
        ctx.fill();
        ctx.stroke();

        // Switch Slot
        ctx.fillStyle = '#111';
        ctx.fillRect(-w * 0.2, -h * 0.3, w * 0.4, h * 0.6);

        // Lever
        ctx.strokeStyle = activated ? '#4CAF50' : '#E74C3C';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const leverLen = h * 0.5;
        const angle = activated ? -Math.PI * 0.2 : Math.PI * 0.2;
        ctx.lineTo(Math.sin(angle) * leverLen, Math.cos(angle) * leverLen);
        ctx.stroke();

        // Knob
        ctx.fillStyle = activated ? '#81C784' : '#EF5350';
        ctx.beginPath();
        ctx.arc(Math.sin(angle) * leverLen, Math.cos(angle) * leverLen, 6, 0, Math.PI * 2);
        ctx.fill(); // Keep this line for the knob to be visible

        // Label
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(label, 1, h / 2 + 13); // Shadow
        ctx.fillStyle = '#FFF';
        ctx.fillText(label, 0, h / 2 + 12);

        ctx.restore();
    },

    drawBarrier(ctx, x, y, w, h) {
        ctx.save();
        const pulse = 0.3 + Math.sin(_getFrameNow() * 0.01) * 0.2;
        ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 2})`;
        ctx.lineWidth = 2;

        // Draw hexagon or grid pattern
        ctx.beginPath();
        const step = 20;
        for (let ix = x; ix < x + w; ix += step) {
            ctx.moveTo(ix, y);
            ctx.lineTo(ix, y + h);
        }
        for (let iy = y; iy < y + h; iy += step) {
            ctx.moveTo(x, iy);
            ctx.lineTo(x + w, iy);
        }
        ctx.stroke();

        // Outer glow
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.fill();
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

        // Face (Master look)
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('v v', -8, -5);
        ctx.restore();
    },

    // === 秘密コマンド・配合キャラの描画関数 ===

    drawSlimeKonami(ctx, x, y, w, h, color, dir, frame) {
        // コナミスライム: 虹色のスライムにコントローラーマークが光る
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(dir, 1);
        const rainbow = `hsl(${(frame * 3) % 360}, 100%, 60%)`;
        ctx.fillStyle = rainbow;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#FFF'; ctx.font = `${w * 0.5}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🎮', 0, 0);
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, w / 2 + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    },

    drawSlimeRainbow(ctx, x, y, w, h, color, dir, frame) {
        // レインボースライム: 7色のオーラをまとった大型スライム
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(dir, 1);
        for (let i = 6; i >= 0; i--) {
            const hue = (i * 51 + frame * 2) % 360;
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.beginPath(); ctx.arc(0, 0, w / 2 + i * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(-w * 0.15, -h * 0.2, w * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    drawDragonDark(ctx, x, y, w, h, color, dir, frame) {
        // ダークドラゴン: ドラゴンの紫黒バージョン
        this.drawDragon(ctx, x, y, w, h, color, dir, frame);
        // Dark aura overlay
        ctx.save(); ctx.translate(x + w / 2, y + h / 2);
        ctx.globalAlpha = 0.3 + Math.sin(frame * 0.1) * 0.1;
        ctx.fillStyle = '#1A0033';
        ctx.beginPath(); ctx.arc(0, 0, w * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

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

    drawSlimeOrichalcum(ctx, x, y, w, h, color, dir, frame) {
        // オリハルコンスライム: 金属光沢の青緑スライム
        this.drawSlimeMetal(ctx, x, y, w, h, color, dir, frame);
        ctx.save(); ctx.translate(x + w / 2, y + h / 2);
        ctx.globalAlpha = 0.4 + Math.sin(frame * 0.07) * 0.2;
        ctx.strokeStyle = '#00CED1'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, w * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    },

    drawMasterGrand(ctx, x, y, w, h, color, dir, frame) {
        // グランドマスター: マスターの金色上位種
        this.drawMaster(ctx, x, y, w, h, color, dir, frame);
        ctx.save(); ctx.translate(x + w / 2, y + h / 2);
        ctx.globalAlpha = 0.5 + Math.sin(frame * 0.05) * 0.2;
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, w * 0.6, 0, Math.PI * 2); ctx.stroke();
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

    // === 配合専用キャラクターの描画関数（未実装分） ===

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
        const sway = Math.sin(frame * 0.04) * 1;

        // 白金オーラ
        const auraAlpha = 0.15 + Math.sin(frame * 0.08) * 0.05;
        ctx.globalAlpha = auraAlpha;
        ctx.fillStyle = '#E5E4E2';
        ctx.beginPath(); ctx.arc(0, 0, w * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // 脚部
        ctx.fillStyle = '#90A4AE';
        ctx.strokeStyle = '#455A64';
        ctx.lineWidth = 2;
        for (let side = -1; side <= 1; side += 2) {
            ctx.fillRect(side * w * 0.18, h * 0.3, w * 0.2, h * 0.35);
        }

        // 腕（白金装甲）
        for (let side = -1; side <= 1; side += 2) {
            const armGrad = ctx.createLinearGradient(side * w * 0.4, 0, side * w * 0.65, 0);
            armGrad.addColorStop(0, '#CFD8DC');
            armGrad.addColorStop(1, '#78909C');
            ctx.fillStyle = armGrad;
            ctx.beginPath();
            ctx.moveTo(side * w * 0.38, -h * 0.2);
            ctx.lineTo(side * w * 0.65, -h * 0.15);
            ctx.lineTo(side * w * 0.68, h * 0.2);
            ctx.lineTo(side * w * 0.38, h * 0.25);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }

        // メインボディ（白金装甲）
        const bodyGrad = ctx.createLinearGradient(-w * 0.4, -h * 0.5, w * 0.4, h * 0.4);
        bodyGrad.addColorStop(0, '#ECEFF1');
        bodyGrad.addColorStop(0.4, '#B0BEC5');
        bodyGrad.addColorStop(1, '#546E7A');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-w * 0.38, h * 0.32);
        ctx.lineTo(-w * 0.42, -h * 0.15);
        ctx.lineTo(-w * 0.28, -h * 0.5);
        ctx.lineTo(w * 0.28, -h * 0.5);
        ctx.lineTo(w * 0.42, -h * 0.15);
        ctx.lineTo(w * 0.38, h * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#90A4AE';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 白金の縁取りライン
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-w * 0.26, -h * 0.45);
        ctx.lineTo(w * 0.26, -h * 0.45);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w * 0.35, -h * 0.1);
        ctx.lineTo(w * 0.35, -h * 0.1);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 目（白金の瞳）
        ctx.fillStyle = '#102027';
        ctx.fillRect(-w * 0.2, -h * 0.33 + sway, w * 0.14, h * 0.09);
        ctx.fillRect(w * 0.06, -h * 0.33 + sway, w * 0.14, h * 0.09);
        // 輝き（白金エネルギー）
        const glow = 0.7 + Math.sin(frame * 0.12) * 0.3;
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#E0F7FA';
        ctx.fillRect(-w * 0.18, -h * 0.3 + sway, w * 0.1, h * 0.04);
        ctx.fillRect(w * 0.08, -h * 0.3 + sway, w * 0.1, h * 0.04);
        ctx.globalAlpha = 1;

        // 胸の白金紋章
        ctx.strokeStyle = '#ECEFF1';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, h * 0.05, w * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#B2EBF2';
        ctx.beginPath();
        ctx.arc(0, h * 0.05, w * 0.06, 0, Math.PI * 2);
        ctx.fill();
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

    drawHealerSlime(ctx, x, y, w, h, color, dir, frame) {
        // ヒーラースライム: 白衣と赤十字を持つ回復専門スライム。通常スライムとは全然違う
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const bob = Math.sin(frame * 0.12) * 3;

        // 光の粒（回復エフェクト）
        for (let i = 0; i < 4; i++) {
            const angle = (frame * 0.05 + i * Math.PI / 2);
            const px = Math.cos(angle) * w * 0.55;
            const py = Math.sin(angle) * h * 0.45 + bob;
            const alpha = 0.4 + Math.sin(frame * 0.1 + i) * 0.2;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#E8F5E9';
            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 体（白いスライム本体）
        ctx.fillStyle = '#FAFAFA';
        ctx.strokeStyle = '#C8E6C9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, bob, w * 0.42, Math.PI, 0);
        ctx.quadraticCurveTo(w * 0.42, h * 0.35 + bob, 0, h * 0.38 + bob);
        ctx.quadraticCurveTo(-w * 0.42, h * 0.35 + bob, -w * 0.42, bob);
        ctx.fill(); ctx.stroke();

        // 白衣の衿（緑ライン）
        ctx.fillStyle = '#A5D6A7';
        ctx.beginPath();
        ctx.moveTo(-8, -2 + bob); ctx.lineTo(0, 10 + bob); ctx.lineTo(8, -2 + bob);
        ctx.fill();

        // 赤十字マーク
        ctx.fillStyle = '#EF5350';
        ctx.fillRect(-3, -h * 0.28 + bob, 6, 18);
        ctx.fillRect(-9, -h * 0.22 + bob, 18, 6);

        // ナースキャップ
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#EF9A9A'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.35 + bob);
        ctx.quadraticCurveTo(0, -h * 0.5 + bob, w * 0.3, -h * 0.35 + bob);
        ctx.quadraticCurveTo(w * 0.28, -h * 0.25 + bob, -w * 0.28, -h * 0.25 + bob);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // キャップの赤ライン
        ctx.strokeStyle = '#EF5350'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.22, -h * 0.28 + bob); ctx.lineTo(w * 0.22, -h * 0.28 + bob);
        ctx.stroke();

        // 目（優しい笑顔）
        ctx.fillStyle = '#388E3C';
        ctx.beginPath(); ctx.arc(-7, -h * 0.1 + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -h * 0.1 + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#388E3C'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, -h * 0.04 + bob, 6, 0.1, Math.PI - 0.1); ctx.stroke();

        // 注射器（小道具）
        ctx.save();
        ctx.translate(w * 0.35, h * 0.05 + bob);
        ctx.rotate(-0.5);
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(-2, -10, 5, 16);
        ctx.fillStyle = '#EF5350';
        ctx.fillRect(-1, -13, 3, 5);
        ctx.fillStyle = '#BDBDBD';
        ctx.fillRect(0, 5, 2, 5);
        ctx.restore();

        ctx.restore();
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
    drawBossAlias(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        // kingslimeのエイリアス（drawBossは既に詳細版として定義済み）
        return this.drawKingSlime(ctx, x, y, w, h, color, dir, frame);
    },

    // === 新配合キャラクター描画関数 ===

    // ファントム (ゴースト+ニンジャ): 半透明の暗殺者、影の中に溶け込む
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

    // 深淵竜 (ダークドラゴン+ドラゴン): 暗黒の竜、闇のオーラが全身を覆う
    drawDragonAbyss(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        this.drawDragon(ctx, x, y, w, h, '#1A0033', dir, frame);
        ctx.save(); ctx.translate(x + w / 2, y + h / 2);
        // 深淵のオーラ（脈動する暗黒エネルギー）
        for (let i = 3; i >= 1; i--) {
            ctx.globalAlpha = 0.1 + Math.sin(frame * 0.1 + i) * 0.05;
            ctx.fillStyle = '#4B0082';
            ctx.beginPath(); ctx.arc(0, 0, w * 0.5 + i * 6, 0, Math.PI * 2); ctx.fill();
        }
        // 闇の粒子
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 6; i++) {
            const ang = frame * 0.05 + i * Math.PI / 3;
            const px = Math.cos(ang) * w * 0.6;
            const py = Math.sin(ang) * h * 0.4;
            ctx.fillStyle = '#7B1FA2';
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },

    // 大天使長 (セラフィム+天使): 黄金の8枚翼、巨大な光輪
    drawArchangelSupreme(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        this.drawAngel(ctx, x, y, w, h, color, dir, frame);
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(dir, 1);
        // 追加翼（金色4枚）
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 4; i++) {
            const side = i < 2 ? 1 : -1;
            const layer = i % 2;
            const wingW = Math.sin(frame * 0.1 + layer * 0.5) * 8;
            ctx.fillStyle = layer === 0 ? '#FFD700' : '#FFFDE7';
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.1 + layer * 10);
            ctx.lineTo(side * (w * 0.8 + wingW), -h * 0.3 + layer * 5);
            ctx.lineTo(side * w * 0.5, h * 0.1 + layer * 5);
            ctx.fill();
        }
        // 巨大な光輪（二重）
        ctx.globalAlpha = 0.6 + Math.sin(frame * 0.06) * 0.2;
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.55, w * 0.3, 8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.6, w * 0.2, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    },

    // アダマンタイト (オリハルコン+プラチナ): 超硬質金属スライム、ダイヤモンドの輝き
    drawSlimeAdamantite(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // ダイヤモンドの反射光
        for (let i = 0; i < 8; i++) {
            const ang = frame * 0.03 + i * Math.PI / 4;
            const rayLen = w * 0.7 + Math.sin(frame * 0.08 + i) * 5;
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = '#E0F7FA';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * rayLen, Math.sin(ang) * rayLen);
            ctx.stroke();
        }

        // 金属ボディ（多面体風）
        ctx.globalAlpha = 1;
        const grad = ctx.createRadialGradient(-w * 0.2, -h * 0.2, 2, 0, 0, w * 0.55);
        grad.addColorStop(0, '#E0F7FA');
        grad.addColorStop(0.4, color);
        grad.addColorStop(1, '#004D40');
        ctx.fillStyle = grad;
        ctx.beginPath();
        // 6角形風ボディ
        for (let i = 0; i < 6; i++) {
            const ang = i * Math.PI / 3 - Math.PI / 6;
            const px = Math.cos(ang) * w * 0.45;
            const py = Math.sin(ang) * h * 0.4;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#80CBC4'; ctx.lineWidth = 2; ctx.stroke();

        // キラキラスパーク
        for (let i = 0; i < 4; i++) {
            const sparkAng = (frame * 5 + i * 90) % 360;
            const sx = Math.cos(sparkAng * Math.PI / 180) * w * 0.3;
            const sy = Math.sin(sparkAng * Math.PI / 180) * h * 0.25;
            const ss = Math.max(0, Math.sin(sparkAng * Math.PI / 180)) * 3;
            ctx.globalAlpha = ss / 3;
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },

    // === ★7 最終配合キャラクター ===

    // カオスドラゴン (ダークドラゴン+セラフィム): 聖と闇の融合竜、二色のオーラ
    drawChaosDragon(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);
        const floatY = Math.sin(frame * 0.1) * 4;
        ctx.translate(0, floatY);

        // 二色オーラ（聖＋闇）
        for (let i = 4; i >= 1; i--) {
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#4B0082';
            ctx.beginPath(); ctx.arc(0, 0, w * 0.5 + i * 7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 翼（左:闇、右:光）
        const wingFlap = Math.sin(frame * 0.12) * 12;
        ctx.fillStyle = '#4B0082';
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, 0);
        ctx.lineTo(-w * 1.1, -h * 0.7 + wingFlap);
        ctx.lineTo(-w * 0.7, -h * 0.2);
        ctx.lineTo(-w * 0.9, -h * 0.5 + wingFlap);
        ctx.lineTo(-w * 0.4, -h * 0.1);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(w * 0.3, 0);
        ctx.lineTo(w * 1.1, -h * 0.7 + wingFlap);
        ctx.lineTo(w * 0.7, -h * 0.2);
        ctx.lineTo(w * 0.9, -h * 0.5 + wingFlap);
        ctx.lineTo(w * 0.4, -h * 0.1);
        ctx.fill();

        // ボディ
        const bodyGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, w * 0.5);
        bodyGrad.addColorStop(0, '#B71C1C');
        bodyGrad.addColorStop(1, color);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // 角（双角）
        ctx.fillStyle = '#311B92';
        ctx.beginPath(); ctx.moveTo(-12, -h * 0.3); ctx.lineTo(-18, -h * 0.7); ctx.lineTo(-6, -h * 0.35); ctx.fill();
        ctx.fillStyle = '#F9A825';
        ctx.beginPath(); ctx.moveTo(12, -h * 0.3); ctx.lineTo(18, -h * 0.7); ctx.lineTo(6, -h * 0.35); ctx.fill();

        // 異色の目（左:紫、右:金）
        ctx.fillStyle = '#CE93D8';
        ctx.beginPath(); ctx.arc(-8, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(8, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-8, -3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -3, 1.5, 0, Math.PI * 2); ctx.fill();

        // ★7マーク
        ctx.fillStyle = '#FFD700'; ctx.font = `bold ${w * 0.2}px Arial`;
        ctx.textAlign = 'center'; ctx.fillText('★7', 0, h * 0.35);

        ctx.restore();
    },

    // プリズムスライム (コナミ+レインボー): 虹色プリズム体、光の屈折アニメ
    drawSlimePrism(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // プリズム光の放射
        for (let i = 0; i < 12; i++) {
            const ang = frame * 0.04 + i * Math.PI / 6;
            const hue = (i * 30 + frame * 3) % 360;
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * w * 0.3, Math.sin(ang) * h * 0.3);
            ctx.lineTo(Math.cos(ang) * w * 0.9, Math.sin(ang) * h * 0.7);
            ctx.stroke();
        }

        // 虹色オーラリング
        for (let i = 5; i >= 0; i--) {
            const hue = (i * 60 + frame * 4) % 360;
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
            ctx.beginPath(); ctx.arc(0, 0, w / 2 + i * 4, 0, Math.PI * 2); ctx.fill();
        }

        // クリスタルボディ（プリズム形状）
        ctx.globalAlpha = 0.9;
        const hue = (frame * 5) % 360;
        const bodyGrad = ctx.createRadialGradient(-w * 0.15, -h * 0.15, 2, 0, 0, w * 0.5);
        bodyGrad.addColorStop(0, `hsl(${hue}, 80%, 85%)`);
        bodyGrad.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 90%, 60%)`);
        bodyGrad.addColorStop(1, `hsl(${(hue + 240) % 360}, 100%, 40%)`);
        ctx.fillStyle = bodyGrad;
        // ダイヤモンド型
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.45);
        ctx.lineTo(w * 0.45, 0);
        ctx.lineTo(0, h * 0.45);
        ctx.lineTo(-w * 0.45, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();

        // 中央のキラキラ
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-w * 0.1, -h * 0.12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.05, -h * 0.05, 2, 0, Math.PI * 2); ctx.fill();

        // ★7マーク
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF'; ctx.font = `bold ${w * 0.2}px Arial`;
        ctx.textAlign = 'center'; ctx.fillText('★7', 0, h * 0.1);

        ctx.restore();
    },

    // ゴッドスライム (オリハルコン+グランドマスター): 神聖なる究極体、天上の光
    drawSlimeGod(ctx, x, y, w, h, color, dir = 1, frame = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(dir, 1);

        // 天上の光（回転する光線）
        for (let i = 0; i < 8; i++) {
            const ang = frame * 0.02 + i * Math.PI / 4;
            ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05 + i) * 0.05;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * w, Math.sin(ang) * h * 0.8);
            ctx.stroke();
        }

        // 聖なるオーラ（重層リング）
        for (let i = 5; i >= 1; i--) {
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath(); ctx.arc(0, 0, w * 0.5 + i * 6, 0, Math.PI * 2); ctx.fill();
        }

        // 神聖ボディ（白金×金）
        ctx.globalAlpha = 1;
        const bodyGrad = ctx.createRadialGradient(-w * 0.1, -h * 0.15, 3, 0, 0, w * 0.5);
        bodyGrad.addColorStop(0, '#FFFFFF');
        bodyGrad.addColorStop(0.4, '#FFF8E1');
        bodyGrad.addColorStop(0.8, '#FFD700');
        bodyGrad.addColorStop(1, '#B8860B');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();

        // 天冠（3つの尖塔）
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-15, -h * 0.35); ctx.lineTo(-18, -h * 0.7); ctx.lineTo(-8, -h * 0.4);
        ctx.lineTo(0, -h * 0.8); ctx.lineTo(8, -h * 0.4);
        ctx.lineTo(18, -h * 0.7); ctx.lineTo(15, -h * 0.35);
        ctx.fill();
        // 冠の宝石
        ctx.fillStyle = '#E1F5FE';
        ctx.beginPath(); ctx.arc(0, -h * 0.5, 3, 0, Math.PI * 2); ctx.fill();

        // 三重光輪
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.55, w * 0.35, 8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.6, w * 0.25, 6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.65, w * 0.18, 4, 0, 0, Math.PI * 2); ctx.stroke();

        // 穏やかな目
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-7, -3, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -3, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(-7, -3, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -3, 2.5, 0, Math.PI * 2); ctx.fill();

        // ★7マーク
        ctx.fillStyle = '#FFD700'; ctx.font = `bold ${w * 0.22}px Arial`;
        ctx.textAlign = 'center'; ctx.fillText('★7', 0, h * 0.35);

        ctx.restore();
    },

    drawTankExterior(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior, tankType = 'NORMAL', battle = null) {
        return this._drawSlimeTank(ctx, tx, ty, tw, th, isEnemy, dmgFlash, showInterior, tankType, battle);
    }
};

window.Renderer = Renderer;
