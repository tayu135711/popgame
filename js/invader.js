// ======================================
// INVADER - Enemy Leader Invasion AI
// ======================================
class InvaderAI {
    constructor(x, y, platforms, targetCore, type) {
        this.x = x;
        this.y = y;
        this.w = 20;
        this.h = 20;
        this.vx = 0;
        this.vy = 0;
        this.platforms = platforms;
        this.targetCore = targetCore;
        this.type = type || 'NORMAL';

        this.hp = 200; // バランス調整: 500 → 200
        this.maxHp = 200;
        this.speed = 2.0;
        this.color = CONFIG.COLORS.BOSS;

        // TRUE BOSS Logic
        if (this.type === 'TRUE_BOSS') {
            this.hp = 800; // バランス調整: 2000 → 800
            this.maxHp = 800;
            this.speed = 3.0;
            this.color = '#4A148C'; // Darkest Purple
            this.w = 32;
            this.h = 32;
        }
        else if (this.type === 'SPEED') {
            this.hp = 120; // バランス調整: 350 → 120
            this.maxHp = 120;
            this.speed = 4.0;
            this.color = '#00FFFF'; // Cyan
        }
        else if (this.type === 'POWER') {
            this.hp = 350; // バランス調整: 800 → 350
            this.maxHp = 350;
            this.speed = 1.5;
            this.color = '#5D4037'; // Brown
            this.w = 30; this.h = 30;
        }
        else if (this.type === 'NINJA') {
            this.hp = 160; // バランス調整: 400 → 160
            this.maxHp = 160;
            this.speed = 3.5;
            this.color = '#212121'; // Black
        }

        this.state = 'fall'; // fall, move_to_core, attack_core, attack_player, hurt
        this.dir = -1;
        this.invincible = 0;
        this.attackCooldown = 0;

        // Visuals
        this.frame = 0;
    }

    update(player) {
        if (this.hp <= 0) return false; // Defeated
        if (!this.targetCore) return true; // Safety: No core to attack, just idle or wander?

        // Don't target dead/respawning player
        const isPlayerDead = player.hp <= 0;

        this.frame++;
        if (this.invincible > 0) this.invincible--;
        if (this.attackCooldown > 0) this.attackCooldown--;

        const core = this.targetCore;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        // State Machine
        switch (this.state) {
            case 'fall':
                this.state = 'move_to_core'; // Just transition immediately in top-down
                break;
            case 'move_to_core': {
                const coreX = core.x + core.w / 2;
                const coreY = core.y + core.h / 2;
                const dxToCore = coreX - cx;
                const dyToCore = coreY - cy;

                if (Math.abs(dxToCore) < 40 && Math.abs(dyToCore) < 40) {
                    this.state = 'attack_core';
                    this.vx = 0;
                    this.vy = 0;
                } else {
                    const toDist = Math.sqrt(dxToCore * dxToCore + dyToCore * dyToCore) || 1;
                    this.vx = (dxToCore / toDist) * this.speed;
                    this.vy = (dyToCore / toDist) * this.speed;
                    this.dir = this.vx > 0 ? 1 : -1;
                }

                // プレイヤーが近くにいて生存中なら追跡に切り替え
                const pdx = (player.x + player.w / 2) - cx;
                const pdy = (player.y + player.h / 2) - cy;
                const distToPlayerSq = pdx * pdx + pdy * pdy;
                if (!isPlayerDead && distToPlayerSq < 10000 && Math.random() < 0.05) {
                    this.state = 'attack_player';
                    this.attackCooldown = 60;
                }
                break;
            }

            case 'attack_core':
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = 120; // Slower (90 -> 120)
                    if (window.game) {
                        window.game.tank.engineCore.hp = Math.max(0, window.game.tank.engineCore.hp - 8);
                        window.game.sound.play('confirm');
                        window.game.particles.enemyAttack(cx, cy); // Added effect
                        window.game.particles.explosion(core.x + core.w / 2, core.y + core.h / 2, '#F00', 8);
                    }
                }
                if (Math.abs((core.x + core.w / 2) - cx) > 60 || Math.abs((core.y + core.h / 2) - cy) > 60) {
                    this.state = 'move_to_core';
                }
                break;

            case 'attack_player': {
                // Bug Fix: プレイヤーが死んでいたらコアを目指す
                if (isPlayerDead) {
                    this.state = 'move_to_core';
                    break;
                }
                const pdxP = (player.x + player.w / 2) - cx;
                const pdyP = (player.y + player.h / 2) - cy;
                const distPSq = pdxP * pdxP + pdyP * pdyP;
                this.dir = pdxP > 0 ? 1 : -1;

                if (distPSq < 1600) { // 40² = 1600
                    if (this.attackCooldown <= 0) {
                        this.attackCooldown = 90;
                        const angle = Math.atan2(pdyP, pdxP);
                        this.vx = Math.cos(angle) * 5;
                        this.vy = Math.sin(angle) * 5;
                        if (window.game) window.game.particles.enemyAttack(cx, cy);
                    } else {
                        this.vx *= 0.9;
                        this.vy *= 0.9;
                    }
                } else {
                    const chaseLen = Math.sqrt(distPSq) || 1;
                    this.vx = (pdxP / chaseLen) * (this.speed * 1.5);
                    this.vy = (pdyP / chaseLen) * (this.speed * 1.5);
                }

                if (distPSq > 62500 || Math.random() < 0.01) {
                    this.state = 'move_to_core';
                }
                break;
            }

            case 'hurt':
                this.vx *= 0.92;
                this.vy *= 0.92;
                if (Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
                    this.state = 'move_to_core';
                    this.invincible = 40;
                }
                break;
        }

        // Apply velocity with Shared Physics
        // Note: Invader has custom sliding behavior, we handle it after update
        const platforms = this.platforms;
        const bounds = (window.game && window.game.tank) ? window.game.tank.getBounds() : null;

        const result = Physics.update(this, platforms, bounds);

        // EXTRA: Wall Bounce for High Knockback
        if (bounds) {
            if (this.x < bounds.left) {
                this.x = bounds.left;
                this.vx *= -0.6; // Bounce with energy loss
                this.dir = 1;
            } else if (this.x + this.w > bounds.right) {
                this.x = bounds.right - this.w;
                this.vx *= -0.6;
                this.dir = -1;
            }
        }

        // 3. Sliding / Avoidance (Custom AI behavior)
        const target = (this.state === 'attack_player') ? player : this.targetCore;

        if (result.collidedX) {
            // Sliding Y if blocked X
            if (target && !result.collidedY) {
                const ty = target.y + (target.h / 2 || 0);
                this.y += (ty > this.y + this.h / 2) ? 1.5 : -1.5;
            }
        }
        if (result.collidedY) {
            // Sliding X if blocked Y
            if (target && !result.collidedX) {
                const tx = target.x + (target.w / 2 || 0);
                this.x += (tx > this.x + this.w / 2) ? 1.5 : -1.5;
            }
        }

        // Calculate distance to player for collision check
        const dx = (player.x + player.w / 2) - cx;
        const dy = (player.y + player.h / 2) - cy;

        // Collision with Player (Attack)
        // Fix: disable damage if moving too fast (being knocked back)
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30 && this.state !== 'hurt' && Math.abs(this.vx) < 5) {
            const damage = this.type === 'TRUE_BOSS' ? 40 : 
                          this.type === 'POWER' ? 30 : 
                          this.type === 'NINJA' ? 25 : 20; // 大幅強化！
            player.takeDamage(damage, cx, cy, 10);
        }

        return true;
    }

    takeDamage(amount, knockbackDir) {
        if (this.invincible > 0) return;
        this.hp -= amount;
        this.invincible = 20;
        this.state = 'hurt';
        this.vx = (knockbackDir || 0) * 6;
        this.vy = 0; // Boss just slides back in top-down
        if (window.game) window.game.sound.play('boss_hit'); // Need sound
    }

    draw(ctx) {
        // Draw Boss Slime (Bigger, Crown?)
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        // ★バグ修正: /2 は30fps相当のちかちかになる。/6 に変更
        if (this.invincible > 0 && Math.floor(this.frame / 6) % 2) ctx.globalAlpha = 0.5;

        ctx.scale(this.dir, 1);

        // Body
        ctx.fillStyle = this.color;
        const rw = this.w / 2;
        const rh = this.h / 2;

        ctx.beginPath();
        ctx.moveTo(-rw, rh);
        ctx.quadraticCurveTo(-rw, -rh, 0, -rh);
        ctx.quadraticCurveTo(rw, -rh, rw, rh);
        ctx.fill();

        // Crown / Accessories based on Type
        if (this.type === 'TRUE_BOSS') {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(-rw * 0.6, -rh * 0.9);
            ctx.lineTo(-rw * 0.4, -rh * 1.5);
            ctx.lineTo(0, -rh);
            ctx.lineTo(rw * 0.4, -rh * 1.5);
            ctx.lineTo(rw * 0.6, -rh * 0.9);
            ctx.fill();
        } else if (this.type === 'NINJA') {
            // Ninja Scarf
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(0, -rh * 0.5);
            ctx.lineTo(rw * 1.5, -rh * 0.5 - Math.sin(this.frame * 0.2) * 5);
            ctx.lineTo(rw * 1.5, -rh * 0.5 + 5 - Math.sin(this.frame * 0.2) * 5);
            ctx.fill();
        } else if (this.type === 'POWER') {
            // Spikes
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(-rw * 0.8, -rh * 0.5); ctx.lineTo(-rw * 1.2, -rh * 1.2); ctx.lineTo(-rw * 0.4, -rh * 0.8); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(rw * 0.8, -rh * 0.5); ctx.lineTo(rw * 1.2, -rh * 1.2); ctx.lineTo(rw * 0.4, -rh * 0.8); ctx.fill();
        }

        // Face
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(rw * 0.3, -rh * 0.3, rw * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(rw * 0.35, -rh * 0.3, rw * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar (Mini)
        ctx.fillStyle = '#333';
        ctx.fillRect(-rw, -rh * 1.8, this.w, 4);
        ctx.fillStyle = '#F00';
        ctx.fillRect(-rw, -rh * 1.8, this.w * (Math.max(0, this.hp) / this.maxHp), 4);

        ctx.restore();
    }
}

window.InvaderAI = InvaderAI;
