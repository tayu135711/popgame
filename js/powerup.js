// ======================================
// POWERUP - Powerup System
// ======================================
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 24;
        this.type = type; // Key from CONFIG.POWERUP
        this.lifespan = 600; // 10 seconds to pick up
        this.animation = Math.random() * 100;

        this.data = CONFIG.POWERUP[type];
    }

    update() {
        this.animation++;
        this.lifespan--;

        // Gentle vertical bobbing
        this.bobOffset = Math.sin(this.animation * 0.05) * 3;
    }

    draw(ctx) {
        if (this.lifespan <= 0) return;
        if (!this.data) return; // データ未定義ならスキップ（クラッシュ防止）

        // Fade out when about to expire
        let alpha = 1.0;
        if (this.lifespan < 120) {
            alpha = this.lifespan / 120;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow effect

        // Draw background circle
        ctx.fillStyle = this.data.color;
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h/2 + this.bobOffset, this.w/2 + 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h/2 + this.bobOffset, this.w/2, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.icon, this.x + this.w/2, this.y + this.h/2 + this.bobOffset);

        ctx.restore();
    }

    checkCollision(entity) {
        const dx = (this.x + this.w/2) - (entity.x + entity.w/2);
        const dy = (this.y + this.h/2) - (entity.y + entity.h/2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (this.w/2 + entity.w/2 + 5);
    }
}

class PowerupManager {
    constructor() {
        this.active = []; // Currently active powerups
        this.playerEffects = {}; // Player active effects
    }

    spawnRandomPowerup(x, y) {
        const types = Object.keys(CONFIG.POWERUP);
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.active.push(new Powerup(x, y, randomType));
    }

    update() {
        // ★バグ修正: filter()は毎フレーム新配列を生成しGCを増やす。インプレース処理に変更。
        let wi = 0;
        for (let i = 0; i < this.active.length; i++) {
            this.active[i].update();
            if (this.active[i].lifespan > 0) {
                this.active[wi++] = this.active[i];
            }
        }
        this.active.length = wi;

        // Update player effects
        for (let effect in this.playerEffects) {
            this.playerEffects[effect].duration--;
            if (this.playerEffects[effect].duration <= 0) {
                delete this.playerEffects[effect];
            }
        }
    }

    applyPowerup(player, type) {
        const config = CONFIG.POWERUP[type];

        if (!config) return;

        // Bug ⑨ fix: duration===0のエフェクトはplayerEffectsに追加しない（即時効果のみ）
        // これにより次フレームで即削除されるゴーストエフェクトを防ぐ
        if (config.duration === 0 && type !== 'HEAL') return;

        switch (type) {
            case 'DOUBLE_AMMO':
                this.playerEffects.doubleAmmo = {
                    duration: config.duration,
                    multiplier: 2
                };
                if (window.game) window.game.sound.play('heal');
                break;

            case 'SHIELD':
                this.playerEffects.shield = {
                    duration: config.duration,
                    absorption: config.absorption,
                    absorbed: 0
                };
                if (window.game) window.game.sound.play('heal');
                break;

            case 'SLOW_TIME':
                this.playerEffects.slowTime = {
                    duration: config.duration,
                    slowFactor: config.slowFactor
                };
                if (window.game) window.game.sound.play('heal');
                break;

            case 'SPEED_UP':
                this.playerEffects.speedUp = {
                    duration: config.duration,
                    speedMult: config.speedMult
                };
                if (window.game) window.game.sound.play('heal');
                break;

            case 'HEAL': {
                const healAmount = config.healAmount;
                player.hp = Math.min(player.hp + healAmount, player.maxHp);
                if (window.game) {
                    window.game.sound.play('heal');
                    window.game.particles.heal(player.x + player.w/2, player.y + player.h/2);
                }
                break;
            }
        }
    }

    draw(ctx) {
        this.active.forEach(p => p.draw(ctx));
    }

    getActiveEffectNames() {
        return Object.keys(this.playerEffects);
    }

    hasEffect(effectType) {
        return this.playerEffects.hasOwnProperty(effectType);
    }

    getEffectValue(effectType, property) {
        if (this.playerEffects[effectType]) {
            return this.playerEffects[effectType][property];
        }
        return null;
    }

    clear() {
        this.active = [];
        this.playerEffects = {};
    }
}
