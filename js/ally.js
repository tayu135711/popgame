// ======================================
// ALLY - Friendly Slime Assistant
// ======================================

class AllySlime {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.id = config.id || 'ally';
        this.name = config.name || 'Slime';
        this.type = config.type || 'slime'; // slime, boss, defender, drone
        this.w = CONFIG.PLAYER.WIDTH * 0.9;
        this.h = CONFIG.PLAYER.HEIGHT * 0.9;
        this.vx = 0;
        this.vy = 0;
        this.dir = 1;
        this.speed = CONFIG.ALLY.SPEED; // レア度ベース速度はコンストラクタ後半で設定
        this.state = 'idle'; // idle, chase_item, carry_item
        // ※ heldItem は廃止 (heldItems 配列に統一)
        this.target = null;
        this.thinkTimer = 0;
        this.frame = Math.floor(Math.random() * 100);

        // Custom Color
        this.color = config.color || '#4CAF50';
        this.darkColor = config.darkColor || '#2E7D32';

        this.level = config.level || 1; // Default Level 1

        // === レア度別ステータス ===
        // configのrarity優先、なければ type→rarity マップでフォールバック
        this.rarity = config.rarity || CONFIG.ALLY_TYPE_RARITY[this.type] || 1;
        const rarityStats = CONFIG.ALLY_RARITY_STATS[this.rarity] || CONFIG.ALLY_RARITY_STATS[1];

        // Speed: レア度 × タイプ補正
        const typeSpeedMult =
            (this.type === 'master' || this.type === 'devil') ? 1.4 :
                (this.type === 'ninja' || this.type === 'slime_metal' || this.type === 'steel_ninja') ? 1.3 :
                    (this.type === 'defender' || this.type === 'drone') ? 1.1 : 1.0;
        this.speed = CONFIG.ALLY.SPEED * rarityStats.speedMult * typeSpeedMult;

        // Size Scaling: level による成長 (0.25 per level, max 2.5x)
        const scale = 1 + Math.min(2.5, (this.level - 1) * 0.25);
        this.w = (CONFIG.PLAYER.WIDTH * 0.9) * scale;
        this.h = (CONFIG.PLAYER.HEIGHT * 0.9) * scale;

        // BaseDamage: レア度由来 (+大型補正)
        const isLarge = (this.type === 'titan_golem' || this.type === 'platinum_golem' || this.type === 'dragon_lord');
        this.baseDamage = isLarge ? Math.floor(rarityStats.baseDamage * 1.5) : rarityStats.baseDamage;

        if (isLarge) {
            this.w *= 1.15;
            this.h *= 1.15;
            this.speed *= 0.80;
        }

        // ★2コスト超大型専用：タイタン・ドラゴンロードは別格に強い
        if (this.type === 'titan_golem') {
            this.baseDamage = Math.floor(rarityStats.baseDamage * 4.0); // 4倍ダメージ
            this.speed *= 1.0; // 速度維持
            this.damageReduction = 0.55; // 55%ダメージカット（超重装甲）
            this.titanRageMode = false;  // レイジモードフラグ
            this.shieldTimer = 0;        // シールドタイマー
            this.invincibleTimer = 0;  // 無敵タイマー（platinum_golem シールド等）
        } else if (this.type === 'dragon_lord') {
            this.baseDamage = Math.floor(rarityStats.baseDamage * 3.5); // 3.5倍ダメージ
            this.speed *= 1.15; // やや速い
            this.dragonAuraTimer = 0;    // 炎オーラタイマー
            this.dragonBuffActive = false; // バフフラグ
        }

        // === 配合産ボーナス（配合で作ったキャラは明確に強い）===
        const FUSION_TYPES = new Set([
            'slime_purple', 'slime_aqua', 'platinum_slime',
            'steel_ninja', 'shadow_mage', 'arch_angel',
            'sage_slime', 'alchemist', 'fortress_golem',
            'royal_guard', 'paladin', 'war_machine',
            'wyvern_lord', 'legend_metal', 'phantom',
            'angel_golem', 'titan_golem', 'dragon_lord', 'platinum_golem',
        ]);
        this.isFusionProduct = FUSION_TYPES.has(this.type) || config.isFusion === true;
        if (this.isFusionProduct) {
            this.baseDamage = Math.floor(this.baseDamage * 1.4); // +40%ダメージ
            this.speed *= 1.15;                                    // +15%速度
        }

        // === 配合連鎖ボーナス廃止（×1.4ボーナスで十分。インフレ防止）===
        // fusionDmgBonus は以前の互換性のため読むが乗算しない
        if (config.fusionDmgBonus && config.fusionDmgBonus > 1) {
            this.chainDepth = config.chainDepth || 1;
            // ボーナスは適用しない（×1.4で差別化済み）
        }

        // Level scaling: +15% per level（以前は+25%でインフレ気味だったため下方修正）
        this.damage = Math.floor(this.baseDamage * (1 + (this.level - 1) * 0.15));

        // 攻撃インターバル: レア度が高いほど速い
        this.atkInterval = Math.max(6, rarityStats.atkInterval - (this.level - 1) * 2);
        if (this.isFusionProduct) {
            this.atkInterval = Math.max(6, Math.floor(this.atkInterval * 0.8)); // 攻撃速度も20%向上
        }

        // Fusion State
        this.isStacked = false;
        this.isDead = false; // 死亡フラグ（フュージョン吸収時にtrueになる）
        this.fusionThrown = false; // プレイヤーが手動で投げた時のみtrue（自動突撃では合体しない）
        this.heldItems = []; // Up to 2 items

        // === 特殊能力システム ===
        this.specialCooldown = 0; // 特殊能力のクールダウン
        this.passiveTimer = 0; // パッシブ効果のタイマー

        // タイプ別の特性 (レア度ベースのクリティカル確率)
        this.criticalChance = rarityStats.critChance;
        // ★バグ修正①: titan_golem は上で 0.55 を設定済みのため上書きしない
        if (this.damageReduction === undefined || this.damageReduction === 0) {
            this.damageReduction = (this.type === 'defender' || this.type === 'golem' ||
                this.type === 'fortress_golem') ? 0.3 : 0;
        }

        // フレームベースのバーストキュー（setTimeout代替）
        this.burstQueue = []; // [{delay, fn}] - delayはフレーム数

        // === EXPシステム ===
        this.exp = config.exp || 0;
        this.expToNextLevel = this._calcExpToNextLevel(this.level);
    }

    // EXP→次Lv必要経験値計算
    _calcExpToNextLevel(lv) {
        return Math.floor(100 * Math.pow(lv, 1.5));
    }

    // EXP獲得（攻撃ヒット時・バトル終了時に呼ぶ）
    gainExp(amount) {
        if (!amount || amount <= 0) return;
        this.exp = (this.exp || 0) + amount;
        while (this.exp >= this.expToNextLevel && this.level < 10) {
            this.exp -= this.expToNextLevel;
            this.level++;
            this.expToNextLevel = this._calcExpToNextLevel(this.level);
            this._recalcLevelStats();
            if (window.game) {
                window.game.sound.play('powerup');
                window.game.particles.rateEffect(
                    this.x + this.w / 2, this.y - 20,
                    `${this.name} Lv.${this.level}！`, '#FFD700'
                );
                window.game.camera_shake = 6;
            }
        }
    }

    // レベルアップ後のステータス再計算
    _recalcLevelStats() {
        const rarityStats = CONFIG.ALLY_RARITY_STATS[this.rarity] || CONFIG.ALLY_RARITY_STATS[1];
        const isLarge = (this.type === 'titan_golem' || this.type === 'platinum_golem' || this.type === 'dragon_lord');
        let bd = isLarge ? Math.floor(rarityStats.baseDamage * 1.5) : rarityStats.baseDamage;
        // ★バグ修正①: コンストラクタの乗算順序に合わせる
        // コンストラクタでは titan/dragon の固有倍率を先に適用し、その後 isFusionProduct × 1.4 を乗せる。
        // 旧コードは逆順だったため Math.floor の切り捨て誤差でダメージがコンストラクタと乖離していた。
        if (this.type === 'titan_golem') bd = Math.floor(rarityStats.baseDamage * 4.0);
        else if (this.type === 'dragon_lord') bd = Math.floor(rarityStats.baseDamage * 3.5);
        if (this.isFusionProduct) bd = Math.floor(bd * 1.4);
        this.baseDamage = bd;
        // ★バグ修正③: コンストラクタと同じ 0.15 を使う（0.25 はレベルアップ時に急激すぎた）
        this.damage = Math.floor(bd * (1 + (this.level - 1) * 0.15));
        this.atkInterval = Math.max(6, rarityStats.atkInterval - (this.level - 1) * 2);
        if (this.isFusionProduct) this.atkInterval = Math.max(6, Math.floor(this.atkInterval * 0.8));
    }

    // === 容量ゲッター（計算を一箇所に集約・バグ防止） ===
    get capacity() {
        const baseCapacity =
            (this.type === 'titan_golem' || this.type === 'platinum_golem' || this.type === 'dragon_lord') ? 3
            : (this.type === 'defender' || this.type === 'boss' || this.type === 'golem') ? 2
            : 1;
        const fusionBonus = (this.level || 1) > 1 ? 1 : 0;
        return baseCapacity + fusionBonus;
    }

    update(tank, ammoItems, invader) {
        // window.game を毎回グローバル参照するのは重いのでローカルキャッシュ
        const g = window.game;

        if (this.isStacked) {
            this.updateStacked(g ? (g.invader || null) : null);
            return;
        }

        this.frame++;
        if (this.thinkTimer > 0) this.thinkTimer--;
        if (this.specialCooldown > 0) this.specialCooldown--;
        this.passiveTimer++;
        // ★ プラチナゴーレムのシールドタイマーデクリメント
        if ((this.invincibleTimer || 0) > 0) this.invincibleTimer--;

        // バーストキュー処理（setTimeout代替）
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

        // 0a. Charge State (自動突撃 - 合体なし)
        if (this.state === 'charge') {
            this.vy += 0.5;
            this.vx *= 0.99;
            const leftWall = CONFIG.TANK.OFFSET_X + 20;
            const rightWall = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W - 20;
            if (this.x < leftWall) { this.x = leftWall; this.vx *= -0.5; }
            if (this.x > rightWall) { this.x = rightWall; this.vx *= -0.5; }
            this.resolveCollision(tank);
            const T = CONFIG.TANK;
            const midY = T.OFFSET_Y + (T.INTERIOR_H / 2);
            if (this.vy > 0 && Math.abs((this.y + this.h) - midY) < 20) {
                this.y = midY - this.h;
                this.state = 'idle'; this.vx = 0; this.vy = 0;
                return;
            }
            if (this.collidedY && this.vy >= 0) {
                this.state = 'idle'; this.vx = 0; this.vy = 0;
                return;
            }
            return;
        }

        // 0b. Thrown State (プレイヤー手動投げ - 合体あり)
        if (this.state === 'thrown') {
            // Check collision with other allies
            if (this.checkFusionCollision()) return;

            // Apply Gravity
            this.vy += 0.5;
            this.vx *= 0.99;

            // Use resolveCollision() later to handle movement and floor/wall checks
            // We remove the manual x/y updates here.

            // Wall Bounds Check
            const leftWall = CONFIG.TANK.OFFSET_X + 20;
            const rightWall = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W - 20;

            if (this.x < leftWall) {
                this.x = leftWall;
                this.vx *= -0.5; // Bounce
            }
            if (this.x > rightWall) {
                this.x = rightWall;
                this.vx *= -0.5; // Bounce
            }

            this.resolveCollision(tank);

            // MANUAL LANDING LOGIC (Since tank.platforms is empty)
            const T = CONFIG.TANK;
            const midY = T.OFFSET_Y + (T.INTERIOR_H / 2); // Approximate 2F Floor

            // Check 2F Landing - Simple Proximity & Falling Down
            if (this.vy > 0 && Math.abs((this.y + this.h) - midY) < 20) {
                this.y = midY - this.h;
                this.state = 'idle';
                this.vx = 0;
                this.vy = 0;
                this.fusionThrown = false; // 着地でフラグリセット
                return;
            }

            // 1F Landing is handled by resolveCollision -> Physics.update (World Bounds)
            if (this.collidedY && this.vy >= 0) {
                this.state = 'idle';
                this.vx = 0;
                this.vy = 0;
                this.fusionThrown = false; // 着地でフラグリセット
                return;
            }
            return;
        }

        // --- KINGSLIME SPECIAL: KING PRESS ---
        if (this.state === 'king_jump') {
            this.vy += 0.8; // Heavy Gravity
            this.x += this.vx;
            this.y += this.vy;

            // Wall Bounds Check (Keep inside Tank)
            const leftWall = CONFIG.TANK.OFFSET_X + 20;
            const rightWall = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W - this.w - 20;

            if (this.x < leftWall) {
                this.x = leftWall;
                this.vx *= -0.5; // Bounce back
            }
            if (this.x > rightWall) {
                this.x = rightWall;
                this.vx *= -0.5; // Bounce back
            }

            // Check Landing (Floor)
            const floorY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H - 40;
            if (this.y > floorY) {
                this.y = floorY;
                this.state = 'idle';
                this.vx = 0;
                this.vy = 0;

                // LANDING IMPACT!
                if (g) {
                    g.camera_shake = 12;
                    g.sound.play('destroy'); // Heavy sound
                    // Visuals
                    g.particles.explosion(this.x + this.w / 2, this.y + this.h, '#FFD700', 50); // Shockwave

                    // Damage Enemies (Invaders)
                    // Check collision with the current invader
                    if (invader) {
                        const dx = (invader.x + invader.w / 2) - (this.x + this.w / 2);
                        const dy = (invader.y + invader.h / 2) - (this.y + this.h / 2);
                        const distSq = dx * dx + dy * dy;

                        // Range Hit
                        if (distSq < 160000) { // (√160000=400)
                            const kDir = (this.x < invader.x) ? 1 : -1;
                            invader.takeDamage(this.damage * 2, kDir);
                            g.particles.rateEffect(invader.x, invader.y - 50, "キングプレス！", '#FF0000');
                        }
                    }
                }
            }
            return; // Skip normal logic
        }

        // === 自動スキル発動（thrown/king_jump中は発動しない）===
        this.updateAutoSkill(invader, g);

        // 1. Logic / Decision Making
        if (this.thinkTimer <= 0) {
            this.thinkTimer = CONFIG.ALLY.THINK_INTERVAL;
            this.decideAction(tank, ammoItems, invader);
        }

        // Attack logic (if state is attack_invader)
        if (this.state === 'attack_invader' && this.target) {

            // --- UNIQUE SKILL: HEAL (Angel) ---
            // ※ ヒール処理はupdateAutoSkill()に統一。ここでは距離取りのみ担当。
            if (this.type === 'angel') {
                this.keepDistance(this.target, 200);
            }
            // --- UNIQUE SKILL: NINJA (Shuriken) ---
            else if (this.type === 'ninja') {
                const dist = Math.abs(this.target.x - this.x);
                if (dist < 300 && this.frame % 40 === 0) {
                    // Throw Shuriken
                    if (g) {
                        // ★バグ修正: 遠距離攻撃命中時もEXPを付与する
                        const _self = this;
                        const proj = new SimpleProjectile({
                            x: this.x + this.w / 2, y: this.y + this.h / 2,
                            vx: (this.target.x > this.x ? 1 : -1) * 8, vy: 0,
                            life: 60, damage: this.damage, w: 10, h: 10, type: 'shuriken', color: '#888'
                        });
                        proj.onHit = () => _self.gainExp(Math.max(1, Math.floor(_self.damage * 0.1)));
                        g.projectiles.push(proj);
                        g.sound.play('shoot');
                        this.vy = -2; // Hop
                    }
                }
                this.keepDistance(this.target, 150);
            }
            // --- UNIQUE SKILL: WIZARD (Magic) ---
            else if (this.type === 'wizard') {
                const dist = Math.abs(this.target.x - this.x);
                if (dist < 400 && this.frame % 70 === 0) {
                    // Cast Magic
                    if (g) {
                        // ★バグ修正: 遠距離攻撃命中時もEXPを付与する
                        const _self = this;
                        const proj = new SimpleProjectile({
                            x: this.x + this.w / 2, y: this.y + this.h / 2,
                            vx: (this.target.x > this.x ? 1 : -1) * 4, vy: 0,
                            life: 100, damage: this.damage, w: 12, h: 12, type: 'magic', color: '#AA00AA'
                        });
                        proj.onHit = () => _self.gainExp(Math.max(1, Math.floor(_self.damage * 0.1)));
                        g.projectiles.push(proj);
                        g.sound.play('shoot');
                        this.vy = -1; // Float
                    }
                }
                this.keepDistance(this.target, 250);
            }
            // --- UNIQUE SKILL: MASTER (Master Wave) ---
            else if (this.type === 'master') {
                const dist = Math.abs(this.target.x - this.x);
                if (dist < 400 && this.frame % 60 === 0) {
                    // Master Wave
                    if (g) {
                        // ★バグ修正: 遠距離攻撃命中時もEXPを付与する
                        const _self = this;
                        const proj = new SimpleProjectile({
                            x: this.x + this.w / 2, y: this.y + this.h / 2,
                            vx: (this.target.x > this.x ? 1 : -1) * 10, vy: 0, // Very Fast
                            life: 80,
                            damage: this.damage,  // レア度+レベルスケール適用
                            w: 20, h: 20, type: 'magic', color: '#00FFFF' // Cyan Wave
                        });
                        proj.onHit = () => _self.gainExp(Math.max(1, Math.floor(_self.damage * 0.1)));
                        g.projectiles.push(proj);
                        g.sound.play('shoot');
                        this.vy = -2;
                    }
                }
                this.keepDistance(this.target, 200);
            }
            // --- DEFAULT MELEE (Slime, Red, Blue, Metal, Golem, etc) ---
            else {
                // Simple melee: bump into them
                const dx = (this.target.x + this.target.w / 2) - (this.x + this.w / 2);
                const dy = (this.target.y + this.target.h / 2) - (this.y + this.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                // ★バグ修正: 大型ユニットは体が大きいのに攻撃範囲が40px固定で攻撃できなかった
                // titan/dragon/platinum は w*0.7 程度の距離まで攻撃可能に拡大
                const isLargeUnit = (this.type === 'titan_golem' || this.type === 'platinum_golem' || this.type === 'dragon_lord');
                const attackRange = isLargeUnit ? Math.max(40, this.w * 0.7) : 40;

                if (dist < attackRange && this.frame % this.atkInterval === 0) {
                    // Attack! 引数を共通化：(damage, knockbackDir) or (damage, sourceX, sourceY, force)
                    // invader は (amount, knockbackDir) なので、dx方向を渡す
                    if (this.target.takeDamage) {
                        const kDir = (this.x < this.target.x) ? 1 : -1;
                        // ★クリティカルヒット判定
                        const isCrit = Math.random() < (this.criticalChance || 0);
                        const finalDamage = isCrit ? Math.floor(this.damage * 1.5) : this.damage;
                        const hitResult = this.target.takeDamage(finalDamage, kDir);
                        // EXP獲得（攻撃ヒット時、ダメージの10%相当）
                        // ★バグ修正: 無敵中(takeDamageがfalseを返す場合)はEXPを付与しない
                        if (hitResult !== false) {
                            this.gainExp(Math.max(1, Math.floor(finalDamage * 0.1)));
                        }
                        if (isCrit && g) {
                            g.particles.rateEffect(
                                this.target.x + (this.target.w || 0) / 2,
                                this.target.y - 20,
                                'クリティカル！', '#FFD700'
                            );
                        }
                    }
                    if (g) {
                        g.sound.play('attack');
                        g.particles.hit(this.target.x, this.target.y);
                    }
                }
            }
        }

        // 2. Separation (Apply before movement to ensure collision handles it)
        this.applySeparation();

        // 3. Movement
        this.move(tank);

        // 4. Collision Resolution (Tank Walls)
        this.resolveCollision(tank);

        // 4. Interaction
        this.handleInteraction(tank, ammoItems);
    }

    updateStacked(invader) {
        // Turret Mode!
        this.frame++;

        // Bug fix: isStackedが解除されているのにupdateStackedが呼ばれた場合は即終了
        if (!this.isStacked) return;

        // Sync position with player
        if (window.game && window.game.player) {
            const p = window.game.player;
            // Bug fix: プレイヤーのstackedAllyが自分でない場合はisStackedをリセット
            if (p.stackedAlly !== this) {
                this.isStacked = false;
                return;
            }
            this.x = p.x;
            this.y = p.y - 15;
            this.dir = p.dir;
        }

        if (!invader) return;

        // Auto-attack invader if close
        const dx = (invader.x + invader.w / 2) - (this.x + this.w / 2);
        const dy = (invader.y + invader.h / 2) - (this.y + this.h / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // BEHAVIOR BY ROLE
        if (this.type === 'gunner' || this.type === 'boss') {
            // Machine Gun / Burst
            if (dist < 250 && this.frame % 15 === 0) { // Fast fire
                if (window.game) {
                    window.game.projectiles.push(new SimpleProjectile({
                        x: this.x + this.w / 2,
                        y: this.y + this.h / 2,
                        vx: Math.cos(angle) * 8,
                        vy: Math.sin(angle) * 8,
                        type: 'bullet',
                        owner: 'player',
                        damage: this.damage,
                    }));
                    window.game.sound.play('shoot');
                }
            }
        } else if (this.type === 'defender' || this.type === 'drone') {
            // Ice Shot (Slows enemy? High impact?)
            if (dist < 200 && this.frame % 60 === 0) { // Slow fire
                if (window.game) {
                    window.game.projectiles.push(new SimpleProjectile({
                        x: this.x + this.w / 2,
                        y: this.y + this.h / 2,
                        vx: Math.cos(angle) * 5,
                        vy: Math.sin(angle) * 5,
                        type: 'ice',
                        owner: 'player',
                        damage: this.damage,
                    }));
                    window.game.sound.play('shoot');
                }
            }
        }
    }

    decideAction(tank, ammoItems, invader) {
        // 0. タイプ別の基本役割を決定
        // ★バランス修正: 以前は invader がいると全員 defender になっていた（ヌルゲーの原因）
        // → タイプで役割を固定し、gunner系は侵入中も砲弾装填を続ける
        let role = 'gunner';
        if (this.type === 'defender' || this.type === 'drone') role = 'defender';

        // 専用戦闘職だけ invader に反応する
        // angel/healer 系はプレイヤー回復に専念（autoSkill で処理）
        // golem/titan/dragon は updateAutoSkill の必殺技で対応済みなのでここでは gunner のまま
        const FIGHTER_TYPES = new Set([
            'defender', 'drone',
            'royal_guard', 'fortress_golem',
            'steel_ninja', 'war_machine', 'wyvern_lord',
            'phantom', 'paladin',
            'kingslime',
        ]);
        if (invader && FIGHTER_TYPES.has(this.type)) role = 'defender';

        // HP危機（30%以下）になったら全員が戦闘参加（緊急防衛）
        const player = window.game && window.game.player;
        const hpCritical = player && (player.hp / (player.maxHp || 100)) < 0.30;
        if (invader && hpCritical) role = 'defender';

        // KINGSLIME Logic（FIGHTER_TYPES に含まれているので role='defender' は設定済み）
        if (this.type === 'kingslime') {
            // 5% Chance to do King Press if Invader is present (Balanced)
            if (invader && Math.random() < 0.05) {
                this.state = 'king_jump';
                this.vy = -18; // Super Jump

                // Calculate Trajectory to land on Enemy
                const hangTime = 45;
                const dx = (invader.x + invader.w / 2) - (this.x + this.w / 2);
                this.vx = dx / hangTime;

                // Clamp speed
                const maxVx = 15;
                if (this.vx > maxVx) this.vx = maxVx;
                if (this.vx < -maxVx) this.vx = -maxVx;

                if (window.game) window.game.sound.play('jump');
                return;
            }
            // Otherwise: FIGHTER_TYPES に含まれるので invader がいれば role='defender' は設定済み
            // Bug fix: invaderがいる場合は role='defender' を維持する（上書きしない）
            else if (!invader) role = 'gunner'; // インベーダーがいない時だけ装填役に回る
        }

        const T = CONFIG.TANK;
        const midY = T.OFFSET_Y + T.WALL_THICKNESS + 20 + (T.INTERIOR_H - T.WALL_THICKNESS * 2 - 40) / 2;
        const myFloor = (this.y + this.h / 2 < midY) ? 2 : 1;

        // === DEFENDER ROLE ===
        if (role === 'defender') {
            // Priority 1: Attack Invader (Anywhere, but mostly 1F)
            if (invader) {
                this.target = invader;
                this.state = 'attack_invader';
                return;
            }

            // Priority 2: Patrol 1F (Switch Guard / Entrance Guard)
            if (myFloor === 2) {
                // Go to 1F via stairs
                this.target = { x: this.x, y: midY + 50 }; // Crude "Go Down"
                this.state = 'patrol';
            } else {
                // Patrol random spot on 1F
                if (!this.target || this.state !== 'patrol') {
                    const bounds = tank.getBounds();
                    const tx = bounds.left + Math.random() * (bounds.right - bounds.left);
                    const ty = midY + Math.random() * (bounds.bottom - midY - 20);
                    this.target = { x: tx, y: ty };
                    this.state = 'patrol';
                }
            }
            return;
        }

        // === GUNNER ROLE ===
        // Priority 1: Attack Invader (Only if on 2F)
        if (invader && invader.y < midY) {
            this.target = invader;
            this.state = 'attack_invader';
            return;
        }

        // Priority 2: Load Cannons (Standard logic)
        // 基本容量（タイプ別）+ レベルボーナス（配合レベルが上がるごとに+1、上限6）
        const capacity = this.capacity; // ゲッターで一元管理
        if (this.heldItems.length < capacity) {
            // Find nearest uncollected item
            let bestItem = null;
            let minDist = 400; // Search range

            // Calculate distance to nearest empty cannon first
            let bestCannon = null;
            let cannonDist = 1000;
            for (const c of tank.cannons) {
                if (c.loaded) continue;
                const d = Math.sqrt((c.x + c.w / 2 - (this.x + this.w / 2)) ** 2 + (c.y + c.h / 2 - (this.y + this.h / 2)) ** 2);
                if (d < cannonDist) { cannonDist = d; bestCannon = c; }
            }

            // Find best item
            for (const item of ammoItems) {
                if (item.collected) continue;
                const d = Math.sqrt((item.x - this.x) ** 2 + (item.y - this.y) ** 2);
                if (d < minDist) {
                    minDist = d;
                    bestItem = item;
                }
            }

            // DECISION:
            // If I have NO items, I must find item.
            // If I have SOME items:
            //    If Cannon is much closer than Item (e.g. half distance), Go Load.
            //    Else, Go Pickup.

            let chaseItem = false;
            if (this.heldItems.length === 0) {
                chaseItem = true;
            } else {
                // Have items, not full.
                if (bestCannon && cannonDist < minDist * 0.8) {
                    // Cannon is closer! Load what we have.
                    chaseItem = false;
                } else {
                    chaseItem = true;
                }
            }

            if (chaseItem && bestItem) {
                this.target = bestItem;
                this.state = 'chase_item';
            } else if (!chaseItem && bestCannon) {
                this.target = bestCannon;
                this.state = 'carry_item';
            } else if (this.heldItems.length > 0 && bestCannon) {
                // Default to loading if no items found
                this.target = bestCannon;
                this.state = 'carry_item';
            } else {
                // Wander if nothing to do
                if (this.state !== 'wander' && Math.random() < 0.1) {
                    this.state = 'wander';
                    const bounds = tank.getBounds();
                    this.target = {
                        x: bounds.left + Math.random() * (bounds.right - bounds.left),
                        y: myFloor === 2 ? (bounds.top + 50) : (midY + 50) // Stay on floor
                    };
                } else if (this.state !== 'wander') {
                    this.state = 'idle';
                    this.target = null;
                }
            }

        } else {
            // Full -> Find nearest empty cannon
            let bestCannon = null;
            let minDist = 1000;
            for (const c of tank.cannons) {
                if (c.loaded) continue;
                const d = Math.sqrt((c.x + c.w / 2 - (this.x + this.w / 2)) ** 2 + (c.y + c.h / 2 - (this.y + this.h / 2)) ** 2);
                if (d < minDist) {
                    minDist = d;
                    bestCannon = c;
                }
            }
            if (bestCannon) {
                this.target = bestCannon;
                this.state = 'carry_item';
            } else {
                // No empty cannon? Wander or Wait near spawn
                if (Math.random() < 0.05) {
                    this.target = tank.getSpawnPoint();
                    this.state = 'wander';
                } else {
                    // Slight wander
                    const spawn = tank.getSpawnPoint();
                    this.target = {
                        x: spawn.x + (Math.random() - 0.5) * 100,
                        y: spawn.y + (Math.random() - 0.5) * 50
                    };
                    this.state = 'wander';
                }
            }
        }
    }

    // Helper for ranged units to keep distance
    keepDistance(target, optimalDist) {
        if (!target) return;
        const dx = target.x - this.x;
        const dist = Math.abs(dx);

        // If too close, back away
        if (dist < optimalDist - 50) {
            this.vx = (dx > 0 ? -1 : 1) * this.speed * 0.5;
        }
    }

    // Helper for melee units to move directly toward target
    approach(target) {
        if (!target) return;
        const dx = (target.x + (target.w || 0) / 2) - (this.x + this.w / 2);
        const dy = (target.y + (target.h || 0) / 2) - (this.y + this.h / 2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist > 15) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
            this.dir = dx > 0 ? 1 : -1;
        }
    }

    move(tank) {
        // Friction / Air Resistance
        this.vx *= 0.9;
        this.vy *= 0.9; // Apply friction to Y as well for top-down

        if (!this.target) {
            // Idle / Random Bobbing
            if (this.type !== 'angel' && this.type !== 'drone') {
                // No gravity
            } else {
                this.vy = Math.sin(this.frame * 0.1) * 0.5;
            }
        } else {
            // Chase Target
            const tx = this.target.x + (this.target.w ? this.target.w / 2 : 0);
            const ty = this.target.y + (this.target.h ? this.target.h / 2 : 0);
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;

            const dx = tx - cx;
            const dy = ty - cy;

            // Horizontal Movement
            if (Math.abs(dx) > 10) {
                this.vx += (dx > 0 ? 0.3 : -0.3);
                // Cap speed（レア度・タイプ別の速度を反映）
                const maxSpeed = this.speed;
                if (this.vx > maxSpeed) this.vx = maxSpeed;
                if (this.vx < -maxSpeed) this.vx = -maxSpeed;

                this.dir = (dx > 0 ? 1 : -1);
            }

            // Vertical Movement (Top-Down)
            if (Math.abs(dy) > 10) {
                this.vy += (dy > 0 ? 0.3 : -0.3);
                const maxSpeed = this.speed;
                if (this.vy > maxSpeed) this.vy = maxSpeed;
                if (this.vy < -maxSpeed) this.vy = -maxSpeed;
            }
        }
        // NOTE: x and y update is handled in resolveCollision
    }

    resolveCollision(tank) {
        // Floor Traversal Logic
        let platforms = tank.platforms;

        if (this.target) {
            const myMidY = this.y + this.h / 2;
            const targetMidY = this.target.y + (this.target.h ? this.target.h / 2 : 0);
            const floorSeparatorY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.WALL_THICKNESS + 20 + (CONFIG.TANK.INTERIOR_H - CONFIG.TANK.WALL_THICKNESS * 2 - 40) / 2;

            // If I am on 1F and Target is on 2F (or vice versa), ignore the middle platform
            // 2F is < floorSeparatorY, 1F is > floorSeparatorY
            const myFloor = (myMidY < floorSeparatorY) ? 2 : 1;
            const targetFloor = (targetMidY < floorSeparatorY) ? 2 : 1;

            if (myFloor !== targetFloor) {
                // Ignore the middle platform (which is usually index 0 or 1 in tank.platforms?)
                // Actually, let's just ignore ALL internal platforms for now, only keep outer walls?
                // Or better, Physics.update handles separation. If we want to pass through, we should skip it?
                // But we still want wall collisions (left/right).

                // Hack: If moving vertically towards target, disable Y collision
                // checking strictly for the floor platform might be complex without ID.
                // Let's try passing empty platforms if we need to change floors.
                // But we need walls.

                // Let's filter platforms. The middle floor is likely horizontal.
                // Assuming platforms[0] is floor?
                // Let's just rely on "Ghost" movement for allies:
                // Allies ghost through EVERYTHING except outer bounds?
                // Originally they were ghost-like.
                // If I disable platform collision entirely for allies, they won't stand on 2F floor but might float?

                // Floating behavior confirmed early in file (vy = 0, no gravity).
                // So they DON'T need platforms to stand on!
                // The platforms are just obstacles.
                // So, if we have a target, we can ignore obstacles to reach it?
                // But we want them to stay inside the tank walls.

                // OK, only collide with World Bounds (Tank Interior)
                platforms = null;
            }
        }

        const result = Physics.update(this, platforms, tank.getBounds());
        // 🐛 BUG FIX: 毎フレームリセットしてから再評価（累積 true バグを防止）
        this.collidedX = result.collidedX;
        this.collidedY = result.collidedY;
    }

    applySeparation() {
        if (!window.game || !window.game.allies) return;
        // パフォーマンス改善: 3フレームに1回のみ実行（体感差なし）
        if (this.frame % 3 !== 0) return;

        const allies = window.game.allies;
        for (let i = 0; i < allies.length; i++) {
            const other = allies[i];
            if (other === this) continue;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSq = dx * dx + dy * dy; // √を避ける

            if (distSq < 625 && distSq > 0) { // 25px² = 625
                const dist = Math.sqrt(distSq);
                const force = (25 - dist) * 0.05;
                this.x += (dx / dist) * force;
                this.y += (dy / dist) * force;
            }
        }
    }

    handleInteraction(tank, ammoItems) {
        if (!this.target) return;

        // Distance check
        const dx = (this.target.x + (this.target.w || 0) / 2) - (this.x + this.w / 2);
        const dy = (this.target.y + (this.target.h || 0) / 2) - (this.y + this.h / 2);
        const distSq = dx * dx + dy * dy;

        // ★バグ修正: titan_golem などの大型キャラは体が大きく40px以内に入れないため固まる
        // 大型キャラは距離チェックを80pxに拡大する
        const isLargeAlly = (this.type === 'titan_golem' || this.type === 'platinum_golem' || this.type === 'dragon_lord');
        const interactDistSq = isLargeAlly ? 6400 : 1600; // large: 80px, normal: 40px

        if (distSq < interactDistSq) { // (√1600=40)
            // CASE 1: Chasing Item
            if (this.state === 'chase_item') {
                const item = this.target;
                if (item && !item.collected && CONFIG.AMMO_TYPES[item.type]) {
                    this.heldItems.push(item.type);
                    item.collected = true;
                    if (window.game) {
                        window.game.sound.play('pickup');
                        window.game.particles.rateEffect(this.x, this.y, 'ゲット！', '#FFF');
                    }
                    this.target = null;
                    this.state = 'idle';
                    this.thinkTimer = 0; // Re-think immediately
                } else {
                    // Item gone?
                    this.target = null;
                    this.state = 'idle';
                }
            }
            // CASE 2: Carrying Item to Cannon
            else if (this.state === 'carry_item') {
                const cannon = this.target;
                if (cannon && !cannon.loaded && this.heldItems.length > 0) {
                    const ammoType = this.heldItems.shift();

                    // CALCULATE POWER BONUS
                    // +7% per level (Lv.1=×1.0, Lv.5=×1.28, Lv.10=×1.63)
                    // 以前は+10%/levelでインフレしていたため下方修正
                    const powerMult = 1 + (this.level - 1) * 0.07;

                    cannon.load(ammoType, powerMult);

                    if (window.game) {
                        window.game.sound.play('load');

                        if (powerMult >= 1.5) {
                            // Big Effect for High Level
                            window.game.particles.rateEffect(cannon.x + cannon.w / 2, cannon.y, 'メガ装填！', '#0FF');
                            window.game.sound.play('powerup'); // Extra sound?
                        } else {
                            window.game.particles.rateEffect(cannon.x + cannon.w / 2, cannon.y, '装填！', '#FF0');
                        }
                    }
                    this.target = null;
                    this.state = 'idle';
                    this.thinkTimer = 0;
                } else {
                    // Cannon filled or invalid?
                    this.target = null;
                    this.state = 'idle';
                }
            }
            // CASE 3: Wandering
            else if (this.state === 'wander') {
                if (distSq < 100) { // dist < 10
                    this.state = 'idle';
                    this.target = null;
                }
            }
        }
    }

    // Resilience against damage calls
    takeDamage(amount, sourceX, sourceY) {
        // ★バグ修正: invincibleTimer中はダメージ無効（platinum_golem のシールド等）
        if ((this.invincibleTimer || 0) > 0) return false;

        // Allies are currently invincible? Or have HP?
        // Let's make them invincible for now, but play a sound/effect
        if (window.game) {
            window.game.sound.play('damage');
            window.game.particles.rateEffect(this.x, this.y, 'ミス！', '#FFF');
        }
        // Push back
        // ★バグ修正: sourceX/sourceY が未定義の場合、ゼロ除算で NaN になるのを防ぐ
        if (sourceX !== undefined && sourceX !== null) {
            const sy = (sourceY !== undefined && sourceY !== null) ? sourceY : (this.y + this.h / 2);
            const dx = this.x - sourceX;
            const dy = this.y - sy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.vx += (dx / dist) * 10;
            this.vy += (dy / dist) * 10;
        }
    }

    draw(ctx) {
        const g = window.game;
        const isInvasion = g && (g.state === 'invasion' || g.state === 'launching');

        // === 侵入中：味方は「待機モード」表示 ===
        if (isInvasion) {
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;
            const t = this.frame;
            // 体を小さく描画（控えめ）
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.translate(cx, cy);
            // ゆっくりボブ
            const bob = Math.sin(t * 0.05 + this.x * 0.01) * 3;
            ctx.translate(0, bob);
            ctx.translate(-cx, -cy);
            const _dfName2 = 'draw' + (this.type||'slime').split('_').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join('');
            const _df2 = Renderer[_dfName2];
            if (_df2 && typeof _df2 === 'function' && _df2 !== Renderer.drawSlime) {
                _df2.call(Renderer, ctx, this.x, this.y, this.w, this.h, this.color, this.dir, 0);
            } else {
                // ★バグ修正㉘: base type フォールバック（ninja_hanzo→ninja 等）
                const _baseType2 = this.type && this.type.includes('_') ? this.type.split('_')[0] : (this.type || 'slime');
                const _baseFn2Name = 'draw' + _baseType2.charAt(0).toUpperCase() + _baseType2.slice(1);
                const _baseFn2 = Renderer[_baseFn2Name];
                if (_baseFn2 && typeof _baseFn2 === 'function' && _baseFn2 !== Renderer.drawSlime) {
                    _baseFn2.call(Renderer, ctx, this.x, this.y, this.w, this.h, this.color, this.dir, 0);
                } else {
                    Renderer.drawSlime(ctx, this.x, this.y, this.w, this.h, this.color, this.darkColor, this.dir, 0, 0, _baseType2);
                }
            }
            ctx.restore();

            // 「待機中」バッジ（点滅）
            if (Math.floor(t / 25) % 2 === 0) {
                ctx.save();
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                const bw = 68, bh = 16;
                Renderer._roundRect(ctx, cx - bw/2, this.y - 20, bw, bh, 4);
                ctx.fill();
                ctx.fillStyle = '#FFD700';
                 ctx.shadowBlur = 0;
                ctx.textAlign = 'center';
                ctx.fillText('⏳ 待機中', cx, this.y - 7);
                ctx.restore();
            }

            // Lvバッジ（小さく）
            if ((this.level||1) > 1) {
                ctx.save();
                ctx.font = 'bold 9px Arial';
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                const lvW = ctx.measureText('Lv.'+this.level).width + 6;
                Renderer._roundRect(ctx, cx - lvW/2, this.y - 34, lvW, 12, 3);
                ctx.fill();
                ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
                ctx.fillText('Lv.'+this.level, cx, this.y - 24);
                ctx.restore();
            }
            return; // 侵入中は通常描画をスキップ
        }

        const moving = Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5;
        const frame = moving ? this.frame : 0;

        // 描画ルーティング - タイプ別専用関数があればそれを使用、なければdrawSlimeにフォールバック
        const _typeToFuncName = (type) => 'draw' + type.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        const _drawFuncName = _typeToFuncName(this.type || 'slime');
        const _drawFunc = Renderer[_drawFuncName];

        // drawSlime自体は除外（引数順が違うためdarkColorにthis.dirが入るバグを防ぐ）
        if (_drawFunc && typeof _drawFunc === 'function' && _drawFunc !== Renderer.drawSlime) {
            // dragon_ninja, angel_golem, legend_metal, sage_slime 等の専用関数を使用
            _drawFunc.call(Renderer, ctx, this.x, this.y, this.w, this.h, this.color, this.dir, frame);
        } else {
            // ★バグ修正㉘: ガチャ pool の新 type（ninja_hanzo, healer_recov 等）は
            // 専用 draw 関数を持たないため、base type（最初の_区切り前）でフォールバック描画する。
            // 例: ninja_hanzo → 'ninja', master_old → 'master', angel_legend → 'angel'
            const _baseType = this.type && this.type.includes('_')
                ? this.type.split('_')[0]
                : (this.type || 'slime');
            const _baseFuncName = _typeToFuncName(_baseType);
            const _baseFunc = Renderer[_baseFuncName];
            if (_baseFunc && typeof _baseFunc === 'function' && _baseFunc !== Renderer.drawSlime) {
                _baseFunc.call(Renderer, ctx, this.x, this.y, this.w, this.h, this.color, this.dir, frame);
            } else {
                // ninja, angel, wizard, dragon, golem等はdrawSlime内でslimeTypeで分岐
                Renderer.drawSlime(ctx, this.x, this.y, this.w, this.h, this.color, this.darkColor, this.dir, frame, this.vy, _baseType);
            }
        }

        // === Lv & 容量インジケーター ===
        {
            const lv = this.level || 1;
            const cap = this.capacity; // ゲッターで一元管理（draw内で1回だけ呼ぶ）
            const held = this.heldItems ? this.heldItems.length : 0;

            ctx.save();
            const cx = this.x + this.w / 2;
            let topY = this.y - 6;

            // Lvバッジ（Lv2以上）
            if (lv > 1) {
                const lvText = 'Lv.' + lv;
                ctx.font = 'bold 10px Arial';
                const lvW = ctx.measureText(lvText).width + 8;
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                Renderer._roundRect(ctx, cx - lvW / 2, topY - 13, lvW, 13, 4);
                ctx.fill();
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.fillText(lvText, cx, topY - 2);
                topY -= 16;
            }

            // 容量インジケーター（玉スロット）
            // 配合していない(Lv1)かつ容量1のキャラは非表示（ごちゃごちゃしないように）
            if (cap > 1 || held > 0) {
                const dotR = 4;
                const dotGap = 10;
                const totalW = cap * dotGap - (dotGap - dotR * 2);
                const startX = cx - totalW / 2 + dotR;

                // 背景バー
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                Renderer._roundRect(ctx, startX - dotR - 2, topY - dotR * 2 - 3, totalW + 4, dotR * 2 + 6, 4);
                ctx.fill();

                for (let s = 0; s < cap; s++) {
                    const dx = startX + s * dotGap;
                    const dy = topY - dotR - 1;
                    if (s < held) {
                        // 持っている玉（アイテム色）
                        ctx.fillStyle = '#FF9800';
                        ctx.strokeStyle = '#E65100';
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.arc(dx, dy, dotR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        // ハイライト
                        ctx.fillStyle = 'rgba(255,255,255,0.5)';
                        ctx.beginPath(); ctx.arc(dx - 1, dy - 1, dotR * 0.4, 0, Math.PI * 2); ctx.fill();
                    } else {
                        // 空きスロット
                        ctx.fillStyle = 'rgba(255,255,255,0.12)';
                        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.arc(dx, dy, dotR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    }
                }
            }

            ctx.restore();
        }

        // Held Items（持ち物アイコン）
        if (this.heldItems && this.heldItems.length > 0) {
            this.heldItems.forEach((item, i) => {
                Renderer.drawHeldItem(ctx, this.x + this.w / 2, this.y - 5 - (i * 15), item);
            });
        }
    }

    // --- KINGSLIME FUSION ---
    transformToKing() {
        if (this.type === 'kingslime') return; // Already King

        this.type = 'kingslime';
        this.name = 'キングスライム';
        this.color = '#2196F3'; // Royal Blue
        this.rarity = 6; // キングスライムはSSR扱い

        // Massive Stat Boost（★6相当の強さにする）
        const kingStat = CONFIG.ALLY_RARITY_STATS[6];
        this.w *= 1.5;
        this.h *= 1.5;
        this.baseDamage = kingStat.baseDamage * 1.5; // 大型★6相当
        this.damage = Math.floor(this.baseDamage * (1 + (this.level - 1) * 0.25));
        this.criticalChance = kingStat.critChance;
        this.atkInterval = kingStat.atkInterval;

        // Effect
        if (window.game) {
            window.game.particles.explosion(this.x + this.w / 2, this.y + this.h / 2, '#FFD700', 30);
            window.game.sound.play('powerup');
            window.game.particles.rateEffect(this.x, this.y - 20, "合体！", '#FFD700');
            window.game.camera_shake = 12;

            // Bug ⑦ fix: saveDataを更新してキングスライム変換を永続化
            if (window.game.saveData?.unlockedAllies) {
                const saved = window.game.saveData.unlockedAllies.find(a => a.id === this.id);
                if (saved) {
                    saved.type = this.type;
                    saved.color = this.color;
                    saved.rarity = this.rarity;
                    saved.w = this.w;
                    saved.h = this.h;
                }
                if (window.SaveManager) SaveManager.save(window.game.saveData);
            }
        }
    }

    checkFusionCollision() {
        if (!window.game || !window.game.allies) return false;

        // ★バグ修正: プレイヤーが手動で投げた時（fusionThrown=true）のみ合体判定する
        // 自動突撃（updateAutoSkill の突撃）では合体しない
        if (!this.fusionThrown) return false;

        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        for (const other of window.game.allies) {
            if (other === this) continue;
            if (other.isStacked) continue;
            if (other.isDead) continue;
            if (other.type === 'kingslime') continue;
            // ★バグ修正: 合体相手も fusionThrown 状態か、同種スライムのみ対象
            // これにより通常移動中の仲間に当たっても合体しない
            if (!other.fusionThrown && other.state !== 'idle' && other.state !== 'wander') continue;

            const ocx = other.x + other.w / 2;
            const ocy = other.y + other.h / 2;
            const dist = Math.sqrt((cx - ocx) ** 2 + (cy - ocy) ** 2);

            if (dist < (this.w + other.w) / 2) {
                other.transformToKing();
                this.isDead = true;
                return true;
            }
        }
        return false;
    }

    // === 自動スキル発動（旧：手動連携技 → 自動化）===
    // specialCooldown が 0 になり、条件が揃ったら自動で発動する
    updateAutoSkill(invader, g) {
        if (!g) return;
        if (this.specialCooldown > 0) return;

        const hasInvader = !!(invader && invader.hp > 0);
        const player = g.player;
        const hpRatio = player ? player.hp / (player.maxHp || 100) : 1;

        // --- パッシブ系（毎フレーム判定、cooldown不使用）---
        // Defender: 敵の飛翔弾を確率でブロック（バトル画面の被弾軽減）
        if (this.type === 'defender') {
            // 2フレームに1回、飛んでくる敵弾をランダムに1発迎撃
            if (this.passiveTimer % 2 === 0 && g.battle && g.battle.projectiles) {
                for (const proj of g.battle.projectiles) {
                    if (!proj.active || proj.dir !== -1) continue; // 敵弾のみ対象
                    if (Math.random() < 0.018) { // 1.8%/フレーム → 平均56フレームに1回ブロック
                        proj.active = false;
                        g.particles.spark(proj.x || 300, proj.y || 200, 0, -2, '#4CAF50');
                        if (this.passiveTimer % 90 === 0) // スパム防止でテキストは間引く
                            g.particles.rateEffect(
                                (proj.x || 300), (proj.y || 180),
                                '🛡 防いだ！', '#4CAF50'
                            );
                        break; // 1フレーム1発まで
                    }
                }
            }
            // プレイヤーに短時間無敵オーラ（120フレームに1回）
            if (this.passiveTimer % 120 === 0) {
                if (player && player.invincible <= 0) {
                    player.invincible = 30; // 20→30フレームに強化
                    g.particles.spark(player.x, player.y, 0, -1, '#4CAF50');
                }
            }
        }
        // Drone: 装填速度バフ（全砲台のloadTimerを毎フレーム-0.3追加短縮）
        if (this.type === 'drone' && g.tank && g.tank.cannons) {
            for (const cannon of g.tank.cannons) {
                if (cannon.loaded && cannon.loadTimer > 0) {
                    cannon.loadTimer = Math.max(0, cannon.loadTimer - 0.4); // 追加短縮
                }
            }
            // 60フレームに1回エフェクト
            if (this.passiveTimer % 60 === 0 && g.tank.cannons.some(c => c.loaded)) {
                g.particles.rateEffect(
                    this.x + this.w / 2, this.y - 16,
                    '⚡ 加速中', '#00BCD4'
                );
            }
        }
        // Golem: 敵弾を確率で消す（passiveTimerはupdate()でインクリメント済み）
        if ((this.type === 'golem' || this.type === 'fortress_golem') && g.battle?.projectiles) {
            if (this.passiveTimer % 6 === 0) { // 毎フレームでなく6フレームに1回チェック
                for (const proj of g.battle.projectiles) {
                    if (!proj.active || proj.dir !== -1) continue; // 敵弾のみ
                    const dx = proj.x - (this.x + this.w / 2);
                    const dy = proj.y - (this.y + this.h / 2);
                    if (dx * dx + dy * dy < 2500 && Math.random() < 0.25) {
                        proj.active = false;
                        g.particles.spark(proj.x, proj.y, 0, 0, '#FFD700');
                    }
                }
            }
        }

        // --- アクティブスキル（cooldownあり）---
        // 回復系: プレイヤーHP 60%以下で自動回復
        const HEALER_TYPES = ['angel', 'arch_angel', 'healer', 'sage_slime', 'angel_golem'];
        if (HEALER_TYPES.includes(this.type)) {
            if (hpRatio < 0.60 && player) {
                const heal = Math.floor(20 + (this.level - 1) * 4);
                player.hp = Math.min(player.hp + heal, player.maxHp || 100);
                g.sound.play('heal');
                g.particles.rateEffect(player.x, player.y - 20, `+${heal}`, '#4CAF50');
                this.specialCooldown = 360;
            }
            return;
        }

        // 防御系: インベーダー出現 or プレイヤーHP 50%以下でバリア (royal_guard, platinum_golem)
        const TANK_TYPES = ['royal_guard', 'platinum_golem'];
        if (TANK_TYPES.includes(this.type)) {
            if ((hasInvader || hpRatio < 0.50) && player) {
                player.invincible = Math.max(player.invincible, 90); // 1.5秒
                g.sound.play('powerup');
                g.particles.rateEffect(player.x, player.y - 20, 'バリア！', '#FFD700');
                this.specialCooldown = 480;
            }
            return;
        }

        // ★ タイタンゴーレム専用必殺技：「天崩地裂（テンブチレツ）」
        // 敵タンクに直接ダメージ + 全インベーダー撃破 + プレイヤー回復 + 長時間無敵
        if (this.type === 'titan_golem') {
            // Fix: レイジモード中は通常攻撃ダメージを1.8倍に強化（毎フレーム適用）
            const rageMultiplier = this.titanRageMode ? 1.8 : 1.0;
            if (this.titanRageMode && hasInvader && this.frame % this.atkInterval === 0) {
                const rageDmg = Math.floor(this.damage * rageMultiplier);
                invader.takeDamage(rageDmg, invader.x > this.x ? 1 : -1);
                if (g) {
                    g.particles.hit(invader.x, invader.y);
                    // テキストは60フレームに1回だけ（スパム防止）
                    if (this.frame % 60 === 0)
                        g.particles.rateEffect(this.x + this.w/2, this.y - 20, `RAGE! ${rageDmg}`, '#FF6600');
                }
            }

            const shouldActivate = hasInvader || hpRatio < 0.40;
            if (!shouldActivate) return;

            // === 【地震砲・GRAND QUAKE】===
            // Phase 1: 地面を拳で叩き砕く
            g.camera_shake = 12;
            g.screenFlash = 8;
            g.sound.play('destroy');
            g.particles.explosion(this.x + this.w / 2, this.y + this.h, '#FF8C00', 15);

            // インベーダーへの超大ダメージ（即死級）
            if (hasInvader) {
                const dmg = this.damage * 5; // 通常の5倍
                invader.takeDamage(dmg, invader.x > this.x ? 1 : -1);
                g.particles.rateEffect(invader.x, invader.y - 30, `QUAKE! ${dmg}`, '#FF4500');
                // 吹き飛ばし
                invader.vx = (invader.x > this.x ? 1 : -1) * 20;
                invader.vy = -15;
            }

            // 敵タンクに直接ダメージ（戦闘外からの砲撃）
            if (window.game && window.game.battle) {
                const tankDmg = 80 + Math.floor(this.damage * 2);
                window.game.battle.enemyTankHP = Math.max(0, window.game.battle.enemyTankHP - tankDmg);
                window.game.battle.enemyDamageFlash = 30;
                window.game.battle.enemyFireTimer += 180; // 3秒スタン
                g.particles.damageNum(
                    CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 80,
                    `地震砲 -${tankDmg}!!`, '#FF4500'
                );
            }

            // プレイヤー回復（30HP）
            if (player) {
                const heal = 30;
                player.hp = Math.min(player.hp + heal, player.maxHp || 100);
                player.invincible = Math.max(player.invincible, 240); // 4秒無敵
                g.particles.rateEffect(player.x, player.y - 20, `+${heal}HP 無敵！`, '#00FF88');
            }

            // レイジモード突入（次の一定時間、さらに強化）
            this.titanRageMode = true;
            this.burstQueue.push({ delay: 300, fn: () => { if (this) this.titanRageMode = false; } });

            // ★ レイジ突入の爆発エフェクト（赤いスパークを全方向に）
            if (g && g.particles) {
                for (let _ri = 0; _ri < 12; _ri++) {
                    const _ra = (_ri / 12) * Math.PI * 2;
                    g.particles.spark(
                        this.x + this.w / 2, this.y + this.h / 2,
                        Math.cos(_ra) * 5, Math.sin(_ra) * 5, '#FF4400'
                    );
                }
                g.particles.rateEffect(this.x + this.w / 2, this.y - 45, '🔥 RAGE MODE!', '#FF4400');
            }

            g.sound.play('destroy'); // 地震砲はdestroyで十分、go(叫び声)は削除
            g.particles.rateEffect(this.x + this.w/2, this.y - 30, '【地震砲】！！', '#FFD700');
            this.specialCooldown = 420; // 7秒クールダウン
            return;
        }

        // ★ ドラゴンロード専用必殺技：「竜炎爆砕（インフェルノ）」
        // 7方向火炎弾 + 敵タンクへの炎ダメージ + 全味方攻撃バフ
        if (this.type === 'dragon_lord') {
            if (!hasInvader) return;

            const myX = this.x + this.w / 2;
            const myY = this.y + this.h / 2;
            const dir = invader.x + invader.w / 2 > myX ? 1 : -1;

            // === 【竜炎爆砕・INFERNO BREATH】===
            g.camera_shake = 12;
            g.screenFlash = 8;
            g.sound.play('destroy');

            // 7方向に巨大火炎弾を発射
            const angles = [-0.5, -0.3, -0.15, 0, 0.15, 0.3, 0.5];
            angles.forEach((angle, i) => {
                this.burstQueue.push({
                    delay: i * 3, fn: () => {
                        if (!window.game) return;
                        const speed = 12 + i * 0.5;
                        window.game.projectiles.push(new SimpleProjectile({
                            x: myX, y: myY,
                            vx: dir * speed * Math.cos(angle),
                            vy: speed * Math.sin(angle) - 3,
                            life: 90,
                            damage: this.damage * 3 | 0, // 3倍ダメージ
                            w: 28, h: 28, type: 'magic', color: i % 2 === 0 ? '#FF4500' : '#FF8C00'
                        }));
                    }
                });
            });

            // 敵タンクへの炎ダメージ
            if (window.game && window.game.battle) {
                const fireDmg = 60 + Math.floor(this.damage * 1.5);
                window.game.battle.enemyTankHP = Math.max(0, window.game.battle.enemyTankHP - fireDmg);
                window.game.battle.enemyDamageFlash = 25;
                window.game.battle.enemyFireTimer += 120; // 2秒スタン
                g.particles.damageNum(
                    CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 80,
                    `竜炎 -${fireDmg}!`, '#FF4500'
                );
            }

            // 全味方への攻撃バフ（5秒間、自分含む全員ダメージ1.5倍）
            if (window.game && window.game.allies) {
                window.game.allies.forEach(ally => {
                    if (ally.dragonBuffed) return; // Bug Fix: 重複バフ防止
                    const origDmg = ally.damage;
                    ally.damage = Math.floor(ally.damage * 1.5);
                    ally.dragonBuffed = true;
                    if (ally === this) ally.dragonBuffActive = true; // ★ 自分のオーラ演出フラグON
                    // ★バグ修正②: 解除処理をドラゴン自身のキューではなく各味方のキューに積む
                    // ドラゴンが死亡・離脱しても確実に解除される
                    ally.burstQueue.push({ delay: 300, fn: () => {
                        if (ally && ally.dragonBuffed) { ally.damage = origDmg; ally.dragonBuffed = false; }
                        if (ally === this) ally.dragonBuffActive = false; // ★ オーラ演出フラグOFF
                    }});
                });
                g.particles.rateEffect(this.x + this.w/2, this.y - 50, '全員火力UP！', '#FF4500');
            }

            // インベーダーへの大ダメージ（即時）
            if (hasInvader) {
                const dmg = this.damage * 4;
                invader.takeDamage(dmg, dir);
                g.particles.rateEffect(invader.x, invader.y - 30, `INFERNO! ${dmg}`, '#FF4500');
            }

            g.sound.play('destroy'); // 竜炎爆砕はdestroyで十分
            g.particles.rateEffect(this.x + this.w/2, this.y - 30, '【竜炎爆砕】！！', '#FF4500');
            g.particles.explosion(myX, myY, '#FF4500', 15);
            this.specialCooldown = 380; // 約6.3秒クールダウン
            return;
        }

        // 攻撃系: インベーダーがいる時のみ発動
        // ★バランス修正: 戦士タイプのみ invader に攻撃スキルを使う
        // gunner系（スライム, wizard, master等）は砲弾装填に専念させる
        if (!hasInvader) return;
        const _SKILL_FIGHTERS = new Set([
            'ninja', 'steel_ninja', 'wizard', 'shadow_mage', 'master',
            'boss', 'metalking', 'war_machine', 'ultimate',
            'defender', 'fortress_golem', 'royal_guard', 'paladin',
            'phantom', 'wyvern_lord', 'platinum_golem',
        ]);
        if (!_SKILL_FIGHTERS.has(this.type)) return; // gunner系はスキル不発動

        const tx = invader.x + invader.w / 2;
        const ty = invader.y + invader.h / 2;
        const myX = this.x + this.w / 2;
        const myY = this.y + this.h / 2;
        const dir = tx > myX ? 1 : -1;

        if (this.type === 'ninja' || this.type === 'steel_ninja') {
            // 手裏剣バースト（5連射）
            for (let i = 0; i < 5; i++) {
                this.burstQueue.push({
                    delay: i * 4, fn: () => {
                        // ★バグ修正E: クロージャ内では window.game.invader を使用する
                        // (古い invader 参照を保持し続けると、撃退済み敵へ発射してしまう)
                        const liveInvader = window.game && window.game.invader;
                        if (!window.game || !liveInvader) return;
                        const _proj1 = new SimpleProjectile({
                            x: myX, y: myY,
                            vx: dir * (9 + i), vy: (Math.random() - 0.5) * 3,
                            life: 55, damage: this.damage * 1.4 | 0,
                            w: 10, h: 10, type: 'shuriken', color: '#888'
                        });
                        _proj1.onHit = () => this.gainExp(Math.max(1, Math.floor(this.damage * 0.1)));
                        window.game.projectiles.push(_proj1);
                    }
                });
            }
            g.particles.rateEffect(this.x, this.y - 20, '手裏剣！', '#888');
            g.sound.play('shoot');
            this.specialCooldown = 220;

        } else if (this.type === 'wizard' || this.type === 'shadow_mage') {
            // 魔法弾（3連射）
            for (let i = 0; i < 3; i++) {
                this.burstQueue.push({
                    delay: i * 8, fn: () => {
                        const liveInvader = window.game && window.game.invader;
                        if (!window.game || !liveInvader) return;
                        const _proj2 = new SimpleProjectile({
                            x: myX, y: myY,
                            vx: dir * 5, vy: (Math.random() - 0.5) * 2,
                            life: 90, damage: this.damage * 1.5 | 0,
                            w: 14, h: 14, type: 'magic',
                            color: this.type === 'shadow_mage' ? '#5E35B1' : '#AA00AA'
                        });
                        _proj2.onHit = () => this.gainExp(Math.max(1, Math.floor(this.damage * 0.1)));
                        window.game.projectiles.push(_proj2);
                    }
                });
            }
            g.particles.rateEffect(this.x, this.y - 20, '魔法！', '#AA00AA');
            g.sound.play('shoot');
            this.specialCooldown = 260;

        } else if (this.type === 'master') {
            // 超波動
            g.projectiles.push(new SimpleProjectile({
                x: myX, y: myY,
                vx: dir * 14, vy: 0,
                life: 70, damage: this.damage * 2,
                w: 36, h: 36, type: 'magic', color: '#00FFFF'
            }));
            g.camera_shake = 12;
            g.particles.rateEffect(this.x, this.y - 20, '超波動！', '#00FFFF');
            g.sound.play('invade');
            this.specialCooldown = 200;

        } else if (this.type === 'dragon_lord') {
            // dragon_lordの処理は上のuniqueSpecialで済み（ここには来ない）
            return;
        } else if (this.type === 'titan_golem') {
            // グランドパウンド（レイジモード中の近接追加攻撃、updateAutoSkillで既に処理済み）
            // Fix: このブロックはupdateAutoSkillのtitan_golemブロックがreturnするため
            //      ここには到達しない。代わりにplatinum_golemを直接処理する。

        } else if (this.type === 'platinum_golem') {
            // ★ プラチナゴーレム専用必殺技: 「白銀の盾壁（プラチナシールド）」
            // 全味方に超長時間無敵 + インベーダー大ダメージ + 敵砲撃を60秒遮断
            g.camera_shake = 10;
            g.screenFlash = 6;
            g.sound.play('powerup');

            // インベーダーへのダメージ（鉄壁の壁による粉砕）
            if (hasInvader) {
                const dmg = this.damage * 3;
                invader.takeDamage(dmg, dir);
                invader.vx = (dir) * 15;
                invader.vy = -12;
                g.particles.rateEffect(invader.x, invader.y - 30, `SHIELD! ${dmg}`, '#CFD8DC');
                g.particles.explosion(invader.x, invader.y, '#CFD8DC', 12);
            }

            // 全味方に無敵付与（3秒）
            if (window.game && window.game.allies) {
                window.game.allies.forEach(a => {
                    if (a.isDead || a.isStacked) return;
                    a.invincibleTimer = (a.invincibleTimer || 0) + 180;
                });
                g.particles.rateEffect(myX, myY - 30, '全員無敵！', '#CFD8DC');
            }

            // プレイヤー回復＋無敵
            if (player) {
                const heal = 20;
                player.hp = Math.min(player.hp + heal, player.maxHp || 100);
                player.invincible = Math.max(player.invincible, 180);
                g.particles.rateEffect(player.x, player.y - 20, `+${heal}HP 防御！`, '#B0BEC5');
            }

            // 敵タンクへのシールドダメージ
            if (window.game && window.game.battle) {
                const tankDmg = 50 + Math.floor(this.damage * 1.5);
                window.game.battle.enemyTankHP = Math.max(0, window.game.battle.enemyTankHP - tankDmg);
                window.game.battle.enemyDamageFlash = 20;
                window.game.battle.enemyFireTimer += 150; // 2.5秒スタン
                g.particles.damageNum(
                    CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 80,
                    `白銀壁 -${tankDmg}!`, '#B0BEC5'
                );
                // バトル画面に盾バリア（woodArmorHP追加）
                window.game.battle.woodArmorActive = true;
                window.game.battle.woodArmorHP = (window.game.battle.woodArmorHP || 0) + 60;
            }

            g.particles.rateEffect(myX, myY - 50, '【白銀の盾壁】！！', '#CFD8DC');
            this.specialCooldown = 400;

        } else if (this.type === 'boss' || this.type === 'metalking' || this.type === 'war_machine' || this.type === 'ultimate') {
            // 全弾一斉発射
            for (let i = -1; i <= 1; i++) {
                g.projectiles.push(new SimpleProjectile({
                    x: myX, y: myY,
                    vx: dir * 10, vy: i * 3,
                    life: 70, damage: this.damage * 1.6 | 0,
                    w: 16, h: 16, type: 'magic', color: this.color
                }));
            }
            g.particles.rateEffect(this.x, this.y - 20, '全弾発射！', this.color);
            g.sound.play('invade');
            this.specialCooldown = 240;

        } else {
            // その他（基本スライム系）: 突撃
            // ★バグ修正: 自動突撃は 'charge' 状態を使い、fusionThrown=false のまま
            // これにより通常移動中の仲間に当たっても勝手に合体しない
            const dx = tx - myX, dy = ty - myY;
            if (dx * dx + dy * dy < 160000) { // 400px以内
                this.vx = dir * 12;
                this.vy = -5;
                this.state = 'charge'; // 'thrown'ではなく'charge'で突撃（合体しない）
                this.fusionThrown = false;
                g.particles.rateEffect(this.x, this.y - 20, '突撃！', '#4CAF50');
                this.specialCooldown = 300;
            }
        }
    }
}
window.AllySlime = AllySlime;
