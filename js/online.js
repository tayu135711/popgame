// ======================================
// ONLINE BATTLE - オンライン対戦モジュール
// ======================================
// このファイルをjs/online.jsとして保存し、
// index.htmlのscriptタグに追加してください

class OnlineBattle {
    constructor(game) {
        this.game = game;
        this.opponentHp = 100;
        this.opponentMaxHp = 100;
        this.opponentName = 'プレイヤー2';
        this.lastSyncFrame = 0;
        this.SYNC_INTERVAL = 3; // 3フレームごとに同期
        this.battleResult = null; // 'win' or 'lose'
        this.resultTimer = 0;
    }

    // オンライン対戦を初期化
    init() {
        const g = this.game;
        this.opponentHp = 100;
        this.opponentMaxHp = 100;
        this.battleResult = null;
        this.resultTimer = 0;

        // NetworkManagerのコールバックを設定
        network.onMatched = (playerId) => {
            g.state = 'online_battle';
            this.startBattle();
        };

        network.onWaiting = () => {
            // waiting状態のまま
        };

        network.onOpponentState = (state) => {
            this.opponentHp = state.hp;
        };

        network.onTakeDamage = (damage, ammoType) => {
            if (g.tank) {
                g.tank.hp = Math.max(0, g.tank.hp - damage);
                g.particles.explosion(g.tank.x + 100, g.canvas.height / 2, 20);
                g.sound.play('hit');
                g.camera_shake = 10;
                g.screenFlash = 8;
                g.screenFlashType = 'hit';
            }
            if (g.tank && g.tank.hp <= 0) {
                this.battleResult = 'lose';
                network.sendGameOver();
            }
        };

        network.onOpponentFire = (ammoType, damage) => {
            // 相手が撃ってきた演出
            g.sound.play('fire');
        };

        network.onOpponentLost = () => {
            this.battleResult = 'win';
        };

        network.onOpponentDisconnected = () => {
            this.battleResult = 'win';
            g.sound.play('confirm');
        };

        // サーバーに接続
        network.connect('ws://localhost:3000');
    }

    // バトル開始
    startBattle() {
        const g = this.game;
        // 既存のバトル初期化を流用
        const stageIndex = 0;
        g.stageIndex = stageIndex;
        g.stageData = STAGES[stageIndex];
        g.tank = new Tank(g.stageData);
        g.player = new Player(g.tank);
        g.ammoDropper = new AmmoDropper(g.tank);
        g.battle = new BattleManager(g.tank);
        g.allies = [];
        g.projectiles = [];
        g.countdownTimer = 180;
        g.state = 'online_countdown';
    }

    // 毎フレーム更新
    update() {
        const g = this.game;

        // 結果処理
        if (this.battleResult) {
            this.resultTimer++;
            if (this.resultTimer > 180) {
                g.state = 'online_result';
            }
            return;
        }

        // 既存のバトル更新を流用
        g.updateBattle();

        // 定期的に自分の状態を送信
        this.lastSyncFrame++;
        if (this.lastSyncFrame >= this.SYNC_INTERVAL) {
            this.lastSyncFrame = 0;
            if (g.tank) {
                network.sendState({ hp: g.tank.hp });
            }
        }
    }

    // 弾発射時に呼ぶ（battle.jsのfireメソッドから呼ぶ）
    onFire(ammoType, damage) {
        network.sendFire(ammoType, damage);
        network.sendDamage(damage, ammoType);
    }

    // 描画
    draw(ctx, W, H) {
        const g = this.game;

        // 通常の戦闘画面を描画（既存のrenderer流用）
        if (typeof Renderer !== 'undefined') {
            Renderer.drawBattle(ctx, g, W, H);
        }

        // 相手のHP表示（画面上部）
        this.drawOpponentHUD(ctx, W, H);
    }

    // 相手のHUDを描画
    drawOpponentHUD(ctx, W, H) {
        const barW = W * 0.35;
        const barH = 18;
        const x = W / 2 + 20;
        const y = 20;

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.roundRect(x - 10, y - 5, barW + 20, barH + 30, 8);
        ctx.fill();

        // 名前
        ctx.fillStyle = '#ff6666';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('⚔ 相手', x, y + 12);

        // HPバー
        const hpRatio = Math.max(0, this.opponentHp / this.opponentMaxHp);
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y + 16, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(x, y + 16, barW * hpRatio, barH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y + 16, barW, barH);

        // 結果オーバーレイ
        if (this.battleResult) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);
            ctx.font = `bold ${W * 0.12}px monospace`;
            ctx.textAlign = 'center';
            if (this.battleResult === 'win') {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('WIN!', W / 2, H / 2);
            } else {
                ctx.fillStyle = '#ff4444';
                ctx.fillText('LOSE...', W / 2, H / 2);
            }
            ctx.font = '16px monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText('タイトルに戻る...', W / 2, H / 2 + 50);
            ctx.textAlign = 'left';
        }
    }

    // 待機画面の描画
    static drawWaiting(ctx, W, H) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);

        // タイトル
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${W * 0.06}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('⚔ オンライン対戦', W / 2, H * 0.3);

        // 待機アニメ（点滅）
        const dots = '.'.repeat((Math.floor(Date.now() / 400) % 4));
        ctx.fillStyle = '#aaffaa';
        ctx.font = `${W * 0.04}px monospace`;
        ctx.fillText(`対戦相手を探しています${dots}`, W / 2, H * 0.5);

        ctx.fillStyle = '#888';
        ctx.font = `${W * 0.03}px monospace`;
        ctx.fillText('サーバー: localhost:3000', W / 2, H * 0.65);

        ctx.textAlign = 'left';
    }
}
