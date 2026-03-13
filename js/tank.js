// ======================================
// TANK - Tank Interior Layout
// ======================================

// ======================================
// LASER - Laser Trap
// ======================================
class Laser {
    constructor(x1, y1, x2, y2, interval = 180) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.active = true;
        this.interval = interval; // ON/OFFの間隔（フレーム）
        this.timer = 0;
    }

    update() {
        this.timer++;
        if (this.timer >= this.interval) {
            this.active = !this.active;
            this.timer = 0;
            if (this.active && window.game) {
                window.game.sound.play('laser');
            }
        }
    }

    checkCollision(entity) {
        if (!this.active) return false;

        // エンティティの中心座標
        const px = entity.x + entity.w / 2;
        const py = entity.y + entity.h / 2;

        // 線分との最短距離を計算
        const A = px - this.x1;
        const B = py - this.y1;
        const C = this.x2 - this.x1;
        const D = this.y2 - this.y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        const param = dot / len_sq;

        let xx, yy;
        if (param < 0) {
            xx = this.x1;
            yy = this.y1;
        } else if (param > 1) {
            xx = this.x2;
            yy = this.y2;
        } else {
            xx = this.x1 + param * C;
            yy = this.y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist < 15; // レーザーの判定半径
    }

    draw(ctx) {
        ctx.save();

        if (!this.active) {
            // 非アクティブ時（点滅予告）
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
        } else {
            // アクティブ時

            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();

        ctx.restore();
    }
}

class Fire {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.timer = 0;
        this.frameOffset = Math.random() * 100;
        // Floor is determined by Y position in simple mode
    }

    update(player) {
        this.timer++;

        // Fire LIFETIME: 火が時間経過で消滅
        if (this.timer > CONFIG.FIRE.LIFETIME) {
            return false; // Fire dies out
        }

        // Water bucket で火を消す
        if (player.heldItems && player.heldItems[0] === 'water_bucket') {
            const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
            const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONFIG.FIRE.EXTINGUISH_DIST) {
                if (window.game) {
                    window.game.sound.play('confirm');
                    window.game.particles.damageNum(this.x, this.y - 20, 'しゅっ！', '#4FC3F7');
                }
                return false; // Fire extinguished
            }
        }

        // Damage player if touching (invincible > 0 のときは無敵なのでダメージなし)
        if (player.invincible <= 0) {
            const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
            const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
            if (Math.abs(dx) < 35 && Math.abs(dy) < 35) {
                player.takeDamage(10, this.x + this.w / 2, this.y + this.h / 2, 6);
                if (window.game) window.game.sound.play('damage');
            }
        }
        return true; // Keep alive
    }

    draw(ctx) {
        ctx.save();
        const f = window.game ? window.game.frame : 0;
        const bounce = Math.sin((f + this.frameOffset) * 0.2) * 5;
        const scale = 1 + Math.sin((f + this.frameOffset) * 0.1) * 0.1;

        ctx.translate(this.x + this.w / 2, this.y + this.h);
        ctx.scale(scale, scale);

        // Glow

        // Core
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15, -10, 0, -35 + bounce);
        ctx.quadraticCurveTo(-15, -10, 0, 0);
        ctx.fill();

        // Outer
        ctx.fillStyle = '#FF5722';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(25, -5, 0, -45 + bounce);
        ctx.quadraticCurveTo(-25, -5, 0, 5);
        ctx.fill();

        ctx.restore();
    }
}

class TankInterior {
    constructor(isEnemy = false, tankType = 'NORMAL', invasionConfig = null) {
        this.isEnemy = isEnemy;
        this.tankType = tankType;
        this.invasionConfig = invasionConfig || { switches: 2, defenders: 2, lasers: 0 };

        const T = CONFIG.TANK;
        const ox = T.OFFSET_X + T.WALL_THICKNESS;
        const oy = T.OFFSET_Y + T.WALL_THICKNESS;
        const iw = T.INTERIOR_W - T.WALL_THICKNESS * 2;
        const ih = T.INTERIOR_H - T.WALL_THICKNESS * 2;

        // 2 Floors Concept (Split by middle Y)
        const midY = oy + ih / 2;

        this.platforms = [];

        // Cannons - 2 cannons (Top and Bottom)
        const cDir = isEnemy ? -1 : 1;
        const cannonX = ox + iw - 80;
        this.cannons = [
            new Cannon(cannonX, oy + 40, 70, 50, cDir),          // Top cannon
            new Cannon(cannonX, oy + ih - 90, 70, 50, cDir),     // Bottom cannon
        ];

        // Ammo Drop (2F)
        this.dropX = ox + 40;
        this.dropY = oy + 40;
        this.dropW = 120;

        // Engine Core (1F)
        this.engineCore = {
            x: ox + iw / 2 - 25,
            y: oy + ih - 60,
            w: 50, h: 50,
            hp: CONFIG.ENGINE_CORE.HP,
            maxHp: CONFIG.ENGINE_CORE.HP,
            visible: true,
            shockwaveTimer: 0,
            shockwaveActive: false,
            shockwaveRadius: 0,
            locked: isEnemy
        };

        this.switches = [];
        if (isEnemy) {
            // Generate switches based on invasionConfig
            const numSwitches = this.invasionConfig.switches;
            const switchPositions = this.generateSwitchPositions(numSwitches, ox, oy, iw, ih, midY);
            const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

            for (let i = 0; i < numSwitches; i++) {
                const pos = switchPositions[i];
                this.switches.push({
                    x: pos.x,
                    y: pos.y,
                    w: 30,
                    h: 30,
                    activated: false,
                    type: 'unlock',
                    label: labels[i]
                });
            }
            this.engineCore.locked = true;
        } else {
            this.engineCore.visible = false;
            this.engineCore.locked = false;
        }

        this.defenders = [];
        this.spawnTimer = 0;
        this.lasers = [];

        // Generate lasers based on invasionConfig
        if (isEnemy && this.invasionConfig.lasers > 0) {
            const numLasers = this.invasionConfig.lasers;

            // Laser 1: Horizontal (1F)
            if (numLasers >= 1) {
                this.lasers.push(new Laser(ox + 20, oy + ih - 120, ox + iw - 20, oy + ih - 120, 120));
            }

            // Laser 2: Horizontal (2F upper)
            if (numLasers >= 2) {
                this.lasers.push(new Laser(ox + 20, oy + 80, ox + iw - 20, oy + 80, 150));
            }

            // Laser 3: Vertical (Middle)
            if (numLasers >= 3) {
                this.lasers.push(new Laser(ox + iw / 2, oy + 50, ox + iw / 2, oy + ih - 80, 100));
            }
        }

        this.fires = [];

        this._bounds = {
            left: ox + 5,
            right: ox + iw - 5,
            top: oy + 5,
            bottom: oy + ih - 5,
        };
    }

    getBounds() { return this._bounds; }

    checkWallCollision(obj) {
        for (const p of this.platforms) {
            if (obj.x + obj.w > p.x && obj.x < p.x + p.w &&
                obj.y + obj.h > p.y && obj.y < p.y + p.h) return true;
        }
        return false;
    }

    update(player) {
        const fired = this.updateCannons();

        // Update Engine Defense
        if (this.engineCore.visible && this.isEnemy) {
            const ec = this.engineCore;
            if (ec.shockwaveActive) {
                ec.shockwaveRadius += 5;
                if (ec.shockwaveRadius > 150) {
                    ec.shockwaveActive = false;
                    ec.shockwaveTimer = 300;
                } else {
                    const cx = ec.x + ec.w / 2;
                    const cy = ec.y + ec.h / 2;
                    const pdx = (player.x + player.w / 2) - cx;
                    const pdy = (player.y + player.h / 2) - cy;
                    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
                    if (pdist < ec.shockwaveRadius && pdist > ec.shockwaveRadius - 25) {
                        player.takeDamage(10, cx, cy, 8);
                    }
                }
            } else {
                ec.shockwaveTimer--;
                if (ec.shockwaveTimer <= 0) {
                    ec.shockwaveActive = true;
                    ec.shockwaveRadius = 10;
                    if (window.game) window.game.sound.play('charge');
                }
            }

            // Spawn Defenders (based on invasionConfig)
            const maxDefenders = this.invasionConfig.defenders || 2;
            if (this.defenders.length < maxDefenders) {
                this.spawnTimer++;
                if (this.spawnTimer > 150) {
                    this.spawnDefender();
                    this.spawnTimer = 0;
                }
            }
        }

        // Defenders & Fires
        for (let i = this.defenders.length - 1; i >= 0; i--) {
            const d = this.defenders[i];
            const alive = d.update(player.x, player.y);
            if (!alive) {
                this.defenders.splice(i, 1);
            } else {
                if (d.hp > 0 && d.state !== 'hurt') {
                    if (player.x < d.x + d.w && player.x + player.w > d.x &&
                        player.y < d.y + d.h && player.y + player.h > d.y) {
                        player.takeDamage(10, d.x + d.w / 2, d.y + d.h / 2, 6);
                    }
                }
            }
        }

        if (this.isEnemy) {
            // 1. Switch Unlock Logic
            if (this.engineCore.locked) {
                const unlockSwitches = this.switches.filter(s => s.type === 'unlock');
                const allUnlocked = unlockSwitches.length > 0 && unlockSwitches.every(s => s.activated);
                if (allUnlocked) {
                    this.engineCore.locked = false;
                    if (window.game) window.game.sound.play('victory');
                }
            }

            // 2. Core Destruction Logic
            if (this.engineCore.visible && window.game) {
                if (window.game.battle && window.game.battle.enemyTankHP > 0) {
                    this.engineCore.hp = this.engineCore.maxHp;
                } else if (this.engineCore.hp <= 0) {
                    window.game.handleInvasionVictory();
                }
            }
        }

        let totalFireDamage = 0;
        for (let i = this.fires.length - 1; i >= 0; i--) {
            const f = this.fires[i];
            const alive = f.update(player);
            if (!alive) {
                this.fires.splice(i, 1); // Bug fix: remove expired/extinguished fires
            } else {
                totalFireDamage += CONFIG.FIRE.DAMAGE_TO_TANK;
            }
        }

        // Update lasers
        for (const laser of this.lasers) {
            laser.update();

            // レーザーとプレイヤーの衝突判定
            if (laser.checkCollision(player)) {
                if (player.invincible <= 0) {
                    player.takeDamage(10,
                        (laser.x1 + laser.x2) / 2,
                        (laser.y1 + laser.y2) / 2,
                        8
                    );
                    if (window.game) {
                        window.game.sound.play('damage');
                        window.game.particles.damageNum(player.x, player.y - 20, 'ビリッ！', '#FF0000');
                    }
                }
            }
        }

        return { fired, fireDamage: totalFireDamage };
    }

    spawnFire() {
        const b = this.getBounds();
        const fx = b.left + Math.random() * (b.right - b.left - 40);
        const fy = b.top + Math.random() * (b.bottom - b.top - 40);
        this.fires.push(new Fire(fx, fy));
    }

    spawnDefender() {
        const b = this.getBounds();
        const dx = b.left + Math.random() * (b.right - b.left - 40);
        const dy = b.top + Math.random() * (b.bottom - b.top - 40);
        this.defenders.push(new DefenderSlime(dx, dy, this.platforms));
    }

    updateCannons() {
        const results = [];
        for (const c of this.cannons) {
            const r = c.update();
            if (r) results.push(r);
        }
        return results;
    }

    // SIMPLIFIED DRAW: Show only active floor logic visually
    draw(ctx) {
        const T = CONFIG.TANK;
        const ox = T.OFFSET_X, oy = T.OFFSET_Y;
        const activeFloor = (window.game && window.game.activeFloor) ? window.game.activeFloor : 2;
        const midY = oy + T.INTERIOR_H / 2;

        Renderer.drawTankExterior(ctx, ox, oy, T.INTERIOR_W, T.INTERIOR_H, this.isEnemy, 0, true, this.tankType);

        // Filter objects by Y coordinate
        // 2F < midY, 1F > midY

        // Always draw platforms on both? Or filter?
        // User wanted "separate floor feel" but reverting to "simple".
        // Let's filter drawing to make it look like switching floors, but in the small window.

        ctx.save();
        // Clip to active floor area? 
        // Actually, just drawing only relevant objects is safer.

        for (const p of this.platforms) {
            Renderer.drawPlatform(ctx, p.x, p.y, p.w, p.h);
        }

        // Draw Everything (Single Screen)

        // 2F Objects (Cannons, etc)
        const chuteX = this.dropX + this.dropW * 0.4;
        const chuteY = oy + 22;
        ctx.fillStyle = '#555'; ctx.fillRect(chuteX, chuteY, 30, 15);
        for (const c of this.cannons) c.draw(ctx);

        // 1F Objects (Engine, Switches)
        if (this.engineCore.visible) {
            Renderer.drawEngineCore(ctx, this.engineCore.x, this.engineCore.y,
                this.engineCore.w, this.engineCore.h, this.engineCore.hp, this.engineCore.maxHp);
            if (this.engineCore.locked) Renderer.drawBarrier(ctx, this.engineCore.x - 10, this.engineCore.y - 10, this.engineCore.w + 20, this.engineCore.h + 20);
        }
        if (this.isEnemy) {
            for (const s of this.switches) Renderer.drawSecuritySwitch(ctx, s.x, s.y, s.w, s.h, s.activated, s.label);
        }

        // Defenders & Fires & Lasers
        for (const d of this.defenders) d.draw(ctx);
        for (const f of this.fires) f.draw(ctx);
        // レーザーは侵攻中（invasion）のみ描画する（バトル画面での誤表示防止）
        const currentState = window.game && window.game.state;
        if (currentState === 'invasion' || currentState === 'defense') {
            for (const laser of this.lasers) laser.draw(ctx);
        }

        ctx.restore();
    }

    updateDamageEffects(hp, maxHp) {
        if (!window.game) return;
        const ratio = hp / maxHp;
        const T = CONFIG.TANK;
        const ox = T.OFFSET_X, oy = T.OFFSET_Y;
        const iw = T.INTERIOR_W, ih = T.INTERIOR_H;

        if (ratio < 0.6) {
            if (Math.random() < 0.02 + (0.6 - ratio) * 0.1) {
                const x = ox + 20 + Math.random() * (iw - 40);
                const y = oy + 20 + Math.random() * (ih - 40);
                window.game.particles.smoke(x, y, 1);
            }
        }
    }

    generateSwitchPositions(num, ox, oy, iw, ih, midY) {
        // スイッチの位置を動的に生成
        const positions = [];

        // 定義済みの位置リスト（最大8個まで）
        const presetPositions = [
            { x: ox + 40, y: midY + 40 },                    // A: 1F 左
            { x: ox + iw - 70, y: oy + ih - 40 },           // B: 1F 右下
            { x: ox + iw / 2 - 15, y: oy + 60 },            // C: 2F 中央
            { x: ox + 40, y: oy + 40 },                     // D: 2F 左上
            { x: ox + iw - 70, y: oy + 100 },               // E: 2F 右上
            { x: ox + iw / 2 - 15, y: oy + ih - 60 },       // F: 1F 中央（コア近く）
            { x: ox + iw / 4, y: midY - 20 },               // G: 1F-2F 境界 左寄り
            { x: ox + iw * 3/4 - 30, y: midY + 60 },        // H: 1F 右寄り
        ];

        // 必要な数だけ位置を返す
        for (let i = 0; i < Math.min(num, presetPositions.length); i++) {
            positions.push(presetPositions[i]);
        }

        return positions;
    }

    getSpawnPoint() {
        const b = this.getBounds();
        return { x: b.left + 80, y: b.top + 50 };
    }
}

window.TankInterior = TankInterior;
window.Fire = Fire;
window.Laser = Laser;
