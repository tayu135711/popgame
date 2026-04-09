// ======================================
// BATTLE - Projectiles, Enemy AI, Allies
// ======================================

// Projectile flying between tanks
// Projectile flying between tanks (Parabolic arc)
class Projectile {
    constructor(x, y, tx, ty, type, dir, damage, owner = null) {
        this.x = x; this.y = y;
        this.tx = tx; this.ty = ty; // Target coordinates
        this.type = type;
        // Validate dir to ensure it's never 0, NaN, or undefined
        this.dir = (!isFinite(dir) || dir === 0) ? 1 : dir; // 1 = going right, -1 = going left
        this.damage = damage;
        this.owner = owner; // Added owner field for EXP gain

        this.effect = null; // burn, freeze, shock

        // Physics for arc
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Simplified arc: fixed travel time based on distance
        this.totalTime = Math.max(30, dist / CONFIG.PROJECTILE.SPEED);
        this.timer = 0;

        // Parabola params
        this.startX = x; this.startY = y;
        this.targetX = tx; this.targetY = ty;
        this.arcHeight = 150 + Math.random() * 50; // Height of arc

        this.active = true;
        this.phase = 'flying';
        this.angle = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.5;

        // Special: Player Launch
        this.isPlayer = (type === 'player');
        this.onHit = null; // Callback when hit
        this.scale = 1.0;
    }
    update() {
        if (!this.active) return;

        this.timer++;

        // Missile Homing Logic
        if (this.type === 'missile') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1; // Prevent divide by zero
            const speed = 7;

            if (dist < speed) {
                this.phase = 'hit';
                this.active = false;
                if (this.onHit) this.onHit(); // Callback
            } else {
                this.x += (dx / dist) * speed;
                this.y += (dy / dist) * speed;
                this.angle = Math.atan2(dy, dx);
                // Smoke trail
                if (Math.random() < 0.04 && window.game) { // パフォーマンス改善: 0.08→0.04
                    window.game.particles.smoke(this.x - Math.cos(this.angle) * 10, this.y - Math.sin(this.angle) * 10, 1);
                }
            }
            if (this.timer > 150) {
                this.active = false; // Timeout
                if (this.onHit) this.onHit(); // Return anyway
            }
            // ★バグ修正: ミサイルの画面外判定を追加（画面外に飛んで消えないバグを修正）
            if (this.x < -100 || this.x > CONFIG.CANVAS_WIDTH + 100 || this.y < -100 || this.y > CONFIG.CANVAS_HEIGHT + 100) {
                this.active = false;
                if (this.onHit) this.onHit();
            }
            return;
        }

        const t = this.timer / this.totalTime;

        if (t >= 1) {
            this.phase = 'hit';
            this.active = false;
            if (this.onHit) this.onHit();
            return;
        }

        // Linear interpolation for X
        this.x = this.startX + (this.targetX - this.startX) * t;

        // Parabolic interpolation for Y
        // y = Lerp(start, end, t) - 4 * h * t * (1-t)
        const linearY = this.startY + (this.targetY - this.startY) * t;
        const arcY = 4 * this.arcHeight * t * (1 - t);
        this.y = linearY - arcY;

        this.angle += this.rotSpeed;
    }
    draw(ctx) {
        if (!this.active) return;
        Renderer.drawProjectile(ctx, this.x, this.y, this.type, this.dir, this.angle, this.scale);
    }
}

// Battle manager
class BattleManager {
    constructor(stageData, saveData) {
        // --- UPGRADES ---
        const hpLevel = (saveData && saveData.upgrades && saveData.upgrades.hp) || 0;
        const atkLevel = (saveData && saveData.upgrades && saveData.upgrades.attack) || 0;

        const hpBonus = hpLevel * 100; // +100 HP per level (Greatly increased!)
        this.attackMultiplier = 1 + (atkLevel * 0.06); // +6%/level（以前10%でインフレ気味、下方修正）

        // ★バグ修正: 装備スキンの hpMult / attackBonus をバトル開始時に適用する
        // これまで attackSpeedMult のみ Player 側で適用されていたが、
        // hpMult と attackBonus は一切反映されていなかった（表示だけ存在するデッドコードだった）
        const _equippedSkinId = (saveData && saveData.tankCustom && saveData.tankCustom.skin) || 'skin_default';
        const _equippedSkin = (window.TANK_PARTS && window.TANK_PARTS.skins || []).find(s => s.id === _equippedSkinId);
        const _skinHpMult     = (_equippedSkin && _equippedSkin.hpMult)     || 1.0;
        const _skinAtkBonus   = (_equippedSkin && _equippedSkin.attackBonus) || 1.0;

        this.attackMultiplier *= _skinAtkBonus;

        this.playerTankHP = Math.ceil(((stageData.playerHP || CONFIG.TANK.DEFAULT_HP) + hpBonus) * _skinHpMult);
        this.playerTankMaxHP = this.playerTankHP;

        this.enemyTankHP = stageData.enemyHP || CONFIG.TANK.DEFAULT_HP;
        this.enemyTankMaxHP = this.enemyTankHP;
        this.projectiles = [];
        this.battleTimer = 0;
        this.enemyFireTimer = stageData.enemyFireInterval || CONFIG.ENEMY.BASE_FIRE_INTERVAL * 1.2; // 20% slower
        this.enemyFireInterval = this.enemyFireTimer;
        this.enemyDamage = Math.round((stageData.enemyDamage || CONFIG.ENEMY.BASE_DAMAGE) * 0.8); // 20% less damage

        // Tank Type Variations
        this.enemyTankType = (stageData.isBossRush && stageData.bosses && stageData.bosses.length > 0)
            ? stageData.bosses[0]
            : (stageData.tankType || 'NORMAL');
        const typeInfo = CONFIG.ENEMY.TYPES[this.enemyTankType] || CONFIG.ENEMY.TYPES.NORMAL;

        // 敵スキン（enemySkinが設定されていればそのスキンで描画）
        this.enemySkinType = stageData.enemySkin || null;

        // Apply multipliers (Disabled for consistency with stage select HP)
        // this.enemyTankHP *= (typeInfo.hpMod || 1.0);
        this.enemyTankMaxHP = this.enemyTankHP;
        this.enemyFireInterval *= (typeInfo.fireRateMod || 1.0);
        this.enemyDodgeProb = typeInfo.dodgeProb || 0.1;

        // Special / Support
        this.specialGauge = 0;
        this.maxSpecialGauge = CONFIG.SPECIAL.GAUGE_MAX;

        // Interactive Battle State
        this.crosshairX = CONFIG.CANVAS_WIDTH / 2;
        this.crosshairY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;
        this.playerTankX = 0; // Relative to default
        this.playerTankY = 0;
        this.playerTankTargetX = 0;
        this.playerTankTargetY = 0;
        this.dodgeTimer = 0;

        this.enemyTankX = 0;
        this.enemyTankY = 0;
        this.enemyTankTargetX = 0;
        this.enemyTankTargetY = 0;
        this.enemyDodgeTimer = 0;

        this.incomingShots = []; // For indicators
        this.shieldActive = false; // Moved this line to correct position
        this.woodArmorActive = false; // もくのよろい：ダメージ軽減バリア
        this.woodArmorHP = 0;        // 残りバリアHP
        this.turboBoostTimer = 0;    // ターボパーツ：残り効果時間
        this.damageFlash = 0;
        this.enemyDamageFlash = 0;
        this.phase = 'battle'; // battle, enemy_disabled, invasion, victory, defeat
        this.invasionAvailable = false;

        // Magic Effects
        this.playerFireEffect = 0; // Burn timer (player tank被弾 → playerTankHPにDoT)
        this.playerIceEffect = 0; // Freeze timer (player被弾 → 敵の行動は変わらない)
        this.enemyFireEffect = 0;  // Burn timer (enemy tank被弾 → enemyTankHPにDoT)
        this.enemyMuzzleFlash = 0;  // 敵砲口フラッシュタイマー
        this.playerMuzzleFlash = 0; // 自砲口フラッシュタイマー
        this.enemyIceEffect = 0;   // Freeze timer (enemy被弾 → 敵の行動を遅くする)
        this.enemyWindEffect = 0;  // Wind timer (leaf_storm: 敵射撃間隔を延長 1200fr=20秒)
        this.enemyBurnEffect = 0;  // Burn DoT timer (sun_stone: 毎秒3ダメージ 90fr=3秒)
        // 後方互換のため旧エイリアスも残す
        Object.defineProperty(this, 'fireEffect', {
            get: () => this.enemyFireEffect,
            set: (v) => { this.enemyFireEffect = v; }
        });
        Object.defineProperty(this, 'iceEffect', {
            get: () => this.enemyIceEffect,
            set: (v) => { this.enemyIceEffect = v; }
        });
        Object.defineProperty(this, 'windEffect', {
            get: () => this.enemyWindEffect,
            set: (v) => { this.enemyWindEffect = v; }
        });
        Object.defineProperty(this, 'burnEffect', {
            get: () => this.enemyBurnEffect,
            set: (v) => { this.enemyBurnEffect = v; }
        });
        this.thunderFlash = 0; // Visual flash for thunder
        this.stageData = stageData; // Added to constructor for enemyFire

        // === ラスボス必殺技システム ===
        this.bossSpecialTimer = 0;
        this.bossSpecialInterval = 600; // 10秒ごとに必殺技チャンス
        this.bossSpecialActive = false;
        this.bossSpecialPhase = 0; // 必殺技のフェーズ管理
        this.bossSpecialType = null; // 現在発動中の必殺技タイプ

        // === 形態変化システム ===
        this.bossPhase = 1; // 1 = 第一形態, 2 = 第二形態
        this.hasPhaseTwo = stageData.hasPhaseTwo || false; // 第二形態があるか
        this.phaseTransitionActive = false; // 形態変化中フラグ

        // --- BOSS RUSH ---
        this.currentBossIndex = 0;

        // フレームベースのバーストキュー（setTimeout/setInterval代替）
        this.burstQueue = []; // [{delay, fn}]
        this.laserFrames = 0; // bossLaserAttack フレームカウンタ
        this.laserActive = false;
    }

    update() {
        const tick = 1;

        // バーストキュー処理（setTimeout/setInterval代替）
        if (this.burstQueue.length > 0) {
            // インプレース処理: new [] 不要で GC 負荷を低減
            let writeIdx = 0;
            for (let bqi = 0; bqi < this.burstQueue.length; bqi++) {
                const entry = this.burstQueue[bqi];
                entry.delay--;
                if (entry.delay <= 0) {
                    try { entry.fn(); } catch (e) { }
                } else {
                    this.burstQueue[writeIdx++] = entry;
                }
            }
            this.burstQueue.length = writeIdx;
        }

        // bossLaserAttack フレームベース処理
        if (this.laserActive) {
            this.laserFrames++;
            if (this.laserFrames >= 120) {
                this.laserActive = false;
                this.laserFrames = 0;
            } else if (this.laserFrames % 10 === 0 && window.game && window.game.state === 'battle') {
                const px = CONFIG.CANVAS_WIDTH - 50;
                const py = CONFIG.TANK.OFFSET_Y + 80 + Math.random() * 100;
                const tx = CONFIG.TANK.OFFSET_X + 100;
                const ty = CONFIG.TANK.OFFSET_Y + Math.random() * CONFIG.TANK.INTERIOR_H;
                this.projectiles.push(new Projectile(px, py, tx, ty, 'thunder', -1, this.enemyDamage));
                window.game.particles.lightning(px, py, tx, ty);
                window.game.camera_shake = 5;
            }
        }

        // Apply SLOW_TIME powerup (Slow down game logic)
        let effectiveTick = tick;
        if (window.game && window.game.powerupManager && window.game.powerupManager.hasEffect('slowTime')) {
            effectiveTick *= window.game.powerupManager.getEffectValue('slowTime', 'slowFactor');
        }

        // Update battle timer (Important: used for time attack records and time bonus rewards)
        // ★バグ修正: effectiveTick が SLOW_TIME powerup で小数になるため、
        // 整数に丸めてから加算する。ハイスコア比較やゴールド計算が浮動小数点誤差で
        // ズレるバグを防ぐ。
        this.battleTimer += Math.round(effectiveTick);

        // --- TIME LIMIT CHECK ---
        if (this.phase === 'battle' && this.stageData && this.stageData.timeLimit) {
            const timeLimitFrames = this.stageData.timeLimit * 60;
            if (this.battleTimer > timeLimitFrames) {
                this.phase = 'defeat';
                if (window.game) {
                    window.game.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'TIME UP!', '#F00');
                    window.game.sound.play('damage');
                }
            }
        }

        // Update tank positions (Smooth movement)
        this.playerTankX += (this.playerTankTargetX - this.playerTankX) * 0.1;
        this.playerTankY += (this.playerTankTargetY - this.playerTankY) * 0.1;
        this.enemyTankX += (this.enemyTankTargetX - this.enemyTankX) * 0.05;
        this.enemyTankY += (this.enemyTankTargetY - this.enemyTankY) * 0.05;

        if (this.dodgeTimer > 0) this.dodgeTimer--;
        if (this.enemyDodgeTimer > 0) this.enemyDodgeTimer--;

        if (this.damageFlash > 0) this.damageFlash--;
        if (this.enemyMuzzleFlash > 0) this.enemyMuzzleFlash--;
        if (this.playerMuzzleFlash > 0) this.playerMuzzleFlash--;
        if (this.enemyDamageFlash > 0) this.enemyDamageFlash--;

        // ターボパーツ効果タイマー
        if (this.turboBoostTimer > 0) this.turboBoostTimer--;

        // Thunder Effect: Flash effect and enhanced enemy attack speed
        if (this.thunderFlash > 0) {
            this.thunderFlash--;
            // Thunder provides enemy a burst chance to fire faster
            if (this.thunderFlash === 1 && Math.random() < 0.5) {
                this.enemyFireTimer -= 30; // Shorten fire interval by 0.5 sec
            }
        }

        // Update Projectiles (インプレース処理: splice O(n²) を O(n) に改善)
        const g = window.game; // window.gameのローカルキャッシュ
        let projWriteIdx = 0;
        for (let i = 0; i < this.projectiles.length; i++) {
            const p = this.projectiles[i];
            p.update();

            if (!p.active) {
                if (p.phase === 'hit') {
                    const hitByEnemy = p.dir === -1;

                    if (hitByEnemy) {
                        // 着弾座標: プレイヤータンク上部（上画面の視覚位置に近い位置）
                        const hitX = CONFIG.TANK.OFFSET_X + 100 + this.playerTankX;
                        const hitY = CONFIG.CANVAS_HEIGHT * 0.4 + this.playerTankY;

                        if (this.shieldActive) {
                            this.shieldActive = false;
                            if (g) {
                                g.sound.play('confirm');
                                g.particles.rateEffect(hitX, hitY, 'BLOCK!', '#FFF');
                            }
                        } else if (this.woodArmorActive && this.woodArmorHP > 0) {
                            // もくのよろい：バリアHPでダメージを肩代わり
                            const absorbed = Math.min(this.woodArmorHP, p.damage);
                            this.woodArmorHP -= absorbed;
                            const remaining = p.damage - absorbed;
                            if (this.woodArmorHP <= 0) {
                                this.woodArmorActive = false;
                                this.woodArmorHP = 0;
                            }
                            if (remaining > 0) {
                                this.playerTankHP = Math.max(0, this.playerTankHP - remaining);
                                this.damageFlash = 6;
                            }
                            if (g) {
                                g.particles.rateEffect(hitX, hitY, `守備-${absorbed}`, '#8D6E63');
                                if (remaining > 0) g.sound.play('damage');
                                else g.sound.play('confirm');
                            }
                        } else {
                            this.playerTankHP = Math.max(0, this.playerTankHP - p.damage);
                            this.damageFlash = 12;
                            this.specialGauge = Math.min(CONFIG.SPECIAL.GAUGE_MAX, this.specialGauge + CONFIG.SPECIAL.GAIN_ON_DAMAGE);
                            if (g?.missionStats) g.missionStats.damageTaken += p.damage;

                            // ヒットストップ（2〜3フレーム）
                            if (g) {
                                g.hitStop = Math.max(g.hitStop, 3);
                                g.camera_shake = Math.max(g.camera_shake, 5);
                                // 実ダメージ数値をポップアップ
                                g.particles.damageNum(hitX + (Math.random() * 40 - 20), hitY - 20, `-${Math.round(p.damage)}`, '#FF4444');
                            }
                        }

                        if (p.type === 'fire') this.playerFireEffect = 180;
                        if (p.type === 'ice') this.playerIceEffect = 120;
                        if (p.type === 'thunder') this.thunderFlash = 15;

                        if (g) {
                            g.particles.explosion(hitX, hitY, '#F44336', 35);
                            g.particles.smoke(hitX, hitY, 3);
                            // 被弾フラッシュは赤
                            g.screenFlash = 6;
                            g.screenFlashType = 'hit';
                        }
                    } else {
                        // 着弾座標: 敵タンク上部（上画面）
                        const eHitX = CONFIG.CANVAS_WIDTH - 140 + this.enemyTankX;
                        const eHitY = CONFIG.CANVAS_HEIGHT * 0.4 + this.enemyTankY;

                        // ★バグ修正: dodgeProbが初期化されているのに一切使われていなかった
                        // → 敵タンクタイプの回避判定を実装
                        const dodged = (this.enemyDodgeTimer <= 0) && (Math.random() < (this.enemyDodgeProb || 0.1));
                        if (dodged) {
                            this.enemyDodgeTimer = 45; // 回避後クールタイム
                            if (g) {
                                g.particles.rateEffect(eHitX, eHitY - 30, 'DODGE!', '#80CBC4');
                                g.particles.smoke(eHitX, eHitY, 3);
                            }
                        } else {
                            // ★バグ修正: インデントを正しく整形
                            this.enemyTankHP = Math.max(0, this.enemyTankHP - p.damage);
                            this.enemyDamageFlash = 12;
                            this.specialGauge = Math.min(CONFIG.SPECIAL.GAUGE_MAX, this.specialGauge + CONFIG.SPECIAL.GAIN_ON_HIT);

                            // ★バグ修正: 飛び道具の持ち主（ドローン等）にEXPを付与
                            if (p.owner && p.owner.gainExp) {
                                p.owner.gainExp(Math.max(1, Math.floor(p.damage * 0.1)));
                            }

                            if (g?.missionStats) g.missionStats.totalDamage += p.damage;


                            // ヒットストップ（プレイヤー弾命中は強め）
                            if (g) {
                                g.hitStop = Math.max(g.hitStop, 4);
                                g.camera_shake = Math.max(g.camera_shake, 4);
                                // 実ダメージ数値ポップアップ
                                const dmgRounded = Math.round(p.damage);
                                const dmgColor = dmgRounded >= 30 ? '#FF9800' : dmgRounded >= 20 ? '#FFD700' : '#FFFFFF';
                                g.particles.damageNum(eHitX + (Math.random() * 40 - 20), eHitY - 30, `${dmgRounded}`, dmgColor);
                            }

                            // コンボ加算
                            if (g) {
                                g.comboCount = (g.comboCount || 0) + 1;
                                g.comboTimer = 180;
                                g.comboFlashTimer = 40;
                                if (g.comboCount > (g.maxCombo || 0)) g.maxCombo = g.comboCount;
                                if (g.comboCount >= 3 && g.particles) {
                                    const comboColors = ['#FFF','#FFD700','#FF9800','#FF4444','#E040FB'];
                                    const col = comboColors[Math.min(g.comboCount - 3, 4)];
                                    g.particles.rateEffect(CONFIG.CANVAS_WIDTH * 0.75, CONFIG.CANVAS_HEIGHT * 0.3, `${g.comboCount}HIT!!`, col);
                                    if (g.comboCount >= 5) g.camera_shake = Math.min(10, g.comboCount + 2);
                                }
                            }

                            if (p.type === 'fire') this.enemyFireEffect = 180;
                            if (p.type === 'ice') this.enemyIceEffect = 120;
                            if (p.effect === 'wind') {
                                // ★バグ修正: 効果を適用した時だけパーティクルを出す
                                // 残り5秒以下のときだけ延長（連打で止まって見える問題を修正）
                                const windApplied = (this.enemyWindEffect || 0) <= 300;
                                if (windApplied) {
                                    this.enemyWindEffect = 600; // 10秒セット
                                    if (g) {
                                        g.particles.damageNum(eHitX, eHitY - 50, '💨 かぜ！', '#A5D6A7');
                                        for (let j = 0; j < 5; j++) {
                                            g.particles.sparkle(eHitX - 40 + Math.random() * 80, eHitY - 10 + Math.random() * 50, '#81C784');
                                        }
                                    }
                                }
                            }
                            if (p.effect === 'burn') {
                                this.enemyBurnEffect = Math.min(540, (this.enemyBurnEffect || 0) + 90); // ★最大9秒上限
                                if (g) {
                                    g.particles.damageNum(eHitX, eHitY - 50, '☀️ やけど！', '#FF8F00');
                                    for (let j = 0; j < 4; j++) {
                                        g.particles.sparkle(eHitX - 30 + Math.random() * 60, eHitY + Math.random() * 40, '#FFA726');
                                    }
                                }
                            }
                            if (p.type === 'thunder') {
                                this.thunderFlash = 15;
                                if (g) {
                                    g.particles.damageNum(eHitX, eHitY - 50, '⚡ ZAAAP!', '#FFEB3B');
                                    for (let j = 0; j < 6; j++) {
                                        g.particles.sparkle(eHitX - 50 + Math.random() * 100, eHitY - 20 + Math.random() * 60, '#FFEB3B');
                                    }
                                    g.hitStop = Math.max(g.hitStop, 6); // 雷は長め
                                }
                            }

                            if (g) {
                                g.particles.explosion(eHitX, eHitY, '#FFC107', 40);
                                g.particles.smoke(eHitX, eHitY, 4);
                                // 命中フラッシュは白（強いほど長い）
                                g.screenFlash = Math.min(8, 4 + Math.floor(p.damage / 15));
                                g.screenFlashType = 'white';
                            }
                        } // end dodge else
                    }
                }
                // 非activeはスキップ（配列に残さない）
            } else {
                // activeなものだけ前に詰める
                this.projectiles[projWriteIdx++] = p;
            }
        }
        this.projectiles.length = projWriteIdx;

        // Apply Fire Damage from Interior (DoT)
        if (window.game && window.game.state === 'battle' && window.game.tank && window.game.tank.fireDamage) {
            if (window.game && window.game.tank) this.playerTankHP = Math.max(0, this.playerTankHP - (window.game.tank.fireDamage || 0));
            if (window.game.missionStats) window.game.missionStats.damageTaken += window.game.tank.fireDamage;
            if (window.game.frame % 30 === 0 && window.game.tank.fireDamage > 0) {
                window.game.particles.smoke(CONFIG.TANK.OFFSET_X + 50, CONFIG.TANK.OFFSET_Y + 50, 2);
            }
        }

        // Update Incoming shots list (manual loop to avoid .filter() allocation)
        let shotsCount = 0;
        for (let i = 0; i < this.projectiles.length; i++) {
            const p = this.projectiles[i];
            if (p.dir === -1 && p.active) {
                this.incomingShots[shotsCount++] = p;
            }
        }
        this.incomingShots.length = shotsCount;

        // Enemy fires at player
        if (this.phase === 'battle') {
            // Apply Ice Effect (Slow down enemy - when enemy is hit by player's ice)
            let currentTick = effectiveTick; // Use effectiveTick which includes SLOW_TIME powerup
            if (this.enemyIceEffect > 0) {
                this.enemyIceEffect--;
                if (window.game && window.game.frame % 3 !== 0) currentTick = 0; // Slower tick
            }

            // Apply Wind Effect (leaf_storm: 敵射撃間隔延長 - 5フレームに1回だけ行動)
            if (this.enemyWindEffect > 0) {
                this.enemyWindEffect--;
                if (window.game && window.game.frame % 5 !== 0) currentTick = 0; // さらに遅い
                if (window.game && this.enemyWindEffect % 60 === 0) {
                    window.game.particles.rateEffect(
                        CONFIG.CANVAS_WIDTH - 140, CONFIG.TANK.OFFSET_Y + 60,
                        `💨 ${Math.ceil(this.enemyWindEffect / 60)}秒`, '#A5D6A7'
                    );
                }
            }

            // Apply Burn DoT to enemy tank (sun_stone: 毎秒3ダメージ)
            if (this.enemyBurnEffect > 0) {
                this.enemyBurnEffect--;
                if (window.game && window.game.frame % 20 === 0) {
                    this.enemyTankHP = Math.max(0, this.enemyTankHP - 3);
                    if (window.game) window.game.particles.damageNum(
                        CONFIG.CANVAS_WIDTH - 100, CONFIG.CANVAS_HEIGHT * 0.35, '☀️3', '#FF8F00'
                    );
                }
            }

            // Apply Fire DoT to enemy tank (when enemy is hit by player's fire)
            if (this.enemyFireEffect > 0) {
                this.enemyFireEffect--;
                if (window.game && window.game.frame % 30 === 0) {
                    this.enemyTankHP = Math.max(0, this.enemyTankHP - 2);
                    if (window.game) window.game.particles.damageNum(CONFIG.CANVAS_WIDTH - 100, CONFIG.CANVAS_HEIGHT * 0.38, '🔥2', '#FF5722');
                }
            }

            // Apply Fire DoT to player tank (when player is hit by enemy's fire)
            if (this.playerFireEffect > 0) {
                this.playerFireEffect--;
                if (window.game && window.game.frame % 30 === 0) {
                    this.playerTankHP = Math.max(0, this.playerTankHP - 2);
                    if (window.game) window.game.particles.damageNum(CONFIG.TANK.OFFSET_X + 80, CONFIG.CANVAS_HEIGHT * 0.38, '🔥2', '#FF4444');
                }
            }
            // Emergency Support from Allies
            const hpPercent = this.playerTankMaxHP > 0 ? (this.playerTankHP / this.playerTankMaxHP) * 100 : 100;
            if (hpPercent < CONFIG.SUPPORT.HP_THRESHOLD && Math.random() < CONFIG.SUPPORT.PROBABILITY) {
                this.triggerSupport();
            }

            // specialActive は使用しない(game.jsのspecialAnimTimerで管理)

            // === ラスボス必殺技システム ===
            const isBossStage = this.stageData && this.stageData.isBoss;
            if (isBossStage && !this.bossSpecialActive) {
                this.bossSpecialTimer += currentTick;

                // HPが50%以下なら必殺技の発動確率UP
                const hpRatio = this.enemyTankMaxHP > 0 ? (this.enemyTankHP / this.enemyTankMaxHP) : 0;
                const specialChance = hpRatio < 0.5 ? 0.7 : 0.5;

                // 定期的に必殺技を使う
                if (this.bossSpecialTimer >= this.bossSpecialInterval && Math.random() < specialChance) {
                    this.activateBossSpecial();
                    this.bossSpecialTimer = 0;
                }
            }

            // ENEMY SHOOTS (Automatic)
            if (!this.bossSpecialActive) { // 必殺技中は通常攻撃しない
                this.enemyFireTimer -= currentTick; // Use currentTick here
                if (this.enemyFireTimer <= 0) {
                    let ammo = 'rock';
                    const typeInfo = CONFIG.ENEMY.TYPES[this.enemyTankType] || CONFIG.ENEMY.TYPES.NORMAL;

                    // ★バグ修正: 以前はMAGICALのみ対象だったが、BOSS/TRUE_BOSSもspecialAmmoProbを持つのに
                    // 魔法弾を発射できなかった。specialAmmoProb > 0 のタイプは全て魔法弾を発射するよう修正。
                    if ((typeInfo.specialAmmoProb || 0) > 0 && Math.random() < typeInfo.specialAmmoProb) {
                        const specials = ['fire', 'ice', 'thunder'];
                        ammo = specials[Math.floor(Math.random() * specials.length)];
                    }

                    this.enemyFire(ammo);
                    this.enemyFireTimer = this.enemyFireInterval + Math.random() * 40;
                    // 敵砲口フラッシュ演出（発射と同時）
                    this.enemyMuzzleFlash = 8;
                }
            }
        }

        // Check enemy disabled or phase transition
        if (this.enemyTankHP <= 0 && this.phase === 'battle') {
            // 第二形態がある場合は形態変化
            if (this.hasPhaseTwo && this.bossPhase === 1 && !this.phaseTransitionActive) {
                this.phaseTransitionActive = true;
                this.transitionToPhaseTwo();
            } else {
                // 通常の敵撃破処理
                this.phase = 'enemy_disabled';

                // 図鑑に敵を追加
                // ★バグ修正B: ボスラッシュ時は stageData.tankType ではなく
                // 現在のボス型(enemyTankType)を登録する
                // (以前は常に最初のボスのtankTypeが登録されていた)
                if (window.game && this.stageData) {
                    const currentEnemyType = this.enemyTankType || this.stageData.tankType;
                    if (currentEnemyType) {
                        const isNew = SaveManager.addEnemyToCollection(window.game.saveData, currentEnemyType);
                        if (isNew && window.game.particles) {
                            window.game.particles.rateEffect(
                                CONFIG.CANVAS_WIDTH / 2,
                                CONFIG.CANVAS_HEIGHT * 0.3,
                                '図鑑に登録！',
                                '#9C27B0'
                            );
                        }
                    }
                }

                // デイリーミッション: defeat_enemiesはmissionStatsで集計してバトル終了時に一括更新
                if (window.game?.missionStats) window.game.missionStats.enemiesDefeated++;

                // --- BOSS RUSH CHECK ---
                if (this.stageData.isBossRush && this.stageData.bosses) {
                    this.currentBossIndex++;
                    if (this.currentBossIndex < this.stageData.bosses.length) {
                        // NEXT BOSS!
                        this.enemyTankType = this.stageData.bosses[this.currentBossIndex];
                        const typeInfo = CONFIG.ENEMY.TYPES[this.enemyTankType] || CONFIG.ENEMY.TYPES.NORMAL;

                        // Recalculate stats for the new boss
                        this.enemyTankHP = this.stageData.enemyHP || 1000;
                        this.enemyTankMaxHP = this.enemyTankHP;
                        this.enemyFireInterval = (this.stageData.enemyFireInterval || CONFIG.ENEMY.BASE_FIRE_INTERVAL * 1.2) * (typeInfo.fireRateMod || 1.0);
                        this.enemyFireTimer = this.enemyFireInterval;
                        this.enemyDodgeProb = typeInfo.dodgeProb || 0.1;

                        // Effect & Reset
                        if (window.game) {
                            window.game.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.3, `NEXT BOSS: ${this.enemyTankType}!`, '#FF0');
                            window.game.sound.play('confirm');
                            window.game.camera_shake = 12;
                            window.game.screenFlash = 8;
                        }

                        // Return to battle state instead of finishing
                        this.phase = 'battle';
                        return;
                    }
                }

                // skipInvasionフラグがある場合は直接勝利へ
                if (this.stageData.skipInvasion) {
                    this.invasionAvailable = false;
                    this.phase = 'victory'; // 侵攻なしで即勝利
                } else {
                    this.invasionAvailable = true;
                }

                // Spawn powerup on enemy defeat
                if (window.game && Math.random() < CONFIG.POWERUP_SPAWN_RATE) {
                    window.game.powerupManager.spawnRandomPowerup(
                        CONFIG.CANVAS_WIDTH - 100 + Math.random() * 100,
                        150 + Math.random() * 100
                    );
                    if (window.game.sound) window.game.sound.play('coin');
                }
            }
        }

        // Check defeat (同時撃破の場合はプレイヤー勝利を優先)
        if (this.playerTankHP <= 0 && this.phase !== 'defeat' && this.phase !== 'enemy_disabled') {
            this.phase = 'defeat';
        }

        // Check projectile collisions (Interception)
        this.checkProjectileCollisions();
    }

    checkProjectileCollisions() {
        // パフォーマンス改善: playerと enemyを事前分離→O(n²)→O(p*e)に削減
        const projs = this.projectiles;
        const pLen = projs.length;
        if (pLen < 2) return; // 弾が1個以下は衝突なし

        // 4フレームに1回だけチェック（視覚的影響ほぼなし、CPU大幅削減）
        if (window.game && window.game.frame % 4 !== 0) return;

        // プレイヤー弾と敵弾を分離
        const playerProjs = [];
        const enemyProjs = [];
        for (let i = 0; i < pLen; i++) {
            const p = projs[i];
            if (!p.active || p.phase !== 'flying') continue;
            if (p.dir === 1) playerProjs.push(p);
            else if (p.dir === -1) enemyProjs.push(p);
        }

        const pP = playerProjs.length;
        const eP = enemyProjs.length;
        if (pP === 0 || eP === 0) return;

        for (let pi = 0; pi < pP; pi++) {
            const pp = playerProjs[pi];
            if (!pp.active) continue;
            for (let ei = 0; ei < eP; ei++) {
                const ep = enemyProjs[ei];
                if (!ep.active) continue;

                const dx = pp.x - ep.x;
                const dy = pp.y - ep.y;
                if (dx * dx + dy * dy < 1600) { // 距离40px以内（40²=1600）
                    if (pp.onHit) pp.onHit();
                    if (ep.onHit) ep.onHit();
                    pp.active = false;
                    ep.active = false;
                    if (window.game) {
                        const mid = Renderer._toUpperCoord((pp.x + ep.x) / 2, (pp.y + ep.y) / 2, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT * 0.5);
                        window.game.particles.explosion(mid.x, mid.y, '#FFF', 8);
                        window.game.sound.play('confirm');
                    }
                    this.specialGauge = Math.min(CONFIG.SPECIAL.GAUGE_MAX, this.specialGauge + 2);
                    break; // pp は既にヒット済みなので内側ループ脱出
                }
            }
        }
    }

    triggerSpecial() {
        if (this.specialGauge < CONFIG.SPECIAL.GAUGE_MAX) return false;
        this.specialGauge = 0;
        if (window.game) {
            window.game.specialAnimTimer = 55; // カットイン演出(約0.9秒)
            window.game.specialImpactTimer = 55; // インパクトエフェクト演出（テキスト25f+衝撃波30f）
            try { window.game.sound.play('victory'); } catch (e) { }
            window.game.screenFlash = 8;
            // ★バグ修正: デイリーミッション進捗はバトル終了時に missionStats.specialsUsed
            // で一括更新するため、ここでの即時呼び出しを削除（二重カウント防止）
        }
        return true;
    }

    triggerSupport() {
        if (!window.game) return;
        // Use standard deck selection for support too, effectively just giving "more ammo"
        const deck = (window.game.saveData && window.game.saveData.deck && window.game.saveData.deck.length > 0)
            ? window.game.saveData.deck
            : ['rock'];

        const type = deck[Math.floor(Math.random() * deck.length)];
        window.game.ammoDropper.spawnItem(window.game.tank.dropX, window.game.tank.dropY, window.game.tank.dropW, type);
        window.game.sound.play('victory');
        // Show message
        window.game.particles.damageNum(CONFIG.TANK.OFFSET_X + 200, CONFIG.TANK.OFFSET_Y + 100, 'あきらめるな！', '#FFF');
    }

    // ステージ進行ボーナスを計算するヘルパー（playerFire / onPlayerFire で共用）
    _calcStageBonus() {
        const clearedCount = (window.game && window.game.saveData && window.game.saveData.clearedStages)
            ? window.game.saveData.clearedStages.length : 0;
        // 0〜5クリア: +0, 6〜10: +8/stage, 11〜20: +4/stage, 21以上: 固定+80
        if (clearedCount <= 5)  return 0;
        if (clearedCount <= 10) return (clearedCount - 5) * 8;
        if (clearedCount <= 20) return 40 + (clearedCount - 10) * 4;
        return 80;
    }

    playerFire(type = 'rock') {
        const info = CONFIG.AMMO_TYPES[type];
        if (!info) return;

        // Normal ammo: create projectile
        const px = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W + 20 + this.playerTankX; // Adjusted for player tank movement
        const py = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2 + this.playerTankY; // Adjusted for player tank movement

        // Target random position on enemy tank
        const tx = CONFIG.CANVAS_WIDTH - 120 + this.enemyTankX; // Adjusted for enemy tank movement
        const ty = CONFIG.TANK.OFFSET_Y + 50 + Math.random() * 200 + this.enemyTankY; // Adjusted for enemy tank movement

        const stageBonus = this._calcStageBonus();
        const damage = Math.floor((info.damage + stageBonus) * (this.attackMultiplier || 1.0));
        this.projectiles.push(new Projectile(px, py, tx, ty, type, 1, damage));
        if (info.effect) {
            this.projectiles[this.projectiles.length - 1].effect = info.effect;
        }
        if (window.game) {
            window.game.sound.play('cannon');
            window.game.particles.smoke(px, py, 3); // パフォーマンス改善: 6→3
        }
    }

    // Player cannon fired
    onPlayerFire(fireResult) {
        if (!fireResult) return;
        const info = CONFIG.AMMO_TYPES[fireResult.type];
        if (!info) return;
        // プレイヤー砲口フラッシュ
        this.playerMuzzleFlash = 8;

        if (info.heal) {
            // Herb heals player tank
            this.playerTankHP = Math.min(this.playerTankMaxHP, this.playerTankHP + info.heal);
            if (window.game) {
                window.game.sound.play('heal');
                window.game.particles.damageNum(
                    CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W / 2,
                    CONFIG.TANK.OFFSET_Y + 50,
                    `+${info.heal}HP`, '#4CAF50'
                );
            }
            return;
        }
        if (info.block) {
            this.shieldActive = true;
            return;
        }
        // きんのたまご：仲間全員にEXP+50
        if (info.special === 'expBoost' || (fireResult.type === 'exp_boost')) {
            if (window.game && window.game.allies) {
                window.game.allies.forEach(ally => ally.gainExp(50));
                window.game.particles.damageNum(
                    CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W / 2,
                    CONFIG.TANK.OFFSET_Y + 50,
                    'みんな EXP+50！', '#FFF176'
                );
                window.game.sound.play('powerup');
            }
            return;
        }
        // ターボパーツ：装填時間を600フレーム間(10秒)半減
        if (fireResult.type === 'turbo_parts') {
            this.turboBoostTimer = Math.min(1800, (this.turboBoostTimer || 0) + 600); // ★最大30秒上限
            if (window.game) {
                window.game.particles.damageNum(
                    CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W / 2,
                    CONFIG.TANK.OFFSET_Y + 50,
                    'ターボ加速！', '#03A9F4'
                );
                window.game.sound.play('powerup');
            }
            return;
        }
        // おうかん：大ダメージ(120) + 敵5秒スタン（即勝利は廃止・弱体化）
        if (info.special === 'victory') {
            const crownDmg = 120;
            this.enemyTankHP = Math.max(0, this.enemyTankHP - crownDmg);
            this.enemyFireTimer = (this.enemyFireTimer || 0) + 300; // 5秒スタン追加
            this.enemyDamageFlash = 30;
            if (window.game) {
                window.game.sound.play('destroy');
                window.game.hitStop = Math.max(window.game.hitStop, 10);
                window.game.camera_shake = Math.max(window.game.camera_shake, 12);
                window.game.particles.explosion(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 100, '#FFD700', 60);
                window.game.particles.damageNum(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 60, `${crownDmg}!!`, '#FFD700');
                window.game.particles.rateEffect(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 30, '👑 王の一撃！5秒スタン', '#FFD700');
            }
            return;
        }
        // もくのよろい：ダメージ軽減バリア（defense値をシールド量として付与）
        if (info.defense) {
            this.woodArmorActive = true;
            this.woodArmorHP = (this.woodArmorHP || 0) + info.defense;
            if (window.game) {
                window.game.sound.play('confirm');
                window.game.particles.damageNum(
                    CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W / 2,
                    CONFIG.TANK.OFFSET_Y + 50,
                    `守備+${info.defense}`, '#8D6E63'
                );
            }
            return;
        }
        // Normal ammo: create projectile
        const px = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W + 20 + this.playerTankX; // Adjusted for player tank movement
        const py = fireResult.y + this.playerTankY; // Adjusted for player tank movement

        // Target random position on enemy tank
        const tx = CONFIG.CANVAS_WIDTH - 120 + this.enemyTankX; // Adjusted for enemy tank movement
        const ty = CONFIG.TANK.OFFSET_Y + 50 + Math.random() * 200 + this.enemyTankY; // Adjusted for enemy tank movement

        let mult = fireResult.damageMultiplier || 1;

        // Apply DOUBLE_AMMO powerup
        if (window.game && window.game.powerupManager && window.game.powerupManager.hasEffect('doubleAmmo')) {
            mult *= window.game.powerupManager.getEffectValue('doubleAmmo', 'multiplier');
        }

        const upgradeMult = this.attackMultiplier || 1.0;
        const totalMult = mult * upgradeMult;

        // ステージ進行ボーナス（_calcStageBonus()で playerFire() と統一）
        const stageBonus = this._calcStageBonus();
        const damage = Math.floor((info.damage + stageBonus) * totalMult);

        const p = new Projectile(px, py, tx, ty, fireResult.type, 1, damage);

        // Scale projectile visual if powered up
        if (mult > 1) {
            p.scale = Math.min(2.0, mult);
        }

        if (info.effect) {
            p.effect = info.effect;
        }
        this.projectiles.push(p);

        // ★2本目の弾：反対側の砲口から（上砲口から撃った→下砲口からも、逆も同様）
        // cannon_doubleまたは二連装砲カスタムで常時2本、それ以外は50%で2本目
        const cannonId = (window.game && window.game.saveData && window.game.saveData.tankCustom && window.game.saveData.tankCustom.cannon) || 'cannon_normal';
        const isDouble = cannonId === 'cannon_double';
        if (isDouble || Math.random() < 0.5) {
            const ox = CONFIG.TANK.OFFSET_X;
            const oy = CONFIG.TANK.OFFSET_Y;
            const ih = CONFIG.TANK.INTERIOR_H;
            // 上砲口と下砲口のY座標
            const topCannonY = oy + 65;
            const botCannonY = oy + ih - 65;
            // 現在の砲口と反対側から発射
            const py2 = (py < oy + ih / 2) ? botCannonY : topCannonY;
            const ty2 = CONFIG.TANK.OFFSET_Y + 50 + Math.random() * 200 + this.enemyTankY;
            const damage2 = Math.floor(damage * 0.7); // 2本目は70%ダメージ
            const p2 = new Projectile(px, py2, tx, ty2, fireResult.type, 1, damage2);
            if (mult > 1) p2.scale = Math.min(1.5, mult * 0.8);
            if (info.effect) p2.effect = info.effect;
            this.projectiles.push(p2);
        }
    }


    launchAllyMissile(allyData, onHitCallback) {
        if (!allyData) { if (onHitCallback) onHitCallback(); return; }
        // Start from Player Tank
        const px = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W / 2 + this.playerTankX;
        const py = CONFIG.TANK.OFFSET_Y - 20 + this.playerTankY; // Top hatch?

        // Target: Center of Enemy Tank
        const tx = CONFIG.CANVAS_WIDTH - 150 + this.enemyTankX;
        const ty = CONFIG.TANK.OFFSET_Y + 150 + this.enemyTankY;

        // ダメージ計算：仲間を大砲に投げ込んだ時のダメージは30固定
        const totalDamage = 30;

        const p = new Projectile(px, py, tx, ty, 'missile', 1, totalDamage);
        p.onHit = () => {
            // Explosion
            if (window.game) {
                window.game.particles.explosion(tx, ty, allyData.color || '#FFF', 40);
                window.game.sound.play('destroy');
                window.game.camera_shake = 12;
                window.game.particles.damageNum(tx, ty - 50, totalDamage.toString() + '!', '#F00');
            }

            // Damage enemy tank
            this.enemyTankHP = Math.max(0, this.enemyTankHP - totalDamage);
            this.enemyDamageFlash = 20;

            // Disable enemy fire temporarily (Stun)
            this.enemyFireTimer += 90; // +1.5 seconds delay (Nerfed)

            // Callback to return ally
            if (onHitCallback) onHitCallback();
        };
        this.projectiles.push(p);
    }

    enemyFire(forcedAmmo) {
        // Attack Patterns
        const rand = Math.random();
        // ★バグ修正D: STAGES.findIndex()が-1を返すと stageLevel=0 になり
        // 敵の攻撃パターンが全て無効化される（イベントステージ等で稀に発生）
        const stageIdx = (this.stageData && this.stageData.id)
            ? STAGES.findIndex(s => s && s.id === this.stageData.id)
            : -1;
        const stageLevel = stageIdx >= 0 ? stageIdx + 1 : 1; // -1の場合はレベル1にフォールバック

        let type = forcedAmmo || 'rock';
        let count = 1;

        // ★バグ修正: forcedAmmo が指定されている場合はステージパターン選択をスキップする。
        // 以前は forcedAmmo で 'fire' などを渡してもステージパターン判定で無条件上書きされていた。
        if (!forcedAmmo) {
            // Pattern selection based on stage level
            // ★バグ修正④: 0.15 * stageLevel がステージ7以上で 1.0 超え → 特殊弾100%確定バグを修正
            // Math.min で上限 0.75 にキャップ（最高難度でも25%は通常弾が来る）
            if (rand < Math.min(0.75, 0.15 * stageLevel)) {
                // Special ammo
                const specials = ['bomb', 'ironball', 'arrow', 'shield'];
                type = specials[Math.floor(Math.random() * specials.length)];
            }

            // BOSS/TRUE_BOSS の specialAmmoProb による魔法弾上書き
            // （update()側でも判定しているが、forcedAmmoなし時のenemyFire()直接呼び出しにも対応）
            const typeInfo = CONFIG.ENEMY.TYPES[this.enemyTankType] || CONFIG.ENEMY.TYPES.NORMAL;
            const specialProb = typeInfo.specialAmmoProb || 0;
            if (specialProb > 0 && Math.random() < specialProb) {
                const magicAmmo = ['fire', 'ice', 'thunder'];
                type = magicAmmo[Math.floor(Math.random() * magicAmmo.length)];
            }
        }

        if (stageLevel >= 2 && rand > 0.7) count = 2; // Burst fire
        if (stageLevel >= 4 && rand > 0.85) count = 3; // Triple burst

        const px = CONFIG.CANVAS_WIDTH - 50 + this.enemyTankX; // Adjusted for enemy tank movement

        for (let i = 0; i < count; i++) {
            const delay = Math.round(i * 15); // 15フレーム間隔（≒250ms）
            this.burstQueue.push({
                delay, fn: () => {
                    if (!window.game || window.game.state !== 'battle' || this.phase !== 'battle') return;

                    // Check Ammo Type behavior
                    const info = CONFIG.AMMO_TYPES[type];
                    const safeType = (info && info.block) ? 'rock' : type;

                    const py = CONFIG.TANK.OFFSET_Y + 80 + Math.random() * 100 + this.enemyTankY;
                    const tx = CONFIG.TANK.OFFSET_X + 100 + this.playerTankX;
                    const ty = CONFIG.TANK.OFFSET_Y + Math.random() * CONFIG.TANK.INTERIOR_H + this.playerTankY;

                    this.projectiles.push(new Projectile(px, py, tx, ty, safeType, -1, this.enemyDamage));

                    if (window.game) {
                        window.game.sound.play('cannon');
                        window.game.particles.smoke(px, py, 2); // パフォーマンス改善: 6→2
                    }
                }
            });
        }

        // Potential enemy movement/dodge
        if (Math.random() < 0.3) {
            this.enemyTankTargetX = (Math.random() - 0.5) * 60;
            this.enemyTankTargetY = (Math.random() - 0.5) * 40;
            this.enemyDodgeTimer = 30;
        }
    }

    // === ラスボス必殺技 ===
    activateBossSpecial() {
        this.bossSpecialActive = true;
        this.bossSpecialPhase = 0;

        const specialTypes = [
            'barrage',      // 弾幕攻撃
            'laser',        // レーザービーム
            'meteor',       // 隕石落下
            'shockwave'     // 衝撃波
        ];

        // 真ボスはより強力な技を使う
        const isTrueBoss = this.stageData && this.stageData.tankType === 'TRUE_BOSS';
        const specialType = isTrueBoss
            ? specialTypes[Math.floor(Math.random() * specialTypes.length)]
            : (Math.random() < 0.5 ? 'barrage' : 'meteor');
        this.bossSpecialType = specialType; // ui.jsで技名表示に使う

        // 警告演出
        if (window.game) {
            window.game.camera_shake = 12;
            window.game.screenFlash = 8;
            window.game.sound.play('invade');
            window.game.particles.rateEffect(
                CONFIG.CANVAS_WIDTH / 2,
                CONFIG.CANVAS_HEIGHT * 0.3,
                '⚠ 必殺技！ ⚠',
                '#FF0000'
            );
        }

        // 必殺技実行（60フレーム後 = 約1秒）
        this.burstQueue.push({
            delay: 60, fn: () => {
                if (!window.game || window.game.state !== 'battle') return;

                switch (specialType) {
                    case 'barrage':
                        this.bossBarrageAttack();
                        break;
                    case 'laser':
                        this.bossLaserAttack();
                        break;
                    case 'meteor':
                        this.bossMeteorAttack();
                        break;
                    case 'shockwave':
                        this.bossShockwaveAttack();
                        break;
                }
            }
        });

        // 必殺技終了（240フレーム後 = 約4秒）
        this.burstQueue.push({
            delay: 240, fn: () => {
                this.bossSpecialActive = false;
                this.bossSpecialType = null;
            }
        });
    }

    // 弾幕攻撃（扇状に大量の弾を発射）
    bossBarrageAttack() {
        const bulletCount = 10; // 15 -> 10
        const px = CONFIG.CANVAS_WIDTH - 50;
        const py = CONFIG.TANK.OFFSET_Y + 150;

        for (let i = 0; i < bulletCount; i++) {
            const delay = Math.round(i * 5); // 5フレーム間隔（≒80ms）
            this.burstQueue.push({
                delay, fn: () => {
                    if (!window.game || window.game.state !== 'battle') return;

                    // 扇状にばらまく
                    const angle = -Math.PI / 3 + (Math.PI * 2 / 3) * (i / bulletCount);
                    // ★バグ修正③: playerTankX を考慮して実際のタンク位置を狙う
                    const tx = CONFIG.TANK.OFFSET_X + 100 + this.playerTankX + Math.cos(angle) * 200;
                    const ty = CONFIG.TANK.OFFSET_Y + this.playerTankY + Math.sin(angle) * 100 + 150;

                    const type = Math.random() < 0.3 ? ['fire', 'ice', 'thunder'][Math.floor(Math.random() * 3)] : 'rock';
                    this.projectiles.push(new Projectile(px, py, tx, ty, type, -1, Math.round(this.enemyDamage * 0.8)));

                    window.game.sound.play('cannon');
                    window.game.particles.smoke(px, py, 3);
                }
            });
        }
    }

    // レーザービーム（直線的な連続攻撃）
    bossLaserAttack() {
        // フレームベース処理 - update() の laserActive ブロックで処理
        this.laserActive = true;
        this.laserFrames = 0;
    }

    // 隕石落下（上から大きな弾が降ってくる）
    bossMeteorAttack() {
        const meteorCount = 8;

        for (let i = 0; i < meteorCount; i++) {
            const delay = Math.round(i * 18); // 18フレーム間隔（≒300ms）
            this.burstQueue.push({
                delay, fn: () => {
                    if (!window.game || window.game.state !== 'battle') return;

                    const px = CONFIG.TANK.OFFSET_X + Math.random() * CONFIG.TANK.INTERIOR_W;
                    const py = 0; // 画面上から
                    const tx = px;
                    const ty = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;

                    this.projectiles.push(new Projectile(px, py, tx, ty, 'bomb', -1, Math.round(this.enemyDamage * 1.5)));

                    window.game.particles.sparkle(px, py, '#FFA500');
                    window.game.sound.play('destroy');
                }
            });
        }
    }

    // 衝撃波（画面全体を揺らす強力な攻撃）
    bossShockwaveAttack() {
        if (!window.game) return;

        // 大きな衝撃波エフェクト
        window.game.camera_shake = 12;
        window.game.screenFlash = 8;

        // 中央から放射状に
        const waveCount = 12; // 20 -> 12
        for (let i = 0; i < waveCount; i++) {
            const delay = Math.round(i * 3); // 3フレーム間隔（≒50ms）
            this.burstQueue.push({
                delay, fn: () => {
                    if (!window.game || window.game.state !== 'battle') return;

                    const angle = (Math.PI * 2 * i) / waveCount;
                    const px = CONFIG.CANVAS_WIDTH - 150;
                    const py = CONFIG.TANK.OFFSET_Y + 150;
                    const tx = px + Math.cos(angle) * 300;
                    const ty = py + Math.sin(angle) * 200;

                    this.projectiles.push(new Projectile(px, py, tx, ty, 'ironball', -1, this.enemyDamage));

                    window.game.particles.spark(px, py, Math.cos(angle) * 10, Math.sin(angle) * 10, '#FFD700');
                }
            });
        }

        window.game.sound.play('destroy');
    }

    // === 形態変化システム ===
    transitionToPhaseTwo() {
        // 第二形態への変化処理
        this.bossPhase = 2;

        // HPを第二形態の値に設定
        const phase2HP = this.stageData.enemyHPPhase2 || 2666;
        this.enemyTankHP = phase2HP;
        this.enemyTankMaxHP = phase2HP;

        // ★ 第二形態スキン切り替え（enemySkinPhase2が設定されている場合）
        if (this.stageData.enemySkinPhase2) {
            this.enemySkinType = this.stageData.enemySkinPhase2;
        }

        // BGMを最強の音楽に変更
        if (window.game && window.game.sound) {
            window.game.sound.playBGM('final_boss');
        }

        // 画面演出（フラッシュ＋テキスト）
        if (window.game) {
            window.game.camera_shake = 15;
            // 白フラッシュ→赤フラッシュの2段演出
            window.game.screenFlash = 12;
            window.game.screenFlashType = 'white';
            window.game.particles.rateEffect(
                CONFIG.CANVAS_WIDTH / 2,
                CONFIG.CANVAS_HEIGHT * 0.3,
                '⚠ 第二形態！ ⚠',
                '#FF00FF'
            );
            // 少し遅らせて2発目のテキスト（burstQueueで代替）
            this.burstQueue.push({ delay: 40, fn: () => {
                if (!window.game) return;
                window.game.screenFlash = 8;
                window.game.screenFlashType = 'hit';
                window.game.particles.rateEffect(
                    CONFIG.CANVAS_WIDTH / 2,
                    CONFIG.CANVAS_HEIGHT * 0.45,
                    '真の姿を見よ！',
                    '#FF4444'
                );
            }});
        }

        // 形態変化完了
        this.phaseTransitionActive = false;
    }

    draw(ctx) {
        // Projectiles are drawn by Renderer on upper screen, 
        // but we keep this method if other battle layers are needed.
    }
}

window.BattleManager = BattleManager;
window.Projectile = Projectile;
