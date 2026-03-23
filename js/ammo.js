// ======================================
// AMMO - Items & Cannon System
// ======================================

// Ammo item on the ground
class AmmoItem {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.w = 20; // 距離計算のためにサイズが必要
        this.h = 20;
        this.type = type;
        this.vy = 0;
        this.grounded = false;
        this.collected = false;
    }
    update(platforms) {
        if (this.collected || this.grounded) return;
        // In top-down, items just fall from the chute and land on the floor immediately
        // (Visual gravity is fine, but logical collision should be simple)
        this.grounded = true;
    }
    draw(ctx) {
        if (this.collected) return;
        Renderer.drawAmmoItem(ctx, this);
    }
}

// Cannon system
class Cannon {
    constructor(x, y, w, h, dir) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.dir = dir; // 1 = right, -1 = left
        this.loaded = false;
        this.ammoType = null;
        this.damageMultiplier = 1;
        this.loadTimer = 0;
        this.fireFlash = 0;
        this.cooldown = 0;
    }
    load(ammoType, multiplier = 1) {
        if (this.loaded) return false;
        this.loaded = true;
        this.ammoType = (typeof ammoType === 'object') ? ammoType.type : ammoType;
        this.damageMultiplier = multiplier || 1;
        this.loadTimer = CONFIG.CANNON.LOAD_TIME;
        return true;
    }
    update() {
        if (this.fireFlash > 0) this.fireFlash--;
        if (this.cooldown > 0) this.cooldown--;
        if (this.loaded && this.loadTimer > 0) {
            // ターボパーツ効果中は装填速度2倍
            const turboActive = window.game && window.game.battle && window.game.battle.turboBoostTimer > 0;
            this.loadTimer -= turboActive ? 2 : 1;
            if (this.loadTimer <= 0) {
                return this.fire();
            }
        }
        return null;
    }
    fire() {
        if (!this.loaded) return null;
        const type = this.ammoType;
        const mult = this.damageMultiplier || 1;

        this.loaded = false;
        this.ammoType = null;
        this.damageMultiplier = 1; // Reset
        this.fireFlash = 12;
        this.cooldown = 30;

        if (window.game) {
            // Pitch down for heavy shots
            const rate = mult > 1.5 ? 0.8 : 1.0;
            window.game.sound.play('cannon', rate);

            const pSize = mult > 1.5 ? 2 : 1;
            window.game.particles.cannonFire(
                this.x + (this.dir > 0 ? this.w + 15 : -15),
                this.y + this.h / 2,
                pSize
            );
        }
        return {
            type,
            x: this.x + this.w / 2,
            y: this.y + this.h / 2,
            dir: this.dir,
            damageMultiplier: mult
        };
    }
    takeDamage(amount) {
        // Apply damage to the main tank HP if this is an enemy cannon
        if (window.game && window.game.battle && window.game.battle.enemyTankHP > 0) {
            window.game.battle.enemyTankHP -= amount;

            // Visual feedback
            window.game.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, '#FF5722', 5);
            window.game.sound.play('damage');
        }
    }

    draw(ctx) {
        const loadProg = this.loaded ? Math.max(0, 1 - this.loadTimer / Math.max(1, CONFIG.CANNON.LOAD_TIME)) : 0;

        if (this.loaded && this.damageMultiplier > 1) {
            ctx.save();
            // パワーアップ時の輝きエフェクト（将来拡張用）
            Renderer.drawCannon(ctx, this.x, this.y, this.w, this.h, this.dir, this.loaded, loadProg);
            ctx.restore();
        } else {
            Renderer.drawCannon(ctx, this.x, this.y, this.w, this.h, this.dir, this.loaded, loadProg);
        }

        // "LOAD" hint
        if (!this.loaded && this.cooldown <= 0) {
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillText('▲ Z で装填', this.x + this.w / 2 + 1, this.y - 7); // Shadow
            ctx.fillStyle = '#FFF';
            ctx.fillText('▲ Z で装填', this.x + this.w / 2, this.y - 8);
        }
    }
}

// Ammo drop manager
class AmmoDropper {
    constructor(dropRateMult = 1.0) {
        this.timer = 60;
        this.items = [];
        this.dropRateMult = dropRateMult; // 難易度によるドロップ率倍率
    }
    update(platforms, dropX, dropY, dropW) {
        this.timer--;
        if (this.timer <= 0) {
            // 難易度でインターバルを変える: EASY(1.2)→短い, HARD(0.85)→長い
            const baseInterval = Math.max(30, 80 - Math.random() * 40);
            this.timer = Math.round(baseInterval / this.dropRateMult);

            // 1. Emergency Support (Water for fires)
            let type = 'rock';
            let isFireEmergency = false;
            if (window.game && window.game.tank && window.game.tank.fires && window.game.tank.fires.length > 0) {
                isFireEmergency = true;
            }

            if (isFireEmergency && Math.random() < 0.4) {
                type = 'water_bucket';
            } else {
                // 2. Deck-based Selection (Main Ammo)
                const deck = (window.game && window.game.saveData && window.game.saveData.deck) || ['rock'];

                // Select strictly from deck
                const candidate = deck[Math.floor(Math.random() * deck.length)];
                type = (candidate && CONFIG.AMMO_TYPES[candidate]) ? candidate : 'rock';
            }

            // ★バグ修正: filter()で新配列を作らずカウントだけする
            let activeCount = 0;
            for (let _i = 0; _i < this.items.length; _i++) {
                if (!this.items[_i].collected) activeCount++;
            }
            if (activeCount < CONFIG.AMMO.MAX_ON_FLOOR) {
                this.spawnItem(dropX, dropY, dropW, type);
            }
        }
        for (const item of this.items) item.update(platforms);
        // ★バグ修正: filter()は毎フレーム新配列を生成しGCを増やす。インプレース処理に変更。
        let wi = 0;
        for (let i = 0; i < this.items.length; i++) {
            if (!this.items[i].collected) this.items[wi++] = this.items[i];
        }
        this.items.length = wi;
    }
    spawnItem(dropX, dropY, dropW, type) {
        // Validation to prevent Nan
        const dx = (isFinite(dropX)) ? dropX : 100;
        const dw = (isFinite(dropW)) ? dropW : 300;
        const dy = (isFinite(dropY)) ? dropY : 100;

        // ★3箇所からランダムにドロップ（左上・右上・右下）
        const dropSide = Math.floor(Math.random() * 3);
        let x, y;
        if (dropSide === 0) {
            // 左上エリア（元の左側）
            x = dx + Math.random() * (dw * 0.4);
            y = dy + Math.random() * 20;
        } else if (dropSide === 1) {
            // 右上エリア
            x = dx + dw * 0.6 + Math.random() * (dw * 0.4);
            y = dy + Math.random() * 20;
        } else {
            // ★左下エリア（新しい補充口）
            const T = CONFIG.TANK;
            const wall = T.WALL_THICKNESS;
            const innerLeft = T.OFFSET_X + wall;
            const innerBottom = T.OFFSET_Y + T.INTERIOR_H - wall;
            x = innerLeft + 60 + Math.random() * 80;
            y = innerBottom - 70 + Math.random() * 30;
        }
        this.items.push(new AmmoItem(x, y, type));
    }

    spawnSpecificItem(x, y, type) {
        this.items.push(new AmmoItem(x, y, type));
    }

    draw(ctx) {
        for (const item of this.items) item.draw(ctx);
    }
    clear() { this.items = []; this.timer = 60; }
}

window.AmmoItem = AmmoItem;
window.Cannon = Cannon;
window.AmmoDropper = AmmoDropper;
