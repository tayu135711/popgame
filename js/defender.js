// ======================================
// DEFENDER - Enemy Inside Tank
// ======================================
class DefenderSlime {
    constructor(x, y, platforms) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.vx = 0;
        this.vy = 0;
        this.platforms = platforms; // Reference to tank platforms
        this.dir = 1; // 1: Right, -1: Left
        this.state = 'idle'; // idle, chase, attack, hurt
        this.hp = 20; // 2 hits (nerfed from 30)
        this.invincible = 0;
        this.attackCooldown = 0;
        this.speed = 1.6; // 🔧 移動速度20%ダウン調整
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
                        window.game.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, '#E74C3C', 10);
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

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

        // ★バグ修正: 点滅をやめて半透明表示に変更（プレイヤーと統一）
        if (this.invincible > 0) {
            ctx.globalAlpha = 0.4;
        }

        // Orientation
        ctx.scale(this.dir, 1);

        // Slime Body (Spiky/Soldier helmet look)
        ctx.fillStyle = '#E74C3C'; // Enemy Red
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.quadraticCurveTo(15, -5, 15, 15);
        ctx.lineTo(-15, 15);
        ctx.quadraticCurveTo(-15, -5, 0, -15);
        ctx.fill();

        // Helmet / Armor
        ctx.fillStyle = '#333';
        ctx.fillRect(-16, -12, 32, 6);
        ctx.fillRect(-5, -18, 10, 6); // Spike

        // Eyes (Angry)
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.moveTo(5, -2); ctx.lineTo(12, 2); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-2, 2); ctx.lineTo(5, 6); ctx.lineTo(5, 2); ctx.closePath(); ctx.fill();

        // Spear/Weapon
        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(10, 5, 20, 4);

        ctx.restore();
    }
}
window.DefenderSlime = DefenderSlime;
