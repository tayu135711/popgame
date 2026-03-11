// ======================================
// PLAYER - Platformer Slime Character
// ======================================
class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.w = CONFIG.PLAYER.WIDTH;
        this.h = CONFIG.PLAYER.HEIGHT;
        this.dir = 1; // 1=right, -1=left
        this.heldItems = []; // Array of ammo types (Max 3)
        this.frame = 0;
        this.invincible = 0;
        this.hp = 100;
        this.maxHp = 100;

        // Attack State
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackDuration = 0;
        this.stunned = 0;

        // Fusion / Stacking State
        this.stackedAlly = null; // Reference to the ally object currently on head
    }


    takeDamage(amount, fromX, fromY, force = 8) {
        if (this.invincible > 0 || this.hp <= 0) return false;

        // Check for SHIELD powerup
        let damageReduced = amount;

        // === 味方の damageReduction 適用（タイタンゴーレム等の重装甲パッシブ）===
        if (window.game && window.game.allies) {
            let maxReduction = 0;
            for (const ally of window.game.allies) {
                if (ally.damageReduction && ally.damageReduction > maxReduction) {
                    maxReduction = ally.damageReduction;
                }
            }
            if (maxReduction > 0) {
                damageReduced = Math.max(1, Math.floor(damageReduced * (1 - maxReduction)));
            }
        }

        if (window.game && window.game.powerupManager && window.game.powerupManager.hasEffect('shield')) {
            const shieldData = window.game.powerupManager.playerEffects.shield;
            const blocked = Math.min(damageReduced, shieldData.absorption - shieldData.absorbed);
            shieldData.absorbed += blocked;
            damageReduced -= blocked;
            // Bug fix: シールドが吸収上限に達したら即削除
            if (shieldData.absorbed >= shieldData.absorption) {
                delete window.game.powerupManager.playerEffects.shield;
            }
            
            if (window.game) {
                window.game.sound.play('confirm');
                window.game.particles.rateEffect(this.x + this.w/2, this.y, 'BLOCK!', '#4FC3F7');
            }
        }

        this.hp = Math.max(0, this.hp - damageReduced);
        this.invincible = 90; // 1.5 seconds of i-frames
        this.stunned = 20;    // 0.3 seconds of "no control"

        // Knockback calculation
        const dx = (this.x + this.w / 2) - fromX;
        const dy = (this.y + this.h / 2) - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        this.vx = (dx / dist) * force;
        this.vy = (dy / dist) * force;

        // Ensure some minimum knockback even if perfectly overlapped
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            this.vx = (Math.random() - 0.5) * force;
            this.vy = (Math.random() - 0.5) * force;
        }

        if (window.game) {
            window.game.sound.play('damage');
            window.game.camera_shake = 15;
            window.game.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, '#F00', 10);
        }
        return true;
    }

    update(input, tank) {
        this.frame++;

        // Attack Logic (Rush forward slightly)
        if (this.isAttacking) {
            this.attackDuration--;
            if (this.attackDuration <= 0) {
                this.isAttacking = false;
            }
        }

        // Top-Down Movement (4-Way)
        let mvx = 0;
        let mvy = 0;

        if (!this.isAttacking) {
            if (input.left) { mvx = -1; this.dir = -1; }
            else if (input.right) { mvx = 1; this.dir = 1; }

            if (input.up) mvy = -1;
            else if (input.down) mvy = 1;
        }

        // Normalize diagonal movement speed
        if (mvx !== 0 && mvy !== 0) {
            const length = Math.sqrt(mvx * mvx + mvy * mvy);
            mvx /= length;
            mvy /= length;
        }

        let speed = CONFIG.PLAYER.SPEED;
        
        // Apply SPEED_UP powerup
        if (window.game && window.game.powerupManager && window.game.powerupManager.hasEffect('speedUp')) {
            speed *= window.game.powerupManager.getEffectValue('speedUp', 'speedMult');
        }

        if (this.stunned > 0) {
            this.stunned--;
            // Velocity decays naturally through friction or just persists until update ends
            this.vx *= 0.92;
            this.vy *= 0.92;
        } else if (!this.isAttacking) {
            this.vx = mvx * speed;
            this.vy = mvy * speed;
        }

        // Apply velocity with robust X/Y collision resolution
        this.resolveCollision(tank);
    }

    resolveCollision(tank) {
        Physics.update(this, tank.platforms, tank.getBounds());

        // Update Stacked Ally Position & Abilities
        this.updateStack(tank.cannons);
    }



    // Try to pick up nearest item OR Ally (Fusion)
    tryPickup(items, allies) {
        if (this.heldItems.length >= 1) return null; // Max 1 item
        // Note: Can we hold an Ally AND an Item? 
        // Logic: Stacking is separate from holding item hands?
        // Let's say: 
        // 1. Hands hold Ammo.
        // 2. Head holds Ally.

        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;

        // 1. Try Pickup Ally (Fusion)
        if (!this.stackedAlly && allies) {
            let bestAlly = null, bestDistSq = 2500; // 50² = 2500
            for (const ally of allies) {
                if (ally.isStacked) continue;
                const dx = (ally.x + ally.w / 2) - cx, dy = (ally.y + ally.h / 2) - cy;
                const dSq = dx * dx + dy * dy;
                if (dSq < bestDistSq) { bestDistSq = dSq; bestAlly = ally; }
            }
            if (bestAlly) {
                this.stackedAlly = bestAlly;
                bestAlly.isStacked = true;
                if (window.game) {
                    window.game.sound.play('powerup'); // Fusion sound
                    window.game.particles.rateEffect(this.x + this.w / 2, this.y, 'UNION!', '#0FF');
                    window.game.particles.sparkle(this.x + this.w / 2, this.y, '#0FF');
                }
                return 'ally'; // Special return
            }
        }

        // 2. Try Pickup Item if no Ally picked
        let best = null, bestItemDistSq = 1600; // 40² = 1600
        for (const item of items) {
            if (item.collected) continue;
            const dx = item.x - cx, dy = item.y - cy;
            const dSq = dx * dx + dy * dy;
            if (dSq < bestItemDistSq) { bestItemDistSq = dSq; best = item; }
        }
        if (best) {
            this.heldItems.push(best.type);
            best.collected = true;
            if (window.game) {
                window.game.sound.play('pickup');
                window.game.particles.rateEffect(this.x + this.w / 2, this.y, 'UP!', '#FFF');
                window.game.particles.sparkle(this.x + this.w / 2, this.y, '#FFD700');
                
                // デイリーミッション: collect_itemsはmissionStatsで集計してバトル終了時に一括更新
                if (window.game.missionStats) window.game.missionStats.itemsCollected++;
            }
            return best;
        }
        return null;
    }

    // Update Stacked Ally Position & Abilities
    updateStack(cannons) {
        if (this.stackedAlly) {
            // Position ally on top of player
            this.stackedAlly.x = this.x;
            this.stackedAlly.y = this.y - 20; // Float above
            this.stackedAlly.dir = this.dir;
            this.stackedAlly.vx = this.vx;
            this.stackedAlly.vy = this.vy;

            // SPECIAL ABILITY: GUNNER AUTO-LOAD
            // If Gunner is stacked, and Player has ammo, and near empty cannon -> Instant Load
            if ((this.stackedAlly.type === 'gunner' || this.stackedAlly.type === 'boss') && this.heldItems.length > 0) {
                if (cannons) {
                    for (const cannon of cannons) {
                        if (!cannon.loaded && this.heldItems.length > 0) {
                            const dx = (cannon.x + cannon.w / 2) - (this.x + this.w / 2);
                            const dy = (cannon.y + cannon.h / 2) - (this.y + this.h / 2);
                            if (Math.abs(dx) < 80 && Math.abs(dy) < 60) { // Slightly wider range
                                cannon.load(this.heldItems[0]);
                                this.heldItems.shift();
                                if (window.game) {
                                    window.game.sound.play('load');
                                    window.game.particles.rateEffect(cannon.x + cannon.w / 2, cannon.y, '自動装填！', '#FF0');
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // Try to load cannon
    tryLoadCannon(cannons) {
        if (this.heldItems.length === 0) return null;
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        for (const cannon of cannons) {
            const dx = (cannon.x + cannon.w / 2) - cx;
            const dy = (cannon.y + cannon.h / 2) - cy;
            if (Math.abs(dx) < 60 && Math.abs(dy) < 40 && !cannon.loaded) {
                // Bug Fix: attackUpgradeのpowerMultをプレイヤー装填時にも適用（仲間と同等に）
                const atkLevel = (window.game?.saveData?.upgrades?.attack) || 0;
                const powerMult = 1 + atkLevel * 0.1;
                cannon.load(this.heldItems[0], powerMult);
                this.heldItems.shift();
                if (window.game) {
                    window.game.sound.play('load');
                    if (powerMult >= 1.5) {
                        window.game.particles.rateEffect(cannon.x + cannon.w / 2, cannon.y, 'メガ装填！', '#0FF');
                    }
                }
                return cannon;
            }
        }
        return null;
    }

    // Throw Stacked Ally (Missile)
    throwStackedAlly() {
        if (!this.stackedAlly) return null;
        const ally = this.stackedAlly;
        this.stackedAlly = null;
        ally.isStacked = false; // Reset state

        if (window.game) {
            window.game.sound.play('dash'); // Throw sound
            window.game.particles.rateEffect(this.x + this.w / 2, this.y, 'いけー！', '#FFF');
        }
        return ally;
    }

    // Get nearest cannon for invasion
    getNearCannon(cannons) {
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        for (const cannon of cannons) {
            const dx = (cannon.x + cannon.w / 2) - cx;
            const dy = (cannon.y + cannon.h / 2) - cy;
            if (Math.abs(dx) < 60 && Math.abs(dy) < 40) return cannon;
        }
        return null;
    }

    // Attack defender with held item (Throws item)
    attackDefender(defenders) {
        if (this.heldItems.length === 0) return false;

        // Always throw the first item!
        const throwDirX = this.dir;
        const throwDirY = 0; // Straight forward

        // Create a projectile (or just a hit check for now? Let's do instant hit check box in front)
        // Better: Projectile logic would be best, but for now let's do a "Wide Hitbox" throw

        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        let hit = false;

        if (defenders) {
            for (const d of defenders) {
                const dx = (d.x + d.w / 2) - cx;
                const dy = (d.y + d.h / 2) - cy;

                // Check if in front and close
                if (Math.abs(dy) < 40 && (this.dir > 0 ? (dx > 0 && dx < 150) : (dx < 0 && dx > -150))) {
                    d.takeHit(20, this.dir, 0); // High damage throw
                    hit = true;
                    if (window.game) {
                        window.game.particles.hit(d.x + d.w / 2, d.y + d.h / 2);
                    }
                }
            }
        }

        // Visuals
        if (window.game) {
            window.game.sound.play('throw'); // Need throw sound, re-use jump or attack
            window.game.particles.rateEffect(this.x, this.y - 20, 'THROW!', '#FF0');
            // Simulate projectile visual (optional, maybe just particle)
            const itemInfo = CONFIG.AMMO_TYPES[this.heldItems[0]];
            const itemColor = itemInfo ? itemInfo.color : '#888';
            window.game.particles.explosion(cx + this.dir * 40, cy, itemColor, 5);
        }

        this.heldItems.shift(); // Remove first item
        return true;
    }

    triggerTailAttack() {
        if (this.attackCooldown > 0 || this.heldItems.length > 0) return false;

        this.isAttacking = true;
        this.attackDuration = 15; // 0.25 sec
        this.attackCooldown = 30; // 0.5 sec cooldown

        // Lunge forward based on direction
        const lungeSpeed = 6;
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            // Lunge in movement direction
            const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            this.vx = (this.vx / mag) * lungeSpeed;
            this.vy = (this.vy / mag) * lungeSpeed;
        } else {
            // Lunge in face direction
            this.vx = this.dir * lungeSpeed;
            this.vy = 0;
        }
        // Jump (Disabled as per request)

        if (window.game) {
            window.game.sound.play('jump');
        }
        return true;
    }

    draw(ctx) {
        if (this.invincible > 0 && Math.floor(this.invincible / 3) % 2) return; // Flash when invincible

        // Attack Animation (Stretched)
        if (this.isAttacking) {
            const stretch = 1.4;
            const squish = 0.6;
            ctx.save();
            // Draw stretched slime offset in direction of attack
            const attackOffset = this.dir * 15;
            ctx.translate(this.x + this.w / 2 + attackOffset, this.y + this.h);
            ctx.scale(stretch, squish); // Wide and flat
            ctx.translate(-(this.x + this.w / 2), -(this.y + this.h));

            Renderer.drawSlime(ctx, this.x, this.y, this.w, this.h,
                CONFIG.COLORS.PLAYER, CONFIG.COLORS.PLAYER_DARK, this.dir, this.frame, this.vy, 'player');

            // Draw Swing Effect
            const progress = (15 - this.attackDuration) / 15;
            Renderer.drawAttackSwing(ctx, this.x, this.y, this.w, this.h, this.dir, progress);

            // "Tail" visual - just a graphic extension
            ctx.fillStyle = CONFIG.COLORS.PLAYER;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2 + (this.dir * 25), this.y + this.h - 15, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            return;
        }

        const moving = Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5;
        Renderer.drawSlime(ctx, this.x, this.y, this.w, this.h,
            CONFIG.COLORS.PLAYER, CONFIG.COLORS.PLAYER_DARK, this.dir, moving ? this.frame : 0, this.vy, 'player');
        // Draw held items (up to 3)
        for (let i = 0; i < this.heldItems.length; i++) {
            const offsetX = (i - (this.heldItems.length - 1) / 2) * 15;
            Renderer.drawHeldItem(ctx, this.x + this.w / 2 + offsetX, this.y - 5 - (i * 8), this.heldItems[i]);
        }

        // Draw Stacked Ally (if any)
        if (this.stackedAlly) {
            // Stacked ally logic managed by Ally class
        }
    }
}

window.Player = Player;
