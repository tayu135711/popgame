// ======================================
// ONLINE BATTLE - 協力対戦モジュール
// ======================================
class OnlineBattle {
    constructor(game) {
        this.game = game;
        this.opponentHp = 220;
        this.opponentMaxHp = 220;
        this.sharedEnemyHp = 4500;
        this.sharedEnemyMaxHp = 4500;
        this.lastSyncFrame = 0;
        this.SYNC_INTERVAL = 3;
        this.battleResult = null;
        this.resultTimer = 0;
        this.partnerAlive = true;
        // 相手キャラ座標
        this.opponentX = -999;
        this.opponentY = -999;
        this.opponentDir = 1;
        this.opponentFrame = 0;
        this.opponentVisible = false;
    }

    init() {
        const g = this.game;
        this.opponentHp = 220;
        this.opponentMaxHp = 220;
        this.battleResult = null;
        this.resultTimer = 0;
        this.partnerAlive = true;

        network.onMatched = (playerId) => {
            this.startBattle();
        };

        network.onWaiting = () => {};

        // 相手のHP・座標同期
        this.opponentX = 0;
        this.opponentY = 0;
        this.opponentDir = 1;
        this.opponentFrame = 0;
        network.onOpponentState = (state) => {
            if (state.hp !== undefined) this.opponentHp = state.hp;
            if (state.maxHp !== undefined) this.opponentMaxHp = state.maxHp;
            if (state.px !== undefined) { this.opponentX = state.px; this.opponentVisible = true; }
            if (state.py !== undefined) this.opponentY = state.py;
            if (state.pdir !== undefined) this.opponentDir = state.pdir;
            if (state.pframe !== undefined) this.opponentFrame = state.pframe;
        };

        // ★共有敵HPの更新
        network.onMessage = (msg) => {
            switch(msg.type) {
                case 'enemy_hp_update':
                    this.sharedEnemyHp = msg.hp;
                    this.sharedEnemyMaxHp = msg.maxHp;
                    // コンボ演出
                    if (msg.isCombo) {
                        g.particles.rateEffect(
                            CONFIG.CANVAS_WIDTH * 0.65,
                            CONFIG.TANK.OFFSET_Y + 60,
                            '★ COMBO x2 ★',
                            '#FFD700'
                        );
                        g.camera_shake = 8;
                        g.screenFlash = 6;
                    }
                    // 自分以外の攻撃ならダメージ演出
                    if (msg.attackerId !== network.playerId && g.battle) {
                        g.particles.damageNum(
                            CONFIG.CANVAS_WIDTH * 0.75,
                            CONFIG.TANK.OFFSET_Y + 80,
                            `-${Math.round(msg.damage)}`,
                            msg.isCombo ? '#FFD700' : '#FF8800'
                        );
                        g.sound.play('hit');
                    }
                    break;
                case 'coop_victory':
                    if (!this.battleResult) this.battleResult = 'win';
                    break;
                case 'coop_defeat':
                    if (!this.battleResult) this.battleResult = 'lose';
                    break;
                case 'partner_died':
                    this.partnerAlive = false;
                    g.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.3, '仲間がやられた！', '#FF4444');
                    break;
                case 'opponent_fire':
                    g.sound.play('fire');
                    break;
                case 'opponent_disconnected':
                    if (!this.battleResult) {
                        this.battleResult = 'lose';
                        g.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.3, '相手が切断しました', '#888');
                    }
                    break;
                case 'matched':
                    // matchedはnetwork.jsで処理済み
                    break;
            }
        };

        // 自分がダメージを受けたとき
        network.onTakeDamage = (damage, ammoType) => {};

        // 接続
        network.connect();
    }

    startBattle() {
        const g = this.game;

        // ★最強ステージ（終焉の戦場）を使用
        const COOP_STAGE_INDEX = 14; // stage_ex3
        g.stageIndex = COOP_STAGE_INDEX;
        g.stageData = JSON.parse(JSON.stringify(STAGES[COOP_STAGE_INDEX]));

        // 敵AIの発射を無効化（ダメージはサーバー管理）
        g.stageData.enemyDamage = 0;
        g.stageData.enemyFireInterval = 999999;
        // HPはサーバーで管理するが、見た目用に設定
        this.sharedEnemyHp = g.stageData.enemyHP || 4500;
        this.sharedEnemyMaxHp = this.sharedEnemyHp;

        g.tank = new TankInterior(false);
        const spawn = g.tank.getSpawnPoint();
        g.player = new Player(spawn.x, spawn.y);
        g.player.maxHp = 220;
        g.player.hp = 220;

        g.ammoDropper = new AmmoDropper(1.0);
        g.powerupManager.clear();
        g.battle = new BattleManager(g.stageData, g.saveData);

        g.battle.playerTankHP = 220;
        g.battle.playerTankMaxHP = 220;
        // 敵HPは共有管理なので高く設定しておく
        g.battle.enemyTankHP = 99999;
        g.battle.enemyTankMaxHP = 99999;

        g.particles.clear();
        g.projectiles = [];
        g.allies = [];

        // ゲージリセット
        g.titanSpecialGauge = Math.floor(g.MAX_ALLY_SPECIAL_GAUGE * 0.3);
        g.dragonSpecialGauge = Math.floor(g.MAX_ALLY_SPECIAL_GAUGE * 0.3);
        g.platinumSpecialGauge = Math.floor(g.MAX_ALLY_SPECIAL_GAUGE * 0.3);
        g.titanSpecialAnimTimer = 0;
        g.dragonSpecialAnimTimer = 0;
        g.platinumSpecialAnimTimer = 0;
        g.screenFlash = 0;
        g.hitStop = 0;
        g.camera_shake = 0;
        g.comboCount = 0;
        g.comboTimer = 0;
        g.maxCombo = 0;
        g.specialAnimTimer = 0;
        g.screenFlashType = 'white';
        g.invader = null;
        g.savedBattleState = null;
        g.continueUsed = false;
        g.bossDestructionInitialized = false;
        g.invasionVictoryTriggered = false;
        g.invasionVictoryDelay = 0;
        g._fusionBonusNotify = null;
        g.resultCursor = 0;

        // 仲間を配置
        if (g.saveData.allyDeck && g.saveData.allyDeck.length > 0) {
            g.saveData.allyDeck.forEach((allyId) => {
                const config = g.saveData.unlockedAllies.find(a => a.id === allyId);
                if (config) {
                    const ox = (Math.random() - 0.5) * 100;
                    const oy = (Math.random() - 0.5) * 60;
                    g.allies.push(new AllySlime(spawn.x + ox, spawn.y + oy, config));
                }
            });
        }
        if (g.allies.length === 0) {
            const config = g.saveData.unlockedAllies[0] || { id: 'ally1', name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' };
            g.allies.push(new AllySlime(spawn.x, spawn.y, config));
        }

        g.sound.playBGM('battle');
        g.countdownTimer = 180;
        g.state = 'online_countdown';
    }

    // ★弾発射→サーバーに敵ダメージを送信
    onPlayerFire(fireResult) {
        if (this.battleResult || !network.matched) return;
        const info = CONFIG.AMMO_TYPES[fireResult.type];
        if (!info || !info.damage) return;

        // ダメージ計算（アップグレード込み）
        const atkLevel = (this.game.saveData?.upgrades?.attack) || 0;
        const powerMult = 1 + atkLevel * 0.1;
        const damage = Math.floor(info.damage * powerMult);

        // サーバーに敵ダメージを報告
        network.send({ type: 'deal_damage_to_enemy', damage });
        // 発射エフェクトを相手に通知
        network.send({ type: 'fire', ammoType: fireResult.type });
    }

    // 毎フレーム更新
    update() {
        const g = this.game;

        if (this.battleResult) {
            this.resultTimer++;
            if (this.resultTimer > 180) {
                g.state = 'online_result';
            }
            return;
        }

        g.updateBattle();

        // 敵AIの勝敗遷移をキャンセル
        if (g.battle) {
            if (g.battle.phase === 'enemy_disabled' ||
                g.battle.phase === 'victory' ||
                g.battle.invasionAvailable) {
                g.battle.phase = 'battle';
                g.battle.invasionAvailable = false;
                g.battle.enemyTankHP = 99999;
            }
            if (g.state === 'tank_destruction' ||
                g.state === 'result' ||
                g.state === 'launching' ||
                g.state === 'invasion') {
                g.state = 'online_battle';
            }
        }

        // 自分のHPが0になったらサーバーに通知
        if (g.battle && g.battle.playerTankHP <= 0 && !this.battleResult) {
            this.battleResult = 'lose';
            network.send({ type: 'player_died' });
        }

        // 自分の状態を定期送信
        this.lastSyncFrame++;
        if (this.lastSyncFrame >= this.SYNC_INTERVAL) {
            this.lastSyncFrame = 0;
            if (g.battle && g.player) {
                network.sendState({
                    hp: g.battle.playerTankHP,
                    maxHp: g.battle.playerTankMaxHP,
                    px: g.player.x,
                    py: g.player.y,
                    pdir: g.player.dir,
                    pframe: g.player.frame
                });
            }
        }
    }

    // HUDを描画（共有敵HP + 相手HP）
    drawOpponentHUD(ctx, W, H) {
        // ★共有敵HPバー（画面上部中央）
        const eBarW = W * 0.5;
        const eBarH = 20;
        const ex = W / 2 - eBarW / 2;
        const ey = 8;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(ex - 8, ey - 4, eBarW + 16, eBarH + 28, 8);
        ctx.fill();

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★ 共通の敵 ★', W / 2, ey + 11);

        const eHpRatio = Math.max(0, this.sharedEnemyHp / this.sharedEnemyMaxHp);
        ctx.fillStyle = '#222';
        ctx.fillRect(ex, ey + 14, eBarW, eBarH);
        ctx.fillStyle = eHpRatio > 0.5 ? '#ff4444' : eHpRatio > 0.25 ? '#ff8800' : '#ff0000';
        ctx.fillRect(ex, ey + 14, eBarW * eHpRatio, eBarH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(ex, ey + 14, eBarW, eBarH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${Math.ceil(this.sharedEnemyHp)} / ${this.sharedEnemyMaxHp}`, W / 2, ey + 28);
        ctx.textAlign = 'left';

        // 相手のHPバー（右上）
        const barW = W * 0.28;
        const barH = 16;
        const x = W - barW - 15;
        const y = 15;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(x - 8, y - 4, barW + 16, barH + 28, 6);
        ctx.fill();

        ctx.fillStyle = '#88ccff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('仲間', x, y + 11);

        const hpRatio = Math.max(0, this.opponentHp / this.opponentMaxHp);
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y + 14, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#44aaff' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(x, y + 14, barW * hpRatio, barH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y + 14, barW, barH);

        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`${Math.ceil(this.opponentHp)}`, x + 2, y + 25);

        // 結果オーバーレイ
        if (this.battleResult) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, W, H);
            ctx.font = `bold ${W * 0.12}px monospace`;
            ctx.textAlign = 'center';
            if (this.battleResult === 'win') {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('WIN!', W / 2, H * 0.4);
                ctx.font = `${W * 0.05}px monospace`;
                ctx.fillStyle = '#88ccff';
                ctx.fillText('協力クリア！', W / 2, H * 0.52);
            } else {
                ctx.fillStyle = '#ff4444';
                ctx.fillText('DEFEAT...', W / 2, H * 0.4);
            }
            ctx.font = `${W * 0.035}px monospace`;
            ctx.fillStyle = '#aaa';
            ctx.fillText('タイトルに戻る...', W / 2, H * 0.62);
            ctx.textAlign = 'left';
        }
    }
}
