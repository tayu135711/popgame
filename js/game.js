// ======================================
// GAME - Main Game Loop & State Manager
// ======================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputManager();
        this.sound = new SoundManager();
        // AudioContext must be created after user gesture (browser policy)
        // Will be initialized on first user interaction via resumeAudio handlers below
        this.saveData = SaveManager.load();
        SaveManager.syncCollection(this.saveData);
        // 音量設定を復元
        if (this.saveData.settings && this.saveData.settings.vol != null) {
            this.sound.vol = this.saveData.settings.vol;
        }
        this.particles = new ParticleSystem();
        this.story = new StoryManager(); // Story System

        this.state = 'title'; // title, stage_select, countdown, battle, invasion, result, story, upgrade, fusion, settings
        this.paused = false;
        this.showFPS = false;
        this.fpsHistory = [];
        this.lastFrameTime = performance.now();
        this.frame = 0;
        this.camera_shake = 0;
        this.hitStop = 0;
        this.screenFlash = 0; // white/red flash overlay
        this.screenFlashType = 'white'; // 'white' or 'hit'

        // === コンボシステム ===
        this.comboCount = 0;       // 現在のコンボ数
        this.comboTimer = 0;       // コンボタイマー（0になるとリセット）
        this.comboFlashTimer = 0;  // コンボ数字の点滅演出タイマー
        this.maxCombo = 0;         // 最大コンボ数（バトル中）

        this.selectedStage = 0;
        this.stageIndex = 0; // 初期値を設定（R押下時のリスタート用）
        this.selectedDifficulty = 'NORMAL'; // EASY, NORMAL, HARD
        this.difficultySelectMode = true; // Toggle between difficulty and stage selection
        this.titleCursor = 0; // タイトル画面のメニューカーソル (0=ゲーム開始, 1=イベント, 2=デイリー, 3=図鑑, 4=アップグレード, 5=配合, 6=カスタマイズ, 7=設定)

        // デイリーミッションをチェック・リセット
        SaveManager.checkAndResetDailyMissions(this.saveData);

        // デイリーログインボーナス（スキン）チェック
        this._checkLoginBonus();

        // Battle state
        this.powerupManager = new PowerupManager();
        this.tank = null;
        this.player = null;
        this.ammoDropper = null;
        this.battle = null;
        this.stageData = null;
        this.specialAnimTimer = 0; // Timer for special move cutin
        this.allies = []; // Friendly AI slimes
        this.projectiles = []; // Friendly projectiles (shuriken, magic)
        this.dialogueIndex = 0; // Current dialogue line index


        // Invasion state
        this.enemyTank = null;
        this.prevState = null;     // String: tracks previous state for story scene backgrounds ('battle', 'invasion', etc.)
        this.savedBattleState = null; // Object {tank, player, ammoDropper}: saved state when invading enemy tank
        this.lastState = null; // Track state changes for BGM
        this.introPlayed = false; // Adventure mode intro flag

        // Countdown
        this.countdownTimer = 0;

        // Sanitize Save Data (Remove invalid ammo like 'flag')
        if (this.saveData.deck) {
            this.saveData.deck = this.saveData.deck.filter(id => CONFIG.AMMO_TYPES[id]);
        }
        if (this.saveData.unlockedAmmo) {
            this.saveData.unlockedAmmo = this.saveData.unlockedAmmo.filter(id => CONFIG.AMMO_TYPES[id]);
        }

        // CRITICAL: Clean up allyDeck to remove ghost entries (allies that no longer exist)
        if (this.saveData.allyDeck && this.saveData.unlockedAllies) {
            const validIds = new Set(this.saveData.unlockedAllies.map(a => a.id));
            this.saveData.allyDeck = this.saveData.allyDeck.filter(id => validIds.has(id));
        }

        if (this.saveData.upgrades) {
            this.saveData.upgrades.maxAllySlot = 0;
        }
        if (this.saveData.allyDeck && this.saveData.unlockedAllies) {
            let totalCost = 0;
            this.saveData.allyDeck = this.saveData.allyDeck.filter(id => {
                const ally = this.saveData.unlockedAllies.find(a => a.id === id);
                const cost = ally ? (ally.cost || 1) : 1;
                if (totalCost + cost <= 3) {
                    totalCost += cost;
                    return true;
                }
                return false;
            });
            if (this.saveData.allyDeck.length === 0 && this.saveData.unlockedAllies.length > 0) {
                this.saveData.allyDeck = [this.saveData.unlockedAllies[0].id];
            }
        }

        // MIGRATION: Sync Rarity from Config (Fixes Titan 6 -> 7 for existing saves)
        if (this.saveData.unlockedAllies) {
            this.saveData.unlockedAllies.forEach(ally => {
                if (CONFIG.ALLY_TYPE_RARITY[ally.type]) {
                    // Update rarity if config has a specific value
                    ally.rarity = CONFIG.ALLY_TYPE_RARITY[ally.type];
                }
            });
        }

        SaveManager.save(this.saveData); // Save clean data immediately

        // Result
        this.resultWon = false;
        this.newlyUnlocked = [];
        this.newlyUnlockedAlly = null;
        this.isNewRecord = false;
        this.gachaResult = null;
        this.gachaQueue = []; // 10連スカウト用キュー
        this.fusionAnimTimer = 0; // 配合演出タイマー
        this.fusionAnimChild = null; // 配合演出対象キャラ
        this.gachaAdventureTimer = 0; // ガチャ冒険演出タイマー
        this.gachaRevealTimer = 0;    // ガチャ結果登場アニメタイマー
        this.specialImpactTimer = 0; // 必殺技インパクト演出タイマー
        this.lastSpecialDamage = 50; // 必殺技ダメージ表示用
        this.gachaAdventureRarity = 1; // ガチャ演出のレア度
        // 10連ガチャ演出用（コンストラクタで明示的に初期化）
        this.gacha10AllResults = null;
        this.gacha10SummaryActive = false;
        this.gacha10PendingSummary = false;
        this.victoryTransitionTriggered = false; // ★エンディング二重再生防止用ガード
        this.bossEndingTriggered = false; 
        this.finalEndingTriggered = false;
        this.gacha10ShowCount = 0;
        this.gacha10ShowTimer = 0;
        this._gacha10LastCard = false; // ★バグ修正: コンストラクタ未初期化 → undefined で falsy だが明示化

        // === タイタン・ドラゴン 連携技ゲージ（Cボタン）===
        this.titanSpecialGauge = 0;
        this.dragonSpecialGauge = 0;
        this.platinumSpecialGauge = 0;  // プラチナゴーレム必殺技ゲージ
        this.MAX_ALLY_SPECIAL_GAUGE = 1800; // 30秒（短縮して使いやすく）
        this.titanSpecialAnimTimer = 0;    // タイタンカットインタイマー
        this.dragonSpecialAnimTimer = 0;   // ドラゴンカットインタイマー
        this.platinumSpecialAnimTimer = 0; // プラチナカットインタイマー

        // Battle helpers (must be initialized before any update)
        this.invader = null;
        this.collectionTab = 0;
        this.collectionScroll = 0;
        this.bossDestructionInitialized = false;
        this.destructionTimer = 0;
        this.invasionVictoryTriggered = false;
        this.invasionVictoryDelay = 0;
        this.continueUsed = false; // コンティニュー使用フラグをリセット
        this.atCockpit = false;
        this.returnState = 'title';
        this.fusionParents = [];
        this.fusionCursor = 0;
        this.fusionErrorMessage = null;
        this.fusionErrorTimer = 0;

        // 設定画面
        this.settingsCursor = 0;
        // リザルト画面カーソル (0=もう一度, 1=ステージ選択, 2=コンティニュー)
        this.resultCursor = 0;
        // コンティニューシステム
        this.continueCost = 300;    // コンティニューに必要なゴールド
        this._tapPos = null;  // { x, y } in canvas coordinates

        // Error handling
        this.globalError = null;
        this.lastTouchMode = null; // タッチUIモード追跡（状態変化時のみ setMode を呼ぶため）
        this._fusionBonusNotify = null; // 配合ボーナス通知
        this.battleRank = null; // バトルランク (S/A/B/C)
        this.resultGoToComplete = false; // 全クリア演出フラグ
        this.missionStats = null;        // バトル中統計（startBattleで初期化）
        // メニューカーソル類（各画面に入る前に設定されるが念のため初期化）
        this.deckCursor = 0;
        this.fusionTab = 'merge';
        this.fusionRecipeCursor = 0;
        this.customizeCursor = { tab: 0, item: 0 };
        this._invaderCooldown = 0;
        this.newlyUnlockedPart = null;
        this.singerBuffTimer = 0;       // ★バグ修正: アークエンジェル/レジェンドメタルの歌バフタイマー（未初期化だった）
        this._pendingShakkin = null;    // ★バグ修正: 借金王トリガー（未初期化だった）

        // 初回インベージョン説明オーバーレイ
        this.invasionTutorialTimer = 0; // 0=非表示, >0=表示中

        // === ゲーム改善: ヘルプ・ソート・フィルタ ===
        this.showHelp = false;          // ヘルプオーバーレイ表示
        this.collectionSortMode = 0;    // 0=デフォルト, 1=レア度順, 2=名前順
        this.fusionFilterMode = 0;      // 0=すべて, 1=配合可能のみ

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // ★ズーム防止 (TouchControllerが未使用の環境でも確実に動作させる)
        document.addEventListener('gesturestart',  (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchmove', (e) => {
            // 2本指ピンチ操作をブロック（音量スライダーの1本指ドラッグは許可）
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
        // iOS Safari: アドレスバーの出現/消去でビューポートサイズが変わるため
        // visualViewport の resize も監視する
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.resize());
        }

        // Audio Context Auto-Resume (Fix for Chrome/Edge/Safari Autoplay Policy)
        if (!window._audioResumeListenersAdded) {
            window._audioResumeListenersAdded = true;

            const doResume = () => {
                const snd = window.game && window.game.sound;
                if (!snd) return;
                snd.init(); // AudioContext を作成
                const ctx = snd.ctx;
                if (!ctx) return;

                const afterRunning = () => {
                    // ★BGMが止まっていたら現在の状態に合ったトラックで再スタート
                    const prev = snd.currentTrack;
                    snd.currentTrack = null; // 強制リスタートのためにリセット
                    snd.playBGM(prev || 'title');
                    window.removeEventListener('click',      doResume);
                    window.removeEventListener('keydown',    doResume);
                    window.removeEventListener('touchstart', doResume);
                    window._audioResumeListenersAdded = false;
                };

                if (ctx.state === 'running') {
                    afterRunning();
                } else {
                    // resume() は Promise を返す。.then() で確実に「再生開始後」に処理する
                    ctx.resume().then(afterRunning).catch(() => {});
                }
            };

            window.addEventListener('click',      doResume);
            window.addEventListener('keydown',    doResume);
            window.addEventListener('touchstart', doResume, { passive: true });

        }
        window.game = this; // Global reference for cross-module access
        // スマホタッチコントロール（初期は非表示、バトル開始時に表示）
        if (window.TouchController) {
            this.touch = new TouchController(this.input, this.canvas);
            if (this.touch) this.touch.setVisible(false); // 初期状態は非表示
        }

        // ★メニュー画面用: canvas タップ/スワイプ → キャンバス座標でメニュー操作
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouchDevice) {
            let _swipeStartX = 0, _swipeStartY = 0;

            // キャンバス座標への変換ヘルパー
            const toCanvasPos = (clientX, clientY) => {
                const rect = this.canvas.getBoundingClientRect();
                return {
                    x: (clientX - rect.left) * (CONFIG.CANVAS_WIDTH  / rect.width),
                    y: (clientY - rect.top)  * (CONFIG.CANVAS_HEIGHT / rect.height),
                };
            };

            this.canvas.addEventListener('touchstart', (e) => {
                // バトル/メニュー中はtouch.jsが担当するのでスキップ
                if (this.touch && this.touch.mode === 'battle') return;
                e.preventDefault();
                if (!e.touches || e.touches.length === 0) return; // null guard
                _swipeStartX = e.touches[0].clientX;
                _swipeStartY = e.touches[0].clientY;
            }, { passive: false });

            this.canvas.addEventListener('touchend', (e) => {
                // バトル中はtouch.jsが担当
                if (this.touch && this.touch.mode === 'battle') return;
                e.preventDefault();
                if (!e.changedTouches || e.changedTouches.length === 0) return; // null guard
                const t = e.changedTouches[0];
                const dx = t.clientX - _swipeStartX;
                const dy = t.clientY - _swipeStartY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 14) {
                    this._tapPos = toCanvasPos(t.clientX, t.clientY);
                } else if (Math.abs(dy) > Math.abs(dx)) {
                    const key = dy < 0 ? 'ArrowUp' : 'ArrowDown';
                    this.input.keys[key] = true;
                    setTimeout(() => { this.input.keys[key] = false; }, 80);
                } else {
                    const key = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
                    this.input.keys[key] = true;
                    setTimeout(() => { this.input.keys[key] = false; }, 80);
                }
            }, { passive: false });

            // touchmove: 設定画面の音量スライダーをドラッグで操作
            this.canvas.addEventListener('touchmove', (e) => {
                if (this.touch && this.touch.mode === 'battle') return;
                if (this.state !== 'settings' || this.settingsCursor !== 0) return;
                if (!window._volSliderRect) return;
                if (!e.touches || e.touches.length === 0) return; // null guard
                e.preventDefault();
                const pos = toCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
                const r = window._volSliderRect;
                if (pos.y >= r.y && pos.y <= r.y + r.h && r.w > 0) {
                    const newVol = Math.max(0, Math.min(1, (pos.x - r.x) / r.w));
                    this.saveData.settings.vol = Math.round(newVol * 10) / 10;
                    this.sound.vol = this.saveData.settings.vol;
                    // 保存は touchend に任せる（move 中は毎フレーム保存しない）
                }
            }, { passive: false });
        }

        // ★バグ修正: スマホでホーム画面に戻ったとき Audio が止まらない / 戻ったとき無音になる
        // visibilitychange でページが隠れたら一時停止、表示されたら resume する
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // バックグラウンドへ: AudioContext を suspend してバッテリー節約
                if (this.sound && this.sound.ctx && this.sound.ctx.state === 'running') {
                    this.sound.ctx.suspend().catch(() => {});
                }
                if (this.sound && this.sound.bgmAudio && !this.sound.bgmAudio.paused) {
                    this.sound.bgmAudio.pause();
                    this._bgmPausedByVisibility = true;
                }
            } else {
                // フォアグラウンドへ: AudioContext を resume して BGM も再開
                if (this.sound && this.sound.ctx && this.sound.ctx.state === 'suspended') {
                    this.sound.ctx.resume().catch(() => {});
                }
                if (this.sound && this.sound.bgmAudio && this._bgmPausedByVisibility) {
                    this._bgmPausedByVisibility = false;
                    this.sound.bgmAudio.play().catch(() => {});
                }
            }
        });

        this.loop();
    }

    // ★パフォーマンス修正: update()/draw() 内で毎フレーム new Set/Array していた定数を
    // static フィールドに移動（GC負荷を削減）
    static BATTLE_STATES = new Set([
        'battle', 'defense', 'invasion', 'launching',
        'countdown', 'dialogue', 'tank_destruction',
    ]);
    static MENU_STATES = new Set([
        'title', 'stage_select', 'event_select', 'chapter2_select', 'chapter3_select', 'chapter4_select', 'chapter5_select',
        'deck_edit', 'ally_edit',
        'upgrade', 'fusion', 'collection',
        'daily_missions', 'settings', 'result',
        'ending', 'complete_clear', 'customize',
    ]);
    static NO_SHAKE_STATES = new Set([
        'story', 'dialogue', 'result', 'title', 'stage_select',
        'upgrade', 'fusion', 'collection', 'daily_missions',
        'ally_edit', 'deck_edit', 'event_select', 'chapter2_select', 'chapter3_select', 'chapter4_select', 'chapter5_select', 'ending',
    ]);

    resize() {
        const ratio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
        // iOS Safari ではアドレスバー出現中に window.innerHeight が不正確になる
        // visualViewport が使えるブラウザではそちらを優先する
        const vp = window.visualViewport;
        let w = vp ? vp.width  : window.innerWidth;
        let h = vp ? vp.height : window.innerHeight;
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
        // PC等の大画面で必要以上に巨大化しないよう上限を設ける
        const MAX_H = 800;
        const MAX_W = MAX_H * ratio;
        if (h > MAX_H) { h = MAX_H; w = MAX_W; }
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
    }

    loop(timestamp = 0) {
        if (this.globalError) {
            this.draw();
            requestAnimationFrame((ts) => this.loop(ts));
            return;
        }

        // 60FPSに上限を設定（高リフレッシュレートモニターでも重くならないように）
        const TARGET_INTERVAL = 1000 / 60;
        if (!this._lastLoopTime) this._lastLoopTime = timestamp;
        const elapsed = timestamp - this._lastLoopTime;

        if (elapsed < TARGET_INTERVAL - 1) {
            // まだ次のフレームの時間ではないのでスキップ
            requestAnimationFrame((ts) => this.loop(ts));
            return;
        }
        this._lastLoopTime = timestamp - (elapsed % TARGET_INTERVAL);

        try {
            this.frame++;
        if (this.singerBuffTimer > 0) this.singerBuffTimer--; // アークエンジェルの歌バフタイマー
        _tickFrameNow();
            this.update();
            this.draw();
            this.input.tick();
            requestAnimationFrame((ts) => this.loop(ts));
        } catch (e) {
            console.error('Game Loop Error:', e);
            this.globalError = e;
            this.draw();
            // ★バグ修正: catch後にrAFを呼ばないとループが完全停止してエラー画面も消える
            requestAnimationFrame((ts) => this.loop(ts));
        }
    }

    // ===== UPDATE =====
    update() {
        // If error occurred, stop updating
        if (this.globalError) return;

        try {
            // Pause Toggle (during gameplay only)
            if (Game.BATTLE_STATES.has(this.state)) {
                if (this.input.pause) {
                    this.paused = !this.paused;
                    this.sound.play('cursor');
                }
                if (this.paused) {
                    // Allow restart while paused
                    if (this.input.pressed('KeyR')) {
                        this.paused = false;
                        this.startBattle(this.stageIndex); // Restart current stage using index
                        this.sound.play('start');
                    }
                    return; // Skip all updates when paused
                }

                // Repair Kit Usage (R key)
                if (this.input.pressed('KeyR') && this.saveData.repairKits > 0) {
                    this.saveData.repairKits--;
                    const healAmount = Math.floor(this.battle.playerTankMaxHP * 0.3);
                    this.battle.playerTankHP = Math.min(this.battle.playerTankMaxHP, this.battle.playerTankHP + healAmount);
                    SaveManager.save(this.saveData);
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 100, `修理キット使用! +${healAmount}HP`, '#00FF00');
                    this.sound.play('heal');
                }
            }

            // Help Toggle (H key)
            if (this.input.pressed('KeyH')) {
                this.showHelp = !this.showHelp;
                this.sound.play('cursor');
            }
            if (this.showHelp && !this.input.pressed('KeyH') && (this.input.menuConfirm || this.input.back)) {
                this.showHelp = false; // 決定や戻るでもヘルプを閉じる
            }

            // Global Skip Help: Any state update should close help if other inputs are pressed
            // But let's keep it simple for now.

            // FPS Toggle (F key)
            if (this.input.pressed('KeyF')) {
                this.showFPS = !this.showFPS;
            }

            // Volume Control (+ - keys)
            if (this.input.pressed('Equal') || this.input.pressed('NumpadAdd')) {
                this.sound.vol = Math.min(1.0, this.sound.vol + 0.1);
                this.saveData.settings.vol = this.sound.vol;
                SaveManager.save(this.saveData);
                this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 50, `音量: ${Math.round(this.sound.vol * 100)}%`, '#FFD700');
            }
            if (this.input.pressed('Minus') || this.input.pressed('NumpadSubtract')) {
                this.sound.vol = Math.max(0.0, this.sound.vol - 0.1);
                this.saveData.settings.vol = this.sound.vol;
                SaveManager.save(this.saveData);
                this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 50, `音量: ${Math.round(this.sound.vol * 100)}%`, '#FFD700');
            }

            // Story Update
            if (this.state === 'story') {
                this.story.update(this.input);
                return;
            }

            try {
                this.particles.update();
            } catch (e) {
                console.warn('Particle Update Error:', e);
                // Try to clear particles to recover
                try { this.particles.clear(); } catch (ex) { }
            }

            // Hit Stop (Frame Freeze)
            if (this.hitStop > 0) {
                this.hitStop--;
                return;
            }

            if (this.camera_shake > 0) this.camera_shake--;
            if (this.screenFlash > 0) this.screenFlash--;

            // コンボタイマー
            if (this.comboTimer > 0) {
                this.comboTimer--;
                if (this.comboTimer === 0 && this.comboCount > 0) {
                    this.comboCount = 0;
                }
            }
            if (this.comboFlashTimer > 0) this.comboFlashTimer--;

            // Tick global player/ally states if they exist
            if (this.player) {
                // stunned は player.update() 内でデクリメントされるため、ここでは invincible と attackCooldown のみ
                if (this.player.invincible > 0) this.player.invincible--;
                if (this.player.attackCooldown > 0) this.player.attackCooldown--;
            }
            if (this.allies) {
                for (const ally of this.allies) {
                    if ((ally.invincibleTimer || 0) > 0) ally.invincibleTimer--;
                }
            }
            // Update Projectiles
            if (this.projectiles) {
                for (let i = this.projectiles.length - 1; i >= 0; i--) {
                    const p = this.projectiles[i];
                    p.update();

                    // Ally projectile vs invader (defense mode) or battle invader
                    if (p.active && this.invader && this.invader.hp > 0) {
                        const ix = this.invader.x + this.invader.w / 2;
                        const iy = this.invader.y + this.invader.h / 2;
                        const pdx = (p.x + p.w / 2) - ix;
                        const pdy = (p.y + p.h / 2) - iy;
                        if (Math.abs(pdx) < (p.w / 2 + this.invader.w / 2) &&
                            Math.abs(pdy) < (p.h / 2 + this.invader.h / 2)) {
                            const didHit = this.invader.takeDamage(p.damage, pdx > 0 ? 1 : -1);
                            // ★バグ修正: invincible中はtakeDamage()がfalseを返すため
                            // onHit（EXP付与など）は実際にダメージが入った時のみ呼ぶ
                            if (didHit && p.onHit) try { p.onHit(); } catch(e) {}
                            p.active = false;
                            if (this.particles) this.particles.hit(ix, iy);
                        }
                    }

                    // Ally projectile vs enemy tank defenders (when in own tank)
                    if (p.active && this.tank && this.tank.defenders) {
                        for (const d of this.tank.defenders) {
                            if (d.hp > 0 && d.invincible <= 0) {
                                const ddx = (p.x + p.w / 2) - (d.x + d.w / 2);
                                const ddy = (p.y + p.h / 2) - (d.y + d.h / 2);
                                if (Math.abs(ddx) < (p.w / 2 + d.w / 2) &&
                                    Math.abs(ddy) < (p.h / 2 + d.h / 2)) {
                                    d.takeHit(p.damage, ddx / (Math.abs(ddx) || 1), ddy / (Math.abs(ddy) || 1));
                                    // ★バグ修正: onHit コールバック（EXP付与など）を呼ぶ
                                    if (p.onHit) try { p.onHit(); } catch(e) {}
                                    p.active = false;
                                    if (this.particles) this.particles.hit(d.x + d.w / 2, d.y + d.h / 2);
                                    break;
                                }
                            }
                        }
                    }

                    if (!p.active) this.projectiles.splice(i, 1);
                }
            }

            // Global Reset (Console Command Only)

            // State Management & BGM
            // Detect state change could be cleaner, but for now let's insert into specific methods or check here.
            // Actually, adding a wrapper for state change is Risky for this size of edit.
            // I will add BGM calls where states are set. 
            // OR checks here:
            if (this.state !== this.lastState) {
                this.lastState = this.state;
                if (this.state === 'title') this.sound.playBGM('title');
                if (this.state === 'stage_select') this.sound.playBGM('title');
                if (this.state === 'chapter2_select') this.sound.playBGM('shop');
                if (this.state === 'chapter3_select') this.sound.playBGM('show');
                if (this.state === 'chapter4_select') this.sound.playBGM('battle'); // 混沌のBGM
                if (this.state === 'chapter5_select') this.sound.playBGM('battle'); // 原初のBGM
                if (this.state === 'battle') {
                    // ★バグ修正: startBattle()で選択したトラックを使う（上書き防止）
                    const stageId = this.stageData?.id;
                    if (stageId === 'stage8') {
                        this.sound.playBGM('boss');
                    } else if (this.stageData && STAGES.findIndex(s => s.id === stageId) >= 4) {
                        this.sound.playBGM('boss');
                    } else {
                        // currentBattleTrack が未設定の場合は fallback として 'battle' を使用
                        this.sound.playBGM(this.currentBattleTrack || 'battle');
                    }
                }
                if (this.state === 'upgrade') this.sound.playBGM('shop');
                if (this.state === 'result') this.sound.playBGM('victory'); // Play victory BGM (battle theme continues)
            }

            // ★バグ修正: タッチUIをゲーム状態に応じて表示/非表示
            // ★パフォーマンス修正: 状態変化時のみ setMode を呼ぶ（毎フレームDOM操作しない）
            // ★スコープ修正: static 定数を参照（毎フレーム new Set() するGCを解消）
            const battleStates = Game.BATTLE_STATES;
            const menuStates   = Game.MENU_STATES;

            if (this.touch && this.state !== this.lastTouchMode) {
                // lastTouchMode で「状態そのもの」を追跡することで、
                // メニュー内での遷移（例：タイトル -> コレクション）でも setMode が呼ばれ、 UIが更新されるようにする
                this.lastTouchMode = this.state;

                if (battleStates.has(this.state)) {
                    this.touch.setMode('battle');
                } else if (this.state === 'story') {
                    this.touch.setMode('story');
                } else if (menuStates.has(this.state)) {
                    this.touch.setMode('menu');
                } else {
                    this.touch.setMode('hidden');
                }
            }

            // ★メニューショートカット (Qキー): 図鑑と配合のクイックアクセス
            if (this.input.pressed('KeyQ') && menuStates.has(this.state)) {
                if (this.state === 'fusion') {
                    // fusion内部のタブ切替は updateFusion() 側で優先処理されるため、
                    // ここでは fusion 以外の状態からの遷移のみを扱う。
                } else if (this.state === 'collection') {
                    this.state = 'fusion';
                    this.fusionParents = []; this.fusionCursor = 0;
                    this.sound.play('confirm');
                } else {
                    this.state = 'collection';
                    this.collectionTab = 0;
                    this.sound.play('confirm');
                }
            }

            // ★タップ判定: ヒット領域と突き合わせてカーソル移動/決定
            if (this._tapPos) {
                this._processTap(this._tapPos);
                this._tapPos = null;
            }

            switch (this.state) {
                case 'title': this.updateTitle(); break;
                case 'stage_select': this.updateStageSelect(); break;
                case 'event_select': this.updateEventSelect(); break;
                case 'chapter2_select': this.updateChapter2Select(); break;
                case 'chapter3_select': this.updateChapter3Select(); break;
                case 'chapter4_select': this.updateChapter4Select(); break;
                case 'chapter5_select': this.updateChapter5Select(); break;
                case 'daily_missions': this.updateDailyMissions(); break;
                case 'collection': this.updateCollection(); break;
                case 'deck_edit': this.updateDeckEdit(); break;
                case 'ally_edit': this.updateAllyEdit(); break;
                case 'dialogue': this.updateDialogue(); break;
                case 'countdown': this.updateCountdown(); break;
                case 'battle': this.updateBattle(); break;
                case 'defense': this.updateDefense(); break;
                case 'invasion': this.updateInvasion(); break;
                case 'launching': this.updateLaunching(); break;
                case 'result': this.updateResult(); break;
                case 'tank_destruction': this.updateTankDestruction(); break;
                case 'upgrade': this.updateUpgrade(); break;
                case 'fusion': this.updateFusion(); break;
                case 'ending': this.updateEnding(); break;
                case 'settings': this.updateSettings(); break;
                case 'customize': this.updateCustomize(); break;
                case 'complete_clear':
                    if (this.frame > 300 && (this.input.menuConfirm || this.input.back)) {
                        this.sound.play('confirm');
                        // ★バグ修正: complete_clear から title へ戻る際にドラゴンスキンを復元する
                        // （startBattle を経由しない遷移なので、ここでも _preDragonSkin を確認する）
                        if (this.saveData && this.saveData.tankCustom && this.saveData.tankCustom._preDragonSkin) {
                            this.saveData.tankCustom.skin = this.saveData.tankCustom._preDragonSkin;
                            delete this.saveData.tankCustom._preDragonSkin;
                            SaveManager.save(this.saveData);
                        }
                        this.state = 'title';
                        this.frame = 0;
                    }
                    break;
            }
        } catch (e) {
            console.error('Game Update Error:', e);
            this.globalError = e;
        }
    }

    updateTitle() {
        // ログインボーナスポップアップ表示中はZ/タップで閉じる
        if (this._pendingLoginBonus) {
            if (this.input.menuConfirm || this.input.action || this.input.back) {
                this._pendingLoginBonus = null;
                this.sound.play('confirm');
            }
            return; // ポップアップ中はメニュー操作を無効化
        }

        const allMainCleared = STAGES_MAIN && STAGES_MAIN.every(s => this.saveData.clearedStages && this.saveData.clearedStages.includes(s.id));
        const chapter2Cleared = !!(this.saveData.clearedStages && this.saveData.clearedStages.includes('c2_boss'));
        const chapter3Cleared = !!(this.saveData.clearedStages && this.saveData.clearedStages.includes('c3_boss'));
        const chapter4Cleared = !!(this.saveData.clearedStages && this.saveData.clearedStages.includes('c4_boss'));
        const ch2Label = allMainCleared ? '✨ 第2章「ギアギアどきどき大作戦！」' : null;
        // ch3はCh2クリア かつ ch2Labelが表示されている（Ch1もクリア済み）場合のみ解放
        const ch3Label = (chapter2Cleared && allMainCleared) ? '☁ 第3章「天門のスカイパレード」' : null;
        // ch4はCh3クリア後に解放
        const ch4Label = (chapter3Cleared && chapter2Cleared && allMainCleared) ? '🌑 第4章「深淵のカオスゾーン」' : null;
        // ch5はCh4クリア後に解放
        const ch5Label = (chapter4Cleared && chapter3Cleared && chapter2Cleared && allMainCleared) ? '✨ 第5章「原初の光と終焉の砲火」' : null;
        const menuItems = ['ゲーム開始', 'イベントステージ', 'デイリーミッション', '図鑑', 'アップグレード', '配合', '🎨 カスタマイズ', '⚙ 設定'];
        if (ch2Label) menuItems.splice(1, 0, ch2Label); // 全クリ後はゲーム開始の次に挿入
        if (ch3Label) menuItems.splice(ch2Label ? 2 : 1, 0, ch3Label);
        if (ch4Label) menuItems.splice((ch2Label ? 1 : 0) + (ch3Label ? 1 : 0) + 1, 0, ch4Label);
        if (ch5Label) menuItems.splice((ch2Label ? 1 : 0) + (ch3Label ? 1 : 0) + (ch4Label ? 1 : 0) + 1, 0, ch5Label);

        // メニュー選択
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            if (menuItems.length > 0) this.titleCursor = (this.titleCursor - 1 + menuItems.length) % menuItems.length;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            if (menuItems.length > 0) this.titleCursor = (this.titleCursor + 1) % menuItems.length;
            this.sound.play('cursor');
        }

        // 決定
        if (this.input.menuConfirm) {
            this.sound.init();
            this.sound.play('confirm');

            // ch2Label が挿入されているかでインデックスをオフセット
            const ch2Offset = ch2Label ? 1 : 0;
            const ch3Offset = ch3Label ? 1 : 0;
            const ch4Offset = ch4Label ? 1 : 0;
            const ch5Offset = ch5Label ? 1 : 0;
            const cur = this.titleCursor;

            if (ch5Label) {
                if (cur === 0) {
                    this.state = 'stage_select'; this.selectedStage = 0; this.stageIndex = 0; this.difficultySelectMode = false;
                } else if (ch2Label && cur === 1) {
                    this._enterChapter2Select();
                } else if (ch3Label && cur === (ch2Label ? 2 : 1)) {
                    this._enterChapter3Select();
                } else if (ch4Label && cur === (ch2Label ? 1 : 0) + (ch3Label ? 1 : 0) + 1) {
                    this._enterChapter4Select();
                } else if (cur === (ch2Label ? 1 : 0) + (ch3Label ? 1 : 0) + (ch4Label ? 1 : 0) + 1) {
                    this._enterChapter5Select();
                } else {
                    switch (cur - ch2Offset - ch3Offset - ch4Offset - ch5Offset) {
                        case 1: this.state = 'event_select'; this.selectedStage = 0; this.stageIndex = 0; break;
                        case 2: this.state = 'daily_missions'; break;
                        case 3: this.state = 'collection'; this.collectionTab = 0; break;
                        case 4: this.state = 'upgrade'; this.deckCursor = 0; this.returnState = 'title'; break;
                        case 5: this.state = 'fusion'; this.fusionParents = []; this.fusionCursor = 0; this.fusionErrorMessage = null; this.fusionErrorTimer = 0; this.fusionTab = 'merge'; this.fusionRecipeCursor = 0; this.returnState = 'title'; break;
                        case 6: this.state = 'customize'; this.customizeCursor = { tab: 0, item: 0 }; this.returnState = 'title'; break;
                        case 7: this.state = 'settings'; this.settingsCursor = 0; break;
                    }
                }
                return;
            }

            if (ch4Label) {
                if (cur === 0) {
                    this.state = 'stage_select'; this.selectedStage = 0; this.stageIndex = 0; this.difficultySelectMode = false;
                } else if (ch2Label && cur === 1) {
                    this._enterChapter2Select();
                } else if (ch3Label && cur === (ch2Label ? 2 : 1)) {
                    this._enterChapter3Select();
                } else if (cur === (ch2Label ? 1 : 0) + (ch3Label ? 1 : 0) + 1) {
                    this._enterChapter4Select();
                } else {
                    switch (cur - ch2Offset - ch3Offset - ch4Offset) {
                        case 1: this.state = 'event_select'; this.selectedStage = 0; this.stageIndex = 0; break;
                        case 2: this.state = 'daily_missions'; break;
                        case 3: this.state = 'collection'; this.collectionTab = 0; break;
                        case 4: this.state = 'upgrade'; this.deckCursor = 0; this.returnState = 'title'; break;
                        case 5: this.state = 'fusion'; this.fusionParents = []; this.fusionCursor = 0; this.fusionErrorMessage = null; this.fusionErrorTimer = 0; this.fusionTab = 'merge'; this.fusionRecipeCursor = 0; this.returnState = 'title'; break;
                        case 6: this.state = 'customize'; this.customizeCursor = { tab: 0, item: 0 }; this.returnState = 'title'; break;
                        case 7: this.state = 'settings'; this.settingsCursor = 0; break;
                    }
                }
                return;
            }

            if (ch3Label) {
                if (cur === 0) {
                    this.state = 'stage_select';
                    this.selectedStage = 0;
                    this.stageIndex = 0;
                    this.difficultySelectMode = false;
                } else if (ch2Label && cur === 1) {
                    this._enterChapter2Select();
                } else if (cur === (ch2Label ? 2 : 1)) {
                    this._enterChapter3Select();
                } else {
                    switch (cur - ch2Offset - ch3Offset) {
                        case 1:
                            this.state = 'event_select';
                            this.selectedStage = 0;
                            this.stageIndex = 0;
                            break;
                        case 2:
                            this.state = 'daily_missions';
                            break;
                        case 3:
                            this.state = 'collection';
                            this.collectionTab = 0;
                            break;
                        case 4:
                            this.state = 'upgrade';
                            this.deckCursor = 0;
                            this.returnState = 'title';
                            break;
                        case 5:
                            this.state = 'fusion';
                            this.fusionParents = [];
                            this.fusionCursor = 0;
                            this.fusionErrorMessage = null;
                            this.fusionErrorTimer = 0;
                            this.fusionTab = 'merge';
                            this.fusionRecipeCursor = 0;
                            this.returnState = 'title';
                            break;
                        case 6:
                            this.state = 'customize';
                            this.customizeCursor = { tab: 0, item: 0 };
                            this.returnState = 'title';
                            break;
                        case 7:
                            this.state = 'settings';
                            this.settingsCursor = 0;
                            break;
                    }
                }
                return;
            }

            if (cur === 0) { // ゲーム開始
                this.state = 'stage_select';
                this.selectedStage = 0;
                this.stageIndex = 0;
                this.difficultySelectMode = false;
            } else if (ch2Label && cur === 1) { // 第2章（全クリ後のみ）
                this._enterChapter2Select();
            } else {
                switch (cur - ch2Offset) {
                    case 1: // イベントステージ
                        this.state = 'event_select';
                        this.selectedStage = 0;
                        this.stageIndex = 0;
                        break;
                    case 2: // デイリーミッション
                        this.state = 'daily_missions';
                        break;
                    case 3: // 図鑑
                        this.state = 'collection';
                        this.collectionTab = 0;
                        break;
                    case 4: // アップグレード
                        this.state = 'upgrade';
                        this.deckCursor = 0;
                        this.returnState = 'title';
                        break;
                    case 5: // 配合
                        this.state = 'fusion';
                        this.fusionParents = [];
                        this.fusionCursor = 0;
                        this.fusionErrorMessage = null;
                        this.fusionErrorTimer = 0;
                        this.fusionTab = 'merge';
                        this.fusionRecipeCursor = 0;
                        this.returnState = 'title';
                        break;
                    case 6: // カスタマイズ
                        this.state = 'customize';
                        this.customizeCursor = { tab: 0, item: 0 };
                        this.returnState = 'title';
                        break;
                    case 7: // 設定
                        this.state = 'settings';
                        this.settingsCursor = 0;
                        break;
                }
            }
        }

        // Reset Data Shortcut (R key)
        // ★バグ修正: window.confirm は iOS PWA モードでブロックされるため
        // 2回押し確認方式に変更（1回目で警告表示、2回目で実行）。
        if (this.input.pressed('KeyR')) {
            if (this._resetConfirmPending && this._resetConfirmTimer < 170) {
                // 2回目のRで確定リセット
                this._resetConfirmPending = false;
                SaveManager.reset();
                location.reload();
            } else {
                this._resetConfirmPending = true;
                this._resetConfirmTimer = 180;
                if (this.particles) {
                    this.particles.damageNum(
                        CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 30,
                        'Rキーをもう一度押すとリセット！', '#FF5252'
                    );
                }
            }
        }
        if (this._resetConfirmPending) {
            if ((this._resetConfirmTimer || 0) > 0) {
                this._resetConfirmTimer--;
            } else {
                this._resetConfirmPending = false;
            }
        }
    }

    updateStageSelect() {
        // Difficulty Selection Mode
        if (this.difficultySelectMode) {
            const difficulties = ['EASY', 'NORMAL', 'HARD'];
            const currentIndex = difficulties.indexOf(this.selectedDifficulty);

            // Left/Right to change difficulty
            if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
                this.selectedDifficulty = difficulties[(currentIndex - 1 + difficulties.length) % difficulties.length];
                this.sound.play('select');
            }
            if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
                this.selectedDifficulty = difficulties[(currentIndex + 1) % difficulties.length];
                this.sound.play('select');
            }

            // ★バグ修正: ArrowUp/Down でも難易度確定＆ステージ選択へ移行できるようにする。
            // 以前は ArrowUp/Down が difficulty モードでは完全に無視されていたため
            // 「上下キーが効かない」と感じる原因になっていた。
            if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW') ||
                this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
                this.sound.play('confirm');
                this.difficultySelectMode = false; // 上下キーは「難易度確定→ステージ選択へ」
            }

            // Confirm difficulty selection
            if (this.input.menuConfirm) {
                this.sound.play('confirm');
                this.difficultySelectMode = false; // Switch to stage selection
            }

            // Back to title with B button
            if (this.input.back) {
                this.sound.play('select');
                this.state = 'title';
            }

            return; // Don't process stage selection yet
        }

        // ★バグ修正①: EXステージ到達不能バグの修正
        // STAGES_NORMAL は isExtra を除外しているため、全メインクリア後は
        // STAGES_EX を結合したリストを使用しないと EX ステージが選択できなかった。
        const allNormalStages = STAGES_NORMAL;
        const mainStages = STAGES_MAIN;
        const allMainCleared = mainStages.every(s => this.saveData.clearedStages.includes(s.id));

        // 表示するステージリスト: 全クリア後は EX ステージも追加
        const normalStages = allMainCleared
            ? [...allNormalStages, ...(window.STAGES_EX || [])]
            : allNormalStages;

        // Calculate max unlocked stage
        // Default: Stage 1 is unlocked.
        // If Stage N is cleared, Stage N+1 is unlocked.
        // Event stages are excluded from normal stage select
        let maxStage = 0;

        for (let i = 0; i < normalStages.length - 1; i++) {
            if (this.saveData.clearedStages.includes(normalStages[i].id)) {
                maxStage = i + 1;
            }
        }

        if (allMainCleared) {
            // 全メインステージクリア済みなら、全てのステージを選択可能に
            maxStage = normalStages.length - 1;
        }

        // Debug/Cheat: Unlock all if name is 'DEBUG'? (Optional)
        // For now, just trust the save data.

        // Stage Navigation (Left/Right + Down to cycle)
        if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD') || this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            if (this.selectedStage < maxStage) {
                this.selectedStage++;
                this.sound.play('select');
            }
        }
        if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA') || this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            if (this.selectedStage > 0) {
                this.selectedStage--;
                this.sound.play('select');
            } else {
                // Change difficulty if at top stage
                this.difficultySelectMode = true;
                this.sound.play('select');
            }
        }

        // ※ Up + selectedStage===0 は difficultySelectMode への遷移のみで行うため、
        //   ここへの到達時点では difficultySelectMode = true がセット済み。
        //   アップグレード画面へのショートカットは削除（二重遷移バグの原因）

        if (this.input.menuConfirm) {
            this.sound.play('confirm');

            // Re-sanitize to be absolutely sure (Fixes freeze on hot-reload/existing bad state)
            this.saveData.deck = this.saveData.deck.filter(id => CONFIG.AMMO_TYPES[id]);
            this.saveData.unlockedAmmo = this.saveData.unlockedAmmo.filter(id => CONFIG.AMMO_TYPES[id]);
            SaveManager.save(this.saveData);

            // Convert normalStages index to actual STAGES index
            const selectedNormalStage = normalStages[this.selectedStage];
            if (selectedNormalStage) {
                const actualStageIndex = STAGES.findIndex(s => s.id === selectedNormalStage.id);
                this.selectedStage = actualStageIndex;
            } else {
                // Fallback: selectedStage is out of range, reset to 0
                this.selectedStage = 0;
            }

            this.state = 'deck_edit';
            this.returnState = 'stage_select';
            this.deckCursor = 0;

            // Ensure deck has at least one item
            if (this.saveData.deck.length === 0) {
                this.saveData.deck.push('rock');
                SaveManager.save(this.saveData);
            }

            // Bug fix: unlockedAmmoが空の場合、rockを追加してzキーが反応しない問題を修正
            if (!this.saveData.unlockedAmmo || this.saveData.unlockedAmmo.length === 0) {
                this.saveData.unlockedAmmo = ['rock'];
                SaveManager.save(this.saveData);
            }
        }
        // B button to go back
        if (this.input.back) {
            this.sound.play('select');
            this.difficultySelectMode = true; // Go back to difficulty selection
        }
    }

    updateDeckEdit() {
        const unlocked = this.saveData.unlockedAmmo;
        const deck = this.saveData.deck;
        // Bug fix: デッキ容量アップグレードを反映
        const capacityLevel = (this.saveData.upgrades && this.saveData.upgrades.capacity) || 0;
        const maxDeckSize = 5 + (CONFIG.UPGRADES.CAPACITY.CAPACITY_INCREASE[capacityLevel] || 0);

        // Auto-correct cursor if out of bounds (e.g. after sanitization)
        if (this.deckCursor >= unlocked.length) {
            this.deckCursor = Math.max(0, unlocked.length - 1);
        }

        // Cursor Move
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.deckCursor--;
            if (this.deckCursor < 0) this.deckCursor = unlocked.length - 1;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.deckCursor++;
            if (this.deckCursor >= unlocked.length) this.deckCursor = 0;
            this.sound.play('cursor');
        }

        // Toggle Equip (Z)
        // action is a getter using pressed(), so it triggers once per press. No need to reset.
        if (this.input.action) {
            const selectedAmmo = unlocked[this.deckCursor];
            if (selectedAmmo && CONFIG.AMMO_TYPES[selectedAmmo]) {
                const deckIndex = deck.indexOf(selectedAmmo);

                if (deckIndex !== -1) {
                    // Remove (Must keep at least 1 item)
                    if (deck.length > 1) {
                        deck.splice(deckIndex, 1);
                        this.sound.play('cancel');
                    } else {
                        this.sound.play('damage'); // Error sound
                    }
                } else {
                    // Add（★バグ修正: 重複追加を防ぐ）
                    if (deck.includes(selectedAmmo)) {
                        this.sound.play('damage'); // Error sound (Already in deck)
                    } else if (deck.length < maxDeckSize) {
                        deck.push(selectedAmmo);
                        this.sound.play('confirm');
                    } else {
                        this.sound.play('damage'); // Error sound (Full)
                    }
                }
                SaveManager.save(this.saveData); // Save deck changes immediately
            }
        }

        // 仲間編集へ (Space/Enter/Cキー。ZはToggle専用なので除外)
        if (this.input.confirm || this.input.invade) {
            if (deck.length > 0) {
                this.sound.play('confirm');
                this.state = 'ally_edit';
                this.deckCursor = 0;
            }
        }

        // ★X ボタン: デッキ編集をスキップして即バトル開始
        if (this.input.pressed('KeyX')) {
            if (deck.length > 0) {
                this.sound.play('confirm');
                this.startBattle(this.selectedStage);
            } else {
                this.sound.play('damage');
                this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 300, 'デッキが空です！', '#FF5252');
            }
        }
        // B button to go back
        if (this.input.back) {
            this.sound.play('select');
            // ★バグ修正: this.stageDataはstartBattle()後にしか設定されないため、
            // バトル開始前にデッキ編集から戻るとstageIdがnullになりカーソルが0にリセットされていた。
            // STAGES[this.selectedStage] をフォールバックに使うことで正しいIDを取得する。
            const stageId = this.stageData?.id || STAGES[this.selectedStage]?.id;
            if (this.returnState === 'event_select') {
                this.state = 'event_select';
                const eventStages = STAGES_EVENT;
                const idx = stageId ? eventStages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            } else if (this.returnState === 'chapter2_select') {
                this.state = 'chapter2_select';
                const ch2Stages = window.STAGES_CHAPTER2 || [];
                const idx = stageId ? ch2Stages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            } else if (this.returnState === 'chapter3_select') {
                this.state = 'chapter3_select';
                const ch3Stages = window.STAGES_CHAPTER3 || [];
                const idx = stageId ? ch3Stages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            } else if (this.returnState === 'chapter4_select') {
                this.state = 'chapter4_select';
                const ch4Stages = window.STAGES_CHAPTER4 || [];
                const idx = stageId ? ch4Stages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            } else if (this.returnState === 'chapter5_select') {
                this.state = 'chapter5_select';
                const ch5Stages = window.STAGES_CHAPTER5 || [];
                const idx = stageId ? ch5Stages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            } else {
                this.state = 'stage_select';
                this.difficultySelectMode = false; // ★バグ修正: デッキ編集から戻った時も矢印が即使えるよう
                // ★バグ修正: 全メインクリア後はEXステージも含むリストで検索する。
                // STAGES_NORMAL のみで findIndex するとEXステージのIDが -1 になり
                // selectedStage が 0（1面）にリセットされるバグを修正。
                const allMainCleared = STAGES_MAIN.every(s => this.saveData.clearedStages.includes(s.id));
                const normalStages = allMainCleared
                    ? [...STAGES_NORMAL, ...(window.STAGES_EX || [])]
                    : STAGES_NORMAL;
                const idx = stageId ? normalStages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            }
        }
    }

    updateAllyEdit() {
        const unlocked = this.saveData.unlockedAllies;
        const deck = this.saveData.allyDeck;
        const maxCost = 3;

        // Calculate current deck cost
        const getCurrentCost = () => {
            return deck.reduce((total, id) => {
                const ally = unlocked.find(a => a.id === id);
                return total + (ally ? (ally.cost || 1) : 0);
            }, 0);
        };

        // Auto-correct cursor if out of bounds
        if (this.deckCursor >= unlocked.length) {
            this.deckCursor = Math.max(0, unlocked.length - 1);
        }

        // Cursor Move
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.deckCursor--;
            if (this.deckCursor < 0) this.deckCursor = unlocked.length - 1;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.deckCursor++;
            if (this.deckCursor >= unlocked.length) this.deckCursor = 0;
            this.sound.play('cursor');
        }

        // Toggle Equip (Z)
        if (this.input.action) {
            const selectedAlly = unlocked[this.deckCursor];
            if (selectedAlly) {
                const deckIndex = deck.indexOf(selectedAlly.id);
                const currentCost = getCurrentCost();
                const allyCost = selectedAlly.cost || 1;

                if (deckIndex !== -1) {
                    // Remove from deck
                    deck.splice(deckIndex, 1);
                    this.sound.play('cancel');
                } else {
                    // Try to add to deck
                    if (currentCost + allyCost <= maxCost) {
                        deck.push(selectedAlly.id);
                        this.sound.play('confirm');
                    } else {
                        // Not enough cost space
                        this.sound.play('damage');
                        // Show error message briefly
                        this.particles.damageNum(
                            CONFIG.CANVAS_WIDTH / 2,
                            CONFIG.CANVAS_HEIGHT / 2,
                            'コスト不足！',
                            '#FF5252'
                        );
                    }
                }
                SaveManager.save(this.saveData);
            }
        }

        // Start Battle (Space/Enter/Cキー。ZはToggle専用なので除外)
        if (this.input.confirm || this.input.invade) {
            // Bug Fix: unlockedが空の場合はバトル開始不可
            if (unlocked.length === 0) {
                this.sound.play('damage');
                this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '仲間が必要です！', '#FF5252');
                return;
            }
            // Ensure at least 1 ally if deck is empty
            if (deck.length === 0) {
                deck.push(unlocked[0].id);
                SaveManager.save(this.saveData);
            }

            this.sound.play('confirm');
            this.startBattle(this.selectedStage);
        }
        // B button to go back
        if (this.input.back) {
            this.sound.play('select');
            this.state = 'deck_edit';
        }
    }

    startBattle(stageIndex) {
        this.stageIndex = stageIndex;
        this._pendingShakkin = null; // ★バグ修正: リスタート時に借金王トリガーをリセット
        // ★バグ修正: 仲間編成・デッキ編成画面のタップ判定領域をクリア。
        window._menuHitRegions = null;

        // 第2章ステージは STAGES 配列外のため STAGES_CHAPTER2 から元データを取得する
        // ★バグ修正: this.stageData をそのままクローンすると difficulty が毎リトライで二重適用される
        const ch2StageId = this.stageData && this.stageData.isChapter2 ? this.stageData.id : null;
        if (ch2StageId) {
            // 必ず STAGES_CHAPTER2 の元データからクローン（difficulty 二重適用を防ぐ）
            const ch2Origin = (window.STAGES_CHAPTER2 || []).find(s => s.id === ch2StageId);
            if (ch2Origin) {
                this.stageData = JSON.parse(JSON.stringify(ch2Origin));
            }
        } else if (this.stageData && this.stageData.isChapter3) {
            const ch3Origin = (window.STAGES_CHAPTER3 || []).find(s => s.id === this.stageData.id);
            if (ch3Origin) {
                this.stageData = JSON.parse(JSON.stringify(ch3Origin));
            }
        } else if (this.stageData && this.stageData.isChapter4) {
            const ch4Origin = (window.STAGES_CHAPTER4 || []).find(s => s.id === this.stageData.id);
            if (ch4Origin) {
                this.stageData = JSON.parse(JSON.stringify(ch4Origin));
            }
        } else if (this.stageData && this.stageData.isChapter5) {
            const ch5Origin = (window.STAGES_CHAPTER5 || []).find(s => s.id === this.stageData.id);
            if (ch5Origin) {
                this.stageData = JSON.parse(JSON.stringify(ch5Origin));
            }
        } else {
            // 範囲外チェック（不正なインデックスでクラッシュするのを防ぐ）
            if (stageIndex < 0 || stageIndex >= STAGES.length || !STAGES[stageIndex]) {
                console.error(`startBattle: 無効なステージインデックス ${stageIndex}`);
                this.stageIndex = 0;
            }
            // Global STAGES array is a constant, so we MUST clone the object to avoid mutating global data
            if (!STAGES[this.stageIndex]) {
            console.error('startBattle: invalid stageIndex', this.stageIndex, '- reset to 0');
            this.stageIndex = 0;
        }
        this.stageData = JSON.parse(JSON.stringify(STAGES[this.stageIndex] || STAGES[0]));
        }

        // Apply difficulty modifier to stage data
        const diffConfig = CONFIG.DIFFICULTY[this.selectedDifficulty];
        this.stageData.enemyDamage = Math.ceil(this.stageData.enemyDamage * diffConfig.enemyDamageMult);
        this.stageData.playerHP = Math.ceil((this.stageData.playerHP || 100) * diffConfig.playerHPMult);

        this.tank = new TankInterior(false);
        this.player = new Player(this.tank.getSpawnPoint().x, this.tank.getSpawnPoint().y);

        // Set player HP based on difficulty
        this.player.maxHp = this.stageData.playerHP;
        this.player.hp = this.stageData.playerHP;

        this.ammoDropper = new AmmoDropper(diffConfig.ammoDropRateMult || 1.0);
        this.powerupManager.clear(); // Reset powerups for new battle

        // BGM Selection (Final boss gets special BGM)
        // ★バグ修正: stageData が null/undefined のまま isChapter2 にアクセスすると
        // TypeError になるケース（例: リトライ時の stageData 再構築前）を防ぐ。
        if (this.stageData && this.stageData.isChapter2) {
            // 第2章: ボスは boss BGM、通常は battle_heavy / battle_heroic でシリアス感
            if (this.stageData.isBoss) {
                this.currentBattleTrack = 'final_boss';
                this.sound.playBGM('final_boss');
            } else {
                const ch2Tracks = ['battle_heavy', 'battle_heroic', 'battle_fast', 'battle_heavy'];
                const track = ch2Tracks[stageIndex % ch2Tracks.length];
                this.currentBattleTrack = track;
                this.sound.playBGM(track);
            }
        } else if (this.stageData.isChapter3) {
            if (this.stageData.isBoss) {
                this.currentBattleTrack = 'boss';
                this.sound.playBGM('boss');
            } else {
                const ch3Tracks = ['show', 'battle_heroic', 'battle_fast', 'battle_heavy'];
                const track = ch3Tracks[stageIndex % ch3Tracks.length];
                this.currentBattleTrack = track;
                this.sound.playBGM(track);
            }
        } else if (this.stageData.isChapter4) {
            if (this.stageData.isBoss) {
                this.currentBattleTrack = 'final_boss';
                this.sound.playBGM('final_boss');
            } else {
                const ch4Tracks = ['battle_heavy', 'battle_fast', 'battle_heroic', 'battle_heavy'];
                const track = ch4Tracks[stageIndex % ch4Tracks.length];
                this.currentBattleTrack = track;
                this.sound.playBGM(track);
            }
        } else if (this.stageData.isChapter5) {
            if (this.stageData.isBoss) {
                this.currentBattleTrack = 'final_boss';
                this.sound.playBGM('final_boss');
            } else {
                const ch5Tracks = ['battle_heavy', 'battle_heroic', 'battle_fast', 'final_boss'];
                const track = ch5Tracks[stageIndex % ch5Tracks.length];
                this.currentBattleTrack = track;
                this.sound.playBGM(track);
            }
        } else if (this.stageData.isExtra) {
            this.sound.playBGM('ex_stage'); // EXステージ専用BGM
        } else if (this.stageData.id === 'stage8') {
            this.sound.playBGM('boss'); // 第一形態はboss BGM
        } else if (this.stageData.isBoss) {
            this.sound.playBGM('boss');
        } else {
            // ★ステージ番号に応じて戦闘BGMを順番に選択（全4曲）
            const tracks = ['battle', 'battle_fast', 'battle_heavy', 'battle_heroic'];
            const track = tracks[stageIndex % tracks.length];
            this.currentBattleTrack = track; // ★バグ修正: 選択トラックを保存して状態遷移時に再利用
            this.sound.playBGM(track);
        }

        // バトル開始時に毎回フラグをリセット
        this.bossDestructionInitialized = false;
        this.invasionVictoryTriggered = false;
        // ★バグ修正: リスタート時にエンディングガードをリセットしないと2回目のクリアでエンディングが再生されない
        this.bossEndingTriggered = false;
        this.finalEndingTriggered = false;
        this.victoryTransitionTriggered = false;
        this.invasionVictoryDelay = 0;
        this._c4BossLoseEventDone = false; // ★負けイベントフラグをリセット（もう一度で再発動）
        // ★バグ修正: c4_boss 第2ラウンドで skin_dragon に一時切り替えた場合、
        //   startBattle 時に元のスキンを復元する（中断・リトライで残留しないよう）
        if (this.saveData && this.saveData.tankCustom && this.saveData.tankCustom._preDragonSkin) {
            this.saveData.tankCustom.skin = this.saveData.tankCustom._preDragonSkin;
            delete this.saveData.tankCustom._preDragonSkin;
        }
        this.newlyUnlocked = [];
        this.newlyUnlockedAlly = null;
        this.isNewRecord = false;
        this.savedBattleState = null; // 前回の侵入状態をクリア（死亡時リーク防止）
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboFlashTimer = 0; // ★バグ修正: リスタート時にコンボ演出タイマーをリセット
        this.maxCombo = 0;
        this.singerBuffTimer = 0; // ★バグ修正: リスタート時に歌バフタイマーをリセット
        // ★バグ修正㉕: stage_ex3クリア後に「もう一度」でリスタートすると
        // resultGoToComplete=true のまま残り、次にクリアした時に
        // complete_clearへ誤遷移するバグを修正
        this.resultGoToComplete = false;

        this.continueUsed = false; // 1バトルに1回のみ使用可能（startBattle毎にリセット）
        this.invader = null; // 前回のインベーダーをクリア（敗北後の残留バグ防止）
        this._invaderCooldown = 0; // ★バグ修正: バトルリスタート時にクールダウンをリセット
        // ★バグ修正⑥: 前バトルで dragonBuff / titanRageMode が残留していると
        //   ダメージが永続的に上昇するバグを防ぐ。allyを再生成する前にリセット。
        if (this.allies) {
            for (const ally of this.allies) {
                if (ally.dragonBuffed) { ally.dragonBuffed = false; }
                if (ally.titanRageMode) { ally.titanRageMode = false; }
                if (ally.dragonBuffActive) { ally.dragonBuffActive = false; } // ★バグ修正: オーラ演出フラグのリセット漏れ
            }
        }
        // ★バグ修正: 前回バトルのUI状態をリセット（「もう一度」時に残留しないよう）
        this.resultCursor = 0;
        this.specialAnimTimer = 0;      // 必殺技カットインが残留しないよう
        this.screenFlashType = 'white'; // 被弾フラッシュ(赤)が残留しないよう
        this.screenFlash = 0;
        this.hitStop = 0;
        this.camera_shake = 0;
        this.battle = new BattleManager(this.stageData, this.saveData);
        this.battleRank = null; // ランクリセット
        this.particles.clear();
        this.projectiles = []; // allyの飛び道具を毎バトルリセット

        // 連携技ゲージリセット（30%プリチャージ）
        this.titanSpecialGauge = Math.floor(this.MAX_ALLY_SPECIAL_GAUGE * 0.3);
        this.dragonSpecialGauge = Math.floor(this.MAX_ALLY_SPECIAL_GAUGE * 0.3);
        this.platinumSpecialGauge = Math.floor(this.MAX_ALLY_SPECIAL_GAUGE * 0.3);
        this.titanSpecialAnimTimer = 0;
        this.dragonSpecialAnimTimer = 0;
        this.platinumSpecialAnimTimer = 0; // ★バグ修正⑦: バトル開始時にリセット漏れていた

        // デイリーミッション用の統計（バトル内カウンター）
        this.missionStats = { enemiesDefeated: 0, totalDamage: 0, specialsUsed: 0, itemsCollected: 0, shotsFired: 0, damageTaken: 0 };

        // Spawn Allies (All unlocked ones join the battle!)
        const spawn = this.tank.getSpawnPoint();
        this.allies = [];

        // Story Trigger (Pre-Battle)
        // ストーリー後のコールバックはcountdown/dialogueに遷移する
        const afterStory = () => {
            // stage4_pre ストーリーで「金貨500G」と告知しているので実際に付与する
            if (this.stageData && this.stageData.id === 'stage4') {
                this.saveData.gold = (this.saveData.gold || 0) + 500;
                SaveManager.save(this.saveData);
                if (this.particles) {
                    this.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, '500G GET!', '#FFD700');
                }
            }
            // stage5_pre ストーリーでも「金貨500G」を付与（城への覚悟のシーンで演出）
            if (this.stageData && this.stageData.id === 'stage5') {
                this.saveData.gold = (this.saveData.gold || 0) + 500;
                SaveManager.save(this.saveData);
                if (this.particles) {
                    this.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, '500G GET!', '#FFD700');
                }
            }
            if (this.stageData.dialogue && this.stageData.dialogue.length > 0) {
                this.state = 'dialogue';
                this.dialogueIndex = 0;
            } else {
                this.countdownTimer = 180;
                this.state = 'countdown';
            }
        };

        if (!this.saveData.seenStories) this.saveData.seenStories = [];

        if (this.stageData.id === 'stage1' && !this.introPlayed) {
            this.introPlayed = true;
            if (!this.saveData.seenStories.includes('intro')) {
                this.saveData.seenStories.push('intro');
                SaveManager.save(this.saveData);
                this.prevState = 'battle';
                this.state = 'story';
                this.story.start('intro', afterStory);
            } else {
                // ★バグ修正: イントロ既読時もafterStoryを呼ばないとバトルが開始しない
                afterStory();
            }
        }
        else {
            // Generic Pre-Stage Story
            const storyKey = this.stageData.id + '_pre';
            if (this.story.scripts[storyKey] && !this.saveData.seenStories.includes(storyKey)) {
                this.saveData.seenStories.push(storyKey);
                SaveManager.save(this.saveData);
                this.prevState = 'battle';
                this.state = 'story';
                this.story.start(storyKey, afterStory);
            } else {
                afterStory();
            }
        }

        // Safety check for older save data
        if (!this.saveData.allyDeck) this.saveData.allyDeck = ['ally1'];

        // Spawn only selected allies
        this.saveData.allyDeck.forEach((allyId) => {
            const config = this.saveData.unlockedAllies.find(a => a.id === allyId);
            if (config) {
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 60;
                this.allies.push(new AllySlime(spawn.x + offsetX, spawn.y + offsetY, config));
            }
        });

        // === 機能4: 配合連鎖ゲーム性 - バトル開始時に配合ボーナスを通知 ===
        let maxChainDepth = 0;
        for (const ally of this.allies) {
            if (ally.chainDepth && ally.chainDepth > maxChainDepth) maxChainDepth = ally.chainDepth;
        }
        if (maxChainDepth >= 1) {
            const bonusLabels = ['', '+10%強化！', '+25%強化！', '+40%強化！'];
            const label = bonusLabels[Math.min(maxChainDepth, 3)] || '+40%強化！';
            const colors = ['', '#7CFC00', '#FFB347', '#FF6B6B'];
            const col = colors[Math.min(maxChainDepth, 3)] || '#FF6B6B';
            // カウントダウン中に表示するため少し遅延（burstQueueの代替）
            this._fusionBonusNotify = { label: `⚗配合チェーン深度${maxChainDepth} ${label}`, color: col, timer: 60 };
        } else {
            this._fusionBonusNotify = null;
        }

        // FALLBACK: If no allies spawned (due to error/empty deck), spawn default
        if (this.allies.length === 0) {
            console.warn("No allies found in deck! Spawning default.");
            // Try to find ANY unlocked ally
            let config = this.saveData.unlockedAllies[0];
            if (!config) {
                // Emergency backup
                config = { id: 'ally1', name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' };
            }
            this.allies.push(new AllySlime(spawn.x, spawn.y, config));

            // Auto-fix save data
            this.saveData.allyDeck = [config.id];
            SaveManager.save(this.saveData);
        }

        // Bug ⑪ fix: afterStory()が常に同期的に呼ばれるようになったため
        // ここでのstate二重設定ブロックを削除。countdown/dialogueへの遷移はafterStory()内で完結。

        // Intro Impact (Land on battlefield)
        this.camera_shake = 12;
        this.hitStop = 10;
        if (this.sound) this.sound.play('destroy');
    }

    updateDialogue() {
        if (this.input.action || this.input.confirm) {
            this.dialogueIndex++;
            this.sound.play('select');
            if (this.dialogueIndex >= this.stageData.dialogue.length) {
                this.state = 'countdown';
                this.countdownTimer = 180;
                this.sound.play('confirm');
            }
        }
    }

    updateCountdown() {
        this.countdownTimer--;

        // Boss Stage Effects (ラスボス演出)
        const isBossStage = this.stageData && this.stageData.isBoss;

        // ラスボス専用の派手な登場演出
        if (isBossStage) {
            // 稲妻エフェクト (ランダムに発生)
            if (Math.random() < 0.05) {
                this.camera_shake = 12;
                this.screenFlash = 8;
                this.particles.lightning(
                    Math.random() * CONFIG.CANVAS_WIDTH,
                    0,
                    Math.random() * CONFIG.CANVAS_WIDTH,
                    CONFIG.CANVAS_HEIGHT * 0.4
                );
            }

            // 定期的な大きな震え
            if (this.countdownTimer % 30 === 0) {
                this.camera_shake = 12;
            }
        }

        // Play countdown beep at each second transition
        if (this.countdownTimer === 179 || this.countdownTimer === 119 || this.countdownTimer === 59) {
            this.sound.play('select');
            // Boss stage: Extra screen shake
            if (isBossStage) {
                this.camera_shake = 12;
                this.screenFlash = 8;
                // 放射状のパーティクル
                for (let i = 0; i < 20; i++) {
                    const angle = (Math.PI * 2 * i) / 20;
                    this.particles.spark(
                        CONFIG.CANVAS_WIDTH / 2,
                        CONFIG.CANVAS_HEIGHT * 0.3,
                        Math.cos(angle) * 5,
                        Math.sin(angle) * 5,
                        '#FFD700'
                    );
                }
            }
        }

        if (this.countdownTimer <= 0) {
            this.state = 'battle';
            this.sound.play('go');
            // ラスボス開始時の大フラッシュ
            if (isBossStage) {
                this.screenFlash = 8;
                this.camera_shake = 12;
            }

            // Boss stage: Dramatic start effect
            if (isBossStage) {
                this.screenFlash = 8; // Longer flash
                this.camera_shake = 12; // Strong shake
                this.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, '決戦！', '#FFD700');
            } else {
                this.screenFlash = 8;
            }

            this.sound.play('confirm'); // Music start or something
        } else {
            // Physics Warm-up: Allow entities to settle on the floor during countdown
            // Update Tank (Platforms)
            if (this.tank && this.player) {
                const cdTankResult = this.tank.update(this.player);
                this.tank.fireDamage = (cdTankResult && cdTankResult.fireDamage) || 0;
            }

            // Update Player (Gravity/Collision only, no input)
            if (this.player) {
                // No Gravity for Top-Down
                // this.player.vy += CONFIG.PHYSICS.GRAVITY; 
                // DO NOT manually update this.player.y here; resolveCollision does it.
                this.player.resolveCollision(this.tank);
            }

            // Update Allies (Gravity/Collision only)
            if (this.allies) {
                for (const ally of this.allies) {
                    // No Gravity
                    // if (ally.type !== 'angel' && ally.type !== 'drone') ally.vy += 0.5;
                    // DO NOT manually update ally.x/y here; resolveCollision does it.
                    ally.resolveCollision(this.tank);
                }
            }
        }
    }

    updateBattle() {
        // 演出タイマー管理（draw()ではなくupdate()でデクリメント）
        if (this.specialImpactTimer > 0) this.specialImpactTimer--;

        // === SPECIAL MOVE CUTIN ===
        if (this.specialAnimTimer > 0) {
            this.specialAnimTimer--;

            // Impact Phase: タイマーが半分を切った瞬間にダメージ
            if (this.specialAnimTimer === 27 && this.battle) {
                let dmg = 50;
                let shake = 12;

                // ★ ドラゴン覚醒中は「究極の龍炎砲（3000ダメージ）」！
                if (this.tank && this.tank.skinId === 'skin_dragon') {
                    dmg = 3000;
                    shake = 30;
                    // 超巨大爆発の連発エフェクト
                    this.screenFlashType = 'white';
                    this.screenFlash = 25;
                    this.particles.explosion(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 150, '#FF4444', 20);
                    this.particles.explosion(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 100, '#FFAA44', 20);
                    this.particles.explosion(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 200, '#FF2222', 20);
                    this.particles.explosion(CONFIG.CANVAS_WIDTH - 80,  CONFIG.TANK.OFFSET_Y + 150, '#FFEE88', 25);
                } else {
                    this.particles.explosion(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 150, '#FF4444', 8);
                }

                this.lastSpecialDamage = dmg;
                this.battle.enemyTankHP = Math.max(0, this.battle.enemyTankHP - dmg);
                this.battle.enemyDamageFlash = 25;
                this.camera_shake = shake;
                this.particles.damageNum(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 100, '-' + dmg + '!!!', '#FF0000');
            }
            // returnしない → バトルは継続しながらカットイン演出を表示
        }

        if (!this.player) return; // playerが初期化される前に呼ばれた場合のガード
        this.player.update(this.input, this.tank);

        // Cockpit Interaction Check
        this.atCockpit = false;
        const cp = CONFIG.TANK.COCKPIT;
        const interior_ox = CONFIG.TANK.OFFSET_X + CONFIG.TANK.WALL_THICKNESS;
        const interior_oy = CONFIG.TANK.OFFSET_Y + 25;
        if (this.player.x > interior_ox + cp.x && this.player.x < interior_ox + cp.x + cp.w &&
            this.player.y > interior_oy + cp.y - 30 && this.player.y < interior_oy + cp.y + 10) {
            this.atCockpit = true;
        }



        // If at cockpit, arrow keys control crosshair / dodge
        if (this.atCockpit) {
            const S = CONFIG.PROJECTILE;
            if (this.input.left) {
                this.battle.crosshairX -= S.CROSSHAIR_SPEED;
                this.battle.playerTankTargetX = -30;
            } else if (this.input.right) {
                this.battle.crosshairX += S.CROSSHAIR_SPEED;
                this.battle.playerTankTargetX = 30;
            } else {
                this.battle.playerTankTargetX = 0;
            }

            if (this.input.up) {
                this.battle.crosshairY -= S.CROSSHAIR_SPEED;
                this.battle.playerTankTargetY = -20;
            } else if (this.input.down) {
                this.battle.crosshairY += S.CROSSHAIR_SPEED;
                this.battle.playerTankTargetY = 20;
            } else {
                this.battle.playerTankTargetY = 0;
            }

            // Constrain crosshair
            this.battle.crosshairX = Math.max(100, Math.min(CONFIG.CANVAS_WIDTH - 100, this.battle.crosshairX));
            this.battle.crosshairY = Math.max(50, Math.min(CONFIG.TANK.OFFSET_Y - 50, this.battle.crosshairY));

            // Dodge Action
            if (this.input.jump && this.battle.dodgeTimer <= 0) {
                this.battle.dodgeTimer = S.DODGE_DURATION;
                this.sound.play('dash');
            }
        }

        // 0. Throw Item (B or Special if not firing special)
        // Note: Special (X/Shift) is also shared with attack now, but logic distinguishes
        let specialFiredThisFrame = false;
        if (this.input.special && this.battle.specialGauge >= this.battle.maxSpecialGauge) {
            specialFiredThisFrame = true;
        }

        let itemThrown = false;
        if (this.input.cancel || (this.input.special && !specialFiredThisFrame && this.player.heldItems.length > 0)) {
            if (this.player.heldItems.length > 0) {
                this.player.attackDefender(null); // Throw item
                itemThrown = true;
            }
        }

        // 1. Pickup Item / Load Cannon (Action - Z)
        if (this.input.action) {
            let actionDone = false;
            if (this.player.heldItems.length > 0) {
                // Extinguish Fire
                if (this.player.heldItems[0] === 'water_bucket') {
                    for (let i = this.tank.fires.length - 1; i >= 0; i--) {
                        const f = this.tank.fires[i];
                        if (Math.abs(this.player.x + this.player.w / 2 - (f.x + f.w / 2)) < CONFIG.FIRE.EXTINGUISH_DIST &&
                            Math.abs(this.player.y + this.player.h / 2 - (f.y + f.h / 2)) < CONFIG.FIRE.EXTINGUISH_DIST) {
                            this.tank.fires.splice(i, 1);
                            this.sound.play('water');
                            this.particles.smoke(f.x + f.w / 2, f.y + f.h / 2, 20);
                            this.player.heldItems.shift();
                            actionDone = true;
                            break;
                        }
                    }
                }
                // Load Cannon
                if (!actionDone && this.player.heldItems[0] !== 'water_bucket') {
                    if (this.player.tryLoadCannon(this.tank.cannons)) {
                        actionDone = true;
                    }
                }
            } else {
                // Pick up item (Filter allies out from tryPickup if we want true separation)
                if (this.ammoDropper && this.player.tryPickup(this.ammoDropper.items, null)) {
                    actionDone = true;
                }
            }
        }

        // 2. Attack / Special (X)
        const attackPressed = this.input.attack;
        const specialShortcutPressed = this.input.special;
        const canUseSpecial = this.battle.specialGauge >= this.battle.maxSpecialGauge
            && this.player.heldItems.length === 0
            && !this.player.stackedAlly;
        if (!itemThrown && ((attackPressed && canUseSpecial) || (specialShortcutPressed && canUseSpecial))) {
            this.battle.triggerSpecial();
            if (this.missionStats) this.missionStats.specialsUsed++;
        } else if (attackPressed) {
            this.player.triggerTailAttack();
        }


        // 3. Ally Action / Invasion (AllyAction - C)
        // ★バグ修正: 仲間ピックアップと即投げが同フレームで発生するバグを防ぐフラグ
        let _allyPickedUpThisFrame = false;
        if (this.input.allyAction) {
            let allyActionDone = false;
            if (this.player.stackedAlly) {
                this.handleAllyThrow();
                allyActionDone = true;
            } else {
                // Try Pickup Ally
                const pickupResult = this.player.tryPickup([], this.allies);
                if (pickupResult) {
                    allyActionDone = true;
                    if (pickupResult === 'ally') _allyPickedUpThisFrame = true; // 今フレームで拾った
                }
                // Try Invasion
                if (!allyActionDone) {
                    const cannon = this.player.getNearCannon(this.tank.cannons);
                    if (cannon && this.battle && this.battle.invasionAvailable) {
                        this.startInvasion();
                        return;
                    }
                }
            }
        }

        // specialAnimTimer は updateBattle() 冒頭で既にデクリメント済みのため、ここでは不要

        // Allies Update
        if (this.allies) {
            for (const ally of this.allies) ally.update(this.tank, this.ammoDropper ? this.ammoDropper.items : [], this.invader);
            // Remove Dead Allies (Fused)
            // インプレース処理: filter の新配列生成を回避
            {
                let _wi = 0;
                for (let _ai = 0; _ai < this.allies.length; _ai++) {
                    if (!this.allies[_ai].isDead) this.allies[_wi++] = this.allies[_ai];
                }
                this.allies.length = _wi;
            }
        }

        // Ammo drops
        this.ammoDropper.update(this.tank.platforms, this.tank.dropX, this.tank.dropY, this.tank.dropW);

        // === バトル中侵入者のアップデート ===
        if (this.invader) {
            let alive = true;
            try {
                alive = this.invader.update(this.player);
            } catch (e) {
                console.error('Battle Invader Error:', e);
                alive = false;
            }
            if (!alive) {
                this.sound.play('victory');
                this.particles.rateEffect(this.invader.x, this.invader.y, '撃退成功！', '#4CAF50');
                this.invader = null;
                // ★バグ修正: 倒した直後に同フレームで再スポーンしないよう
                // クールダウンを設けて次のスポーンを最低600フレーム(10秒)抑制する
                this._invaderCooldown = 600;
            }

            // 尻尾攻撃のヒット判定
            if (this.player.isAttacking && this.player.attackDuration > 0 && this.invader && this.invader.hp > 0 && this.invader.invincible <= 0) {
                const px = this.player.x + this.player.w / 2;
                const py = this.player.y + this.player.h / 2;
                const ix = this.invader.x + this.invader.w / 2;
                const iy = this.invader.y + this.invader.h / 2;
                const dx = ix - px, dy = iy - py;
                const distSq = dx * dx + dy * dy;
                if (distSq < 65 * 65) {
                    const dist = Math.sqrt(distSq) || 1;
                    this.invader.takeDamage(80, dx / dist); // 🔧 80 プレイヤー攻撃（10発で倒せる）
                    this.camera_shake = 10;
                    this.hitStop = 4; // ★攻撃感: ヒットストップ追加
                    this.particles.explosion(ix, iy, '#FF6600', 10); // ★攻撃感: ヒットパーティクル
                    this.sound.play('hit'); // ★攻撃感: ヒット音追加
                    this.player.isAttacking = false;
                }
            }
        }

        // Powerup Manager Update
        this.powerupManager.update();

        // Check Powerup Collision with Player
        for (let i = this.powerupManager.active.length - 1; i >= 0; i--) {
            const pu = this.powerupManager.active[i];
            if (pu.checkCollision(this.player)) {
                this.powerupManager.applyPowerup(this.player, pu.type);
                this.powerupManager.active.splice(i, 1);
            }
        }

        // Tank & Cannon updates (Logic)
        const tankUpdate = this.tank.update(this.player);
        if (tankUpdate.fired) {
            for (const f of tankUpdate.fired) {
                this.battle.onPlayerFire(f);
                // Bug Fix: comboCountはヒット時(battle.js内)のみ加算。発射時は加算しない
                if (this.missionStats) this.missionStats.shotsFired++;
            }

        }
        this.tank.fireDamage = tankUpdate.fireDamage || 0;

        // Damage effects based on tank HP
        this.tank.updateDamageEffects(this.battle.playerTankHP, this.battle.playerTankMaxHP);

        // Battle manager updates (projectiles, enemy fire, HP checks)
        this.battle.update();

        // === ラスボス戦専用エフェクト ===
        if (this.stageData && this.stageData.isBoss) {
            // 敵タンクの中心座標を計算 (演出用)
            const enemyX = CONFIG.CANVAS_WIDTH - CONFIG.TANK.OFFSET_X - CONFIG.TANK.INTERIOR_W / 2;
            const enemyY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;

            // 定期的な稲妻エフェクト
            if (this.frame % 120 === 0) {
                this.particles.lightning(
                    Math.random() * CONFIG.CANVAS_WIDTH,
                    0,
                    Math.random() * CONFIG.CANVAS_WIDTH,
                    CONFIG.CANVAS_HEIGHT * 0.4
                );
                this.camera_shake = 10;
            }

            // 敵タンクの周りにオーラエフェクト（パフォーマンス改善: 30フレームに1回）
            if (this.frame % 30 === 0) {
                this.particles.aura(enemyX, enemyY, this.stageData.enemyColor || '#9C27B0');
            }

            // 敵のHPが低い時の暴走演出
            const hpRatio = this.battle.enemyTankHP / this.battle.enemyTankMaxHP;
            if (hpRatio < 0.3 && this.frame % 60 === 0) {
                this.camera_shake = 12;
                this.screenFlash = 5;
                // 放射状の衝撃波
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    this.particles.spark(
                        enemyX, enemyY,
                        Math.cos(angle) * 8,
                        Math.sin(angle) * 8,
                        '#FF0000'
                    );
                }
            }
        }

        // === ランダム侵入（stage3以降）===
        // 敵HPが削れてくると侵入者が来て戦闘が激化する
        // ★バグ修正: クールダウンをデクリメント（倒した直後の即再スポーン防止）
        if (this._invaderCooldown > 0) this._invaderCooldown--;
        if (!this.invader && !this._invaderCooldown && this.stageData && !this.stageData.isEvent && !this.stageData.isExtra) {
            const hpRatio = this.battle.enemyTankHP / this.battle.enemyTankMaxHP;
            // Bug Fix ⑤: parseInt('stage_boss'...)→1になるバグを修正。STAGESの順番で難易度を決定
            const stageIdx = window.STAGES ? window.STAGES.findIndex(s => s && s.id === this.stageData.id) : -1;
            const stageNum = stageIdx >= 0 ? stageIdx + 1 : 3; // 見つからない場合はデフォルト3
            // stage3以降（インデックス2以降）かつ敵HP50%以下になったら侵入チャンス
            if (stageNum >= 3 && hpRatio < 0.5 && this.battle.phase === 'battle') {
                // 約30秒に1回 (1800フレーム) 侵入
                const invadeInterval = Math.max(900, 1800 - stageNum * 100);
                if (this.frame % invadeInterval === 0 && this.frame > 0) {
                    this.spawnBattleInvader();
                }
            }
        }

        // Check Victory (From Invasion or standard)
        if (this.battle.phase === 'victory') {
            if (this.victoryTransitionTriggered) return;
            this.victoryTransitionTriggered = true;
            this.sound.stopBGM(); // Stop music and clear pending timers

            // Cleanup pending ally missiles to ensure they return!
            if (this.battle.projectiles) {
                this.battle.projectiles.forEach(p => {
                    if (p.type === 'missile' && p.active && p.onHit) {
                        p.onHit(); // Force return ally
                        p.active = false;
                    }
                });
                // Clear projectiles array to prevent accumulation
                this.battle.projectiles = [];
            }

            // Clear particles to free memory
            if (this.particles) {
                this.particles.clear();
            }

            this.state = 'tank_destruction';
            this.destructionTimer = 180; // 3 seconds destruction sequence
            return;
        }

        // Check defeat -> Defense Mode
        // ★バグ修正: battle.phase が 'enemy_disabled'（侵攻可能状態）のとき、
        // playerTankHP <= 0 でも startDefense() を起動しない。
        // battle.js は phase='enemy_disabled' 中に playerTankHP<=0 になっても
        // 'defeat' に遷移しない（守備側勝利を保護）のに、ここで直接HP参照すると
        // そのガードが無効化されてしまう。
        const _isDefeated = this.battle.phase === 'defeat' ||
            (this.battle.playerTankHP <= 0 && this.battle.phase !== 'enemy_disabled');
        if (_isDefeated && this.state !== 'defense') {
            this.startDefense();
        }

        // === タイタン・ドラゴン 連携技ゲージ チャージ ===
        // ★バグ修正: プレイヤーが死亡している場合はゲージをチャージしない
        if (this.allies && this.battle && this.player && this.player.hp > 0) {
            const hasInvader = !!(this.invader && this.invader.hp > 0);
            // 通常: 60fpsで3600f = 60秒。敵出現中は2倍速 = 30秒
            const chargeRate = hasInvader ? 2 : 1;
            for (const ally of this.allies) {
                if (ally.isStacked || ally.isDead) continue;
                if (ally.type === 'titan_golem') {
                    this.titanSpecialGauge = Math.min(this.MAX_ALLY_SPECIAL_GAUGE, this.titanSpecialGauge + chargeRate);
                }
                if (ally.type === 'dragon_lord') {
                    this.dragonSpecialGauge = Math.min(this.MAX_ALLY_SPECIAL_GAUGE, this.dragonSpecialGauge + chargeRate);
                }
                if (ally.type === 'platinum_golem') {
                    this.platinumSpecialGauge = Math.min(this.MAX_ALLY_SPECIAL_GAUGE, this.platinumSpecialGauge + chargeRate);
                }
            }
        }

        // アニメタイマー デクリメント
        if (this.titanSpecialAnimTimer > 0) this.titanSpecialAnimTimer--;
        if (this.dragonSpecialAnimTimer > 0) this.dragonSpecialAnimTimer--;
        if (this.platinumSpecialAnimTimer > 0) this.platinumSpecialAnimTimer--;
        if (this.invasionTutorialTimer > 0) this.invasionTutorialTimer--;

        // Trigger invasion or Ally Throw (Cキー)
        if (this.input.invade) {
            // ★バグ修正: 今フレームで仲間を拾った直後は即投げしない
            if (this.player.stackedAlly && !_allyPickedUpThisFrame) {
                this.handleAllyThrow();
            } else if (!this.player.stackedAlly) {
                // === 連携技：タイタン or ドラゴンのゲージがMAXなら発動 ===
                let allySpecialFired = false;
                if (this.allies) {
                    for (const ally of this.allies) {
                        if (ally.isDead || ally.isStacked) continue;
                        if (ally.type === 'titan_golem' && this.titanSpecialGauge >= this.MAX_ALLY_SPECIAL_GAUGE) {
                            this.fireTitanSpecial(ally);
                            allySpecialFired = true;
                            break;
                        }
                        if (ally.type === 'dragon_lord' && this.dragonSpecialGauge >= this.MAX_ALLY_SPECIAL_GAUGE) {
                            this.fireDragonSpecial(ally);
                            allySpecialFired = true;
                            break;
                        }
                        if (ally.type === 'platinum_golem' && this.platinumSpecialGauge >= this.MAX_ALLY_SPECIAL_GAUGE) {
                            this.firePlatinumSpecial(ally);
                            allySpecialFired = true;
                            break;
                        }
                    }
                }
                if (!allySpecialFired && this.battle.invasionAvailable) {
                    this.startInvasion();
                }
            }
        }

        // Check Player Death
        // ★バグ修正: state='defense'に遷移した直後（同フレーム内）にプレイヤーHP=0で
        // handlePlayerDeath()が呼ばれるとdefenseが即result上書きされてしまうため、
        // defenseモードに入ったばかりのフレームはプレイヤー死亡チェックをスキップする。
        if (this.player.hp <= 0 && this.state !== 'defense') {
            this.handlePlayerDeath();
        }
    }

    updateLaunching() {
        // Animation is handled by battle.projectiles
        this.battle.update();
        // Keep allies/ammo updating for background feel
        if (this.allies) {
            // battle中の飛翔アニメ中も this.invader が存在する可能性があるので渡す
            for (const ally of this.allies) ally.update(this.tank, this.ammoDropper ? this.ammoDropper.items : [], this.invader || null);
        }
        this.ammoDropper.update(this.tank.platforms, this.tank.dropX, this.tank.dropY, this.tank.dropW);
    }

    // ============================================================
    // 連携技：タイタンゴーレム 【天崩地裂・GRAND QUAKE】
    // ============================================================
    fireTitanSpecial(ally) {
        this.titanSpecialGauge = 0;
        this.titanSpecialAnimTimer = 100;
        // フラッシュ・シェイクは最小限に
        this.camera_shake = 8;
        // screenFlash は設定しない（カットイン中はカットインで画面が覆われるため不要）

        const g = this;
        const invader = this.invader;
        const hasInvader = !!(invader && invader.hp > 0);
        const allyX = ally.x + ally.w / 2;
        const allyY = ally.y + ally.h / 2;

        // パーティクルは少量のみ（カットインで派手さは十分）
        g.particles.explosion(allyX, ally.y + ally.h, '#FF8C00', 25);

        // === 攻撃：インベーダーに超大ダメージ ===
        if (hasInvader) {
            const dmg = ally.damage * 8;
            invader.takeDamage(dmg, invader.x > ally.x ? 1 : -1);
            g.particles.rateEffect(invader.x, invader.y - 30, `GRAND QUAKE! ${dmg}`, '#FF8C00');
            invader.vx = (invader.x > ally.x ? 1 : -1) * 20;
            invader.vy = -12;
        }

        // === 攻撃：敵タンクへの重砲撃（メイン効果）===
        if (this.battle) {
            const tankDmg = 200 + Math.floor(ally.damage * 4);
            this.battle.enemyTankHP = Math.max(0, this.battle.enemyTankHP - tankDmg);
            this.battle.enemyDamageFlash = 30;
            this.battle.enemyFireTimer += 360; // 6秒スタン
            g.particles.damageNum(
                CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 80,
                `天崩地裂 -${tankDmg}!!`, '#FF8C00'
            );
        }

        // === プレイヤー保護：allyShield（点滅しない無敵） ===
        if (this.player) {
            this.player.allyShield = 180; // 3秒間の保護（点滅なし）
        }

        // === タイタンのレイジモード（攻撃力1.5倍・8秒）===
        ally.titanRageMode = true;
        const origDmg = ally.damage;
        ally.damage = Math.floor(ally.damage * 1.5);
        ally.burstQueue.push({ delay: 480, fn: () => {
            if (ally) { ally.titanRageMode = false; ally.damage = origDmg; }
        }});
        ally.specialCooldown = 600;

        try { g.sound.play('destroy'); } catch (e) {}
        g.particles.rateEffect(allyX, ally.y - 30, '【天崩地裂】', '#FFD700');
        if (this.missionStats) this.missionStats.specialsUsed++;
    }

    // ============================================================
    // 連携技：ドラゴンロード 【覇竜炎・INFERNO BURST】
    // ============================================================
    fireDragonSpecial(ally) {
        this.dragonSpecialGauge = 0;
        this.dragonSpecialAnimTimer = 105;
        this.camera_shake = 8;
        // screenFlash は設定しない

        const g = this;
        const invader = this.invader;
        const hasInvader = !!(invader && invader.hp > 0);
        const myX = ally.x + ally.w / 2;
        const myY = ally.y + ally.h / 2;
        const dir = hasInvader ? (invader.x + invader.w / 2 > myX ? 1 : -1) : ally.dir;

        // === 攻撃：5方向の超大火炎弾（9→5に削減して軽量化）===
        const angles = [-0.5, -0.2, 0, 0.2, 0.5];
        angles.forEach((angle, i) => {
            ally.burstQueue.push({
                delay: i * 4, fn: () => {
                    if (!window.game) return;
                    const speed = 14 + i * 0.8;
                    window.game.projectiles.push(new SimpleProjectile({
                        x: myX, y: myY,
                        vx: dir * speed * Math.cos(angle),
                        vy: speed * Math.sin(angle) - 3,
                        life: 90,
                        damage: ally.damage * 5 | 0,
                        w: 30, h: 30, type: 'magic',
                        color: i % 2 === 0 ? '#FF2000' : '#FF7000'
                    }));
                }
            });
        });

        // === 攻撃：敵タンクへの炎ダメージ（メイン効果）===
        if (this.battle) {
            const fireDmg = 160 + Math.floor(ally.damage * 3.5);
            this.battle.enemyTankHP = Math.max(0, this.battle.enemyTankHP - fireDmg);
            this.battle.enemyDamageFlash = 30;
            this.battle.enemyFireTimer += 300;
            this.battle.enemyFireEffect = Math.max(this.battle.enemyFireEffect || 0, 150);
            g.particles.damageNum(
                CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 80,
                `覇竜炎 -${fireDmg}!`, '#FF4500'
            );
        }

        // === 攻撃：インベーダーへの即時大ダメージ ===
        if (hasInvader) {
            const dmg = ally.damage * 6;
            invader.takeDamage(dmg, dir);
            g.particles.rateEffect(invader.x, invader.y - 30, `INFERNO! ${dmg}`, '#FF2000');
        }

        // === 全味方への攻撃バフ（5秒, ×1.6）===
        if (this.allies) {
            this.allies.forEach(a => {
                if (a.dragonBuffed) return; // 重複バフ防止
                const origDmg = a.damage;
                a.damage = Math.floor(a.damage * 1.6);
                a.dragonBuffed = true;
                // ★バグ修正②: 解除処理を各味方自身のキューに積む（dragon死亡時でも確実に解除）
                a.burstQueue.push({ delay: 300, fn: () => {
                    if (a && a.dragonBuffed) { a.damage = origDmg; a.dragonBuffed = false; }
                }});
            });
            g.particles.rateEffect(myX, ally.y - 45, '全員攻撃UP！', '#FF6000');
        }

        // === プレイヤー保護（allyShield、点滅なし）===
        if (this.player) {
            this.player.allyShield = 120; // 2秒保護
        }

        ally.specialCooldown = 600;

        try { g.sound.play('destroy'); } catch (e) {}
        g.particles.explosion(myX, myY, '#FF4500', 20); // パーティクル少量のみ
        g.particles.rateEffect(myX, ally.y - 30, '【覇竜炎】', '#FF4500');
        if (this.missionStats) this.missionStats.specialsUsed++;
    }

    // ============================================================
    // 連携技：プラチナゴーレム 【聖光天罰・DIVINE JUDGEMENT】
    // ============================================================
    firePlatinumSpecial(ally) {
        this.platinumSpecialGauge = 0;
        this.platinumSpecialAnimTimer = 110;
        this.camera_shake = 6;

        const g = this;
        const invader = this.invader;
        const hasInvader = !!(invader && invader.hp > 0);
        const myX = ally.x + ally.w / 2;
        const myY = ally.y + ally.h / 2;

        // === 攻撃：7方向の聖なる光弾 ===
        const angles = [-0.6, -0.35, -0.12, 0, 0.12, 0.35, 0.6];
        angles.forEach((angle, i) => {
            ally.burstQueue.push({
                delay: i * 5, fn: () => {
                    if (!window.game) return;
                    const speed = 12 + i * 0.5;
                    const dir = (invader && invader.x + invader.w / 2 > myX) ? 1 : ally.dir;
                    window.game.projectiles.push(new SimpleProjectile({
                        x: myX, y: myY,
                        vx: dir * speed * Math.cos(angle),
                        vy: speed * Math.sin(angle) - 2,
                        life: 100,
                        damage: ally.damage * 4 | 0,
                        w: 24, h: 24, type: 'magic',
                        color: i % 2 === 0 ? '#E3F2FD' : '#90CAF9'
                    }));
                }
            });
        });

        // === 攻撃：敵タンクへの聖光砲（メイン効果）===
        if (this.battle) {
            const holyDmg = 180 + Math.floor(ally.damage * 4);
            this.battle.enemyTankHP = Math.max(0, this.battle.enemyTankHP - holyDmg);
            this.battle.enemyDamageFlash = 30;
            this.battle.enemyFireTimer += 330;
            g.particles.damageNum(
                CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 80,
                `聖光天罰 -${holyDmg}!!`, '#90CAF9'
            );
        }

        // === インベーダーへのダメージ ===
        if (hasInvader) {
            const dmg = ally.damage * 5;
            const dir = invader.x > ally.x ? 1 : -1;
            invader.takeDamage(dmg, dir);
            g.particles.rateEffect(invader.x, invader.y - 30, `DIVINE! ${dmg}`, '#E3F2FD');
        }

        // === 全味方のHP回復（聖なる癒し）===
        if (this.allies) {
            this.allies.forEach(a => {
                if (a.isDead) return;
                const healAmt = Math.floor(a.maxHp * 0.25);
                a.hp = Math.min(a.maxHp, a.hp + healAmt);
                g.particles.rateEffect(a.x + a.w / 2, a.y - 20, `+${healAmt}HP`, '#A5D6A7');
            });
            g.particles.rateEffect(myX, ally.y - 45, '味方全員回復！', '#E3F2FD');
        }

        // === プレイヤー回復＋保護 ===
        if (this.player) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.floor(this.player.maxHp * 0.20));
            this.player.allyShield = 150;
        }

        ally.specialCooldown = 600;
        try { g.sound.play('destroy'); } catch (e) {}
        g.particles.explosion(myX, myY, '#E3F2FD', 22);
        g.particles.rateEffect(myX, ally.y - 30, '【聖光天罰】', '#90CAF9');
        if (this.missionStats) this.missionStats.specialsUsed++;
    }

    handleAllyThrow() {
        if (!this.player.stackedAlly) return;

        // Check if near cannon for "Ally Missile" move
        const nearCannon = this.player.getNearCannon(this.tank.cannons);

        if (nearCannon && this.state === 'battle') {
            // == MISSILE MODE ==
            const ally = this.player.throwStackedAlly();
            if (ally) {
                // Remove from list temporarily (visual only, logical existence handled by battle)
                const idx = this.allies.indexOf(ally);
                if (idx > -1) this.allies.splice(idx, 1);

                this.battle.launchAllyMissile(ally, () => {
                    this.returnAlly(ally);
                });
            }
        } else {
            // == DROP MODE ==
            const ally = this.player.throwStackedAlly();
            if (ally) {
                ally.x = this.player.x + (this.player.dir * 40);
                ally.y = this.player.y;
                ally.vx = this.player.dir * 12; // Throw speed (Faster!)
                ally.vy = -5;
                ally.isStacked = false;
                ally.state = 'thrown'; // Toggle Thrown State for Fusion
                ally.fusionThrown = true; // ★バグ修正: 手動投げのみ合体フラグON
                ally.thinkTimer = 0;
                ally.target = null; // Clear target to prevent floor clipping
                ally.heldItems = []; // 🐛 BUG FIX: 投げた仲間のアイテムをクリア (heldItem→heldItems)

                // Note: Ally is already in this.allies list, just state changed.
            }
        }
    }


    returnAlly(ally) {

        // Fallback spawn point
        let tx = 150;
        let ty = 300;

        if (this.tank && this.tank.getSpawnPoint) {
            const drop = this.tank.getSpawnPoint();
            if (drop) {
                tx = drop.x;
                ty = drop.y - 20; // Lower drop height
            }
        }

        ally.x = tx;
        ally.y = ty;
        ally.vx = 0;
        ally.vy = 0;
        ally.isStacked = false;
        ally.state = 'idle';

        // Force add back to list
        if (!this.allies.includes(ally)) {
            this.allies.push(ally);
        }

        this.sound.play('confirm');
        if (this.particles) this.particles.rateEffect(ally.x, ally.y, 'ただいま！', '#FFF');
    }

    startInvasion(force = false) {
        if (this.state === 'invasion' || this.state === 'launching') return;

        // Strict Check: Only allowed if battle says so (Enemy HP <= 0)
        // Unless forced (Debug)
        if (!force && (!this.battle || !this.battle.invasionAvailable)) {
            return;
        }

        this.sound.play('cannon');
        // インベージョン中のBGM: 通常ステージはinvasion、ボス戦はbossのまま継続
        if (this.stageData && !this.stageData.isBoss) {
            this.sound.playBGM('invasion');
        }
        // ボス戦中は緊張感維持のためboss BGMをそのまま継続
        this.particles.smoke(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 10);

        // Create player projectile on upper screen
        const px = CONFIG.TANK.OFFSET_X + CONFIG.TANK.INTERIOR_W + 20;
        const py = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;
        const tx = CONFIG.CANVAS_WIDTH - 120;
        const ty = CONFIG.TANK.OFFSET_Y + 100;

        const p = new Projectile(px, py, tx, ty, 'player', 1, 0);
        p.onHit = () => { this.confirmInvasion(); };
        this.battle.projectiles.push(p);

        this.state = 'launching';
    }

    confirmInvasion() {
        if (this.state === 'invasion') return;
        this.sound.play('invade');
        this.screenFlash = 8; // Flash on invade transition
        this.savedBattleState = {
            tank: this.tank,
            player: this.player,
            ammoDropper: this.ammoDropper,
        };

        // Create enemy tank interior with invasion config
        const invasionConfig = this.stageData.invasion || { switches: 2, defenders: 2, lasers: 0 };
        this.enemyTank = new TankInterior(true, this.stageData.tankType || 'NORMAL', invasionConfig);
        // Engine Core is the target! Always visible.
        this.enemyTank.engineCore.visible = true;
        this.enemyTank.engineCore.hp = 100; // Boss HP

        const spawnPoint = this.enemyTank.getSpawnPoint();
        this.player.x = spawnPoint.x;
        this.player.y = spawnPoint.y;
        this.player.vx = 0;
        this.player.vy = 0;
        // ★バグ修正: 侵入時にプレイヤーが一瞬ワープして見える
        // 無敵フレームを付与して「テレポート」の視覚的違和感をカモフラージュ
        this.player.invincible = Math.max(this.player.invincible, 30);
        this.tank = this.enemyTank;

        // Ammo dropper for enemy tank
        this.ammoDropper = new AmmoDropper();

        this.state = 'invasion';
        // タッチUIを侵攻モード用ラベルに切り替え
        if (this.touch) this.touch.setMode('invasion');
        // 初回インベージョン: チュートリアルオーバーレイを表示（saveDataで管理）
        if (!this.saveData.invasionTutorialDone) {
            this.invasionTutorialTimer = 240; // 4秒表示
            this.saveData.invasionTutorialDone = true;
            SaveManager.save(this.saveData);
        }
        this.invasionVictoryTriggered = false; // Reset flag
    }

    updateInvasion() {
        // チュートリアルオーバーレイ表示中はZかSpaceで閉じる
        if (this.invasionTutorialTimer > 0) {
            if (this.input.action || this.input.confirm) {
                this.invasionTutorialTimer = 0;
            }
        }
        // Player Update (Control handled inside Player.update)
        this.player.update(this.input, this.tank);

        // Check Player Death
        if (this.player.hp <= 0) {
            this.handlePlayerDeath();
            return;
        }

        // Update Tank Interior (Defenders, Engine Shockwave, etc.)
        const tankResult = this.tank.update(this.player);
        this.tank.fireDamage = (tankResult && tankResult.fireDamage) || 0;

        // Allies update during invasion (敵戦車内でディフェンダーを攻撃する)
        if (this.allies) {
            // 敵ディフェンダーの中で最も近いものをinvaderとして渡す（仲間が自動攻撃）
            const defenders = this.tank.defenders || [];
            for (const ally of this.allies) {
                const allyX = ally.x + ally.w / 2;
                const allyY = ally.y + ally.h / 2;
                const nearestDefender = defenders.length > 0 ? defenders.reduce((best, d) => {
                    if (!best) return d;
                    const bDist = Math.hypot((best.x+best.w/2) - allyX, (best.y+best.h/2) - allyY);
                    const dDist = Math.hypot((d.x+d.w/2) - allyX, (d.y+d.h/2) - allyY);
                    return dDist < bDist ? d : best;
                }, null) : null;
                ally.update(this.tank, this.ammoDropper ? this.ammoDropper.items : [], nearestDefender);
            }
            // インプレース処理: filter の新配列生成を回避
            {
                let _wi = 0;
                for (let _ai = 0; _ai < this.allies.length; _ai++) {
                    if (!this.allies[_ai].isDead) this.allies[_wi++] = this.allies[_ai];
                }
                this.allies.length = _wi;
            }
        }

        // Update Engine Core invincibility timer
        const ec = this.tank.engineCore;
        if (ec && ec.invincible > 0) {
            ec.invincible--;
        }

        // 侵攻勝利カウントダウン（エンジン破壊後の遷移処理）
        this.tickInvasionVictoryDelay();

        // 1. Throw Item OR Sabotage Cannon (special/X)
        // NOTE: キャノン妨害を優先し、外れたら敵スライムに投げる（下のブロックで処理）

        // Track if special was used for sabotage/throw this frame to prevent double-firing
        let specialUsedForSabotage = false;
        const attackPressed = this.input.attack;
        const specialShortcutPressed = this.input.special;
        const canUseXSpecial = this.battle.specialGauge >= this.battle.maxSpecialGauge
            && !this.player.stackedAlly
            && this.player.heldItems.length === 0;

        // === X/Shift キー処理（侵攻モード）===
        // ★バグ修正: input.special と input.attack が同じ KeyX を参照するため、
        //   以前は妨害キックと通常攻撃が同フレームで二重発火していた。
        //   attackCooldown で排他制御し、バトルモードと同じ速度感に統一する。
        if (attackPressed && !canUseXSpecial) { // pressed() で 1フレーム 1 回のみ発火
            if (this.player.attackCooldown <= 0) { // クールダウン中は何もしない
                if (this.player.stackedAlly) {
                    // 仲間を持ちながらXで投げる
                    this.handleAllyThrow();
                    specialUsedForSabotage = true;
                } else if (this.player.heldItems.length > 0) {
                    // アイテム所持中：大砲に投擲、外れたら消費
                    const cannons = this.tank.cannons;
                    let hit = false;
                    for (const c of cannons) {
                        const dx = (c.x + c.w / 2) - (this.player.x + this.player.w / 2);
                        const dy = (c.y + c.h / 2) - (this.player.y + this.player.h / 2);
                        if (Math.abs(dy) < 50 && (this.player.dir > 0 ? dx > 0 : dx < 0) && Math.abs(dx) < 150) {
                            c.takeDamage(25);
                            hit = true;
                            this.particles.explosion(c.x + c.w / 2, c.y + c.h / 2, '#EDA', 10);
                        }
                    }
                    if (hit) {
                        this.player.heldItems.shift();
                        this.sound.play('destroy');
                    } else {
                        this.player.attackDefender([]); // 投擲エフェクト
                        this.player.heldItems.shift();
                    }
                    // ★Bug1修正: triggerTailAttack()はattack音も鳴らすため呼ばない。
                    //   クールダウンだけ手動設定してdestroy音との二重再生を防ぐ。
                    const _skinId = window.game?.saveData?.tankCustom?.skin || 'skin_default';
                    const _skinData = (window.TANK_PARTS?.skins || []).find(s => s.id === _skinId);
                    this.player.attackCooldown = Math.max(10, Math.round(30 * (_skinData?.attackSpeedMult ?? 1.0)));
                    specialUsedForSabotage = true;
                } else {
                    // 素手：近くの大砲があれば妨害キック、なければ通常テール攻撃
                    const cannons = this.tank.cannons;
                    let sabotageDone = false;
                    for (const c of cannons) {
                        const dx = (c.x + c.w / 2) - (this.player.x + this.player.w / 2);
                        const dy = (c.y + c.h / 2) - (this.player.y + this.player.h / 2);
                        if (Math.abs(dx) < 60 && Math.abs(dy) < 60) {
                            // 妨害キック（大砲近接時）
                            this.player.triggerTailAttack(); // クールダウン込み
                            this.sound.play('jump');
                            c.takeDamage(5);
                            this.camera_shake = 2;
                            sabotageDone = true;
                            break;
                        }
                    }
                    if (!sabotageDone) {
                        // 通常テール攻撃（バトルモードと完全同一）
                        this.player.triggerTailAttack();
                    }
                    specialUsedForSabotage = true; // special チェックをスキップ
                }
            }
        }

        // ゲージ満タン時はXで必殺技、Shiftでもショートカット可能
        if (((attackPressed && canUseXSpecial) || specialShortcutPressed) && this.battle.specialGauge >= this.battle.maxSpecialGauge && !specialUsedForSabotage) {
            this.battle.triggerSpecial();
            specialUsedForSabotage = true; // 必殺技を撃ったので攻撃はスキップ済み
        }

        // 帰還ボタンは廃止 - 侵入したら勝つか死ぬかのみ

        // 2. Action (Z / A)
        if (this.input.action) {
            let actionDone = false;

            // スイッチ操作は最優先（アイテム所持中でも押せる）
            let switchInteracted = false;
            if (this.tank.switches) {
                for (const s of this.tank.switches) {
                    const dx = this.player.x + this.player.w / 2 - (s.x + s.w / 2);
                    const dy = this.player.y + this.player.h / 2 - (s.y + s.h / 2);
                    const distSq = dx * dx + dy * dy;

                    if (distSq < 4900 && !s.activated) { // √4900=70px
                        s.activated = true;
                        this.sound.play('click');
                        if (s.type === 'trap') {
                            this.tank.spawnDefender();
                            this.tank.spawnDefender();
                            this.sound.play('invade');
                            this.screenFlash = 5;
                        } else {
                            this.particles.explosion(s.x + s.w / 2, s.y + s.h / 2, '#4CAF50', 10);
                        }
                        switchInteracted = true;
                        actionDone = true;
                        break;
                    }
                }
            }

            if (!switchInteracted && this.player.heldItems && this.player.heldItems.length > 0) {
               // 侵入モードではZキー（Action）はアイテム拾いとスイッチのみ。大砲破壊はXキー（Throw）。
            } else if (!switchInteracted) {
                // 侵入モードでもZキーで仲間を拾わないように(null)変更。
                if (this.ammoDropper && this.player.tryPickup(this.ammoDropper.items, null)) {
                    actionDone = true;
                } 
            }
        }

        // 3. Ally Action (C / B) - 侵攻モードでも仲間操作をCキーに統一
        if (this.input.allyAction) {
            if (this.player.stackedAlly) {
                this.handleAllyThrow();
            } else {
                if (this.player.tryPickup([], this.allies)) {
                    // Picked up ally
                }
            }
        }

        // Special Animation Timer
        if (this.specialAnimTimer > 0) this.specialAnimTimer--;

        // Hit Detection for Tail Attack (Improved Box in front of player)
        if (this.player.isAttacking && this.player.attackDuration > 5) {
            // Check Defenders
            if (this.tank.defenders) {
                const px = this.player.x + this.player.w / 2;
                const py = this.player.y + this.player.h / 2;

                // Attack Box Center
                const ax = px + (this.player.vx > 0 ? 25 : (this.player.vx < 0 ? -25 : this.player.dir * 25));
                const ay = py + (this.player.vy > 0 ? 25 : (this.player.vy < 0 ? -25 : 0));

                // 2.1 Check Switches (New Fix)
                if (this.tank.switches) {
                    for (const s of this.tank.switches) {
                        if (!s.activated) {
                            const sx = s.x + s.w / 2;
                            const sy = s.y + s.h / 2;
                            if (Math.abs(ax - sx) < 60 && Math.abs(ay - sy) < 60) {
                                s.activated = true;
                                this.sound.play('confirm');
                                this.particles.sparkle(sx, sy, '#FFFF00');
                                this.camera_shake = 3;
                            }
                        }
                    }
                }

                for (const d of this.tank.defenders) {
                    if (d.hp > 0 && d.invincible <= 0) {
                        const dx = (d.x + d.w / 2) - ax;
                        const dy = (d.y + d.h / 2) - ay;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < 2025) { // √2025=45
                            // Hit! Determine push direction
                            const pdx = (d.x + d.w / 2) - px;
                            const pdy = (d.y + d.h / 2) - py;
                            const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1; // ノックバック方向に必要

                            d.takeHit(10, pdx / pdist, pdy / pdist);
                            this.camera_shake = 8;
                            this.sound.play('hit');
                        }
                    }
                }
            }

            // Check Engine Core (const ec は updateInvasion() 内で宣言済み)
            if (this.tank.isEnemy && ec && ec.visible && ec.hp > 0 && !ec.locked) {
                const px = this.player.x + this.player.w / 2;
                const py = this.player.y + this.player.h / 2;
                // Attack Box Center
                const ax = px + (this.player.dir * 30);
                const ay = py;

                const cx = ec.x + ec.w / 2;
                const cy = ec.y + ec.h / 2;

                // Simple box/circle check
                if (Math.abs(ax - cx) < 50 && Math.abs(ay - cy) < 50) {
                    // Hit Core!
                    // Initialize invincible property if it doesn't exist
                    if (!ec.invincible) ec.invincible = 0;

                    if (ec.invincible <= 0) {
                        // エンジンコアへのダメージは固定（必殺技ボーナスは砲台弾のみ）
                        const totalDamage = 10;

                        ec.hp -= totalDamage;
                        ec.invincible = 20;

                        this.sound.play('hit');
                        this.particles.hit(cx, cy);
                        this.particles.damageNum(cx, cy - 30, totalDamage.toString(), '#FFD700');
                        this.camera_shake = 8;
                    }
                }
            }
            this.player.vx *= 0.1;
            this.player.vy *= 0.1;
        }

        // Check if Engine Core is destroyed (const ec は updateInvasion() 内で宣言済み)
        if (ec && ec.hp <= 0 && !this.invasionVictoryTriggered) {
            this.handleInvasionVictory();
        }
        // ※ tickInvasionVictoryDelay() は updateInvasion() 冒頭で既に呼び済みのため、
        //   ここでは呼ばない（二重呼び出しバグ修正）
    }

    updateDefense() {
        // Player Update
        // Update logic (Stun handled in main update)
        if (this.player.stunned > 0) {
            this.player.vx = 0; this.player.vy = 0;
            this.player.update({ left: false, right: false, up: false, down: false, jump: false, action: false, invade: false }, this.tank);
        } else {
            this.player.update(this.input, this.tank);
        }

        // 1. Action (Z) - 装填・アイテム取得のみ
        if (this.input.action) {
            if (this.player.heldItems.length > 0) {
                this.player.tryLoadCannon(this.tank.cannons);
            } else {
                this.player.tryPickup(this.ammoDropper.items, null);
            }
        }

        // 2. Attack / Special (X)
        const attackPressed = this.input.attack;
        const specialShortcutPressed = this.input.special;
        if ((attackPressed || specialShortcutPressed) && this.battle.specialGauge >= this.battle.maxSpecialGauge) {
            this.battle.triggerSpecial();
        } else if (attackPressed) {
            this.player.triggerTailAttack();
        }

        // 3. Ally Action (C) - 仲間を持ち上げる・投げる
        if (this.input.allyAction) {
            if (this.player.stackedAlly) {
                this.handleAllyThrow();
            } else {
                this.player.tryPickup([], this.allies);
            }
        }

        // 旧操作（互換性・キャンセル用）
        if (this.input.cancel) {
            if (this.player.heldItems.length > 0) {
                const defenders = this.tank.defenders;
                this.player.attackDefender(defenders);
            }
        }

        // Check Player Death
        if (this.player.hp <= 0) {
            this.handlePlayerDeath();
            return;
        }

        // Tank Update (Fires, etc.)
        const bossInvadeTankResult = this.tank.update(this.player);
        this.tank.fireDamage = (bossInvadeTankResult && bossInvadeTankResult.fireDamage) || 0;

        // Allies Update (Defend during boss invade?)
        for (const ally of this.allies) {
            ally.update(this.tank, this.ammoDropper ? this.ammoDropper.items : [], this.invader);
        }
        // ★バグ修正③: updateBattle同様、死亡/配合済み仲間をインプレース削除
        // (以前はdefenseモードで死亡した仲間がゴーストとして毎フレーム update() され続けていた)
        {
            let _wi = 0;
            for (let _ai = 0; _ai < this.allies.length; _ai++) {
                if (!this.allies[_ai].isDead) this.allies[_wi++] = this.allies[_ai];
            }
            this.allies.length = _wi;
        }

        // Invader Update
        if (this.invader) {
            let alive = true;
            try {
                alive = this.invader.update(this.player);
            } catch (e) {
                console.error("Invader Error:", e);
                alive = false; // Kill invader on error to unfreeze
            }

            if (!alive) {
                // Invader Defeated!
                this.sound.play('victory');

                // If in Defense Mode (Defeat recovery), restore HP
                if (this.state === 'defense') {
                    this.battle.playerTankHP = Math.floor(this.battle.playerTankMaxHP * 0.3); // Restore 30% HP
                    this.battle.phase = 'battle'; // Resume battle
                    this.state = 'battle';
                } else {
                    // Just a battle invasion repelled
                    this.particles.rateEffect(this.invader.x, this.invader.y, "撃退成功！", "#4CAF50");
                }

                // Cleanup invader
                this.invader = null;
            }
        }

        // Check Core Destruction (Defeat)
        if (this.tank.engineCore.hp <= 0) {
            this.triggerResult(false);
        }



        // Hit Detection for Tail Attack (Unified 360-degree detection)
        if (this.player.isAttacking && this.player.attackDuration > 0) {
            const px = this.player.x + this.player.w / 2;
            const py = this.player.y + this.player.h / 2;
            const hitRadius = 65;

            // 1. Check Invader
            if (this.invader && this.invader.hp > 0 && this.invader.invincible <= 0) {
                const ix = this.invader.x + this.invader.w / 2;
                const iy = this.invader.y + this.invader.h / 2;
                const dx = ix - px, dy = iy - py;
                const distSq = dx * dx + dy * dy;

                if (distSq < hitRadius * hitRadius) { // 二乗比較でsqrt不要
                    const dist = Math.sqrt(distSq) || 1; // ノックバック方向用
                    this.invader.takeDamage(80, dx / dist); // 🔧 80 プレイヤー攻撃（10発で倒せる）
                    this.camera_shake = 10;
                    this.player.isAttacking = false; // Only hit boss once per swing?
                }
            }

            // 2. Check Defenders (if present in own tank)
            if (this.tank.defenders) {
                for (const d of this.tank.defenders) {
                    if (d.hp > 0 && d.invincible <= 0) {
                        const dxx = (d.x + d.w / 2) - px;
                        const dyy = (d.y + d.h / 2) - py;
                        const ddistSq = dxx * dxx + dyy * dyy;
                        if (ddistSq < hitRadius * hitRadius) { // 二乗比較でsqrt不要
                            const ddist = Math.sqrt(ddistSq) || 1; // ノックバック方向計算用
                            d.takeHit(10, dxx / ddist, dyy / ddist);
                            this.camera_shake = 5;
                        }
                    }
                }
            }
        }

        // Ammo Dropper - Keep spawning items to help player? Or stop?
        // Let's keep it but maybe slower? Or normal.
        this.ammoDropper.update(this.tank.platforms, this.tank.dropX, this.tank.dropY, this.tank.dropW);
    }

    // New Method: Spawn Invader during Battle (Without stopping game)
    spawnBattleInvader() {
        if (this.invader) return; // Already invaded

        this.sound.play('invade');
        this.screenFlash = 8;

        // Spawn at top hatch
        const entryX = (this.tank.dropX !== undefined) ? this.tank.dropX + 50 : 100;
        const entryY = (this.tank.dropY !== undefined) ? this.tank.dropY : 50;

        // Randomize Type
        let type = 'NORMAL';
        const r = Math.random();
        if (r < 0.7) type = 'NORMAL';
        else if (r < 0.8) type = 'SPEED';
        else if (r < 0.9) type = 'POWER';
        else type = 'NINJA';

        // ステージのtankTypeがTRUE_BOSSの場合は強制的にTRUE_BOSSを侵入させる
        const _bInvaderMap = {
            'TRUE_BOSS': 'TRUE_BOSS', 'BOSS': 'POWER', 'DEFENSE': 'POWER',
            'HEAVY': 'POWER', 'SCOUT': 'SPEED', 'MAGICAL': 'NINJA'
        };
        const _bTankType = (this.stageData && this.stageData.tankType) || '';
        if (_bInvaderMap[_bTankType]) type = _bInvaderMap[_bTankType];

        this.invader = new InvaderAI(entryX, entryY, this.tank.platforms, this.tank.engineCore, type);

        // Ensure core is vulnerable
        this.tank.engineCore.visible = true;
        this.tank.engineCore.locked = false;

        // Visual warning
        if (this.particles) this.particles.rateEffect(CONFIG.TANK.OFFSET_X + 280, CONFIG.TANK.OFFSET_Y + 100, "侵入者だ！", "#FF0000");
    }

    startDefense() {
        if (this.state === 'defense') return; // Guard against re-entry freeze
        this.sound.play('invade');
        this.screenFlash = 8;

        // CRITICAL: Check if we need to return from invasion BEFORE changing state.
        // returnFromInvasion() restores this.tank to the player's own tank.
        const wasInInvasion = (this.savedBattleState && typeof this.savedBattleState === 'object' && this.savedBattleState.tank);
        if (wasInInvasion) {
            this.returnFromInvasion(); // Restores this.tank to player tank
        }

        this.state = 'defense';

        // Reset Player Position to Cockpit (Safe from walls)
        const spawn = this.tank.getSpawnPoint();
        this.player.x = spawn.x;
        this.player.y = spawn.y;
        this.player.vx = 0; this.player.vy = 0;

        // Spawn Invader at top - ステージのtankTypeをInvaderAIの対応typeにマッピング
        const entryX = (this.tank.dropX !== undefined) ? this.tank.dropX + 50 : 100;
        const entryY = (this.tank.dropY !== undefined) ? this.tank.dropY : 50;
        const _tankType = (this.stageData && this.stageData.tankType) || 'NORMAL';
        const _invaderTypeMap = {
            'NORMAL': 'NORMAL', 'HEAVY': 'POWER', 'DEFENSE': 'POWER',
            'SCOUT': 'SPEED',   'NINJA': 'NINJA',  'MAGICAL': 'NINJA',
            'BOSS': 'POWER',    'SHAKKIN': 'POWER', 'TRUE_BOSS': 'TRUE_BOSS'
        };
        const defenseType = _invaderTypeMap[_tankType] || 'NORMAL';
        this.invader = new InvaderAI(entryX, entryY, this.tank.platforms, this.tank.engineCore, defenseType);

        // Ensure core is exposed/unlock for defense
        this.tank.engineCore.visible = true;
        this.tank.engineCore.locked = false;

        // Message?
        // Maybe add a UI message later
    }

    updateTankDestruction() {
        if (this.state !== 'tank_destruction') return;
        if (!this.destructionTimer) this.destructionTimer = 180;
        this.destructionTimer--;

        const isBossStage = this.stageData && this.stageData.isBoss;

        // ラスボスは破壊演出を特別に
        if (isBossStage) {
            if (!this.bossDestructionInitialized) {
                this.bossDestructionInitialized = true;
                this.destructionTimer = 240; // 4秒に延長
                this.camera_shake = 12;
                this.screenFlash = 8;
            }

            // 激しいカメラシェイク
            this.camera_shake = Math.max(2, Math.floor(this.destructionTimer / 16));

            // 連続爆発
            if (this.destructionTimer % 5 === 0) {
                const rx = CONFIG.CANVAS_WIDTH - CONFIG.TANK.OFFSET_X - Math.random() * CONFIG.TANK.INTERIOR_W;
                const ry = CONFIG.TANK.OFFSET_Y + Math.random() * CONFIG.TANK.INTERIOR_H;
                this.particles.explosion(rx, ry, '#FF4400', 30);
                this.sound.play('destroy');
            }

            // 大爆発
            if (this.destructionTimer % 20 === 0) {
                const centerX = CONFIG.CANVAS_WIDTH - CONFIG.TANK.OFFSET_X - CONFIG.TANK.INTERIOR_W / 2;
                const centerY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;
                this.particles.explosion(centerX, centerY, '#FFD700', 50);
                this.screenFlash = 8;
                this.camera_shake = 12;

                for (let i = 0; i < 20; i++) {
                    const angle = (Math.PI * 2 * i) / 20;
                    this.particles.spark(centerX, centerY, Math.cos(angle) * 15, Math.sin(angle) * 15, '#FFD700');
                }
            }

            if (this.destructionTimer === 30) {
                const centerX = CONFIG.CANVAS_WIDTH - CONFIG.TANK.OFFSET_X - CONFIG.TANK.INTERIOR_W / 2;
                const centerY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;
                this.particles.explosion(centerX, centerY, '#FFFFFF', 100);
                this.screenFlash = 8;
                this.camera_shake = 12;
                this.sound.play('destroy');
            }
        } else {
            // 通常の破壊演出
            this.camera_shake = 10;
            if (this.destructionTimer % 10 === 0) {
                const rx = Math.random() * CONFIG.CANVAS_WIDTH;
                const ry = Math.random() * CONFIG.CANVAS_HEIGHT;
                this.particles.explosion(rx, ry, '#FF4400', 15);
                this.sound.play('destroy');
            }
        }

        if (this.destructionTimer <= 0) {
            // 共通のセーブ処理 (ミッション進捗など)
            const stats = this.missionStats || { enemiesDefeated: 0, totalDamage: 0, specialsUsed: 0, itemsCollected: 0, shotsFired: 0, damageTaken: 0 };
            // ミッション進捗を更新し、今回初めて完了したものだけ通知
            const notifyMission = (m) => {
                if (!m) return;
                if (this.particles) {
                    this.particles.rateEffect(
                        CONFIG.CANVAS_WIDTH / 2,
                        CONFIG.CANVAS_HEIGHT / 2 - 60,
                        `ミッション達成！ +${m.reward}G`,
                        '#FFD700'
                    );
                }
                if (this.sound) this.sound.play('powerup');
            };

            // パフォーマンス改善: notifyMission呼出しを整理
            const vM = SaveManager.updateMissionProgress(this.saveData, 'win_battles', 1);
            if (vM) notifyMission(vM);
            if (stats.enemiesDefeated > 0) {
                const eM = SaveManager.updateMissionProgress(this.saveData, 'defeat_enemies', stats.enemiesDefeated);
                if (eM) notifyMission(eM);
            }
            if (stats.totalDamage > 0) {
                const dM = SaveManager.updateMissionProgress(this.saveData, 'deal_damage', stats.totalDamage);
                if (dM) notifyMission(dM);
            }
            if (stats.specialsUsed > 0) {
                const sM = SaveManager.updateMissionProgress(this.saveData, 'use_special', stats.specialsUsed);
                if (sM) notifyMission(sM);
            }
            if (stats.itemsCollected > 0) {
                const iM = SaveManager.updateMissionProgress(this.saveData, 'collect_items', stats.itemsCollected);
                if (iM) notifyMission(iM);
            }
            this.saveData.wins = (this.saveData.wins || 0) + 1;
            // ミッション進捗を一括保存（完了以外は個別保存されないため）
            SaveManager.save(this.saveData);

            // クリア済みフラグと報酬の処理
            SaveManager.clearStage(this.saveData, this.stageData.id);

            // 報酬のアンロック
            if (this.stageData.reward) {
                const rewards = Array.isArray(this.stageData.reward) ? this.stageData.reward : [this.stageData.reward];
                rewards.forEach(ammo => {
                    if (!this.saveData.unlockedAmmo.includes(ammo)) {
                        this.saveData.unlockedAmmo.push(ammo);
                        this.newlyUnlocked.push(ammo);
                    }
                });
            }
            // === パーツ報酬処理（配列・単体両対応）===
            if (this.stageData.partReward) {
                if (!this.saveData.unlockedParts) this.saveData.unlockedParts = [];
                // 配列でも単体でも対応
                const rewards = Array.isArray(this.stageData.partReward)
                    ? this.stageData.partReward
                    : [this.stageData.partReward];
                this.newlyUnlockedPart = null;
                for (const part of rewards) {
                    const alreadyHave = this.saveData.unlockedParts.includes(part.id);
                    if (!alreadyHave) {
                        this.saveData.unlockedParts.push(part.id);
                        if (!this.newlyUnlockedPart) this.newlyUnlockedPart = part; // 最初の新パーツを表示
                    }
                }
            } else {
                this.newlyUnlockedPart = null;
            }

            // === 仲間報酬処理（allyReward フィールドがあるステージ用）===
            // stage_secret クリアで「老師」を解放するなど
            if (this.stageData.allyReward) {
                const ar = this.stageData.allyReward;
                if (!this.saveData.unlockedAllies) this.saveData.unlockedAllies = [];
                const alreadyHave = this.saveData.unlockedAllies.find(a => a.type === ar.type);
                if (!alreadyHave) {
                    const LARGE = new Set(['titan_golem', 'platinum_golem', 'dragon_lord']);
                    const newAlly = {
                        id: `ally_${Date.now()}_reward`,
                        type: ar.type,
                        name: ar.name,
                        color: ar.color,
                        darkColor: ar.darkColor,
                        rarity: ar.rarity || 5,
                        level: 1,
                        cost: LARGE.has(ar.type) ? 2 : 1,
                    };
                    this.saveData.unlockedAllies.push(newAlly);
                    SaveManager.addAllyToCollection(this.saveData, ar.type);
                    this.newlyUnlockedAlly = { ...newAlly };
                } else {
                    // 既に持っている場合は newlyUnlockedAlly をセットしない（重複防止）
                    this.newlyUnlockedAlly = null;
                }
            }

            // ゴールド報酬計算
            const rewardGold = 6000 + Math.max(0, 3600 - (this.battle ? this.battle.battleTimer : 0)) * 1.5; // 🔧 基本4500→6000G タイムボーナス最大5400G
            const goldBoostLevel = this.saveData.upgrades.goldBoost || 0;
            const goldMultiplier = CONFIG.UPGRADES.GOLD_BOOST.BOOST_MULTIPLIER[goldBoostLevel] || 1.0;
            this.saveData.gold = (this.saveData.gold || 0) + Math.floor(rewardGold * goldMultiplier);

            // Repair Kit Reward (10% chance)
            if (Math.random() < 0.1) {
                this.saveData.repairKits = (this.saveData.repairKits || 0) + 1;
                this.newlyUnlocked.push('repair_kit');
            }

            // === 仲間EXP付与（バトル終了時）===
            const battleTime = this.battle ? this.battle.battleTimer : 0;
            const baseExp = 30 + Math.floor(battleTime / 180); // 基本30 + バトル時間ボーナス
            if (this.allies && this.saveData.allyDeck) {
                this.allies.forEach(ally => {
                    ally.gainExp(baseExp);
                    // セーブデータに同期
                    const saved = this.saveData.unlockedAllies.find(a => a.id === ally.id);
                    if (saved) {
                        saved.level = ally.level;
                        saved.exp = ally.exp;
                    }
                });
            }

            // ハイスコア記録
            if (this.battle && typeof this.battle.battleTimer === 'number') {
                this.isNewRecord = SaveManager.saveHighScore(this.saveData, this.stageData.id, this.battle.battleTimer);
            }

            // === バトルランク計算（S/A/B/C） ===
            {
                const secs = Math.floor((this.battle ? this.battle.battleTimer : 999 * 60) / 60);
                const hpRatio = this.battle ? (this.battle.playerTankHP / this.battle.playerTankMaxHP) : 0;
                const combo = this.maxCombo || 0;
                let battleScore = 0;
                // タイム評価（最大40点）
                if (secs <= 30) battleScore += 40;
                else if (secs <= 60) battleScore += 30;
                else if (secs <= 120) battleScore += 20;
                else if (secs <= 180) battleScore += 10;
                // HP残量評価（最大40点）
                battleScore += Math.floor(hpRatio * 40);
                // コンボ評価（最大20点）
                if (combo >= 20) battleScore += 20;
                else if (combo >= 10) battleScore += 15;
                else if (combo >= 5) battleScore += 10;
                else if (combo >= 2) battleScore += 5;
                // ランク決定
                if (battleScore >= 85) this.battleRank = 'S';
                else if (battleScore >= 65) this.battleRank = 'A';
                else if (battleScore >= 40) this.battleRank = 'B';
                else this.battleRank = 'C';

                // === 累計総合スコアを計算してDBに送信 ===
                // クリア数・勝利数・育成度・仲間をバランスよく反映
                const sd = this.saveData;
                const clearedCount = (sd.clearedStages || []).length;
                const winsCount = sd.wins || 0;
                const hpLv  = (sd.upgrades && sd.upgrades.hp)     || 0;
                const atkLv = (sd.upgrades && sd.upgrades.attack)  || 0;
                const allyCount = (sd.unlockedAllies || []).length;
                const allyAvgLv = allyCount > 0
                    ? Math.floor((sd.unlockedAllies || []).reduce((s, a) => s + (a.level || 1), 0) / allyCount)
                    : 1;
                const goldScore = Math.min(Math.floor((sd.gold || 0) / 100), 300);
                const gachaScore = Math.min((sd.gachaPity || 0) * 5, 200);

                const totalScore =
                    clearedCount * 150 +   // クリア数（育成の証）
                    winsCount    *  80 +   // 総勝利数（プレイ量）
                    hpLv         *  40 +   // HPアップグレード（育成度）
                    atkLv        *  40 +   // 攻撃アップグレード（育成度）
                    allyCount    *  50 +   // 仲間の数（コレクション）
                    allyAvgLv    *  30 +   // 仲間の平均レベル（育成度）
                    goldScore           +   // ゴールド（上限300）
                    gachaScore;            // ガチャ回数（上限200）

                // === Spring Boot DBにスコア保存 ===
                const _pname = window._slimePlayerName;
                if (_pname) saveSlimeScore(_pname, totalScore);
            }

            // 最終セーブ
            SaveManager.save(this.saveData);

            // 遷移処理
            if (this.stageData.id === 'stage8') {
                if (this.finalEndingTriggered) return;
                this.finalEndingTriggered = true;
                this.state = 'ending';
                this.frame = 0;
                return;
            }

            if (this.stageData.id === 'stage_boss') {
                if (this.bossEndingTriggered) return;
                this.bossEndingTriggered = true;
                this.state = 'story';
                this.prevState = 'battle';
                this.story.start('stage_boss_ending', () => {
                    this.triggerResult(true);
                });
                return;
            }

            // 第2章ボス（c2_boss）クリア後：エンディングストーリーを再生してからリザルトへ
            if (this.stageData.id === 'c2_boss') {
                if (this.bossEndingTriggered) return;
                this.bossEndingTriggered = true;
                this.state = 'story';
                this.prevState = 'battle';
                this.story.start('chapter2_ending', () => {
                    this._ch2EndingShown = true;
                    this.triggerResult(true);
                });
                return;
            }

            if (this.stageData.id === 'c3_boss') {
                if (this.bossEndingTriggered) return;
                this.bossEndingTriggered = true;
                this.state = 'story';
                this.prevState = 'battle';
                this.story.start('chapter3_ending', () => {
                    this._ch3EndingShown = true;
                    this.triggerResult(true);
                });
                return;
            }

            if (this.stageData.id === 'c4_boss') {
                if (this.bossEndingTriggered) return;
                this.bossEndingTriggered = true;
                this.state = 'story';
                this.prevState = 'battle';
                this.story.start('chapter4_ending', () => {
                    this._ch4EndingShown = true;
                    this.resultGoToComplete = true; // ★第4章が最終章 → 全クリア演出へ
                    this.triggerResult(true);
                });
                return;
            }

            if (this.stageData.id === 'c5_boss') {
                if (this.bossEndingTriggered) return;
                this.bossEndingTriggered = true;
                this.state = 'story';
                this.prevState = 'battle';
                this.story.start('chapter5_ending', () => {
                    this._ch5EndingShown = true;
                    this.resultGoToComplete = true;
                    this.triggerResult(true);
                });
                return;
            }

            // EXステージ（stage_ex1〜3）クリア後は result → stage_select に戻る
            // stage_ex3（終焉の戦場）クリアで complete_clear へ
            if (this.stageData.id === 'stage_ex3') {
                this.resultGoToComplete = true;
                this.triggerResult(true);
                return;
            }


            // === 借金王トリガー：stage5クリア後に自動出現 ===
            if (this.stageData.id === 'stage5') {
                const shakkinCleared = this.saveData.clearedStages &&
                    this.saveData.clearedStages.includes('stage_shakkin');
                if (!shakkinCleared) {
                    const shakkinIdx = STAGES.findIndex(s => s && s.id === 'stage_shakkin');
                    if (shakkinIdx >= 0) {
                        this._pendingShakkin = shakkinIdx;
                        this.triggerResult(true);
                        return;
                    }
                }
            }

            this.triggerResult(true);
        }
    }

    // === 欠落していたメソッドの復旧 ===
    handleInvasionVictory() {
        if (this.invasionVictoryTriggered) return;
        this.invasionVictoryTriggered = true;
        this.sound.play('victory');

        // エフェクト演出
        if (this.particles) {
            const ec = this.tank.engineCore;
            this.particles.explosion(ec.x + ec.w / 2, ec.y + ec.h / 2, '#FFD700', 100);
            this.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 50, "エンジン破壊成功！", "#FFD700");
        }

        // バトルマネージャーに勝利を通知
        if (this.battle) {
            this.battle.phase = 'victory';
        }

        // Use a frame counter instead of setTimeout to keep all logic inside the game loop.
        // 120 frames ≈ 2 seconds at 60 FPS.
        this.invasionVictoryDelay = 120;
    }

    // Called each frame from updateInvasion() while invasionVictoryDelay counts down.
    tickInvasionVictoryDelay() {
        if (!this.invasionVictoryDelay || this.invasionVictoryDelay <= 0) return;
        this.invasionVictoryDelay--;
        if (this.invasionVictoryDelay === 0) {
            if (this.state === 'invasion') {
                this.returnFromInvasion();
                this.state = 'battle';
            }
        }
    }

    returnFromInvasion() {
        if (!this.savedBattleState || typeof this.savedBattleState !== 'object') return;

        // ★バグ修正: 帰還時に手持ちアイテムと担ぎ状態をクリアする（表示の不自然さを防ぐ）
        if (this.player) {
            this.player.heldItems = [];
            this.player.stackedAlly = null;
        }

        // 以前の状態（自軍タンク）を復元
        if (this.savedBattleState.tank) this.tank = this.savedBattleState.tank;
        if (this.savedBattleState.ammoDropper) this.ammoDropper = this.savedBattleState.ammoDropper;

        // プレイヤーを持ち場（コックピットなど）に戻す
        const spawn = this.tank.getSpawnPoint();
        this.player.x = spawn.x;
        this.player.y = spawn.y;
        this.player.vx = 0;
        this.player.vy = 0;

        this.savedBattleState = null;

        // タッチUIをバトルモードに戻す
        if (this.touch) this.touch.setMode('battle');
    }

    // ====================================================
    // デイリーログインボーナス（スキン）
    // ====================================================
    _checkLoginBonus() {
        // ★バグ修正: toISOString()はUTC日付を返すためJST(+9)では日付がズレる
        //   SaveManager.getTodayDate()はローカル時間ベースで正確
        const today = SaveManager.getTodayDate(); // 'YYYY-MM-DD' (ローカル時間)
        if (!this.saveData.loginBonus) {
            this.saveData.loginBonus = { lastDate: null, claimedSkins: [], streak: 0 };
        }
        const lb = this.saveData.loginBonus;
        if (lb.lastDate === today) return; // 今日はもう受け取り済み

        // 連続ログイン判定（ローカル時間で前日を計算）
        const _now = new Date();
        const _yesterday = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() - 1);
        const yesterday = `${_yesterday.getFullYear()}-${String(_yesterday.getMonth()+1).padStart(2,'0')}-${String(_yesterday.getDate()).padStart(2,'0')}`;
        lb.streak = (lb.lastDate === yesterday) ? (lb.streak || 0) + 1 : 1;
        lb.lastDate = today;

        // 今日のスライムスキンを決定（デフォルト除外、日付ローテ）
        const bonusSkins = (window.TANK_PARTS?.playerSkins || []).filter(s => !s.isDefault);
        if (!bonusSkins.length) return;
        const _d = new Date();
        const _startOfYear = new Date(_d.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((_d - _startOfYear) / 86400000);
        const todaySkin = bonusSkins[dayOfYear % bonusSkins.length];

        if (!this.saveData.unlockedParts) this.saveData.unlockedParts = [];
        for (const skinId of lb.claimedSkins) {
            if (!this.saveData.unlockedParts.includes(skinId)) {
                this.saveData.unlockedParts.push(skinId);
            }
        }

        // アンロック済みでなければ解放してペンディングに積む
        if (!lb.claimedSkins.includes(todaySkin.id)) {
            lb.claimedSkins.push(todaySkin.id);
            if (!this.saveData.unlockedParts.includes(todaySkin.id)) {
                this.saveData.unlockedParts.push(todaySkin.id);
            }
            this._pendingLoginBonus = { skin: todaySkin, streak: lb.streak, isNew: true };
        } else {
            // 既にそのスキンは持っている → 代わりにゴールド+100
            this.saveData.gold = (this.saveData.gold || 0) + 100;
            this._pendingLoginBonus = { skin: todaySkin, streak: lb.streak, isNew: false, goldBonus: 100 };
        }
        SaveManager.save(this.saveData);
    }

    // タイトル画面でログインボーナスポップアップを表示する
    showLoginBonusPopupIfNeeded(ctx, W, H) {
        if (!this._pendingLoginBonus || this.state !== 'title') return false;
        const lb = this._pendingLoginBonus;
        const skin = lb.skin;

        // 半透明オーバーレイ
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        const bw = Math.min(W - 40, 360), bh = 280;
        const bx = (W - bw) / 2, by = (H - bh) / 2;
        ctx.fillStyle = '#10102a';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        // ★Bug4修正: ctx.roundRect は Safari<15.4 未対応のため互換ヘルパーで代替
        const _roundRectCompat = (c, x, y, w, h, r) => {
            if (typeof c.roundRect === 'function') {
                c.roundRect(x, y, w, h, r);
            } else {
                c.moveTo(x + r, y);
                c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
                c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
                c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
                c.closePath();
            }
        };
        ctx.beginPath();
        _roundRectCompat(ctx, bx, by, bw, bh, 14);
        ctx.fill(); ctx.stroke();

        // タイトル
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎁 デイリーログインボーナス！`, W / 2, by + 36);

        // 連続ログイン
        ctx.fillStyle = '#00e5ff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`${lb.streak}日連続ログイン中！`, W / 2, by + 58);

        // ★変更: スライム本体 + 帽子スキンをプレビュー描画
        try {
            const slimeSize = 66;
            const slimeX = W / 2 - slimeSize / 2;
            const slimeY = by + 68;
            // saveDataに一時的にスキンを設定してプレビュー（帽子はrenderer側で参照）
            const _prevSkin = this.saveData.tankCustom?.playerSkin;
            try {
                if (this.saveData.tankCustom) this.saveData.tankCustom.playerSkin = skin.id;
                Renderer.drawSlime(ctx, slimeX, slimeY, slimeSize, slimeSize,
                    CONFIG.COLORS.PLAYER, CONFIG.COLORS.PLAYER_DARK, 1, 0, 0, 'player');
            } finally {
                // ★バグ修正3: エラー時も必ずprevSkinに戻す（playerSkinが書き換わったままになるバグを修正）
                if (this.saveData.tankCustom) this.saveData.tankCustom.playerSkin = _prevSkin;
            }
        } catch(e) {
            ctx.font = '52px sans-serif';
            ctx.fillText('👾', W / 2, by + 128);
        }

        // スキン名
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(skin.name, W / 2, by + 160);

        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(200,200,255,0.75)';
        ctx.fillText((skin && skin.desc) || '', W / 2, by + 177);

        if (lb.isNew) {
            ctx.fillStyle = '#4cff72';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('✨ 新スキンをゲット！', W / 2, by + 202);
        } else {
            ctx.fillStyle = '#ffd700';
            ctx.font = '12px sans-serif';
            ctx.fillText(`（取得済み → 💰 +${lb.goldBonus}G 受取済み）`, W / 2, by + 202);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '11px sans-serif';
        ctx.fillText('Zキー / タップ で閉じる', W / 2, by + 240);
        ctx.restore();
        return true;
    }

    handlePlayerDeath() {
        if (this.state === 'result') return;

        // 侵入中に死亡した場合、タンク状態を元に戻す（savedBattleStateリーク防止）
        if (this.state === 'invasion' && this.savedBattleState) {
            this.returnFromInvasion();
        }

        // ===================================================
        // ★ 負けイベント：c4_boss（ニヒルム＝ドラゴン）
        // ===================================================
        if (this.stageData && this.stageData.id === 'c4_boss' && this.stageData.isLoseEvent && !this._c4BossLoseEventDone) {
            this._c4BossLoseEventDone = true; // 2回目以降は通常敗北

            // BGM を一時停止
            this.sound.stopBGM && this.sound.stopBGM();

            // カメラシェイク＆フラッシュ演出
            this.camera_shake = 20;
            this.screenFlash = 15;
            this.screenFlashType = 'hit';

            // バトル画面のまま表示してストーリーへ
            this.prevState = 'battle';
            this.state = 'story';
            this.story.start('c4_boss_lose_event', () => {
                // ストーリー終了 → 第2ラウンド開始演出
                this.prevState = 'battle';
                this.state = 'story';
                this.story.start('c4_boss_second_chance', () => {
                    // ===== プレイヤー戦車の覚醒：HP30000・攻撃/速度2倍・ドラゴン化 =====
                    // battle の playerTankHP を覚醒HPに上書き
                    if (this.battle) {
                        this.battle.playerTankHP = 30000;
                        this.battle.playerTankMaxHP = 30000;

                        // 攻撃力を覚醒値（ベース×2）に設定
                        // ★バグ修正: 乗算ではなく上書きにする。
                        //   skin_dragon を既に装備してリプレイした場合、攻撃ボーナスが
                        //   BattleManager 構築時に一度適用されているため ×2 すると二重適用になる。
                        //   ここでは「覚醒後の最終値」を直接計算して代入する。
                        {
                            const _baseAtk = 1 + (((this.saveData.upgrades && this.saveData.upgrades.attack) || 0) * 0.06);
                            this.battle.attackMultiplier = _baseAtk * 2.0;
                        }

                        // プレイヤーの戦車を『ドラゴンタンク』に変化！
                        // ★バグ修正: tank.skinId はダメージ計算専用フラグ。
                        //   視覚的なスキンは saveData.tankCustom.skin を変更しないと反映されない。
                        //   元のスキンを _preDragonSkin に退避してから skin_dragon に切り替える。
                        if (this.tank) {
                            this.tank.skinId = 'skin_dragon';
                        }
                        if (!this.saveData.tankCustom) this.saveData.tankCustom = {};
                        if (!this.saveData.tankCustom._preDragonSkin) {
                            // 元のスキンを退避（未設定なら skin_default）
                            this.saveData.tankCustom._preDragonSkin = this.saveData.tankCustom.skin || 'skin_default';
                        }
                        this.saveData.tankCustom.skin = 'skin_dragon';

                        // 敵のHPを第2ラウンド用（ボスの適正HP）にリセット
                        this.battle.enemyTankHP = this.stageData.enemyHP || 4000;
                        this.battle.enemyTankMaxHP = this.battle.enemyTankHP;
                        this.battle.bossSpecialActive = false;
                        this.battle.bossSpecialTimer = 0;
                        this.battle.phase = 'battle';
                        this.battle.projectiles = [];
                        // ★バグ修正: 第1ラウンドで発動中だったレーザー・バーストキューをリセット
                        // リセットしないと第2ラウンド開始直後にレーザーが連射し続ける
                        this.battle.laserActive = false;
                        this.battle.laserFrames = 0;
                        this.battle.burstQueue = [];
                    }

                    // タンク内プレイヤーも回復
                    if (this.player) {
                        this.player.hp = this.player.maxHp;
                        this.player.stunned = 0;
                        this.player.invincible = 120;
                        const spawn = this.tank && this.tank.getSpawnPoint();
                        if (spawn) { this.player.x = spawn.x; this.player.y = spawn.y; }
                    }

                    // 画面フラッシュ＆シェイク
                    this.camera_shake = 25;
                    this.screenFlash = 20;
                    this.screenFlashType = 'white';

                    // BGM再開（ボスBGM）
                    this.sound.playBGM('boss');

                    // バトル状態に戻る
                    this.state = 'battle';
                    this.prevState = 'battle';
                });
            });
            return; // 通常の敗北処理をスキップ
        }
        // ===================================================

        // ★バグ修正⑧: 敗北時も仲間のEXP・レベルをセーブデータに書き戻す
        // 勝利時(handleTankDestruction)と同じ処理。バトル中のEXP獲得が消えるバグを修正。
        if (this.allies && this.saveData.unlockedAllies) {
            this.allies.forEach(ally => {
                const saved = this.saveData.unlockedAllies.find(a => a.id === ally.id);
                if (saved) {
                    saved.level = ally.level;
                    saved.exp   = ally.exp;
                }
            });
        }

        this.saveData.losses = (this.saveData.losses || 0) + 1;
        SaveManager.save(this.saveData);
        this.triggerResult(false);
    }

    // === GM Narrator: 共通リザルト遷移ヘルパー ===
    triggerResult(won) {
        this.resultWon = won;
        this.state = 'result';
        if (won) {
            this.sound.play('victory');
            this.screenFlash = 8;
        } else {
            this.sound.playBGM('lose');
        }

        // GmNarrator に通知
        if (typeof GmNarrator !== 'undefined') {
            const isBoss = this.stageData?.isBoss || this.stageData?.id === 'stage_boss' || this.stageData?.id === 'stage8';
            const eventType = won
                ? (isBoss ? GmNarrator.EVENT_TYPES.BOSS_CLEAR : GmNarrator.EVENT_TYPES.STAGE_CLEAR)
                : GmNarrator.EVENT_TYPES.GAME_OVER;

            GmNarrator.onGameEvent(eventType, {
                stageId:         this.stageData?.id        || 'default',
                stageName:       this.stageData?.name      || '未知のステージ',
                enemyName:       this.stageData?.enemyName || '謎の敵',
            });
        }
    }

    // === NEW: Missing Method Fix ===
    updateResult() {
        // resultCursor: 0=もう一度 / 1=ステージ選択 / 2=コンティニュー(敗北時のみ)
        if (this.resultCursor === undefined) this.resultCursor = 0;

        // 敗北時かつ未使用のコンティニューが使えるか
        const canContinue = !this.resultWon && !this.continueUsed &&
                            (this.saveData.gold || 0) >= this.continueCost;

        // ◀▶ または ▲▼ カーソル移動
        const maxCursor = canContinue ? 2 : 1;
        if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA') ||
            this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.resultCursor = Math.max(0, this.resultCursor - 1);
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD') ||
            this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.resultCursor = Math.min(maxCursor, this.resultCursor + 1);
            this.sound.play('cursor');
        }

        if (this.input.menuConfirm || this.input.back) {
            // ★バグ修正: backキーは常にステージ選択へ。confirmキーはカーソルに従う。
            // backとconfirmで別々のサウンドを鳴らして区別する。
            const isBack = this.input.back && !this.input.menuConfirm;
            this.sound.play(isBack ? 'select' : 'confirm');

            // EX3クリア後はcomplete_clearへ
            if (this.resultGoToComplete) {
                this.resultGoToComplete = false;
                this.newlyUnlocked = [];
                this.newlyUnlockedAlly = null;
                this.newlyUnlockedPart = null;
                this.gachaResult = null;
                this.state = 'complete_clear';
                this.frame = 0;
                return;
            }

            // ★バグ修正: backキー押下時でも resultCursor===2（コンティニュー）を選んでいた場合は
            // ステージ選択へ強制遷移せず、isBack は cursor===1 相当として扱う。
            // 旧: `this.input.back || this.resultCursor === 1` だと
            // back + cursor===2 のときコンティニューが無視されてしまっていた。
            const _goBack = isBack || this.resultCursor === 1;
            if (_goBack) {
                // ステージ選択に戻る（第2章ステージなら chapter2_select へ）
                this.newlyUnlocked = [];
                this.newlyUnlockedAlly = null;
                this.newlyUnlockedPart = null;
                this.gachaResult = null;
                this._pendingShakkin = null; // キャンセル
                if (this.stageData && this.stageData.isChapter2) {
                    this.state = 'chapter2_select';
                    this.sound.playBGM('shop');
                    this.selectedStage = (window.STAGES_CHAPTER2 || []).findIndex(s => s.id === this.stageData.id);
                    if (this.selectedStage < 0) this.selectedStage = 0;
                } else if (this.stageData && this.stageData.isChapter3) {
                    this.state = 'chapter3_select';
                    this.sound.playBGM('show');
                    this.selectedStage = (window.STAGES_CHAPTER3 || []).findIndex(s => s.id === this.stageData.id);
                    if (this.selectedStage < 0) this.selectedStage = 0;
                } else if (this.stageData && this.stageData.isChapter4) {
                    this.state = 'chapter4_select';
                    this.sound.playBGM('battle');
                    this.selectedStage = (window.STAGES_CHAPTER4 || []).findIndex(s => s.id === this.stageData.id);
                    if (this.selectedStage < 0) this.selectedStage = 0;
                } else if (this.stageData && this.stageData.isChapter5) {
                    this.state = 'chapter5_select';
                    this.sound.playBGM('battle');
                    this.selectedStage = (window.STAGES_CHAPTER5 || []).findIndex(s => s.id === this.stageData.id);
                    if (this.selectedStage < 0) this.selectedStage = 0;
                } else {
                    this.state = 'stage_select';
                    this.difficultySelectMode = false;
                    this.sound.playBGM('title');
                }
                this.resultCursor = 0;
            } else if (this.resultCursor === 2 && canContinue) {
                // === コンティニュー ===
                this.saveData.gold -= this.continueCost;
                this.continueUsed = true;
                SaveManager.save(this.saveData);
                this.sound.play('coin');
                // HPを30%回復した状態でバトルに復帰
                this.state = 'battle';
                this.sound.playBGM(this.stageData && this.stageData.isBoss ? 'boss' : (this.currentBattleTrack || 'battle'));
                if (this.battle) {
                    const maxHP = this.battle.playerTankMaxHP || 100;
                    this.battle.playerTankHP = Math.max(1, Math.floor(maxHP * 0.3));
                    this.battle.phase = 'battle';
                    this.battle.enemyDamageFlash = 0;
                }
                // ★バグ修正: コンティニュー後のインベーダー残留防止
                this.invader = null;
                // Bug Fix ③: コンティニュー後のスタン・無敵フラグをリセット
                if (this.player) {
                    this.player.stunned = 0;
                    this.player.invincible = 60; // 1秒の復帰無敵
                    this.player.hp = Math.max(1, Math.floor(this.player.maxHp * 0.3)); // ★バグ修正: hp=0から30%回復して復帰
                    const spawn = this.tank.getSpawnPoint();
                    this.player.x = spawn.x;
                    this.player.y = spawn.y;
                    this.player.vx = 0;
                    this.player.vy = 0;
                }
                this.resultCursor = 0;
            } else {
                // もう一度: 同じステージをリスタート
                // ただし借金王pending中はそちらを優先
                this.newlyUnlocked = [];
                this.newlyUnlockedAlly = null;
                this.newlyUnlockedPart = null;
                this.gachaResult = null;
                if (this._pendingShakkin !== null && this._pendingShakkin !== undefined) {
                    const shakkinIdx = this._pendingShakkin;
                    this._pendingShakkin = null;
                    this.startBattle(shakkinIdx);
                } else {
                    this.startBattle(this.stageIndex);
                }
                this.resultCursor = 0;
            }
        }
    }

    // ===== DRAW =====
    draw() {
        const ctx = this.ctx;
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;

        // Draw Error Screen if global error exists
        if (this.globalError) {
            ctx.fillStyle = 'rgba(50, 0, 0, 0.9)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#FF4444';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('CRITICAL ERROR:', 50, 100);
            ctx.fillStyle = '#FFF';
            ctx.font = '16px monospace';
            ctx.fillText(this.globalError.message, 50, 140);
            ctx.fillStyle = '#AAA';
            ctx.fillText(this.globalError.stack ? this.globalError.stack.split('\n')[0] : '', 50, 170);
            ctx.fillText('Please press [Delete] key to reset save data.', 50, 300);
            return;
        }

        try {
            ctx.clearRect(0, 0, W, H);
            ctx.save();

            // Camera Shake (Enhanced)
            // ストーリー・ダイアログ中はシェイクをスキップ（テキストが読みにくくなるため）
            const noShakeStates = Game.NO_SHAKE_STATES;
            if (this.camera_shake > 0 && !noShakeStates.has(this.state)) {
                // ★パフォーマンス改善: シェイク強度を 0.7 → 0.25 に削減（Androidでの酔い・重さ対策）
                const mag = this.camera_shake * 0.25;
                const dx = (Math.random() - 0.5) * mag;
                const dy = (Math.random() - 0.5) * mag;
                ctx.translate(dx, dy);
            }

            switch (this.state) {
                case 'story':
                    if (this.prevState === 'battle' || this.prevState === 'invasion') {
                        this.drawBattleScene(ctx, W, H);
                    } else {
                        // Background based on context?
                        this.drawTitleScreen(ctx, W, H);
                    }
                    this.story.draw(ctx, W, H);
                    break;
                case 'title':
                    // UI.drawTitle(ctx, W, H, this.frame); // React UI側で描画するためスキップ
                    this.drawTitleScreen(ctx, W, H); // 背景のみ描画
                    this.showLoginBonusPopupIfNeeded(ctx, W, H); // ログインボーナスポップアップ
                    break;
                case 'stage_select':
                    // UI.drawStageSelect(ctx, W, H, this.selectedStage, this.saveData, this.frame, this.difficultySelectMode, this.selectedDifficulty); // React UI側で描画
                    this.drawTitleScreen(ctx, W, H); // 背景のみ
                    break;
                case 'event_select':
                    // UI.drawEventSelect(ctx, W, H, this.selectedStage, this.saveData, this.frame); // 将来的にReact化する場合はここも
                    UI.drawEventSelect(ctx, W, H, this.selectedStage, this.saveData, this.frame);
                    break;
                case 'chapter2_select':
                    UI.drawChapter2Select(ctx, W, H, this.selectedStage, this.saveData, this.frame);
                    break;
                case 'chapter3_select':
                    UI.drawChapter3Select(ctx, W, H, this.selectedStage, this.saveData, this.frame);
                    break;
                case 'chapter4_select':
                    UI.drawChapter4Select(ctx, W, H, this.selectedStage, this.saveData, this.frame);
                    break;
                case 'chapter5_select':
                    UI.drawChapter5Select(ctx, W, H, this.selectedStage, this.saveData, this.frame);
                    break;
                case 'countdown':
                    this.drawBattleScene(ctx, W, H);
                    UI.drawCountdown(ctx, W, H, this.countdownTimer, this.stageData || {});
                    // 配合連鎖ボーナス通知
                    if (this._fusionBonusNotify && this._fusionBonusNotify.timer > 0) {
                        this._fusionBonusNotify.timer--;
                        const alpha = Math.min(1, this._fusionBonusNotify.timer / 20);
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.font = 'bold 22px Arial';
                        ctx.fillStyle = this._fusionBonusNotify.color;
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 3;
                        ctx.textAlign = 'center';
                        ctx.strokeText(this._fusionBonusNotify.label, W / 2, H * 0.75);
                        ctx.fillText(this._fusionBonusNotify.label, W / 2, H * 0.75);
                        ctx.restore();
                    }
                    break;
                case 'dialogue':
                    this.drawBattleScene(ctx, W, H);
                    if (this.stageData?.dialogue) {
                        UI.drawDialogue(ctx, W, H, this.stageData.dialogue, this.dialogueIndex, this.frame);
                    }
                    break;
                case 'battle':
                case 'defense':
                case 'launching': // Use battle scene for launch animation
                    this.drawBattleScene(ctx, W, H);
                    // 必殺技インパクト演出オーバーレイ(デクリメントはupdateBattle()側で管理)
                    if (this.specialImpactTimer > 0) {
                        UI.drawSpecialImpact(ctx, W, H, this.specialImpactTimer, this.frame, this.lastSpecialDamage || 50);
                    }
                    break;
                case 'invasion':
                case 'tank_destruction':
                    this.drawInvasionScene(ctx, W, H);
                    break;
                case 'result':
                    UI.drawResult(ctx, W, H, this.resultWon, this.stageData ? this.stageData.name : '', this.frame, this.battle ? this.battle.battleTimer : 0, this.isNewRecord, this.battleRank);
                    break;
                case 'deck_edit':
                    UI.drawDeckEdit(ctx, W, H, this.saveData.unlockedAmmo, this.saveData.deck, this.deckCursor,
                    5 + (CONFIG.UPGRADES.CAPACITY.CAPACITY_INCREASE[this.saveData.upgrades.capacity || 0] || 0));
                    break;
                case 'ally_edit':
                    UI.drawAllyEdit(ctx, W, H, this.saveData.unlockedAllies, this.saveData.allyDeck, this.deckCursor, this.frame, this.saveData);
                    break;
                case 'upgrade':
                    UI.drawUpgradeMenu(ctx, W, H, this.saveData, this.deckCursor);
                    // ガチャ冒険演出オーバーレイ(デクリメントはupdateUpgrade()側で管理)
                    if (this.gachaAdventureTimer > 0) {
                        UI.drawGachaAdventureAnim(ctx, W, H, this.gachaAdventureRarity, this.gachaAdventureTimer, this.frame);
                    }
                    // 10連一覧
                    if (this.gacha10SummaryActive && this.gacha10AllResults) {
                        UI.drawGacha10Summary(ctx, W, H, this.gacha10AllResults, this.frame);
                    }
                    break;
                case 'daily_missions':
                    UI.drawDailyMissions(ctx, W, H, this.saveData);
                    break;
                case 'collection':
                    UI.drawCollection(ctx, W, H, this.saveData, this.collectionTab);
                    break;
                case 'ending':
                    UI.drawEnding(ctx, W, H, this.frame);
                    break;
                case 'complete_clear':
                    UI.drawCompleteClear(ctx, W, H, this.frame);
                    break;
                case 'fusion':
                    UI.drawFusion(ctx, W, H, this.saveData, this.fusionCursor, this.fusionParents, this.frame, this.fusionErrorMessage, this.fusionTab || 'merge', this.fusionRecipeCursor || 0);
                    if (this.fusionAnimTimer > 0) {
                        // デクリメントはupdateFusion()に移動。draw()では表示のみ
                        UI.drawFusionBirthAnim(ctx, W, H, this.fusionAnimChild, this.fusionAnimTimer, this.frame);
                    } else if (this.gachaResult) {
                        // ★フリーズ修正: fusionAnimTimer=0後にgachaResultがあれば結果画面を表示
                        // （スカウト画面と同じ _drawGachaResult を流用）
                        UI._drawGachaResult(ctx, W, H, this.gachaResult);
                    }
                    break;
                case 'settings':
                    // UI.drawSettings(ctx, W, H, this.saveData, this.settingsCursor, this.frame); // React UI側で描画
                    this.drawTitleScreen(ctx, W, H); // 背景のみ
                    break;
                case 'customize':
                    if (UI.drawCustomize) UI.drawCustomize(ctx, W, H, this.saveData, this.customizeCursor, this.frame);
                    break;
            }

            // Pause Overlay
            if (this.paused && Game.BATTLE_STATES.has(this.state)) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
                ctx.fillRect(0, 0, W, H);

                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 44px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('⏸ ポーズ', W / 2, 70);

                const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                ctx.font = '18px Arial';
                ctx.fillStyle = '#CCC';
                ctx.fillText(isTouch ? 'ポーズボタン: 再開' : 'P / ESC: 再開', W / 2, 108);
                ctx.fillText(isTouch ? '↺ ステージを最初から' : 'R: ステージをやり直す', W / 2, 132);

                // === 仲間情報パネル ===
                if (this.allies && this.allies.length > 0) {
                    const panelX = 20, panelY = 160;
                    const panelW = W - 40;
                    ctx.fillStyle = 'rgba(20,30,60,0.9)';
                    Renderer._roundRect(ctx, panelX, panelY, panelW, Math.min(this.allies.length * 80 + 30, 340), 12);
                    ctx.fill();
                    ctx.strokeStyle = '#5BA3E6';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.font = 'bold 16px Arial';
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'left';
                    ctx.fillText('🐾 仲間ステータス', panelX + 15, panelY + 22);

                    this.allies.slice(0, 4).forEach((ally, i) => {
                        const ay = panelY + 44 + i * 72;
                        const rarityStars = '★'.repeat(ally.rarity || 1);
                        const rarityColors = ['#9E9E9E','#9E9E9E','#4CAF50','#9C27B0','#FFD700','#FF4444','#E040FB'];
                        const rCol = rarityColors[Math.min((ally.rarity||1)-1, 6)];

                        // 仲間アイコン（小）★バグ修正㉘: 2段階フォールバック
                        ctx.save();
                        (() => {
                            const _t = ally.type || 'slime';
                            const _toFn = t => 'draw' + t.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                            const _fn1 = Renderer[_toFn(_t)];
                            if (_fn1 && typeof _fn1 === 'function' && _fn1 !== Renderer.drawSlime) {
                                // ★引数順: (ctx, x, y, w, h, color, dir, frame) - darkColorは渡さない
                                _fn1.call(Renderer, ctx, panelX + 15, ay - 10, 35, 35, ally.color, 1, 0);
                                return;
                            }
                            const _base = _t.includes('_') ? _t.split('_')[0] : _t;
                            const _fn2 = Renderer[_toFn(_base)];
                            if (_fn2 && typeof _fn2 === 'function' && _fn2 !== Renderer.drawSlime) {
                                // ★引数順: (ctx, x, y, w, h, color, dir, frame) - darkColorは渡さない
                                _fn2.call(Renderer, ctx, panelX + 15, ay - 10, 35, 35, ally.color, 1, 0);
                                return;
                            }
                            // drawSlimeのみ darkColor を正しく渡す
                            Renderer.drawSlime(ctx, panelX + 15, ay - 10, 35, 35, ally.color, ally.darkColor||'#333', 1, 0, 0, _base);
                        })();
                        ctx.restore();

                        // 名前・レア度
                        ctx.font = 'bold 15px Arial';
                        ctx.fillStyle = '#FFF';
                        ctx.textAlign = 'left';
                        ctx.fillText(ally.name, panelX + 60, ay + 4);
                        ctx.font = '13px Arial';
                        ctx.fillStyle = rCol;
                        ctx.fillText(rarityStars, panelX + 60, ay + 20);

                        // Lv・EXP・攻撃力
                        ctx.font = '13px Arial';
                        ctx.fillStyle = '#4FC3F7';
                        ctx.fillText(`Lv.${ally.level||1}`, panelX + 150, ay + 4);
                        ctx.fillStyle = '#AAA';
                        const expCurrent = ally.exp || 0;
                        const expNext = ally._calcExpToNextLevel ? ally._calcExpToNextLevel(ally.level||1) : 100;
                        const expPct = Math.floor((expCurrent / expNext) * 100);
                        ctx.fillText(`EXP ${expCurrent}/${expNext} (${expPct}%)`, panelX + 190, ay + 4);

                        // EXPバー
                        const barX = panelX + 190, barY = ay + 10, barW = 160, barH = 7;
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        Renderer._roundRect(ctx, barX, barY, barW, barH, 3);
                        ctx.fill();
                        ctx.fillStyle = '#FFD700';
                        Renderer._roundRect(ctx, barX, barY, barW * Math.min(1, expCurrent / expNext), barH, 3);
                        ctx.fill();

                        // 攻撃力
                        ctx.font = '12px Arial';
                        ctx.fillStyle = '#FF8A65';
                        ctx.fillText(`攻撃 ${ally.damage}`, panelX + 370, ay + 4);
                    });
                }

                ctx.font = '14px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('音量: +/-  ·  FPS: F', W / 2, H - 20);
            }

            // FPS Display
            if (this.showFPS) {
                const now = performance.now();
                const delta = now - this.lastFrameTime;
                this.lastFrameTime = now;
                const fps = Math.round(1000 / delta);

                this.fpsHistory.push(fps);
                if (this.fpsHistory.length > 60) this.fpsHistory.shift();
                const avgFPS = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(10, 10, 120, 60);
                ctx.fillStyle = fps < 50 ? '#F44336' : '#4CAF50';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(`FPS: ${fps}`, 20, 30);
                ctx.fillText(`AVG: ${avgFPS}`, 20, 50);
            }

            ctx.restore(); // Always restore after camera shake

        } catch (e) {
            console.error('Draw Error:', e);
            // ★バグ修正: ctx.save() 後に例外が発生した場合、restore() が呼ばれないまま
            // 変換行列が蓄積し続けてクラッシュするのを防ぐ。
            // restore() 自体が失敗しても握りつぶして次フレームに備える。
            try { ctx.restore(); } catch (_) {}
        }
    }

    updateFusion() {
        // ★配合演出中(fusionAnimTimer > 0): Zキー/Spaceでスキップ可能
        if (this.fusionAnimTimer > 0) {
            this.fusionAnimTimer--;
            if (this.input.menuConfirm || this.input.back) {
                this.fusionAnimTimer = 0; // スキップ
            }
            return; // 演出中は他の入力を受け付けない
        }

        // 配合結果表示中はgachaResultを表示し、確定/キャンセルで閉じる
        if (this.gachaResult) {
            if (this.input.menuConfirm || this.input.back) {
                this.gachaResult = null;
                this.fusionParents = [];
                this.sound.play('select');
            }
            return;
        }

        const allies = this.saveData.unlockedAllies || [];

        // レシピタブの初期化
        if (this.fusionTab === undefined) this.fusionTab = 'merge';
        if (this.fusionRecipeCursor === undefined) this.fusionRecipeCursor = 0;

        // Update error message timer
        if (this.fusionErrorTimer > 0) {
            this.fusionErrorTimer--;
            if (this.fusionErrorTimer === 0) {
                this.fusionErrorMessage = null;
            }
        }

        // Back to title
        if (this.input.back) {
            this.sound.play('select');
            this.state = 'title';
            return;
        }

        // タブ切り替え (Qキー or Tab)
        if (this.input.pressed('KeyQ') || this.input.pressed('Tab')) {
            this.fusionTab = (this.fusionTab === 'merge') ? 'recipe' : 'merge';
            this.sound.play('cursor');
            return;
        }

        // === レシピ図鑑タブ ===
        if (this.fusionTab === 'recipe') {
            const recipeCount = window.FUSION_RECIPES ? window.FUSION_RECIPES.length : 0;
            if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
                this.fusionRecipeCursor = (this.fusionRecipeCursor - 1 + recipeCount) % recipeCount;
                this.sound.play('cursor');
            }
            if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
                this.fusionRecipeCursor = (this.fusionRecipeCursor + 1) % recipeCount;
                this.sound.play('cursor');
            }
            return;
        }

        // === 配合タブ ===
        // 仲間が0人の場合はカーソル操作不可（NaN防止）
        if (allies.length === 0) {
            this.fusionErrorMessage = '仲間がいません！スカウトで仲間を増やそう';
            this.fusionErrorTimer = 120;
            return;
        }
        // カーソルを有効範囲内に補正
        if (this.fusionCursor >= allies.length) this.fusionCursor = allies.length - 1;
        if (this.fusionCursor < 0) this.fusionCursor = 0;

        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.fusionCursor = (this.fusionCursor - 1 + allies.length) % allies.length;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.fusionCursor = (this.fusionCursor + 1) % allies.length;
            this.sound.play('cursor');
        }

        if (this.input.menuConfirm) {
            const selected = allies[this.fusionCursor];
            if (!selected) return;

            // Cannot select the same ally twice (ID-based check)
            if (this.fusionParents.length === 1 && this.fusionParents[0].id === selected.id) {
                this.sound.play('damage'); // ★バグ修正: 'error'は存在しないサウンドID
                this.fusionErrorMessage = '同じ仲間は選択できません！';
                this.fusionErrorTimer = 120; // 2秒間表示
                return;
            }

            this.fusionParents.push(selected);
            this.sound.play('confirm');

            if (this.fusionParents.length === 2) {
                this.executeFusion();
            }
        }

        // === 機能1: 不要キャラ削除 (Deleteキー or Backspace) ===
        if (this.input.pressed('Delete') || this.input.pressed('Backspace')) {
            if (this.fusionTab === 'merge') {
                const selected = allies[this.fusionCursor];
                if (!selected) return;
                // 最後の1体は削除不可
                if (allies.length <= 1) {
                    this.fusionErrorMessage = '最後の仲間は削除できません！';
                    this.fusionErrorTimer = 120;
                    this.sound.play('damage');
                    return;
                }
                // デッキにいる場合はデッキからも除去
                if (this.saveData.allyDeck) {
                    this.saveData.allyDeck = this.saveData.allyDeck.filter(id => id !== selected.id);
                }
                this.saveData.unlockedAllies = this.saveData.unlockedAllies.filter(a => a.id !== selected.id);
                // fusionParentsからも除去
                this.fusionParents = this.fusionParents.filter(p => p.id !== selected.id);
                // カーソル補正
                if (this.fusionCursor >= this.saveData.unlockedAllies.length) {
                    this.fusionCursor = Math.max(0, this.saveData.unlockedAllies.length - 1);
                }
                SaveManager.save(this.saveData);
                this.fusionErrorMessage = `${selected.name} を解放しました`;
                this.fusionErrorTimer = 90;
                this.sound.play('cancel');
            }
        }
    }

    executeFusion() {
        const [p1, p2] = this.fusionParents;
        if (!p1 || !p2) { this.fusionParents = []; return; }

        // ══ FUSION_RECIPES から一致レシピを検索（config.jsと完全同期）══
        const recipes = window.FUSION_RECIPES || [];
        const recipe = recipes.find(r =>
            (r.p1.type === p1.type && r.p2.type === p2.type) ||
            (r.p1.type === p2.type && r.p2.type === p1.type)
        );

        // 共通後処理: child オブジェクトを整形してセーブ・演出起動
        const _finishFusion = (child, isLimitBreak = false) => {
            // allyDeckとunlockedAlliesから素材2体を除去
            this.fusionParents = [];
            this.saveData.allyDeck = (this.saveData.allyDeck || []).filter(id => id !== p1.id && id !== p2.id);
            this.saveData.unlockedAllies = this.saveData.unlockedAllies.filter(a => a !== p1 && a !== p2);

            // 既存の同タイプがいたらレベルアップ
            const existing = this.saveData.unlockedAllies.find(a => a.type === child.type);
            const TITAN_DRAGON_TYPES = new Set(['titan_golem', 'dragon_lord', 'platinum_golem']);
            let resultAlly;
            if (existing) {
                // タイタン/ドラゴン/プラチナはLv10以降もリミットブレイクで成長できる（上限なし）
                // その他はLv10上限
                existing.level = TITAN_DRAGON_TYPES.has(existing.type)
                    ? (existing.level || 1) + 1
                    : Math.min(10, (existing.level || 1) + 1);
                existing.isFusion = true;
                existing.chainDepth = Math.max(existing.chainDepth || 0, child.chainDepth || 1);
                existing.fusionDmgBonus = Math.max(existing.fusionDmgBonus || 1, child.fusionDmgBonus || 1.10);
                resultAlly = { ...existing, isLimitBreak: true };
                this.sound.play('powerup');
            } else {
                this.saveData.unlockedAllies.push(child);
                SaveManager.addAllyToCollection(this.saveData, child.type);
                resultAlly = child;
                this.sound.play('victory');
            }

            SaveManager.save(this.saveData); // セーブは1回だけ

            const color = child.color || '#FFD700';
            for (let i = 0; i < 5; i++) {
                this.particles.explosion(
                    CONFIG.CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 150,
                    CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 150,
                    color, 15
                );
            }
            this.gachaResult = resultAlly;
            this.fusionAnimTimer = 50;
            this.fusionAnimChild = resultAlly;
            this.camera_shake = 12;
        };

        if (recipe) {
            // ══ レシピ一致: FUSION_RECIPES のデータから child を生成 ══
            const r = recipe.child;
            const rarity = (CONFIG.ALLY_TYPE_RARITY && CONFIG.ALLY_TYPE_RARITY[r.type]) || 3;
            const parentDepth = Math.max(p1.chainDepth || 0, p2.chainDepth || 0);
            const chainDepth = parentDepth + 1;
            const fusionDmgBonus = chainDepth >= 3 ? 1.40 : (chainDepth === 2 ? 1.25 : 1.10);
            const LARGE_TYPES = new Set(['titan_golem', 'platinum_golem', 'dragon_lord']);
            const GOD_TYPES = new Set(['god_king']);

            const TITAN_DRAGON = new Set(['titan_golem', 'dragon_lord', 'platinum_golem', 'god_king']);
            const child = {
                id: r.type + '_' + Date.now(),
                name: r.name,
                type: r.type,
                color: r.color || '#4CAF50',
                darkColor: r.darkColor || '#2E7D32',
                rarity,
                // タイタン/ドラゴン/プラチナはLv10スタート。リミットブレイクでさらに上へ。
                // その他の配合産はLv5スタート。
                level: TITAN_DRAGON.has(r.type) ? 10 : 5,
                isFusion: true,
                chainDepth,
                fusionDmgBonus,
                cost: GOD_TYPES.has(r.type) ? 3 : (LARGE_TYPES.has(r.type) ? 2 : 1),
            };

            _finishFusion(child);

        } else {
            // ══ レシピ未一致: p1を継承してレベルアップ（フォールバック）══
            const parent = p1;
            const parentDepth = Math.max(p1.chainDepth || 0, p2.chainDepth || 0);
            // ★バグ修正: child.type === p1.type のため、_finishFusion内でp1除去後に
            // 「既存の同タイプ」として誤マッチする問題を回避するため、
            // p1/p2除去後にまだ残っている同タイプを先に確認してレベルを決定する。
            const remainingAfterRemove = this.saveData.unlockedAllies.filter(a => a !== p1 && a !== p2);
            const alreadyExisting = remainingAfterRemove.find(a => a.type === parent.type);
            const startLevel = alreadyExisting
                ? (alreadyExisting.level || 1) + 1  // 既存がいれば+1
                : (parent.level || 1) + 1;           // いなければ親のlevel+1
            const child = {
                id: parent.type + '_' + Date.now(),
                name: parent.name,
                type: parent.type,
                color: parent.color,
                darkColor: parent.darkColor,
                rarity: parent.rarity || 1,
                level: startLevel,
                isFusion: true,
                chainDepth: parentDepth + 1,
                fusionDmgBonus: 1.10,
                cost: parent.cost || 1,
            };
            _finishFusion(child, true);
        }
    }


    // ===== 欠落メソッド補完 =====

    // Bug Fix: updateEnding was called but never defined
    updateEnding() {
        // エンディングは一定フレーム後にSPACE/Z/タップで complete_clear へ
        if (this.frame > 400 && (this.input.menuConfirm || this.input.back)) {
            this.sound.play('confirm');
            this.state = 'complete_clear';
        }
    }

    // Bug Fix: updateSettings was called but never defined
    updateSettings() {
        const NUM_ITEMS = 4; // 音量, 書き出し, 読み込み, 戻る

        // ▲▼ カーソル移動
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.settingsCursor = (this.settingsCursor - 1 + NUM_ITEMS) % NUM_ITEMS;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.settingsCursor = (this.settingsCursor + 1) % NUM_ITEMS;
            this.sound.play('cursor');
        }

        // 音量スライダー: ◀ ▶ で調整（settingsCursor === 0 の時）
        if (this.settingsCursor === 0) {
            if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
                this.saveData.settings.vol = Math.max(0, Math.round((this.sound.vol - 0.1) * 10) / 10);
                this.sound.vol = this.saveData.settings.vol;
                SaveManager.save(this.saveData);
                this.sound.play('cursor');
            }
            if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
                this.saveData.settings.vol = Math.min(1, Math.round((this.sound.vol + 0.1) * 10) / 10);
                this.sound.vol = this.saveData.settings.vol;
                SaveManager.save(this.saveData);
                this.sound.play('cursor');
            }
        }

        // 決定
        if (this.input.menuConfirm) {
            this.sound.play('confirm');
            switch (this.settingsCursor) {
                case 0: // 音量 — 決定キーでも少し上げる
                    break;
                case 1: // セーブデータ書き出し
                    if (SaveManager.exportData(this.saveData)) {
                        // ★バグ修正: particles が未初期化の場合クラッシュしないよう guard
                        if (this.particles) this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '書き出し完了！', '#4CAF50');
                    }
                    break;
                case 2: // セーブデータ読み込み
                    SaveManager.importData(
                        () => {
                            this.sound.play('powerup');
                            if (window.confirm('セーブデータを読み込みました。ページをリロードします。')) {
                                location.reload();
                            }
                        },
                        (msg) => {
                            this.sound.play('damage');
                            // ★バグ修正: particles が未初期化の場合クラッシュしないよう guard
                            if (this.particles) this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '読み込み失敗: ' + msg, '#FF5252');
                        }
                    );
                    break;
                case 3: // 戻る
                    this.state = 'title';
                    this.sound.playBGM('title');
                    break;
            }
        }

        // B で戻る
        if (this.input.back) {
            this.sound.play('select');
            this.state = 'title';
            this.sound.playBGM('title');
        }
    }

    updateCustomize() {
        if (!this.customizeCursor) this.customizeCursor = { tab: 0, item: 0 };
        const cur = this.customizeCursor;
        const parts = window.TANK_PARTS;
        if (!parts) return;

        // tab: 0=戦車スキン, 1=スライムスキン（帽子）
        const TAB_COUNT = 2;
        // Q/E or ←→ でタブ切替
        if (this.input.pressed('KeyQ') || this.input.pressed('KeyE')) {
            cur.tab = (cur.tab + 1) % TAB_COUNT;
            cur.item = 0;
            this.sound.play('cursor');
        }

        const skinList = cur.tab === 0
            ? (parts.skins || [])
            : (parts.playerSkins || []);
        const maxItem = Math.max(0, skinList.length - 1);

        // ▲▼ スキン選択
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            cur.item = Math.max(0, cur.item - 1);
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            cur.item = Math.min(maxItem, cur.item + 1);
            this.sound.play('cursor');
        }

        // Z / Enter で装備
        if (this.input.menuConfirm) {
            const skin = skinList[cur.item];
            if (skin) {
                const unlocked = this.saveData.unlockedParts || [];
                if (skin.isDefault || unlocked.includes(skin.id)) {
                    if (!this.saveData.tankCustom) this.saveData.tankCustom = {};
                    if (cur.tab === 0) {
                        this.saveData.tankCustom.skin = skin.id;
                    } else {
                        this.saveData.tankCustom.playerSkin = skin.id;
                    }
                    SaveManager.save(this.saveData);
                    this.sound.play('confirm');
                    if (this.particles) this.particles.rateEffect(
                        CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 60, '装備！', '#FFD700');
                } else {
                    this.sound.play('select');
                }
            }
        }

        // B で戻る
        if (this.input.back) {
            this.sound.play('select');
            this.state = this.returnState || 'title';
        }
    }

    // Bug Fix: _processTap was called but never defined
    // タッチタップ座標をメニューのヒット領域と突き合わせてカーソル移動・決定を行う
    _processTap(pos) {
        if (!pos || !window._menuHitRegions) return;
        const { x, y } = pos;

        for (const region of window._menuHitRegions) {
            // stage type needs scroll offset applied
            // ★バグ修正: allyItem も _allyScrollY を反映しないとスクロール時にタップ判定がズレる
            const scrollOffset = (region.type === 'stage' || region.type === 'stageSelectItem')
                ? (window._stageSelectScrollY || 0)
                : (region.type === 'allyItem')
                ? (window._allyScrollY || 0)
                : (region.type === 'ch2Stage')
                ? (window._ch2SelectScrollY || 0)
                : (region.type === 'ch3Stage')
                ? (window._ch3SelectScrollY || 0)
                : (region.type === 'ch4Stage')
                ? (window._ch4SelectScrollY || 0)
                : (region.type === 'ch5Stage')
                ? (window._ch5SelectScrollY || 0)
                : 0;
            const ry = region.y + scrollOffset;
            if (x >= region.x && x <= region.x + region.w &&
                y >= ry && y <= ry + region.h) {

                switch (region.type) {
                    case 'titleMenu':
                    case 'menuItem':
                    case 'stageItem':
                    case 'shopItem':
                    case 'allyItem':
                    case 'ammoItem':
                    case 'deckItem':
                    case 'settingsItem': {
                        const idx = region.index;
                        if (this.settingsCursor !== undefined && this.state === 'settings') {
                            if (idx === this.settingsCursor) {
                                // 同じ行をタップ → 決定
                                this.input.keys['Space'] = true;
                                setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                            } else {
                                this.settingsCursor = idx;
                                this.sound.play('cursor');
                            }
                        } else if (this.state === 'title') {
                            if (idx === this.titleCursor) {
                                this.input.keys['Space'] = true;
                                setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                            } else {
                                this.titleCursor = idx;
                                this.sound.play('cursor');
                            }
                        } else if (this.state === 'upgrade') {
                            if (idx === this.deckCursor) {
                                this.input.keys['Space'] = true;
                                setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                            } else {
                                this.deckCursor = idx;
                                this.sound.play('cursor');
                            }
                        } else if (this.state === 'deck_edit') {
                            // ★バグ修正: ally_edit と同様に1タップで即選択トグル
                            this.deckCursor = idx;
                            this.sound.play('cursor');
                            setTimeout(() => {
                                this.input.keys['KeyZ'] = true;
                                setTimeout(() => { this.input.keys['KeyZ'] = false; }, 80);
                            }, 0);
                        } else if (this.state === 'ally_edit') {
                            // ★バグ修正: 2タップ方式を廃止し、タップ1回で即カーソル移動＋選択トグルを実行。
                            // resultItem と同様に setTimeout(0) で次フレームに KeyZ を立てることで
                            // tick() による prev 更新との競合を回避する。
                            this.deckCursor = idx;
                            this.sound.play('cursor');
                            setTimeout(() => {
                                this.input.keys['KeyZ'] = true;
                                setTimeout(() => { this.input.keys['KeyZ'] = false; }, 80);
                            }, 0);
                        } else if (this.state === 'fusion') {
                            if (idx === this.fusionCursor) {
                                this.input.keys['Space'] = true;
                                setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                            } else {
                                this.fusionCursor = idx;
                                this.sound.play('cursor');
                            }
                        } else if (this.state === 'customize') {
                            if (!this.customizeCursor) this.customizeCursor = { tab: 0, item: 0 };
                            if (idx === this.customizeCursor.item) {
                                this.input.keys['KeyZ'] = true;
                                setTimeout(() => { this.input.keys['KeyZ'] = false; }, 80);
                            } else {
                                this.customizeCursor.item = idx;
                                this.sound.play('cursor');
                            }
                        }
                        break;
                    }
                    case 'stage':
                    case 'stageSelectItem': {
                        const idx = region.index;
                        if (idx === this.selectedStage) {
                            this.input.keys['Space'] = true;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        } else {
                            this.selectedStage = idx;
                            this.sound.play('cursor');
                        }
                        break;
                    }
                    case 'ch2Stage': {
                        const idx = region.index;
                        const ch2Stages = window.STAGES_CHAPTER2 || [];
                        const prevS = ch2Stages[idx - 1];
                        const isLockedTap = idx > 0 && prevS && !this.saveData.clearedStages.includes(prevS.id);
                        if (isLockedTap) {
                            this.sound.play('damage');
                        } else if (idx === this.selectedStage) {
                            this.input.keys['Space'] = true;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        } else {
                            this.selectedStage = idx;
                            this.sound.play('cursor');
                        }
                        break;
                    }
                    case 'ch3Stage': {
                        const idx = region.index;
                        const ch3Stages = window.STAGES_CHAPTER3 || [];
                        const prevS = ch3Stages[idx - 1];
                        const isLockedTap = idx > 0 && prevS && !this.saveData.clearedStages.includes(prevS.id);
                        if (isLockedTap) {
                            this.sound.play('damage');
                        } else if (idx === this.selectedStage) {
                            this.input.keys['Space'] = true;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        } else {
                            this.selectedStage = idx;
                            this.sound.play('cursor');
                        }
                        break;
                    }
                    case 'ch4Stage': {
                        const idx = region.index;
                        const ch4Stages = window.STAGES_CHAPTER4 || [];
                        const prevS = ch4Stages[idx - 1];
                        const isLockedTap = idx > 0 && prevS && !this.saveData.clearedStages.includes(prevS.id);
                        if (isLockedTap) {
                            this.sound.play('damage');
                        } else if (idx === this.selectedStage) {
                            this.input.keys['Space'] = true;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        } else {
                            this.selectedStage = idx;
                            this.sound.play('cursor');
                        }
                        break;
                    }
                    case 'ch5Stage': {
                        const idx = region.index;
                        const ch5Stages = window.STAGES_CHAPTER5 || [];
                        const prevS = ch5Stages[idx - 1];
                        const isLockedTap = idx > 0 && prevS && !this.saveData.clearedStages.includes(prevS.id);
                        if (isLockedTap) {
                            this.sound.play('damage');
                        } else if (idx === this.selectedStage) {
                            this.input.keys['Space'] = true;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        } else {
                            this.selectedStage = idx;
                            this.sound.play('cursor');
                        }
                        break;
                    }
                    case 'resultItem': {
                        const idx = region.index;
                        // ★バグ修正⑤: コンティニューボタンが2回タップ必要だった問題を修正
                        // 旧コード: 未選択なら cursor 移動のみ → 選択済みなら confirm
                        // 新コード: タップ時点で cursor を設定し、即 confirm を発火する（1タップで動作）
                        this.resultCursor = idx;
                        this.sound.play('cursor');
                        // 同フレーム内で confirm を実行するため、次フレームへのキュー投入ではなく
                        // setTimeout(0) で confirm キーを立てる（input.menuConfirm が依存する Space）
                        setTimeout(() => {
                            this.input.keys['Space'] = true;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        }, 0);
                        break;
                    }
                    case 'deckBtn':
                        this.sound.play('confirm');
                        if (region.action === 'back') {
                            this.input.keys['KeyB'] = true;
                            this.input.prev['KeyB'] = false;
                            setTimeout(() => { this.input.keys['KeyB'] = false; }, 80);
                        } else if (region.action === 'battle') {
                            this.input.keys['KeyX'] = true;
                            this.input.prev['KeyX'] = false;
                            setTimeout(() => { this.input.keys['KeyX'] = false; }, 80);
                        } else if (region.action === 'next') {
                            this.input.keys['Space'] = true;
                            this.input.prev['Space'] = false;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        }
                        return;

                    case 'allyNavBtn':
                        // 仲間編成画面のナビボタン
                        this.sound.play('confirm');
                        if (region.action === 'back') {
                            this.input.keys['KeyB'] = true;
                            this.input.prev['KeyB'] = false;
                            setTimeout(() => { this.input.keys['KeyB'] = false; }, 80);
                        } else if (region.action === 'battle') {
                            this.input.keys['Space'] = true;
                            this.input.prev['Space'] = false;
                            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                        }
                        return;

                    case 'customizeTab':
                        // カスタマイズ画面のタブ切替
                        if (!this.customizeCursor) this.customizeCursor = { tab: 0, item: 0 };
                        if (region.index !== this.customizeCursor.tab) {
                            this.customizeCursor.tab = region.index;
                            this.customizeCursor.item = 0;
                            this.sound.play('cursor');
                        }
                        return;

                    case 'customizeSkinItem': {
                        // カスタマイズ画面のスキンアイテムをタップ
                        if (!this.customizeCursor) this.customizeCursor = { tab: 0, item: 0 };
                        const cur = this.customizeCursor;
                        const parts = window.TANK_PARTS;
                        if (!parts) return;
                        const skinList = cur.tab === 0 ? (parts.skins || []) : (parts.playerSkins || []);
                        if (cur.item === region.index) {
                            // 2回タップで装備
                            const skin = skinList[region.index];
                            if (skin) {
                                const unlocked = this.saveData.unlockedParts || [];
                                if (skin.isDefault || unlocked.includes(skin.id)) {
                                    if (!this.saveData.tankCustom) this.saveData.tankCustom = {};
                                    if (cur.tab === 0) this.saveData.tankCustom.skin = skin.id;
                                    else this.saveData.tankCustom.playerSkin = skin.id;
                                    SaveManager.save(this.saveData);
                                    this.sound.play('confirm');
                                    if (this.particles) this.particles.rateEffect(CONFIG.CANVAS_WIDTH/2, CONFIG.CANVAS_HEIGHT/2-60, '装備！', '#FFD700');
                                } else { this.sound.play('select'); }
                            }
                        } else {
                            cur.item = region.index;
                            this.sound.play('cursor');
                        }
                        return;
                    }
                }
                return; // 最初にヒットした領域だけ処理
            }
        }
    }

    // Bug Fix: drawTitleScreen was called but never defined
    drawTitleScreen(ctx, W, H) {
        UI.drawTitle(ctx, W, H, this.frame);
    }

    // Bug Fix: drawBattleScene was called but never defined
    drawBattleScene(ctx, W, H) {
        // 背景描画（雲アニメのためキャッシュ不可、内部で山/空はキャッシュ済み）
        Renderer.drawSplitBackground(ctx, W, H, this.stageData || {});

        // 上画面（敵戦車・砲弾など）を毎フレーム描画
        // ★バグ修正: frame%2 の間引き描画を廃止。戦車アニメが30fpsになりちかちかしていた
        if (this.battle) {
            Renderer.drawUpperBattle(ctx, W, H, this.battle, this.state);
        }
        if (this.tank) this.tank.draw(ctx);
        if (this.allies) for (const ally of this.allies) ally.draw(ctx);
        if (this.player) this.player.draw(ctx);
        if (this.ammoDropper) this.ammoDropper.draw(ctx);
        if (this.powerupManager) this.powerupManager.draw(ctx);
        if (this.invader && this.invader.hp > 0) this.invader.draw(ctx);
        if (this.projectiles) {
            for (const p of this.projectiles) {
                if (p.active) Renderer.drawProjectile(ctx, p.x, p.y, p.type || 'rock', p.dir || 1);
            }
        }
        this.particles.draw(ctx);
        // ★必殺技カットインを上画面のみに制限
        const upperH = CONFIG.TANK.OFFSET_Y; // 上画面の高さ（420px）
        if (this.specialAnimTimer > 0 || this.titanSpecialAnimTimer > 0 || this.dragonSpecialAnimTimer > 0 || this.platinumSpecialAnimTimer > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, W, upperH);
            ctx.clip();
            if (this.specialAnimTimer > 0) Renderer.drawSpecialCutin(ctx, W, upperH, this.specialAnimTimer);
            if (this.titanSpecialAnimTimer > 0) Renderer.drawTitanSpecialCutin(ctx, W, upperH, this.titanSpecialAnimTimer);
            if (this.dragonSpecialAnimTimer > 0) Renderer.drawDragonSpecialCutin(ctx, W, upperH, this.dragonSpecialAnimTimer);
            if (this.platinumSpecialAnimTimer > 0) Renderer.drawPlatinumSpecialCutin(ctx, W, upperH, this.platinumSpecialAnimTimer);
            ctx.restore();
        }
        // 初回インベージョン説明オーバーレイ
        if (this.invasionTutorialTimer > 0 && (this.state === 'invasion' || this.state === 'launching')) {
            UI.drawInvasionTutorial(ctx, W, H, this.invasionTutorialTimer);
        }
        if (this.battle) {
            UI.drawHUD(ctx, this.battle, this.stageData || {});
        }
        if (this.screenFlash > 0) {
            ctx.save();
            // screenFlashTypeで色を変える: 'hit'=赤（被弾）, それ以外=白（命中・必殺技）
            const flashColor = this.screenFlashType === 'hit'
                ? `rgba(255,60,60,${this.screenFlash * 0.05})`
                : `rgba(255,255,255,${this.screenFlash * 0.04})`;
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // ★スマホUI: バトルコンテキストをタッチコントローラに通知（ボタンラベル動的更新）
        if (this.touch && this.touch.mode === 'battle') {
            const nearCannon = this.player ? this.player.getNearCannon(this.tank ? this.tank.cannons : []) : null;
            // ★バグ修正: 仲間必殺技ゲージMAXをコンテキストに追加（Cボタンに表示するため）
            const _maxG = this.MAX_ALLY_SPECIAL_GAUGE || 3600;
            const _allySpecialReady = !!(this.allies && this.allies.some(a =>
                !a.isDead && !a.isStacked && (
                    (a.type === 'titan_golem'    && this.titanSpecialGauge    >= _maxG) ||
                    (a.type === 'dragon_lord'    && this.dragonSpecialGauge   >= _maxG) ||
                    (a.type === 'platinum_golem' && this.platinumSpecialGauge >= _maxG)
                )
            ));
            this.touch.updateBattleContext({
                holdingItem:       this.player && this.player.heldItems.length > 0,
                holdingAlly:       this.player && !!this.player.stackedAlly,
                nearCannon:        !!nearCannon,
                invasionAvailable: this.battle && this.battle.invasionAvailable,
                specialReady:      this.battle && this.battle.specialGauge >= this.battle.maxSpecialGauge,
                allySpecialReady:  _allySpecialReady,
                repairKits:        (this.saveData && this.saveData.repairKits) || 0,
            });
        }
    }

    // Bug Fix: drawInvasionScene was called but never defined
    drawInvasionScene(ctx, W, H) {
        Renderer.drawSplitBackground(ctx, W, H, this.stageData || {});
        if (this.tank) this.tank.draw(ctx);
        if (this.allies) for (const ally of this.allies) ally.draw(ctx);
        if (this.player) this.player.draw(ctx);
        if (this.ammoDropper) this.ammoDropper.draw(ctx);
        this.particles.draw(ctx);
        if (this.battle) UI.drawHUD(ctx, this.battle, this.stageData || {});
        // スイッチ近接ヒント表示
        if (this.player && this.tank && this.tank.switches) {
            for (const s of this.tank.switches) {
                if (s.activated) continue;
                const dx = this.player.x + 12 - (s.x + 15);
                const dy = this.player.y + 14 - (s.y + 15);
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 80) {
                    ctx.save();
                    ctx.font = 'bold 14px Arial';
                    ctx.fillStyle = '#FFD700';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    ctx.textAlign = 'center';
                    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                    const hint = isTouch ? 'Zボタン: レバー操作' : 'Z: レバー操作';
                    ctx.strokeText(hint, s.x + 15, s.y - 10);
                    ctx.fillText(hint, s.x + 15, s.y - 10);
                    ctx.restore();
                }
            }
        }
        if (this.screenFlash > 0) {
            ctx.save();
            // screenFlashTypeで色を変える: 'hit'=赤（被弾）, それ以外=白（命中・必殺技）
            const flashColor = this.screenFlashType === 'hit'
                ? `rgba(255,60,60,${this.screenFlash * 0.05})`
                : `rgba(255,255,255,${this.screenFlash * 0.04})`;
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
    }

    // ============================================================
    // 第2章 ヘルパー・ステート
    // ============================================================
    _enterChapter2Select() {
        this.state = 'chapter2_select';
        this.selectedStage = 0;
        this.sound.playBGM('shop'); // ★第2章選択画面BGM（落ち着いたBGM）
        // 初回進入時にイントロストーリーを再生
        if (!this.saveData.seenStories) this.saveData.seenStories = [];
        if (!this.saveData.seenStories.includes('chapter2_intro')) {
            this.saveData.seenStories.push('chapter2_intro');
            SaveManager.save(this.saveData);
            this.story.start('chapter2_intro', () => { this.state = 'chapter2_select'; }); // ★バグ修正: 空コールバックだとstory state固まる
            this.prevState = 'chapter2_select';
            this.state = 'story';
        }
    }

    updateChapter2Select() {
        const ch2Stages = window.STAGES_CHAPTER2 || [];

        // ★ステージロック判定: ステージiは(i-1)がクリア済みのときのみ選択可
        const _ch2IsUnlocked = (i) => {
            if (i === 0) return true;
            const prev = ch2Stages[i - 1];
            return prev && this.saveData.clearedStages.includes(prev.id);
        };

        // maxUnlocked: 解放されている最大インデックス
        let maxUnlocked = 0;
        for (let i = 0; i < ch2Stages.length; i++) {
            if (_ch2IsUnlocked(i)) maxUnlocked = i;
        }

        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW') ||
            this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
            if (this.selectedStage > 0) { this.selectedStage--; this.sound.play('cursor'); }
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS') ||
            this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
            if (this.selectedStage < maxUnlocked) { this.selectedStage++; this.sound.play('cursor'); }
        }
        if (this.input.menuConfirm) {
            const stage = ch2Stages[this.selectedStage];
            if (stage && _ch2IsUnlocked(this.selectedStage)) {
                this.sound.play('confirm');
                this.stageData = stage;
                this.stageIndex = this.selectedStage;
                this.returnState = 'chapter2_select';
                this.state = 'deck_edit';
                this.deckCursor = 0;
            } else {
                this.sound.play('damage');
                this.particles && this.particles.damageNum(
                    window.CONFIG ? window.CONFIG.CANVAS_WIDTH / 2 : 200,
                    300, '前のステージをクリアしてね！', '#FF9800'
                );
            }
        }
        if (this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    _enterChapter3Select() {
        this.state = 'chapter3_select';
        this.selectedStage = 0;
        this.sound.playBGM('show');
        if (!this.saveData.seenStories) this.saveData.seenStories = [];
        if (!this.saveData.seenStories.includes('chapter3_intro')) {
            this.saveData.seenStories.push('chapter3_intro');
            SaveManager.save(this.saveData);
            this.story.start('chapter3_intro', () => { this.state = 'chapter3_select'; });
            this.prevState = 'chapter3_select';
            this.state = 'story';
        }
    }

    updateChapter3Select() {
        const ch3Stages = window.STAGES_CHAPTER3 || [];

        const _ch3IsUnlocked = (i) => {
            if (i === 0) return true;
            const prev = ch3Stages[i - 1];
            return prev && this.saveData.clearedStages.includes(prev.id);
        };

        let maxUnlocked = 0;
        for (let i = 0; i < ch3Stages.length; i++) {
            if (_ch3IsUnlocked(i)) maxUnlocked = i;
        }

        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW') ||
            this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
            if (this.selectedStage > 0) { this.selectedStage--; this.sound.play('cursor'); }
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS') ||
            this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
            if (this.selectedStage < maxUnlocked) { this.selectedStage++; this.sound.play('cursor'); }
        }
        if (this.input.menuConfirm) {
            const stage = ch3Stages[this.selectedStage];
            if (stage && _ch3IsUnlocked(this.selectedStage)) {
                this.sound.play('confirm');
                this.stageData = stage;
                this.stageIndex = this.selectedStage;
                this.returnState = 'chapter3_select';
                this.state = 'deck_edit';
                this.deckCursor = 0;
            } else {
                this.sound.play('damage');
                this.particles && this.particles.damageNum(
                    window.CONFIG ? window.CONFIG.CANVAS_WIDTH / 2 : 200,
                    300, '前のステージをクリアしてね！', '#FF9800'
                );
            }
        }
        if (this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    _enterChapter4Select() {
        this.state = 'chapter4_select';
        this.selectedStage = 0;
        this.sound.playBGM('battle');
        if (!this.saveData.seenStories) this.saveData.seenStories = [];
        if (!this.saveData.seenStories.includes('chapter4_intro')) {
            this.saveData.seenStories.push('chapter4_intro');
            SaveManager.save(this.saveData);
            this.story.start('chapter4_intro', () => { this.state = 'chapter4_select'; });
            this.prevState = 'chapter4_select';
            this.state = 'story';
        }
    }

    _enterChapter5Select() {
        this.state = 'chapter5_select';
        this.selectedStage = 0;
        this.sound.playBGM('battle');
        if (!this.saveData.seenStories) this.saveData.seenStories = [];
        if (!this.saveData.seenStories.includes('chapter5_intro')) {
            this.saveData.seenStories.push('chapter5_intro');
            SaveManager.save(this.saveData);
            this.story.start('chapter5_intro', () => { this.state = 'chapter5_select'; });
            this.prevState = 'chapter5_select';
            this.state = 'story';
        }
    }

    updateChapter5Select() {
        const ch5Stages = window.STAGES_CHAPTER5 || [];

        const _ch5IsUnlocked = (i) => {
            if (i === 0) return true;
            const prev = ch5Stages[i - 1];
            return prev && this.saveData.clearedStages.includes(prev.id);
        };

        let maxUnlocked = 0;
        for (let i = 0; i < ch5Stages.length; i++) {
            if (_ch5IsUnlocked(i)) maxUnlocked = i;
        }

        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW') ||
            this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
            if (this.selectedStage > 0) { this.selectedStage--; this.sound.play('cursor'); }
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS') ||
            this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
            if (this.selectedStage < maxUnlocked) { this.selectedStage++; this.sound.play('cursor'); }
        }
        if (this.input.menuConfirm) {
            const stage = ch5Stages[this.selectedStage];
            if (stage && _ch5IsUnlocked(this.selectedStage)) {
                this.sound.play('confirm');
                this.stageData = stage;
                this.stageIndex = this.selectedStage;
                this.returnState = 'chapter5_select';
                this.state = 'deck_edit';
                this.deckCursor = 0;
            } else {
                this.sound.play('damage');
                this.particles && this.particles.damageNum(
                    window.CONFIG ? window.CONFIG.CANVAS_WIDTH / 2 : 200,
                    300, '前のステージをクリアしてね！', '#FF9800'
                );
            }
        }
        if (this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    updateChapter4Select() {
        const ch4Stages = window.STAGES_CHAPTER4 || [];

        const _ch4IsUnlocked = (i) => {
            if (i === 0) return true;
            const prev = ch4Stages[i - 1];
            return prev && this.saveData.clearedStages.includes(prev.id);
        };

        let maxUnlocked = 0;
        for (let i = 0; i < ch4Stages.length; i++) {
            if (_ch4IsUnlocked(i)) maxUnlocked = i;
        }

        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW') ||
            this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
            if (this.selectedStage > 0) { this.selectedStage--; this.sound.play('cursor'); }
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS') ||
            this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
            if (this.selectedStage < maxUnlocked) { this.selectedStage++; this.sound.play('cursor'); }
        }
        if (this.input.menuConfirm) {
            const stage = ch4Stages[this.selectedStage];
            if (stage && _ch4IsUnlocked(this.selectedStage)) {
                this.sound.play('confirm');
                this.stageData = stage;
                this.stageIndex = this.selectedStage;
                this.returnState = 'chapter4_select';
                this.state = 'deck_edit';
                this.deckCursor = 0;
            } else {
                this.sound.play('damage');
                this.particles && this.particles.damageNum(
                    window.CONFIG ? window.CONFIG.CANVAS_WIDTH / 2 : 200,
                    300, '前のステージをクリアしてね！', '#FF9800'
                );
            }
        }
        if (this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    // Bug Fix: updateEventSelect was called but never defined
    updateEventSelect() {
        const eventStages = STAGES_EVENT;
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW') ||
            this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
            if (this.selectedStage > 0) { this.selectedStage--; this.sound.play('cursor'); }
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS') ||
            this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
            if (this.selectedStage < eventStages.length - 1) { this.selectedStage++; this.sound.play('cursor'); }
        }
        if (this.input.menuConfirm) {
            const ev = eventStages[this.selectedStage];
            if (ev) {
                const idx = STAGES.findIndex(s => s.id === ev.id);
                this.selectedStage = idx !== -1 ? idx : 0;
                this.sound.play('confirm');
                this.state = 'deck_edit';
                this.returnState = 'event_select';
                this.deckCursor = 0;
                if (this.saveData.deck.length === 0) { this.saveData.deck.push('rock'); SaveManager.save(this.saveData); }
            }
        }
        if (this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    // Bug Fix: updateDailyMissions was called but never defined
    updateDailyMissions() {
        if (this.input.menuConfirm || this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    // Bug Fix: updateCollection was called but never defined
    updateCollection() {
        if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) {
            this.collectionTab = Math.max(0, this.collectionTab - 1);
            this.collectionScroll = 0; // タブ切替でスクロールリセット
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) {
            this.collectionTab = Math.min(1, this.collectionTab + 1);
            this.collectionScroll = 0; // タブ切替でスクロールリセット
            this.sound.play('cursor');
        }
        const collGap = 70; // drawCollectionのgap値と一致させる
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.collectionScroll = Math.max(0, (this.collectionScroll||0) - collGap);
        }
        if (this.input.pressed('ArrowDown')) {
            // ★バグ修正: ArrowDownのみでスクロール。KeySはソート切替専用に分離。
            const itemCount = this.collectionTab === 0
                ? Object.keys(window.CONFIG?.ENEMY?.TYPES || {}).length
                : (window.CONFIG?.MASTER_ALLY_LIST?.length || 30);
            const canvasH = window.CONFIG?.CANVAS_HEIGHT || 600;
            const visibleItems = Math.floor((canvasH - 220) / collGap);
            const maxScroll = Math.max(0, (itemCount - visibleItems) * collGap);
            this.collectionScroll = Math.min(maxScroll, (this.collectionScroll||0) + collGap);
        }

        // ソート切替 (Sキー専用 - ArrowDownとの二重発火を防ぐため分離)
        if (this.input.pressed('KeyS')) {
            this.collectionSortMode = (this.collectionSortMode + 1) % 3;
            this.sound.play('confirm');
            this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 80, `ソート: ${['標準', 'レア度', '名前'][this.collectionSortMode]}`, '#AAA');
        }

        if (this.input.menuConfirm || this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    // Bug Fix: updateUpgrade was called but never defined
    updateUpgrade() {
        // 演出タイマー管理
        if (this.gachaAdventureTimer > 0) this.gachaAdventureTimer--;
        if (this.gachaRevealTimer > 0) this.gachaRevealTimer--;
        // ★バグ修正: 最後のキャラ演出が終わったらサマリーに切り替え
        if (this.gacha10PendingSummary && this.gachaAdventureTimer === 0) {
            this.gacha10PendingSummary = false;
            this.gacha10SummaryActive = true;
        }
        // 10連サマリー: カードを順番に表示
        if (this.gacha10SummaryActive && this.gacha10AllResults) {
            if (this.gacha10ShowCount < this.gacha10AllResults.length) {
                this.gacha10ShowTimer++;
                const interval = (this.gacha10AllResults[this.gacha10ShowCount]?.rarity >= 5) ? 14 : 8;
                if (this.gacha10ShowTimer >= interval) {
                    this.gacha10ShowCount++;
                    // ★バグ修正: 最後のカードも含め、常にタイマーをリセットして登場演出を再生
                    this.gacha10ShowTimer = 0;
                    this.sound.play(this.gacha10AllResults[this.gacha10ShowCount - 1]?.rarity >= 5 ? 'powerup' : 'pickup');
                }
            } else {
                // ★バグ修正: 全カード表示後はタイマーを最大14まで進めて演出完走させる
                // 以前は60まで進めていたが、popScaleがマイナスになりカードが消えるバグがあった
                if (this.gacha10ShowTimer < 14) this.gacha10ShowTimer++;
            }
        }

        const shopItems = [
            { id: 'hp',            type: 'upgrade',   cost: Math.floor(CONFIG.UPGRADES.HP.BASE_COST * Math.pow(CONFIG.UPGRADES.HP.COST_MULTIPLIER, this.saveData.upgrades.hp || 0)) },
            { id: 'attack',        type: 'upgrade',   cost: Math.floor(CONFIG.UPGRADES.ATTACK.BASE_COST * Math.pow(CONFIG.UPGRADES.ATTACK.COST_MULTIPLIER, this.saveData.upgrades.attack || 0)) },
            { id: 'goldBoost',     type: 'upgrade',   cost: CONFIG.UPGRADES.GOLD_BOOST.COSTS[this.saveData.upgrades.goldBoost || 0] || 0 },
            { id: 'capacity',      type: 'upgrade',   cost: CONFIG.UPGRADES.CAPACITY.COSTS[this.saveData.upgrades.capacity || 0] || 0 },
            { id: 'room_expand',   type: 'upgrade',   cost: CONFIG.UPGRADES.ROOM_EXPAND.COSTS[this.saveData.upgrades.room_expand || 0] || 0 },
            // maxAllySlotアップグレード撤廃（最大3コスト固定）
            { id: 'ally_train',    type: 'ally_train', cost: 2000 },

            { id: 'scout',         type: 'gacha',    cost: 1000 },
            { id: 'scout_10',      type: 'gacha_10', cost: 8000 },
            { id: 'bomb',          type: 'ammo',     cost: 1500 },
            { id: 'ironball',      type: 'ammo',     cost: 2000 },
            { id: 'missile',       type: 'ammo',     cost: 3000 },
            { id: 'exit',          type: 'system',   cost: 0 },
        ];
        // Advance gacha queue on confirm
        if (this.gachaQueue && this.gachaQueue.length > 0) {
            if (this.input.menuConfirm || this.input.back) {
                const next = this.gachaQueue.shift();
                this.gachaAdventureRarity = next.rarity || 1;
                this.gachaAdventureTimer = (next.rarity >= 5) ? 200 : (next.rarity >= 4) ? 150 : 110;
                this.gachaRevealTimer = 60; // 結果登場アニメ用
                this.gachaResult = next;
                this.sound.play('confirm');
                // ★バグ修正: キューが空になっても pending は立てない。
                // 最後の1枚の gachaAdventureTimer が 0 になるのを待ってから
                // updateUpgrade() の先頭チェックで自動的に pending → summary に切り替わる。
                // ここで pending を立てると演出開始直後に return してしまいアニメが再生されない。
                this._gacha10LastCard = (this.gachaQueue.length === 0);
            }
            return;
        }
        // 最後の1枚の演出が終わったらサマリーへ
        if (this._gacha10LastCard) {
            if (this.gachaAdventureTimer === 0) {
                // ★バグ修正: 冒険演出終了後、結果カードをconfirmで確認してからサマリーへ
                // 修正前は演出終了と同時に即座にサマリーへ切り替わり、結果カードが1フレームも表示されなかった
                if (this.input.menuConfirm || this.input.back) {
                    this._gacha10LastCard = false;
                    this.gacha10PendingSummary = false;
                    this.gacha10SummaryActive = true;
                    this.gacha10ShowCount = 0;
                    this.gacha10ShowTimer = 0;
                    this.sound.play('select');
                }
            }
            return;
        }
        // ★バグ修正: 最後のキャラ演出待機中（ペンディング）は入力を受け付けない
        if (this.gacha10PendingSummary) return;
        // 10連一覧表示中
        if (this.gacha10SummaryActive && this.gacha10AllResults) {
            if (this.input.menuConfirm || this.input.back) {
                this.gacha10SummaryActive = false;
                this.gacha10AllResults = null;
                this.gacha10ShowCount = 0;
                this.gacha10ShowTimer = 0;
                this.gachaResult = null;
                this.sound.play('select');
            }
            return;
        }
        // Dismiss single result
        if (this.gachaResult) {
            if (this.input.menuConfirm || this.input.back) { this.gachaResult = null; this.sound.play('select'); }
            return;
        }
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.deckCursor = (this.deckCursor - 1 + shopItems.length) % shopItems.length; this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.deckCursor = (this.deckCursor + 1) % shopItems.length; this.sound.play('cursor');
        }
        if (this.input.back) { this.sound.play('select'); this.state = this.returnState || 'title'; return; }
        if (this.input.menuConfirm) {
            const item = shopItems[this.deckCursor];
            if (!item) return;
            if (item.type === 'system') { this.sound.play('select'); this.state = this.returnState || 'title'; return; }
            if (this.saveData.gold < item.cost) {
                this.sound.play('damage');
                this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, 'ゴールド不足！', '#FF5252');
                return;
            }
            if (item.type === 'upgrade') {
                const currentLevel = this.saveData.upgrades[item.id] || 0;
                const maxLevel = (item.id === 'hp' || item.id === 'attack')
                    ? CONFIG.UPGRADES[item.id.toUpperCase()].MAX_LEVEL
                    : item.id === 'goldBoost' ? CONFIG.UPGRADES.GOLD_BOOST.MAX_LEVEL
                    : item.id === 'room_expand' ? CONFIG.UPGRADES.ROOM_EXPAND.MAX_LEVEL
                    : CONFIG.UPGRADES.CAPACITY.MAX_LEVEL;
                if (currentLevel >= maxLevel) {
                    this.sound.play('damage');
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, 'MAX！', '#FFD700');
                    return;
                }
                this.saveData.gold -= item.cost;
                this.saveData.upgrades[item.id] = currentLevel + 1;
                this.sound.play('powerup');
                this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, 'アップグレード！', '#FFD700');
                SaveManager.save(this.saveData);
            } else if (item.type === 'ally_train') {
                // 仲間EXP特訓（最もレベルの低い仲間にEXPを大量付与）
                const allies = this.saveData.unlockedAllies || [];
                if (allies.length === 0) {
                    this.sound.play('damage');
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '仲間がいません！', '#FF5252');
                    return;
                }
                const target = allies.reduce((lowest, a) => (!lowest || (a.level || 1) < (lowest.level || 1)) ? a : lowest, null);
                this.saveData.gold -= item.cost;
                const oldLevel = target.level || 1;
                // ★バグ修正: 旧コードは if 文で1段階しかレベルアップしなかった。
                // gainExp() と同様に while ループで複数レベルアップに対応する。
                target.exp = (target.exp || 0) + 200;
                let leveled = false;
                while ((target.exp >= Math.floor(100 * Math.pow(target.level || 1, 1.5))) &&
                       (target.level || 1) < 10) {
                    const expNeeded = Math.floor(100 * Math.pow(target.level || 1, 1.5));
                    target.exp -= expNeeded;
                    target.level = (target.level || 1) + 1;
                    leveled = true;
                }
                if (leveled) {
                    // ★バグ修正: レベルアップ後のステータスをセーブデータに反映する。
                    // セーブデータはプレーンオブジェクトなので AllySlime を一時生成して
                    // _recalcLevelStats() でダメージ・攻撃間隔を正しく再計算し書き戻す。
                    try {
                        const tempAlly = new AllySlime(0, 0, target);
                        target.damage = tempAlly.damage;
                        target.atkInterval = tempAlly.atkInterval;
                        target.baseDamage = tempAlly.baseDamage;
                    } catch(e) { /* AllySlime生成失敗時は古い値のまま */ }
                    this.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, 200, `${target.name} Lv.${target.level}！`, '#FFD700');
                    this.sound.play('powerup');
                } else {
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, `${target.name} +200EXP！`, '#4CAF50');
                    this.sound.play('confirm');
                }
                SaveManager.save(this.saveData);
            } else if (item.type === 'ammo') {
                // 弾の解放
                if (this.saveData.unlockedAmmo.includes(item.id)) {
                    this.sound.play('damage');
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '入手済み！', '#888');
                } else {
                    this.saveData.gold -= item.cost;
                    this.saveData.unlockedAmmo.push(item.id);
                    this.sound.play('powerup');
                    const ammoName = (CONFIG.AMMO_TYPES[item.id] && CONFIG.AMMO_TYPES[item.id].name) || item.id;
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, `${ammoName} GET！`, '#4CAF50');
                    SaveManager.save(this.saveData);
                }
            } else if (item.type === 'gacha') {
                this.saveData.gold -= item.cost;
                this.buyGacha();
                SaveManager.save(this.saveData);
            } else if (item.type === 'gacha_10') {
                this.saveData.gold -= item.cost;
                this.buy10Gacha();
                SaveManager.save(this.saveData);
            }
        }
    }

    // =====================================================
    // ★ ガチャシステム（天井・確率保証付き）
    // =====================================================

    // ガチャプールの定義（単一の信頼できるソース）
    // ★バグ修正㉘: 同一 type で異なるキャラが存在すると _singleGachaPull() の
    //   existing = find(a => a.type === type) で誤マッチし、
    //   別キャラを引いても既存キャラのレベルアップ扱いになっていた。
    //   → 各キャラに一意の type を割り当てて完全に区別する。
    _getGachaPool() {
        return {
            // ★1〜2: 35%
            r1: [
                { type:'slime',      name:'スライム',        color:'#4CAF50', darkColor:'#2E7D32', rarity:1 },
                { type:'slime_red',  name:'レッドスライム',  color:'#F44336', darkColor:'#B71C1C', rarity:2 },
                { type:'slime_blue', name:'ブルースライム',  color:'#2196F3', darkColor:'#0D47A1', rarity:2 },
            ],
            // ★3: 25%
            r3: [
                { type:'slime_metal',   name:'クロームスライム', color:'#B0BEC5', darkColor:'#78909C', rarity:3 },
                { type:'ninja',         name:'ニンジャスライム', color:'#212121', darkColor:'#000000', rarity:3 },
                { type:'defender',      name:'ディフェンダー',   color:'#607D8B', darkColor:'#455A64', rarity:3 },
                { type:'healer',        name:'ヒーラースライム', color:'#81C784', darkColor:'#388E3C', rarity:3 },
                { type:'ghost',         name:'どろろん',         color:'#CE93D8', darkColor:'#7B1FA2', rarity:3 },
                // ★修正: 旧 type:'healer' → 'healer_recov' (リカバリス専用type)
                { type:'healer_recov',  name:'リカバリス',       color:'#42A5F5', darkColor:'#0D47A1', rarity:3 },
                // ★修正: 旧 type:'ninja'  → 'ninja_hanzo'  (ハンゾー専用type)
                { type:'ninja_hanzo',   name:'ハンゾー',          color:'#333333', darkColor:'#000000', rarity:3 },
                // ★修正: 旧 type:'ghost'  → 'ghost_kai'    (どろろん改専用type)
                { type:'ghost_kai',     name:'どろろん改',        color:'#F5F5F5', darkColor:'#999999', rarity:3 },
                // ★修正: 旧 type:'ninja'  → 'ninja_merman'  (マーマン専用type)
                { type:'ninja_merman',  name:'マーマン',          color:'#2196F3', darkColor:'#0D47A1', rarity:3 },
            ],
            // ★4: 22%
            r4: [
                { type:'wizard',        name:'魔法使いスライム',  color:'#7B1FA2', darkColor:'#4A148C', rarity:4 },
                { type:'golem',         name:'ゴーレムスライム',  color:'#795548', darkColor:'#5D4037', rarity:4 },
                { type:'slime_gold',    name:'ゴールデンスライム',color:'#FFD700', darkColor:'#FFA000', rarity:4 },
                // ★修正: 旧 type:'golem'    → 'golem_sand'   (サンドゴーレム専用type)
                { type:'golem_sand',    name:'サンドゴーレム',    color:'#FBC02D', darkColor:'#F57F17', rarity:4 },
                // ★修正: 旧 type:'angel'    → 'angel_seraph'  (セラフィ専用type。drawAngelSeraphを使用)
                { type:'angel_seraph',  name:'セラフィ',          color:'#FFF59D', darkColor:'#FBC02D', rarity:4 },
                // ★修正: 旧 type:'defender' → 'defender_golem' (ゴーレムA専用type)
                { type:'defender_golem',name:'ゴーレムA',          color:'#8D6E63', darkColor:'#4E342E', rarity:4 },
            ],
            // ★5: 13%
            r5: [
                { type:'angel',         name:'エンジェルスライム',color:'#FFF59D', darkColor:'#FBC02D', rarity:5 },
                { type:'master',        name:'老師',               color:'#880E4F', darkColor:'#560027', rarity:5 },
                { type:'drone',         name:'ドローン',           color:'#607D8B', darkColor:'#455A64', rarity:5 },
                { type:'boss',          name:'ボススライム',       color:'#9C27B0', darkColor:'#6A1B9A', rarity:5 },
                { type:'metalking',     name:'クロームキング',     color:'#B0BEC5', darkColor:'#78909C', rarity:5 },
                { type:'ultimate',      name:'究極スライム',       color:'#FF6F00', darkColor:'#E65100', rarity:5 },
                { type:'special',       name:'ダークJr',           color:'#9C27B0', darkColor:'#6A1B9A', rarity:5 },
                // ★修正: 旧 type:'metalking'→ 'metalking_ex'  (メタキン専用type)
                { type:'metalking_ex',  name:'メタキン',           color:'#B0BEC5', darkColor:'#546E7A', rarity:5 },
                // ★修正: 旧 type:'master'   → 'master_dim'    (次元スライム専用type)
                { type:'master_dim',    name:'次元スライム',       color:'#00FFFF', darkColor:'#008B8B', rarity:5 },
                // ★修正: 旧 type:'angel'    → 'angel_legend'  (レジェンドスライム専用type)
                { type:'angel_legend',  name:'レジェンドスライム', color:'#FFD700', darkColor:'#FFA500', rarity:5 },
                // ★修正: 旧 type:'defender' → 'defender_elite' (エリート兵専用type)
                { type:'defender_elite',name:'エリート兵',          color:'#E74C3C', darkColor:'#C0392B', rarity:5 },
            ],
            // ★6: 5%（ガチャ限定キャラ含む）
            r6: [
                { type:'platinum_slime', name:'プラチナスライム',  color:'#E0E0E0', darkColor:'#9E9E9E', rarity:6 },
                { type:'arch_angel',     name:'アークエンジェル',  color:'#E3F2FD', darkColor:'#90CAF9', rarity:6 },
                { type:'wyvern_lord',    name:'ワイバーンロード',  color:'#1B5E20', darkColor:'#004D40', rarity:6 },
                { type:'legend_metal',   name:'レジェンドメタル',  color:'#78909C', darkColor:'#455A64', rarity:6 },
            ],
        };
    }

    // 1回ガチャの共通処理（天井・保証管理付き）
    _singleGachaPull(pullIndex = 0) {
        const pool = this._getGachaPool();

        // 天井カウンター初期化
        if (this.saveData.gachaPity === undefined || this.saveData.gachaPity === null) this.saveData.gachaPity = 0;
        this.saveData.gachaPity++;

        // 天井: 50連以内に★6保証
        const pityGuarantee = this.saveData.gachaPity >= 50;
        // ソフト天井: 30連以降は★6確率が段階的に増加
        const softPityBonus = this.saveData.gachaPity >= 30
            ? (this.saveData.gachaPity - 29) * 0.025  // 30連目から+2.5%/連
            : 0;

        // 10連の最後の1枚は★5以上保証
        const isGuaranteedR5 = (pullIndex === 9);

        let pool_key;
        const rand = Math.random();

        if (pityGuarantee) {
            // 天井: 必ず★6
            pool_key = 'r6';
            this.saveData.gachaPity = 0;
        } else if (isGuaranteedR5 && rand >= 0.18) {
            // 10連最終枠: ★5以上保証（★6: 5%+ソフト天井ボーナス, それ以外★5）
            const r6Chance = 0.05 + softPityBonus;
            pool_key = Math.random() < r6Chance ? 'r6' : 'r5';
            if (pool_key === 'r6') this.saveData.gachaPity = 0;
        } else {
            // 通常: ★1=35%, ★3=25%, ★4=22%, ★5=13%, ★6=5%+ソフト
            const r6Chance = 0.05 + softPityBonus;
            const r5Chance = 0.13;
            const r4Chance = 0.22;
            const r3Chance = 0.25;
            // 累積判定
            if (rand < r6Chance) {
                pool_key = 'r6';
                this.saveData.gachaPity = 0;
            } else if (rand < r6Chance + r5Chance) {
                pool_key = 'r5';
            } else if (rand < r6Chance + r5Chance + r4Chance) {
                pool_key = 'r4';
            } else if (rand < r6Chance + r5Chance + r4Chance + r3Chance) {
                pool_key = 'r3';
            } else {
                pool_key = 'r1';
            }
        }

        const variants = pool[pool_key];
        const { type, name, color, darkColor, rarity } = variants[Math.floor(Math.random() * variants.length)];

        // セーブデータに登録
        const existing = this.saveData.unlockedAllies.find(a => a.type === type);
        const _TITAN_DRAGON_GACHA = new Set(['titan_golem', 'dragon_lord', 'platinum_golem']);
        let result;
        if (existing) {
            // タイタン/ドラゴン/プラチナはリミットブレイクで上限なく成長。他はLv10上限。
            existing.level = _TITAN_DRAGON_GACHA.has(existing.type)
                ? (existing.level || 1) + 1
                : Math.min(10, (existing.level || 1) + 1);
            result = { ...existing, isLimitBreak: true };
        } else {
            const LARGE = new Set(['titan_golem', 'platinum_golem', 'dragon_lord']);
            const newAlly = {
                id: `ally_${Date.now()}_${pullIndex}`,
                type, name, color, darkColor, rarity,
                level: 1, cost: LARGE.has(type) ? 2 : 1,
            };
            this.saveData.unlockedAllies.push(newAlly);
            SaveManager.addAllyToCollection(this.saveData, newAlly.type);
            result = { ...newAlly };
        }
        return result;
    }

    buyGacha() {
        const result = this._singleGachaPull(0);
        this.gachaResult = result;
        this.gachaAdventureRarity = result.rarity || 1;
        // ★5以上はたっぷり演出時間を取る
        this.gachaAdventureTimer = (result.rarity >= 5) ? 200 : (result.rarity >= 4) ? 150 : 110;
        this.gachaRevealTimer = 60; // 結果登場アニメ用
        this.sound.play('confirm');
        SaveManager.save(this.saveData);
    }

    buy10Gacha() {
        const results = [];
        for (let i = 0; i < 10; i++) {
            const r = this._singleGachaPull(i);
            r._queueIndex = i + 1;
            r._queueTotal = 10;
            results.push(r);
        }

        SaveManager.save(this.saveData);

        // レアリティ昇順に並べ替え（最後に一番いいのが来るように）
        results.sort((a, b) => (a.rarity || 1) - (b.rarity || 1));
        results.forEach((r, i) => { r._queueIndex = i + 1; });

        // 先頭をキューに入れて演出付きで流す（最初の1枚も演出あり）
        this.gachaQueue = results.slice(1); // 2枚目以降をキューに
        // 最初の1枚も演出付きで表示
        const first = results[0];
        this.gachaResult = first;
        this.gachaAdventureRarity = first.rarity || 1;
        this.gachaAdventureTimer = (first.rarity >= 5) ? 200 : (first.rarity >= 4) ? 150 : 110;
        this.gachaRevealTimer = 60;
        this.gacha10AllResults = results;
        this.gacha10SummaryActive = false;
        this.gacha10PendingSummary = false;
        this.gacha10Pending = false;
        // ★バグ修正: _gacha10LastCard を明示的にリセットしないと前回の10連の状態が残り
        // 最後の1枚（10枚目）の演出がスキップされてサマリーに直行してしまう
        this._gacha10LastCard = false;
        this.gacha10ShowCount = 0;
        this.gacha10ShowTimer = 0;
        this.sound.play('confirm');
    }

}

// Start the game when page loads
window.addEventListener('load', () => {
    try {
        new Game();
    } catch (e) {
        console.error("FATAL GAME START ERROR:", e);
        // ★バグ修正: window.confirm は iOS PWA モードでブロックされる
        // canvasに直接エラーを描いてタップでリセットできるようにする
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const W = canvas.width || 600, H = canvas.height || 800;
            ctx.fillStyle = '#1a0000';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#FF4444';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('起動エラーが発生しました', W / 2, H / 2 - 60);
            ctx.fillStyle = '#FFF';
            ctx.font = '15px Arial';
            ctx.fillText(e.message || String(e), W / 2, H / 2 - 20);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('画面をタップしてリセット', W / 2, H / 2 + 40);
            ctx.fillStyle = 'rgba(255,215,0,0.2)';
            ctx.fillRect(W / 2 - 130, H / 2 + 18, 260, 44);
            canvas.addEventListener('touchstart', () => {
                localStorage.removeItem('slime_tank_v2');
                location.reload();
            }, { once: true });
            canvas.addEventListener('click', () => {
                localStorage.removeItem('slime_tank_v2');
                location.reload();
            }, { once: true });
        }
    }
});
// スコアをJavaのサーバーに保存する関数
const SCORE_API_URL = 'https://popgame-backend.onrender.com/api/scores';

// Render.com無料プランのコールドスタート対策: 最大3回・指数バックオフでリトライ
async function saveSlimeScoreWithRetry(data, attempt = 1) {
    try {
        const res = await fetch(SCORE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            console.log(`DBへのスコア保存に成功しました！(試行${attempt}回目)`);
            return;
        }
        throw new Error('HTTP ' + res.status);
    } catch (err) {
        if (attempt >= 3) {
            console.error('スコア保存に失敗しました（3回試行後）:', err);
            return;
        }
        const delay = attempt * 2000; // 2秒 → 4秒
        console.warn(`スコア保存リトライ中... (${attempt}/3) ${delay/1000}秒後`);
        await new Promise(r => setTimeout(r, delay));
        await saveSlimeScoreWithRetry(data, attempt + 1);
    }
}

function saveSlimeScore(name, points) {
    // 送信前バリデーション（localStorage改ざん対策）
    const safeName = String(name).trim().slice(0, 20);
    if (!safeName) { console.warn("スコア保存スキップ: 名前が空です"); return; }
    if (!Number.isFinite(points) || points < 0) { console.warn("スコア保存スキップ: 不正なスコア値", points); return; }

    const data = {
        playerName: safeName,
        score: points,
        title: window._slimePlayerTitle || '冒険者'
    };

    saveSlimeScoreWithRetry(data);
}
// ===== ゲーム起動時の名前入力処理 =====
window._slimePlayerName = '';
window.addEventListener('DOMContentLoaded', function () {
    const popup = document.getElementById('name-input-popup');
    const input = document.getElementById('player-name-input');
    const btn   = document.getElementById('name-submit-btn');
    if (!popup || !input || !btn) return;

    // localStorage から前回の名前を読み込む
    const savedName = localStorage.getItem('slime_player_name');
    if (savedName) {
        input.value = savedName;
        window._slimePlayerName = savedName;
        popup.style.display = 'none'; // 前回の名前があればポップアップをスキップ
        return;
    }

    input.focus();

    function submit() {
        const name = input.value.trim();
        if (!name) {
            input.style.border = '1px solid #ff4444';
            input.placeholder = '名前を入力してください！';
            return;
        }
        if (name.length > 12) {
            input.style.border = '1px solid #ff4444';
            input.placeholder = '12文字以内で入力してください！';
            return;
        }
        // localStorageに名前を保存
        localStorage.setItem('slime_player_name', name);
        window._slimePlayerName = name;
        popup.style.display = 'none';
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submit();
    });
});
