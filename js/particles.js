// ======================================
// PARTICLES - Visual Effects
// ======================================
class Particle {
    constructor(x, y, vx, vy, life, size, color, type = 'circle') {
        Object.assign(this, { x, y, vx, vy, life, maxLife: life, size, color, type, alpha: 1, rot: Math.random() * 6.28, rotSpd: (Math.random() - 0.5) * 0.2 });
        // Extra props for specific types
        if (type === 'debris') this.vy += 2; // initial force
    }
    update() {
        // Physics
        this.x += this.vx;
        this.y += this.vy;

        if (this.type === 'smoke') {
            this.vx *= 0.95;
            this.vy -= 0.02; // Rise
            this.size *= 1.02; // Expand
        } else if (this.type === 'spark') {
            this.vy += 0.2; // Gravity
            this.vx *= 0.95;
        } else if (this.type === 'debris') {
            this.vy += 0.3; // Gravity
            this.rot += this.rotSpd;
        } else if (this.type === 'sparkle') {
            this.vy -= 0.5; // Float up
            this.vx *= 0.9;
            this.rot += 0.1;
        } else if (this.type === 'shockwave') {
            this.size += 2; // Expand
            this.life -= 2; // Die faster
        } else {
            // Default friction
            this.vx *= 0.98;
            this.vy *= 0.98;
        }

        this.life--;
        this.alpha = this.life / this.maxLife;
        // ★バグ修正: particleの画面外判定を追加（画面外に残って消えないバグを修正）
        if (this.x < -50 || this.x > CONFIG.CANVAS_WIDTH + 50 || this.y < -50 || this.y > CONFIG.CANVAS_HEIGHT + 50) {
            this.life = 0;
        }
        return this.life > 0;
    }
    draw(ctx) {
        const s = this.size;

        // Simple types: no rotation needed
        // ★バグ修正: globalAlpha を直接 1.0 にリセットすると呼び出し元の globalAlpha を
        // 壊す（例：侵攻中の ally.draw() が globalAlpha=0.75 のまま particles.draw() を
        // 呼んだとき、spark/square が描画後に 1.0 にリセットして残りの描画が狂う）。
        // save()/restore() で確実にスタックを守る。
        if (this.type === 'square' || this.type === 'spark') {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);

        ctx.fillStyle = this.color;

        if (this.type === 'smoke') {
            // Smoke is just a circle, doesn't need rotation
            ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'star') {
            ctx.rotate(this.rot);
            this._star(ctx, 0, 0, 5, s, s * 0.4);
        } else if (this.type === 'debris') {
            ctx.rotate(this.rot);
            ctx.fillRect(-s / 2, -s / 2, s, s);
        } else if (this.type === 'sparkle') {
            ctx.rotate(this.rot);
            // Diamond shape
            ctx.beginPath();
            ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.6, 0);
            ctx.closePath(); ctx.fill();
        } else if (this.type === 'shockwave') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    _star(ctx, cx, cy, sp, or, ir) {
        let r = -Math.PI / 2; const st = Math.PI / sp;
        ctx.beginPath();
        for (let i = 0; i < sp; i++) { ctx.lineTo(cx + Math.cos(r) * or, cy + Math.sin(r) * or); r += st; ctx.lineTo(cx + Math.cos(r) * ir, cy + Math.sin(r) * ir); r += st; }
        ctx.closePath(); ctx.fill();
    }
}

class ParticleSystem {
    constructor() { this.ps = []; this.nums = []; }

    update() {
        // パーティクル上限（Android向けパフォーマンス改善: 40→25に削減）
        const MAX_PARTICLES = 25;
        if (this.ps.length > MAX_PARTICLES) {
            const excess = this.ps.length - MAX_PARTICLES;
            for (let i = 0; i < excess; i++) ParticlePool.release(this.ps[i]);
            this.ps.splice(0, excess);
        }

        // インプレース処理: splice O(n²) を O(n) に改善
        let writeIdx = 0;
        for (let i = 0; i < this.ps.length; i++) {
            const p = this.ps[i];
            if (p.update()) {
                this.ps[writeIdx++] = p;
            } else {
                ParticlePool.release(p);
            }
        }
        this.ps.length = writeIdx;

        // nums（ダメージ数字）もインプレース処理でfilter()の新配列生成を回避
        let numWi = 0;
        for (let ni = 0; ni < this.nums.length; ni++) {
            const n = this.nums[ni];
            n.y -= 0.5;
            n.life--;
            n.alpha = Math.min(1, n.life / 20);
            if (n.life > 0) this.nums[numWi++] = n;
        }
        this.nums.length = numWi;
    }

    draw(ctx) {
        // Draw Particles (for ループの方が forEach より高速)
        const ps = this.ps;
        for (let i = 0, len = ps.length; i < len; i++) {
            ps[i].draw(ctx);
        }

        // Draw Numbers (Damage, Text)
        const _nums = this.nums;
        for (let _ni = 0, _nlen = _nums.length; _ni < _nlen; _ni++) {
            const n = _nums[_ni]; {
                ctx.save();
                ctx.globalAlpha = n.alpha;

                if (n.isHuge) {
                    // 巨大テキスト（シンプル化してパフォーマンス改善）
                    const scale = 1 + Math.sin(n.life * 0.07) * 0.1; // Date.now()ではなくlifeを使う
                    ctx.translate(n.x, n.y);
                    ctx.scale(scale, scale);

                    ctx.font = `bold ${n.size}px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif`;
                    ctx.textAlign = 'center';

                    // 影（1回だけ）
                    ctx.fillStyle = 'rgba(0,0,0,0.8)';
                    ctx.fillText(n.text, 2, 2);

                    // 白い外枠
                    ctx.strokeStyle = '#FFF';
                    ctx.lineWidth = 4;
                    ctx.strokeText(n.text, 0, 0);

                    // メインテキスト（グラデーションはコスト高いのでソリッドカラーに）
                    ctx.fillStyle = n.color;
                    ctx.fillText(n.text, 0, 0);
                } else {
                    // 通常テキスト
                    ctx.font = `bold ${n.size}px Arial`;
                    ctx.textAlign = 'center';
                    // Shadow
                    ctx.fillStyle = '#000';
                    ctx.fillText(n.text, n.x + 2, n.y + 2);
                    // Main Text
                    ctx.fillStyle = n.color;
                    ctx.fillText(n.text, n.x, n.y);
                }

                ctx.restore();
            }
        }
    }

    // === EFFECTS ===

    explosion(x, y, color = '#F00', size = 30) {
        // Flash smoke
        this.ps.push(ParticlePool.get(x, y, 0, 0, 5, size * 1.5, '#FFF', 'smoke'));

        // Smoke Cloud（1個に削減）
        for (let i = 0; i < 1; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2;
            this.ps.push(ParticlePool.get(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                25 + Math.random() * 15,
                size * 0.4 + Math.random() * 8,
                Math.random() > 0.5 ? '#555' : color,
                'smoke'
            ));
        }

        // Sparks（1個に削減）
        for (let i = 0; i < 1; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.ps.push(ParticlePool.get(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                30,
                2 + Math.random() * 2,
                '#FFD700',
                'spark'
            ));
        }
    }

    cannonFire(x, y, size = 1) {
        // 砲撃エフェクト：スモークのみ（explosionを省いて軽量化）
        const count = Math.max(1, Math.round(size));
        this.smoke(x, y, count);
    }

    hit(x, y) {
        for (let i = 0; i < 4; i++) { // パフォーマンス改善: 6→4
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.ps.push(ParticlePool.get(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 3 + Math.random() * 2, '#FFD700', 'star'));
        }
    }

    enemyAttack(x, y) {
        this.smoke(x, y, 5);
    }

    smoke(x, y, count = 1) {
        for (let i = 0; i < count; i++) {
            this.ps.push(ParticlePool.get(
                x + (Math.random() - 0.5) * 10,
                y + (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 0.5,
                -1 - Math.random(),
                40,
                10 + Math.random() * 5,
                `rgba(200,200,200,${0.5 + Math.random() * 0.5})`,
                'smoke'
            ));
        }
    }

    damageNum(x, y, val, color = '#FFF') {
        const MAX_NUMS = 20; // ★上限: 激しい戦闘でスパムされるとメモリ増加するため
        if (this.nums.length >= MAX_NUMS) return;
        const isBig = typeof val === 'number' && val > 15;
        this.nums.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 10,
            text: `${val}`,
            size: isBig ? 26 : 18,
            life: 60,
            maxLife: 60,
            alpha: 1,
            color,
            isHuge: isBig  // ★バグ修正: isHuge を設定していなかったため大数字演出が未発動だった
        });
    }

    rateEffect(x, y, text, color) {
        this.damageNum(x, y, text, color);
    }

    sparkle(x, y, color = '#FFD700') {
        for (let i = 0; i < 2; i++) { // 5→2に削減
            this.ps.push(ParticlePool.get(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                0, -1 - Math.random(),
                25 + Math.random() * 15,
                4 + Math.random() * 3,
                color,
                'sparkle'
            ));
        }
    }

    shockwave(x, y, color = '#FFF') {
        this.ps.push(ParticlePool.get(x, y, 0, 0, 20, 10, color, 'shockwave'));
    }

    // === ラスボス用エフェクト ===

    // 稲妻エフェクト
    lightning(x1, y1, x2, y2) {
        // 稲妻：セグメント数を8→4に削減、スパーク生成を省略
        const segments = 4;
        const points = [{ x: x1, y: y1 }];
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            points.push({
                x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 50,
                y: y1 + (y2 - y1) * t
            });
        }
        points.push({ x: x2, y: y2 });
        // グローのみ（スパーク生成なし）
        this.ps.push(ParticlePool.get(x2, y2, 0, 0, 8, 22, '#FFFFFF', 'smoke'));
    }

    // オーラエフェクト（ボスの周囲）
    aura(x, y, color = '#9C27B0') {
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;

        this.ps.push(ParticlePool.get(
            px, py,
            (x - px) * 0.02, // 中心に向かって移動
            (y - py) * 0.02,
            40 + Math.random() * 20,
            4 + Math.random() * 4,
            color,
            'sparkle'
        ));
    }

    // 強力なスパーク（放射状）
    spark(x, y, vx, vy, color = '#FFD700') {
        this.ps.push(ParticlePool.get(
            x, y, vx, vy,
            30 + Math.random() * 20,
            3 + Math.random() * 3,
            color,
            'spark'
        ));
    }

    heal(x, y) {
        // Green sparkles floating upward（5→3）
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            this.ps.push(ParticlePool.get(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 1.5,
                35 + Math.random() * 15,
                4 + Math.random() * 3,
                '#4CAF50',
                'sparkle'
            ));
        }
        this.damageNum(x, y - 10, '♥', '#4CAF50');
    }

    clear() {
        // Return all particles to pool
        this.ps.forEach(p => ParticlePool.release(p));
        this.ps = [];
        this.nums = [];
    }
}

// === OBJECT POOLING ===
class ParticlePool {
    static pool = [];
    static get(x, y, vx, vy, life, size, color, type) {
        let p = this.pool.pop();
        if (!p) {
            p = new Particle(x, y, vx, vy, life, size, color, type);
        } else {
            // Reset existing particle
            p.x = x; p.y = y;
            p.vx = vx; p.vy = vy;
            p.life = life; p.maxLife = life;
            p.size = size; p.color = color;
            p.type = type;
            p.alpha = 1;
            p.rot = Math.random() * 6.28;
            p.rotSpd = (Math.random() - 0.5) * 0.2;
            // Type specific reset
            if (type === 'debris') p.vy += 2;
        }
        return p;
    }
    static release(p) {
        if (this.pool.length < 500) { // Increased limit from 200 to 500 for better performance
            this.pool.push(p);
        }
    }
}

window.Particle = Particle;
window.ParticleSystem = ParticleSystem;
