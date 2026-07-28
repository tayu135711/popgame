// ======================================
// DEFENDER - Enemy Inside Tank
// ======================================
//
// ★合成ディフェンダー: 既存の「配合(合成)」文化 - スライム王(ゴッドキング×プラチナゴーレム)等 -
// に合わせて、侵入モードの敵も2体の要素を混ぜた合成モンスターとして描画・調整する。
// 単なる色替えではなく、武器モーション・角/翼などのシルエット要素も個体ごとに変える。
const DEFENDER_FUSIONS = [
    // ベース(素の赤スライム兵士) — 一番よく出る標準形
    { name: 'スライム兵', primary: '#E74C3C', secondary: '#333333', accent: '#FFEB3B', hpMult: 1.0, speedMult: 1.0, weapon: 'spear', horn: false, wings: false },
    // ゴーレム×忍者
    { name: 'ゴーレム忍者', primary: '#8B4513', secondary: '#37474F', accent: '#B0BEC5', hpMult: 1.5, speedMult: 0.85, weapon: 'blade', horn: false, wings: false },
    // ファントム×メタル
    { name: 'メタルファントム', primary: '#78909C', secondary: '#4A148C', accent: '#E1BEE7', hpMult: 0.75, speedMult: 1.6, weapon: 'claw', horn: false, wings: true },
    // 鬼将軍×炎
    { name: '鬼将軍', primary: '#B71C1C', secondary: '#FFA000', accent: '#FFD54F', hpMult: 1.7, speedMult: 0.8, weapon: 'hammer', horn: true, wings: false },
    // ドラゴン×ドローン
    { name: 'ドラゴンドローン', primary: '#2E7D32', secondary: '#607D8B', accent: '#80DEEA', hpMult: 1.1, speedMult: 1.25, weapon: 'spear', horn: false, wings: true },
    // 魔導ゴースト×スライム
    { name: '魔導ゴースト', primary: '#6A1B9A', secondary: '#EC407A', accent: '#FCE4EC', hpMult: 0.9, speedMult: 1.1, weapon: 'orb', horn: true, wings: false },
];
window.DEFENDER_FUSIONS = DEFENDER_FUSIONS;

class DefenderSlime {
    constructor(x, y, platforms, fusionIndex) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.vx = 0;
        this.vy = 0;
        this.platforms = platforms; // Reference to tank platforms
        this.dir = 1; // 1: Right, -1: Left
        this.state = 'idle'; // idle, chase, attack, hurt
        this.invincible = 0;
        this.attackCooldown = 0;

        // ★合成タイプ決定: 指定が無ければランダム抽選(スライム兵をやや出やすくする軽い重み付け)
        const idx = (fusionIndex !== undefined && fusionIndex !== null)
            ? fusionIndex
            : (Math.random() < 0.35 ? 0 : 1 + Math.floor(Math.random() * (DEFENDER_FUSIONS.length - 1)));
        this.fusion = DEFENDER_FUSIONS[idx] || DEFENDER_FUSIONS[0];

        this.hp = Math.round(20 * this.fusion.hpMult); // 素の20を合成タイプで増減
        this.maxHp = this.hp;
        this.speed = 1.6 * this.fusion.speedMult; // 🔧 移動速度20%ダウン調整をベースに合成補正
        // サイズも合成タイプでほんの少し変える（重量級は大きく、俊敏系は小さく）
        const sizeMult = this.fusion.hpMult >= 1.4 ? 1.15 : (this.fusion.speedMult >= 1.4 ? 0.9 : 1.0);
        this.w = Math.round(30 * sizeMult);
        this.h = Math.round(30 * sizeMult);
    }

    update(playerX, playerY) {
        if (this.hp <= 0) return false;

        if (this.invincible > 0) this.invincible--;
        if (this.attackCooldown > 0) this.attackCooldown--;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Top-down AI behavior
        if (this.state === 'hurt') {
            this.vx *= 0.95;
            this.vy *= 0.95;

            // Smash against wall logic
            if (window.game && window.game.tank) {
                const bounds = window.game.tank.getBounds();
                if (this.x <= bounds.left || this.x + this.w >= bounds.right ||
                    this.y <= bounds.top || this.y + this.h >= bounds.bottom) {
                    if (Math.abs(this.vx) > 3 || Math.abs(this.vy) > 3) {
                        this.hp = 0;
                        window.game.sound.play('destroy');
                        window.game.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, '#E74C3C', 8);
                        const deck = (window.game && window.game.saveData && window.game.saveData.deck) || ['rock'];
                        const ammoType = deck[Math.floor(Math.random() * deck.length)];
                        window.game.ammoDropper.spawnSpecificItem(this.x + this.w / 2, this.y + this.h / 2, ammoType);
                        return false;
                    }
                }
            }

            if (Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
                this.state = 'chase';
                this.invincible = 30;
            }
        } else if (dist < 400) {
            this.state = 'chase';
            const angle = Math.atan2(dy, dx);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            this.dir = this.vx > 0 ? 1 : -1;
        } else {
            this.state = 'idle';
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        // Apply movement with Sliding Collision resolution
        const oldX = this.x;
        const oldY = this.y;

        // X軸移動・衝突解決
        this.x += this.vx;
        let collideX = false;
        for (const p of this.platforms) {
            if (this.x + this.w > p.x && this.x < p.x + p.w &&
                this.y + this.h > p.y && this.y < p.y + p.h) {
                collideX = true; break;
            }
        }
        if (window.game && window.game.tank) {
            const b = window.game.tank.getBounds();
            if (this.x < b.left || this.x + this.w > b.right) collideX = true;
        }
        if (collideX) {
            this.x = oldX; // X衝突を先に解決してからY移動に進む
        }

        // Y軸移動・衝突解決
        this.y += this.vy;
        let collideY = false;
        for (const p of this.platforms) {
            if (this.x + this.w > p.x && this.x < p.x + p.w &&
                this.y + this.h > p.y && this.y < p.y + p.h) {
                collideY = true; break;
            }
        }
        if (window.game && window.game.tank) {
            const b = window.game.tank.getBounds();
            if (this.y < b.top || this.y + this.h > b.bottom) collideY = true;
        }

        // SLIDING（壁沿いに滑る）
        if (collideX) {
            if (this.state === 'chase' && !collideY) {
                this.y += (playerY > this.y + this.h / 2) ? 1.5 : -1.5;
            }
        }
        if (collideY) {
            this.y = oldY;
            // Bug ⑧ fix: collideX（X軸の古いフラグ）ではなく現在のX境界状態で判定
            const blockedX = window.game?.tank
                ? (this.x <= window.game.tank.getBounds().left || this.x + this.w >= window.game.tank.getBounds().right)
                : false;
            if (this.state === 'chase' && !blockedX) {
                this.x += (playerX > this.x + this.w / 2) ? 1.5 : -1.5;
            }
        }

        // Simple Attack AI
        if (this.attackCooldown <= 0 && dist < 120 && this.state !== 'hurt') {
            this.attackCooldown = 120; // Slower (from 80)
            // Tackle toward player
            const angle = Math.atan2(dy, dx);
            this.vx = Math.cos(angle) * 8;
            this.vy = Math.sin(angle) * 8;
            if (window.game) window.game.particles.enemyAttack(this.x + this.w / 2, this.y + this.h / 2);
        }

        return true;
    }

    takeHit(dmg, pushDirX, pushDirY = 0) {
        if (this.invincible > 0) return;
        this.hp -= dmg;
        this.invincible = 20;
        this.state = 'hurt';
        this.vx = (pushDirX || 0) * 8;
        this.vy = (pushDirY || 0) * 8;

        if (window.game) {
            window.game.sound.play('hit');
            window.game.particles.hit(this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    takeDamage(dmg) {
        this.takeHit(dmg, (Math.random() - 0.5), (Math.random() - 0.5));
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    draw(ctx) {
        if (this.hp <= 0) return;

        const f = this.fusion || DEFENDER_FUSIONS[0];
        const hw = this.w / 2, hh = this.h / 2;

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

        // ★バグ修正: 点滅をやめて半透明表示に変更（プレイヤーと統一）
        if (this.invincible > 0) {
            ctx.globalAlpha = 0.4;
        }

        // Orientation
        ctx.scale(this.dir, 1);

        // 翼(合成タイプにより追加) — 本体より先に描いて背後に見せる
        if (f.wings) {
            ctx.fillStyle = f.secondary;
            ctx.globalAlpha *= 0.85;
            ctx.beginPath();
            ctx.moveTo(-hw * 0.3, -hh * 0.2);
            ctx.quadraticCurveTo(-hw * 1.6, -hh * 0.6, -hw * 1.4, hh * 0.4);
            ctx.quadraticCurveTo(-hw * 0.8, hh * 0.1, -hw * 0.3, hh * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = (this.invincible > 0) ? 0.4 : 1;
        }

        // Slime Body (Spiky/Soldier helmet look) — 合成タイプのメインカラー
        ctx.fillStyle = f.primary;
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.quadraticCurveTo(hw, -hh * 0.33, hw, hh);
        ctx.lineTo(-hw, hh);
        ctx.quadraticCurveTo(-hw, -hh * 0.33, 0, -hh);
        ctx.fill();

        // Helmet / Armor — 合成タイプのサブカラー
        ctx.fillStyle = f.secondary;
        ctx.fillRect(-hw * 1.07, -hh * 0.8, hw * 2.13, hh * 0.4);
        ctx.fillRect(-hw * 0.33, -hh * 1.2, hw * 0.67, hh * 0.4); // Spike

        // 角(合成タイプにより追加)
        if (f.horn) {
            ctx.fillStyle = f.accent;
            ctx.beginPath();
            ctx.moveTo(-hw * 0.6, -hh * 1.15);
            ctx.lineTo(-hw * 0.2, -hh * 1.9);
            ctx.lineTo(-hw * 0.05, -hh * 1.15);
            ctx.closePath();
            ctx.fill();
        }

        // Eyes (Angry) — 合成タイプのアクセントカラー
        ctx.fillStyle = f.accent;
        ctx.beginPath();
        ctx.moveTo(hw * 0.33, -hh * 0.13); ctx.lineTo(hw * 0.8, hh * 0.13); ctx.lineTo(hw * 0.8, hh * 0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-hw * 0.13, hh * 0.13); ctx.lineTo(hw * 0.33, hh * 0.4); ctx.lineTo(hw * 0.33, hh * 0.13); ctx.closePath(); ctx.fill();

        // Weapon — 合成タイプごとに武器の形を変える
        ctx.fillStyle = '#BDC3C7';
        switch (f.weapon) {
            case 'blade': // 忍者刀っぽい細長い刃
                ctx.save();
                ctx.rotate(-0.3);
                ctx.fillRect(hw * 0.5, hh * 0.1, hw * 1.6, hh * 0.15);
                ctx.fillStyle = f.secondary;
                ctx.fillRect(hw * 0.4, hh * 0.02, hw * 0.25, hh * 0.3);
                ctx.restore();
                break;
            case 'claw': // ファントムの鉤爪
                ctx.strokeStyle = f.accent;
                ctx.lineWidth = Math.max(2, hw * 0.12);
                ctx.beginPath();
                ctx.moveTo(hw * 0.5, hh * 0.1); ctx.lineTo(hw * 1.3, -hh * 0.2);
                ctx.moveTo(hw * 0.5, hh * 0.3); ctx.lineTo(hw * 1.35, hh * 0.15);
                ctx.moveTo(hw * 0.5, hh * 0.5); ctx.lineTo(hw * 1.3, hh * 0.55);
                ctx.stroke();
                break;
            case 'hammer': // 鬼将軍の大槌
                ctx.fillRect(hw * 0.4, hh * 0.15, hw * 1.1, hh * 0.15);
                ctx.fillStyle = f.secondary;
                ctx.fillRect(hw * 1.3, -hh * 0.15, hw * 0.55, hh * 0.6);
                break;
            case 'orb': // 魔導ゴーストの浮遊球
                ctx.fillStyle = f.accent;
                ctx.globalAlpha *= 0.9;
                ctx.beginPath();
                ctx.arc(hw * 1.4, -hh * 0.1, hw * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = (this.invincible > 0) ? 0.4 : 1;
                break;
            default: // spear (ベースのスライム兵)
                ctx.fillRect(hw * 0.33, hh * 0.17, hw * 0.67, hh * 0.13);
        }

        ctx.restore();

        // 被弾済みなら頭上に簡易HPバー（合成タイプによる体力差を可視化）
        if (this.hp < this.maxHp) {
            ctx.save();
            const bw = this.w * 0.9, bh = 4;
            const bx = this.x + (this.w - bw) / 2, by = this.y - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = f.accent;
            ctx.fillRect(bx, by, bw * Math.max(0, this.hp / this.maxHp), bh);
            ctx.restore();
        }
    }
}
window.DefenderSlime = DefenderSlime;
