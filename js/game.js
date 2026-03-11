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

        // === コンボシステム ===
        this.comboCount = 0;       // 現在のコンボ数
        this.comboTimer = 0;       // コンボタイマー（0になるとリセット）
        this.comboFlashTimer = 0;  // コンボ数字の点滅演出タイマー
        this.maxCombo = 0;         // 最大コンボ数（バトル中）

        this.selectedStage = 0;
        this.stageIndex = 0; // 初期値を設定（R押下時のリスタート用）
        this.selectedDifficulty = 'NORMAL'; // EASY, NORMAL, HARD
        this.difficultySelectMode = true; // Toggle between difficulty and stage selection
        this.titleCursor = 0; // タイトル画面のメニューカーソル (0=ゲーム開始, 1=デイリーミッション, 2=図鑑, 3=アップグレード)

        // デイリーミッションをチェック・リセット
        SaveManager.checkAndResetDailyMissions(this.saveData);

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
        this.specialImpactTimer = 0; // 必殺技インパクト演出タイマー
        this.gachaAdventureRarity = 1; // ガチャ演出のレア度

        // Battle helpers (must be initialized before any update)
        this.invader = null;
        this.collectionTab = 0;
        this.collectionScroll = 0;
        this.bossDestructionInitialized = false;
        this.destructionTimer = 0;
        this.invasionVictoryTriggered = false;
        this.invasionVictoryDelay = 0;
        this.atCockpit = false;
        this.returnState = 'title';
        this.fusionParents = [];
        this.fusionCursor = 0;
        this.fusionErrorMessage = null;
        this.fusionErrorTimer = 0;

        // 設定画面
        this.settingsCursor = 0;
        // リザルト画面カーソル (0=もう一度, 1=ステージ選択)
        this.resultCursor = 0;
        this._tapPos = null;  // { x, y } in canvas coordinates

        // Error handling
        this.globalError = null;

        // Deck Edit
        this.deckCursor = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Audio Context Auto-Resume (Fix for Chrome/Edge Autoplay Policy)
        // Use a flag to ensure listeners are only added once
        if (!window._audioResumeListenersAdded) {
            window._audioResumeListenersAdded = true;
            const resumeAudio = () => {
                if (window.game && window.game.sound) {
                    window.game.sound.init();
                    window.game.sound.ensure();
                    if (window.game.sound.ctx && window.game.sound.ctx.state === 'running') {
                        // Audio context is running - start title BGM if not already playing
                        if (!window.game.sound.currentTrack) {
                            window.game.sound.playBGM('title');
                        }
                        // Remove all listeners
                        window.removeEventListener('click', resumeAudio);
                        window.removeEventListener('keydown', resumeAudio);
                        window.removeEventListener('touchstart', resumeAudio);
                        window._audioResumeListenersAdded = false;
                    }
                }
            };
            window.addEventListener('click', resumeAudio);
            window.addEventListener('keydown', resumeAudio);
            window.addEventListener('touchstart', resumeAudio);
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
                _swipeStartX = e.touches[0].clientX;
                _swipeStartY = e.touches[0].clientY;
            }, { passive: false });

            this.canvas.addEventListener('touchend', (e) => {
                // バトル中はtouch.jsが担当
                if (this.touch && this.touch.mode === 'battle') return;
                e.preventDefault();
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
                e.preventDefault();
                const pos = toCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
                const r = window._volSliderRect;
                if (pos.y >= r.y && pos.y <= r.y + r.h) {
                    const newVol = Math.max(0, Math.min(1, (pos.x - r.x) / r.w));
                    this.saveData.settings.vol = Math.round(newVol * 10) / 10;
                    this.sound.vol = this.saveData.settings.vol;
                    // 保存は touchend に任せる（move 中は毎フレーム保存しない）
                }
            }, { passive: false });
        }

        this.loop();
    }

    resize() {
        const ratio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
        let w = window.innerWidth, h = window.innerHeight;
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
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
            _tickFrameNow(); // Date.now() をフレームにつき1回だけ呼ぶ（renderer/ui が再利用）
            this.update();
            this.draw();
            this.input.tick();
            requestAnimationFrame((ts) => this.loop(ts));
        } catch (e) {
            console.error('Game Loop Error:', e);
            this.globalError = e;
            this.draw();
        }
    }

    // ===== UPDATE =====
    update() {
        // If error occurred, stop updating
        if (this.globalError) return;

        try {
            // Pause Toggle (during gameplay only)
            if (['battle', 'defense', 'invasion', 'countdown'].includes(this.state)) {
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
            }

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
                    if (ally.invincible > 0) ally.invincible--;
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
                            this.invader.takeDamage(p.damage, pdx > 0 ? 1 : -1);
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
                if (this.state === 'stage_select') this.sound.playBGM('title'); // Keep title theme? Or calm theme.
                if (this.state === 'battle') {
                    // Determine BGM based on stage
                    const stageId = this.stageData?.id;
                    if (stageId === 'stage8') {
                        this.sound.playBGM('boss');
                    } else if (this.stageData && STAGES.findIndex(s => s.id === stageId) >= 4) {
                        this.sound.playBGM('boss');
                    } else {
                        this.sound.playBGM('battle');
                    }
                }
                if (this.state === 'upgrade') this.sound.playBGM('shop');
                if (this.state === 'result') this.sound.playBGM('victory'); // Play victory BGM (battle theme continues)
            }

            // ★バグ修正: タッチUIをゲーム状態に応じて表示/非表示
            if (this.touch) {
                // タッチUIモード切替
                const battleStates = new Set([
                    'battle', 'defense', 'invasion', 'launching',
                    'countdown', 'dialogue'
                ]);
                const menuStates = new Set([
                    'title', 'stage_select', 'event_select',
                    'deck_edit', 'ally_edit',
                    'upgrade', 'fusion', 'collection',
                    'daily_missions', 'settings', 'result',
                    'ending', 'complete_clear'
                ]);
                if (battleStates.has(this.state)) {
                    this.touch.setMode('battle');
                } else if (menuStates.has(this.state)) {
                    this.touch.setMode('menu');
                } else {
                    this.touch.setMode('hidden');
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
                case 'complete_clear':
                    if (this.input.menuConfirm) {
                        this.state = 'title';
                        this.sound.play('confirm');
                    }
                    break;
            }
        } catch (e) {
            console.error('Game Update Error:', e);
            this.globalError = e;
        }
    }

    updateTitle() {
        const menuItems = ['ゲーム開始', 'イベントステージ', 'デイリーミッション', '図鑑', 'アップグレード', '配合', '⚙ 設定'];

        // メニュー選択
        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.titleCursor = (this.titleCursor - 1 + menuItems.length) % menuItems.length;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.titleCursor = (this.titleCursor + 1) % menuItems.length;
            this.sound.play('cursor');
        }

        // 決定
        if (this.input.menuConfirm) {
            this.sound.init();
            this.sound.play('confirm');

            switch (this.titleCursor) {
                case 0: // ゲーム開始
                    this.state = 'stage_select';
                    this.selectedStage = 0;
                    this.stageIndex = 0;
                    break;
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
                case 6: // 設定
                    this.state = 'settings';
                    this.settingsCursor = 0;
                    break;
            }
        }

        // Reset Data Shortcut (R key)
        if (this.input.pressed('KeyR')) {
            if (confirm('【データリセット】\nセーブデータを完全に削除しますか？\n(ページがリロードされます)')) {
                SaveManager.reset();
                location.reload();
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
                    // Add
                    if (deck.length < maxDeckSize) {
                        deck.push(selectedAmmo);
                        this.sound.play('confirm');
                    } else {
                        this.sound.play('damage'); // Error sound (Full)
                    }
                }
                SaveManager.save(this.saveData); // Save deck changes immediately
            }
        }

        // 仲間編集へ (Space/Enter/Cキー。Zキーは弾の着脱専用)
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
            const stageId = this.stageData?.id;
            if (this.returnState === 'event_select') {
                this.state = 'event_select';
                const eventStages = STAGES_EVENT;
                const idx = stageId ? eventStages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            } else {
                this.state = 'stage_select';
                const normalStages = STAGES_NORMAL;
                const idx = stageId ? normalStages.findIndex(s => s && s.id === stageId) : -1;
                this.selectedStage = idx !== -1 ? idx : 0;
            }
        }
    }

    updateAllyEdit() {
        const unlocked = this.saveData.unlockedAllies;
        const deck = this.saveData.allyDeck;
        const maxCost = 2; // 最大コスト = 2（通常仲間2体 or 大型仲間1体）

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
                        if (window.game) {
                            window.game.particles.damageNum(
                                CONFIG.CANVAS_WIDTH / 2,
                                CONFIG.CANVAS_HEIGHT / 2,
                                'コスト不足！',
                                '#FF5252'
                            );
                        }
                    }
                }
                SaveManager.save(this.saveData);
            }
        }

        // Start Battle (Space/Enter/Cキー。Zキーは着脱専用なので除外)
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
        // Global STAGES array is a constant, so we MUST clone the object to avoid mutating global data
        this.stageData = JSON.parse(JSON.stringify(STAGES[stageIndex]));

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
        if (this.stageData.isExtra) {
            this.sound.playBGM('ex_stage'); // EXステージ専用BGM
        } else if (this.stageData.id === 'stage8') {
            this.sound.playBGM('boss'); // 第一形態はboss BGM
        } else if (this.stageData.isBoss) {
            this.sound.playBGM('boss');
        } else {
            this.sound.playBGM('battle');
        }

        // バトル開始時に毎回フラグをリセット
        this.bossDestructionInitialized = false;
        this.invasionVictoryTriggered = false;
        this.invasionVictoryDelay = 0;
        this.newlyUnlocked = [];
        this.newlyUnlockedAlly = null;
        this.isNewRecord = false;
        this.savedBattleState = null; // 前回の侵入状態をクリア（死亡時リーク防止）
        this.comboCount = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;

        this.invader = null; // 前回のインベーダーをクリア（敗北後の残留バグ防止）
        this.battle = new BattleManager(this.stageData, this.saveData);
        this.particles.clear();
        this.projectiles = []; // allyの飛び道具を毎バトルリセット

        // デイリーミッション用の統計（バトル内カウンター）
        this.missionStats = { enemiesDefeated: 0, totalDamage: 0, specialsUsed: 0, itemsCollected: 0 };

        // Spawn Allies (All unlocked ones join the battle!)
        const spawn = this.tank.getSpawnPoint();
        this.allies = [];

        // Story Trigger (Pre-Battle)
        // ストーリー後のコールバックはcountdown/dialogueに遷移する
        const afterStory = () => {
            // stage5_pre ストーリーで「金貨500G」と告知しているので実際に付与する
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

        // Countdown or Dialogue?
        // ※ storyで state が既にセットされている場合は上書きしない（重要！）
        if (this.state !== 'story') {
            if (this.stageData.dialogue && this.stageData.dialogue.length > 0) {
                this.state = 'dialogue';
                this.dialogueIndex = 0;
            } else {
                this.countdownTimer = 180; // 3 seconds
                this.state = 'countdown';
            }
        }

        // Intro Impact (Land on battlefield)
        this.camera_shake = 30;
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
                this.camera_shake = 15;
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
                this.camera_shake = 20;
            }
        }

        // Play countdown beep at each second transition
        if (this.countdownTimer === 179 || this.countdownTimer === 119 || this.countdownTimer === 59) {
            this.sound.play('select');
            // Boss stage: Extra screen shake
            if (isBossStage) {
                this.camera_shake = 25;
                this.screenFlash = 10;
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
                this.screenFlash = 20;
                this.camera_shake = 30;
            }

            // Boss stage: Dramatic start effect
            if (isBossStage) {
                this.screenFlash = 30; // Longer flash
                this.camera_shake = 20; // Strong shake
                this.particles.rateEffect(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, '決戦！', '#FFD700');
            } else {
                this.screenFlash = 15;
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
            if (this.specialAnimTimer === 27) {
                const dmg = 50;
                this.battle.enemyTankHP = Math.max(0, this.battle.enemyTankHP - dmg);
                this.battle.enemyDamageFlash = 25;
                this.camera_shake = 18;
                this.particles.explosion(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 150, '#FF4444', 8);
                this.particles.damageNum(CONFIG.CANVAS_WIDTH - 150, CONFIG.TANK.OFFSET_Y + 100, '-' + dmg + '!!!', '#FF0000');
            }
            // returnしない → バトルは継続しながらカットイン演出を表示
        }

        // Trigger Special
        if (this.input.special && this.battle.specialGauge >= this.battle.maxSpecialGauge) {
            this.battle.triggerSpecial(); // specialGauge/specialActive/animTimer/mission まとめて処理
            // ★バグ修正②: return を削除 → 必殺技発動フレームでも全エンティティ更新を継続
            // (以前は return があったため、弾/仲間/タンクが1フレームフリーズしていた)
        }

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

            // Dodge Action (Double Jump or Jump in cockpit?)
            if (this.input.jump && this.battle.dodgeTimer <= 0) {
                this.battle.dodgeTimer = S.DODGE_DURATION;
                this.sound.play('dash');
            }
        }

        // 0. Throw Item OR Ally (X / B) - Independent of Action
        // itemThrown flag prevents special from firing on the same frame as a throw
        let itemThrown = false;
        if (this.input.cancel || this.input.special) {
            if (this.player.heldItems.length > 0) {
                this.player.attackDefender(null); // Throw item
                itemThrown = true;
            } else if (this.player.stackedAlly) {
                this.handleAllyThrow(); // Throw ally
                itemThrown = true;
            }
        }

        // Pick up item OR Load Cannon OR Launch Self
        if (this.input.action) {
            let actionDone = false;

            if (this.player.heldItems.length > 0) {
                // 1. Extinguish Fire?
                if (this.player.heldItems[0] === 'water_bucket') {
                    for (let i = this.tank.fires.length - 1; i >= 0; i--) {
                        const f = this.tank.fires[i];
                        if (Math.abs(this.player.x + this.player.w / 2 - (f.x + f.w / 2)) < CONFIG.FIRE.EXTINGUISH_DIST &&
                            Math.abs(this.player.y + this.player.h / 2 - (f.y + f.h / 2)) < CONFIG.FIRE.EXTINGUISH_DIST) {
                            this.tank.fires.splice(i, 1);
                            this.sound.play('water');
                            this.particles.smoke(f.x + f.w / 2, f.y + f.h / 2, 20);
                            this.player.heldItems.shift(); // Remove water_bucket
                            actionDone = true;
                            break;
                        }
                    }
                }

                // 2. Load Cannon?
                if (!actionDone && this.player.heldItems[0] !== 'water_bucket') {
                    if (this.player.tryLoadCannon(this.tank.cannons)) {
                        actionDone = true;
                    }
                }
            } else {
                // 3. Pick up item OR Ally (Fusion)
                if (this.player.tryPickup(this.ammoDropper.items, this.allies)) {
                    actionDone = true;
                }

                // 4. Manual Launch (Invasion) if no item nearby and near cannon
                if (!actionDone) {
                    const cannon = this.player.getNearCannon(this.tank.cannons);
                    if (cannon && this.battle && this.battle.invasionAvailable) {
                        this.startInvasion();
                        return; // Exit here to prevent other actions
                    }
                }

                // 5. Tail Attack (Fallback)
                if (!actionDone) {
                    this.player.triggerTailAttack();
                }
            }
        }

        // Special Move: only trigger if we did NOT throw an item/ally this frame
        if (!itemThrown && this.input.special && this.battle.specialActive <= 0 && this.player.heldItems.length === 0 && !this.player.stackedAlly) {
            this.battle.triggerSpecial();
            if (this.missionStats) this.missionStats.specialsUsed++;
        }
        // specialAnimTimer は updateBattle() 冒頭で既にデクリメント済みのため、ここでは不要

        // Allies Update
        if (this.allies) {
            for (const ally of this.allies) ally.update(this.tank, this.ammoDropper.items, this.invader);
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
                    this.invader.takeDamage(10, dx / dist);
                    this.camera_shake = 10;
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
                this.camera_shake = 15;
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
        if (!this.invader && this.stageData && !this.stageData.isEvent && !this.stageData.isExtra) {
            const hpRatio = this.battle.enemyTankHP / this.battle.enemyTankMaxHP;
            const stageNum = parseInt((this.stageData.id || '').replace('stage','')) || 1;
            // stage3以降かつ敵HP50%以下になったら侵入チャンス
            if (stageNum >= 3 && hpRatio < 0.5 && this.battle.phase === 'battle') {
                // 約30秒に1回 (1800フレーム) 侵入
                const invadeInterval = Math.max(900, 1800 - stageNum * 120);
                if (this.frame % invadeInterval === 0 && this.frame > 0) {
                    this.spawnBattleInvader();
                }
            }
        }

        // Check Victory (From Invasion or standard)
        if (this.battle.phase === 'victory') {
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
        if ((this.battle.phase === 'defeat' || this.battle.playerTankHP <= 0) && this.state !== 'defense') {
            this.startDefense();
        }

        // Trigger invasion or Ally Throw (Cキー)
        if (this.input.invade) {
            if (this.player.stackedAlly) {
                this.handleAllyThrow();
            } else if (this.battle.invasionAvailable) {
                this.startInvasion();
            }
        }

        // Check Player Death
        if (this.player.hp <= 0) {
            this.handlePlayerDeath();
        }
    }

    updateLaunching() {
        // Animation is handled by battle.projectiles
        this.battle.update();
        // Keep allies/ammo updating for background feel
        if (this.allies) {
            // battle中の飛翔アニメ中も this.invader が存在する可能性があるので渡す
            for (const ally of this.allies) ally.update(this.tank, this.ammoDropper.items, this.invader || null);
        }
        this.ammoDropper.update(this.tank.platforms, this.tank.dropX, this.tank.dropY, this.tank.dropW);
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
        // this.sound.playBGM('invasion'); // BGMを変えずに現在のBGMを継続
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
        this.screenFlash = 20; // Flash on invade transition
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
        this.tank = this.enemyTank;

        // Ammo dropper for enemy tank
        this.ammoDropper = new AmmoDropper();

        this.state = 'invasion';
        this.invasionVictoryTriggered = false; // Reset flag
    }

    updateInvasion() {
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
            const nearestDefender = defenders.length > 0 ? defenders.reduce((best, d) => {
                if (!best) return d;
                const bDist = Math.hypot((best.x+best.w/2) - 300, (best.y+best.h/2) - 500);
                const dDist = Math.hypot((d.x+d.w/2) - 300, (d.y+d.h/2) - 500);
                return dDist < bDist ? d : best;
            }, null) : null;
            for (const ally of this.allies) ally.update(this.tank, this.ammoDropper ? this.ammoDropper.items : [], nearestDefender);
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

        // Sabotage Check: Kick (Empty Hand)
        if (!this.player.heldItems.length && !this.player.stackedAlly && this.input.special) {
            this.player.isAttacking = true;
            this.player.attackDuration = 15;
            this.sound.play('jump');
            const cannons = this.tank.cannons;
            for (const c of cannons) {
                const dx = (c.x + c.w / 2) - (this.player.x + this.player.w / 2);
                const dy = (c.y + c.h / 2) - (this.player.y + this.player.h / 2);
                if (Math.abs(dx) < 60 && Math.abs(dy) < 60) {
                    c.takeDamage(5);
                    this.camera_shake = 2;
                }
            }
            specialUsedForSabotage = true;
        }

        // Sabotage Check: Throw Item at Cannon - moved from drawInvasionScene
        if (this.input.special && this.player.heldItems.length > 0) {
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
                this.player.attackDefender([]);
            }
            specialUsedForSabotage = true;
        } else if (this.input.special && this.player.stackedAlly) {
            this.handleAllyThrow();
            specialUsedForSabotage = true;
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
                // Load Cannon (Action Button)
                if (this.player.heldItems[0] !== 'water_bucket') {
                    if (this.player.tryLoadCannon(this.tank.cannons)) {
                        actionDone = true;
                    }
                }
            } else if (!switchInteracted) {
                if (this.player.tryPickup(this.ammoDropper.items)) {
                    // Picked up
                } else {
                    // Tail Attack if nothing else!
                    this.player.triggerTailAttack();
                }
            }
        }

        if (!specialUsedForSabotage && this.input.special && this.battle.specialActive <= 0) {
            this.battle.triggerSpecial();
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

        // Throw Logic (Defense Mode)
        if (this.input.special || this.input.cancel) {
            if (this.player.heldItems.length > 0) {
                // Determine target (nearest defender?)
                // For now, simple throw forward
                const defenders = this.tank.defenders;
                this.player.attackDefender(defenders);
            } else if (this.player.stackedAlly) {
                this.handleAllyThrow();
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
            ally.update(this.tank, this.ammoDropper.items, this.invader);
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
            this.resultWon = false;
            this.state = 'result';
            this.sound.playBGM('lose');
        }

        // Player Actions (Attack Invader)
        if (this.input.action) {
            // Tail Attack vs Invader
            this.player.triggerTailAttack();
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
                    this.invader.takeDamage(10, dx / dist);
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
        this.screenFlash = 10;

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

        // Override if boss stage? No, boss is tankType usually.
        // If tankType is special, keep it? 
        // Logic: if stageData.tankType is TRUE_BOSS, maybe spawn boss?
        // But for now, let's just add variety to the "soldier" invaders.

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
        this.screenFlash = 20;

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

        // Spawn Invader at top - ステージのtankTypeに応じた強さで侵入
        const entryX = (this.tank.dropX !== undefined) ? this.tank.dropX + 50 : 100;
        const entryY = (this.tank.dropY !== undefined) ? this.tank.dropY : 50;
        const defenseType = (this.stageData && this.stageData.tankType) ? this.stageData.tankType : 'NORMAL';
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
                this.camera_shake = 50;
                this.screenFlash = 30;
            }

            // 激しいカメラシェイク
            this.camera_shake = Math.max(3, Math.floor(this.destructionTimer / 8));

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
                this.screenFlash = 15;
                this.camera_shake = 30;

                for (let i = 0; i < 20; i++) {
                    const angle = (Math.PI * 2 * i) / 20;
                    this.particles.spark(centerX, centerY, Math.cos(angle) * 15, Math.sin(angle) * 15, '#FFD700');
                }
            }

            if (this.destructionTimer === 30) {
                const centerX = CONFIG.CANVAS_WIDTH - CONFIG.TANK.OFFSET_X - CONFIG.TANK.INTERIOR_W / 2;
                const centerY = CONFIG.TANK.OFFSET_Y + CONFIG.TANK.INTERIOR_H / 2;
                this.particles.explosion(centerX, centerY, '#FFFFFF', 100);
                this.screenFlash = 60;
                this.camera_shake = 80;
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
            const stats = this.missionStats || { enemiesDefeated: 0, totalDamage: 0, specialsUsed: 0, itemsCollected: 0 };
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
            notifyMission(SaveManager.updateMissionProgress(this.saveData, 'win_battles', 1));
            if (stats.enemiesDefeated > 0) notifyMission(SaveManager.updateMissionProgress(this.saveData, 'defeat_enemies', stats.enemiesDefeated));
            if (stats.totalDamage > 0) notifyMission(SaveManager.updateMissionProgress(this.saveData, 'deal_damage', stats.totalDamage));
            if (stats.specialsUsed > 0) notifyMission(SaveManager.updateMissionProgress(this.saveData, 'use_special', stats.specialsUsed));
            if (stats.itemsCollected > 0) notifyMission(SaveManager.updateMissionProgress(this.saveData, 'collect_items', stats.itemsCollected));
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
            if (this.stageData.allyReward) {
                const newAlly = this.stageData.allyReward;
                const existing = this.saveData.unlockedAllies.find(a => a.id === newAlly.id);
                if (existing) {
                    // 既に持っている場合はレベルアップ（何度クリアしても必ずもらえる設計）
                    existing.level = (existing.level || 1) + 1;
                    this.newlyUnlockedAlly = { ...existing, isLevelUp: true };
                } else {
                    // 初回クリア：新規追加
                    const ally = { ...newAlly, level: 1 };
                    this.saveData.unlockedAllies.push(ally);
                    this.newlyUnlockedAlly = ally;
                    SaveManager.addAllyToCollection(this.saveData, newAlly.type || 'slime');
                }
            }

            // ゴールド報酬計算
            const rewardGold = 1500 + Math.max(0, 3600 - (this.battle ? this.battle.battleTimer : 0)) * 0.5;
            const goldBoostLevel = this.saveData.upgrades.goldBoost || 0;
            const goldMultiplier = CONFIG.UPGRADES.GOLD_BOOST.BOOST_MULTIPLIER[goldBoostLevel] || 1.0;
            this.saveData.gold = (this.saveData.gold || 0) + Math.floor(rewardGold * 10 * goldMultiplier);

            // ハイスコア記録
            if (this.battle && typeof this.battle.battleTimer === 'number') {
                this.isNewRecord = SaveManager.saveHighScore(this.saveData, this.stageData.id, this.battle.battleTimer);
            }

            // 最終セーブ
            SaveManager.save(this.saveData);

            // 遷移処理
            if (this.stageData.id === 'stage8') {
                this.state = 'ending';
                this.frame = 0;
                return;
            }

            if (this.stageData.id === 'stage_boss') {
                this.state = 'story';
                this.prevState = 'battle';
                this.story.start('ending', () => {
                    this.state = 'result';
                    this.resultWon = true;
                    this.sound.play('victory');
                });
                return;
            }

            this.resultWon = true;
            this.state = 'result';
            this.sound.play('victory');
            this.screenFlash = 30;
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
    }

    handlePlayerDeath() {
        if (this.state === 'result') return;

        // 侵入中に死亡した場合、タンク状態を元に戻す（savedBattleStateリーク防止）
        if (this.state === 'invasion' && this.savedBattleState) {
            this.returnFromInvasion();
        }

        this.resultWon = false;
        this.state = 'result';
        this.saveData.losses = (this.saveData.losses || 0) + 1;
        SaveManager.save(this.saveData);

        // BGM停止して敗北BGMを再生
        this.sound.playBGM('lose');
    }

    // === NEW: Missing Method Fix ===
    updateResult() {
        // resultCursor: 0=もう一度 / 1=ステージ選択
        if (this.resultCursor === undefined) this.resultCursor = 0;

        // ◀▶ または ▲▼ カーソル移動（スマホタップでも使えるよう上下も対応）
        if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA') ||
            this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.resultCursor = 0;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD') ||
            this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.resultCursor = 1;
            this.sound.play('cursor');
        }

        if (this.input.menuConfirm || this.input.back) {
            this.sound.play('confirm');
            this.newlyUnlocked = [];
            this.newlyUnlockedAlly = null;
            this.gachaResult = null;

            if (this.input.back || this.resultCursor === 1) {
                // ステージ選択に戻る
                this.state = 'stage_select';
                this.sound.playBGM('title');
            } else {
                // もう一度: 同じステージをリスタート
                this.startBattle(this.stageIndex);
            }
            this.resultCursor = 0;
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
            const noShakeStates = ['story', 'dialogue', 'result', 'title', 'stage_select', 'upgrade', 'fusion', 'collection', 'daily_missions', 'ally_edit', 'deck_edit', 'event_select', 'ending'];
            if (this.camera_shake > 0 && !noShakeStates.includes(this.state)) {
                const mag = this.camera_shake * 0.7;
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
                    UI.drawTitle(ctx, W, H, this.frame);
                    break;
                case 'stage_select':
                    UI.drawStageSelect(ctx, W, H, this.selectedStage, this.saveData, this.frame, this.difficultySelectMode, this.selectedDifficulty);
                    break;
                case 'event_select':
                    UI.drawEventSelect(ctx, W, H, this.selectedStage, this.saveData, this.frame);
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
                        UI.drawSpecialImpact(ctx, W, H, this.specialImpactTimer, this.frame);
                    }
                    break;
                case 'invasion':
                case 'tank_destruction':
                    this.drawInvasionScene(ctx, W, H);
                    break;
                case 'result':
                    UI.drawResult(ctx, W, H, this.resultWon, this.stageData ? this.stageData.name : '', this.frame, this.battle ? this.battle.battleTimer : 0, this.isNewRecord);
                    break;
                case 'deck_edit':
                    UI.drawDeckEdit(ctx, W, H, this.saveData.unlockedAmmo, this.saveData.deck, this.deckCursor,
                    5 + (CONFIG.UPGRADES.CAPACITY.CAPACITY_INCREASE[this.saveData.upgrades.capacity || 0] || 0));
                    break;
                case 'ally_edit':
                    UI.drawAllyEdit(ctx, W, H, this.saveData.unlockedAllies, this.saveData.allyDeck, this.deckCursor, this.frame);
                    break;
                case 'upgrade':
                    UI.drawUpgradeMenu(ctx, W, H, this.saveData, this.deckCursor);
                    // ガチャ冒険演出オーバーレイ(デクリメントはupdateUpgrade()側で管理)
                    if (this.gachaAdventureTimer > 0) {
                        UI.drawGachaAdventureAnim(ctx, W, H, this.gachaAdventureRarity, this.gachaAdventureTimer, this.frame);
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
                    }
                    break;
                case 'settings':
                    UI.drawSettings(ctx, W, H, this.saveData, this.settingsCursor, this.frame);
                    break;
            }

            // Pause Overlay
            if (this.paused && ['battle', 'defense', 'invasion', 'countdown'].includes(this.state)) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
                ctx.fillRect(0, 0, W, H);

                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('⏸ ポーズ', W / 2, H / 2 - 60);

                const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                ctx.font = '20px Arial';
                ctx.fillStyle = '#CCC';
                ctx.fillText(isTouch ? 'ポーズボタン: 再開' : 'P / ESC: 再開', W / 2, H / 2 + 0);
                ctx.fillText(isTouch ? 'Bボタン: タイトルに戻る' : 'B / ESC: タイトルに戻る', W / 2, H / 2 + 32);
                ctx.fillText(isTouch ? '↺ ステージを最初から' : 'R: ステージをやり直す', W / 2, H / 2 + 64);

                ctx.font = '15px Arial';
                ctx.fillStyle = '#888';
                ctx.fillText('音量: +/-キー  ·  設定: タイトル → ⚙ 設定', W / 2, H / 2 + 108);
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
            // Don't call restore again - it was already called or failed
            // If restore failed, calling it again will cause stack underflow
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
                this.sound.play('error');
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
        let child = null;

        const check = (t1, t2) => (p1.type === t1 && p2.type === t2) || (p1.type === t2 && p2.type === t1);

        // === 基本配合（★2〜3）===
        if (check('slime_blue', 'slime_red')) {
            child = { id: 'slime_purple_' + Date.now(), name: 'パープルスライム', type: 'slime_purple', color: '#9C27B0', darkColor: '#6A1B9A', rarity: 2 };
        }
        else if (check('slime_metal', 'ninja')) {
            child = { id: 'steel_ninja_' + Date.now(), name: 'スティールニンジャ', type: 'steel_ninja', color: '#90A4AE', darkColor: '#546E7A', rarity: 4 };
        }
        else if (check('ghost', 'ninja')) {
            child = { id: 'phantom_' + Date.now(), name: 'ファントム', type: 'phantom', color: '#4A148C', darkColor: '#1A0033', rarity: 5 };
        }

        // === 魔法使い配合（wizard × ★2〜4）===
        else if (check('slime_red', 'wizard')) {
            child = { id: 'shadow_mage_' + Date.now(), name: 'シャドウメイジ', type: 'shadow_mage', color: '#5E35B1', darkColor: '#311B92', rarity: 5 };
        }
        else if (check('slime_blue', 'wizard')) {
            child = { id: 'sage_slime_' + Date.now(), name: '賢者スライム', type: 'sage_slime', color: '#2196F3', darkColor: '#0D47A1', rarity: 5 };
        }
        else if (check('slime_gold', 'wizard')) {
            child = { id: 'alchemist_' + Date.now(), name: '錬金術師', type: 'alchemist', color: '#FF8F00', darkColor: '#E65100', rarity: 5 };
        }

        // === 防衛・戦闘配合 ===
        else if (check('defender', 'golem')) {
            child = { id: 'fortress_golem_' + Date.now(), name: 'フォートレスゴーレム', type: 'fortress_golem', color: '#37474F', darkColor: '#263238', rarity: 5 };
        }
        else if (check('healer', 'golem')) {
            child = { id: 'paladin_' + Date.now(), name: 'パラディン', type: 'paladin', color: '#C0CA33', darkColor: '#9E9D24', rarity: 5 };
        }
        else if (check('drone', 'boss')) {
            child = { id: 'war_machine_' + Date.now(), name: 'ウォーマシン', type: 'war_machine', color: '#424242', darkColor: '#212121', rarity: 5 };
        }

        // === ★6 最終配合（配合産×配合産）===
        else if (check('fortress_golem', 'paladin')) {
            child = { id: 'titan_golem_' + Date.now(), name: 'タイタンゴーレム', type: 'titan_golem', color: '#212121', darkColor: '#000000', rarity: 6 };
        }
        else if (check('war_machine', 'shadow_mage')) {
            child = { id: 'dragon_lord_' + Date.now(), name: 'ドラゴンロード', type: 'dragon_lord', color: '#C62828', darkColor: '#B71C1C', rarity: 6 };
        }

        // Fallback: 親1を優先的に継承
        else {
            const parent = p1;
            child = {
                id: parent.type + '_' + Date.now(),
                name: parent.name,
                type: parent.type,
                color: parent.color,
                darkColor: parent.darkColor,
                rarity: parent.rarity || 1,
                level: (parent.level || 1) + 1,
                isFusion: true,
                chainDepth: (parent.chainDepth || 0) + 1,
            };
            this.fusionParents = [];
            this.saveData.unlockedAllies = this.saveData.unlockedAllies.filter(a => a !== p1 && a !== p2);
            const existingFallback = this.saveData.unlockedAllies.find(a => a.type === child.type);
            if (existingFallback) {
                existingFallback.level = (existingFallback.level || 1) + 1;
                child = { ...existingFallback, isLimitBreak: true }; // Bug Fix: show actual updated ally
            } else {
                this.saveData.unlockedAllies.push(child);
                SaveManager.addAllyToCollection(this.saveData, child.type); // 図鑑に登録
            }
            // fallbackも必ずセーブ
            SaveManager.save(this.saveData);
            this.gachaResult = child;
            this.sound.play('powerup');
            // 演出タイマーをセット（通常配合と同じフロー）
            this.fusionAnimTimer = 50;
            this.fusionAnimChild = child;
            this.camera_shake = 15;
            this.state = 'fusion';
            return;
        }

        if (child) {
            // 配合フラグ・深度をセット
            const parentDepth = Math.max(p1.chainDepth || 0, p2.chainDepth || 0);
            child.isFusion = true;
            child.chainDepth = parentDepth + 1;

            // 配合深度ボーナス
            const fusionDmgBonus = child.chainDepth >= 3 ? 1.40 : (child.chainDepth === 2 ? 1.25 : 1.10);
            child.fusionDmgBonus = fusionDmgBonus;

            // 配合直後はlevel=2（レベルアップ扱い）
            child.level = 2;

            // 大型仲間はコスト2
            const LARGE_TYPES = new Set(['titan_golem', 'platinum_golem', 'dragon_lord']);
            child.cost = LARGE_TYPES.has(child.type) ? 2 : 1;

            // 素材2体を消費
            this.fusionParents = [];
            this.saveData.unlockedAllies = this.saveData.unlockedAllies.filter(a => a !== p1 && a !== p2);

            // 既存の同タイプがいたらレベルアップ
            const existing = this.saveData.unlockedAllies.find(a => a.type === child.type);
            if (existing) {
                existing.level = (existing.level || 1) + 1;
                existing.isFusion = true;
                existing.chainDepth = Math.max(existing.chainDepth || 0, child.chainDepth);
                existing.fusionDmgBonus = Math.max(existing.fusionDmgBonus || 1, child.fusionDmgBonus);
                // (save は末尾で一括実行)
                this.gachaResult = { ...existing, isLimitBreak: true };
                this.sound.play('powerup');
            } else {
                this.saveData.unlockedAllies.push(child);
                SaveManager.addAllyToCollection(this.saveData, child.type); // 図鑑に登録
                this.gachaResult = child;
                this.sound.play('victory');
            }

            // ★ saveは1回だけ (複数回呼ぶと固まる原因になる)
            SaveManager.save(this.saveData);

            const color = child.color || '#FFD700';
            for (let i = 0; i < 5; i++) { // 固まり防止: 20→5
                this.particles.explosion(CONFIG.CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 150, CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 150, color, 15);
            }
            // 配合演出タイマー起動（50フレーム）
            this.fusionAnimTimer = 50;
            this.fusionAnimChild = this.gachaResult;
            this.camera_shake = 20;
        }
    }


    // ===== 欠落メソッド補完 =====

    // Bug Fix: drawTitleScreen was called but never defined
    drawTitleScreen(ctx, W, H) {
        UI.drawTitle(ctx, W, H, this.frame);
    }

    // Bug Fix: drawBattleScene was called but never defined
    drawBattleScene(ctx, W, H) {
        Renderer.drawSplitBackground(ctx, W, H, this.stageData || {});
        // パフォーマンス改善: 重い上画面描画を2フレームおき（30fps相当）
        if (this.battle) Renderer.drawUpperBattle(ctx, W, H, this.battle, this.state);
        if (this.tank) this.tank.draw(ctx);
        if (this.allies) for (const ally of this.allies) ally.draw(ctx);
        if (this.player) this.player.draw(ctx);
        if (this.ammoDropper) this.ammoDropper.draw(ctx);
        if (this.powerupManager) this.powerupManager.draw(ctx);
        if (this.invader) this.invader.draw(ctx);
        if (this.projectiles) {
            for (const p of this.projectiles) {
                if (p.active) Renderer.drawProjectile(ctx, p.x, p.y, p.type || 'rock', p.dir || 1);
            }
        }
        this.particles.draw(ctx);
        if (this.specialAnimTimer > 0) Renderer.drawSpecialCutin(ctx, W, H, this.specialAnimTimer);
        if (this.battle) UI.drawHUD(ctx, this.battle, this.stageData || {});
        if (this.screenFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255,255,255,${this.screenFlash * 0.04})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // ★スマホUI: バトルコンテキストをタッチコントローラに通知（ボタンラベル動的更新）
        if (this.touch && this.touch.mode === 'battle') {
            const nearCannon = this.player ? this.player.getNearCannon(this.tank ? this.tank.cannons : []) : null;
            this.touch.updateBattleContext({
                holdingItem:       this.player && this.player.heldItems.length > 0,
                holdingAlly:       this.player && !!this.player.stackedAlly,
                nearCannon:        !!nearCannon,
                invasionAvailable: this.battle && this.battle.invasionAvailable,
                specialReady:      this.battle && this.battle.specialGauge >= this.battle.maxSpecialGauge,
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
            ctx.fillStyle = `rgba(255,255,255,${this.screenFlash * 0.04})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
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
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            const itemCount = this.collectionTab === 0
                ? Object.keys(window.CONFIG?.ENEMY?.TYPES || {}).length
                : (window.CONFIG?.MASTER_ALLY_LIST?.length || 30);
            const canvasH = window.CONFIG?.CANVAS_HEIGHT || 600;
            const visibleItems = Math.floor((canvasH - 220) / collGap);
            const maxScroll = Math.max(0, (itemCount - visibleItems) * collGap);
            this.collectionScroll = Math.min(maxScroll, (this.collectionScroll||0) + collGap);
        }
        if (this.input.menuConfirm || this.input.back) { this.sound.play('select'); this.state = 'title'; }
    }

    // Bug Fix: updateUpgrade was called but never defined
    updateUpgrade() {
        // 演出タイマー管理
        if (this.gachaAdventureTimer > 0) this.gachaAdventureTimer--;

        const shopItems = [
            { id: 'hp',        type: 'upgrade',  cost: (this.saveData.upgrades.hp + 1) * 500 },
            { id: 'attack',    type: 'upgrade',  cost: (this.saveData.upgrades.attack + 1) * 800 },
            { id: 'goldBoost', type: 'upgrade',  cost: [1500,2500,4000,6000,8000][this.saveData.upgrades.goldBoost] || 0 },
            { id: 'capacity',  type: 'upgrade',  cost: [2000,3500,5500,8000,12000][this.saveData.upgrades.capacity||0] || 0 },
            { id: 'scout',     type: 'gacha',    cost: 1000 },
            { id: 'scout_10',  type: 'gacha_10', cost: 8000 },
            { id: 'bomb',      type: 'ammo',     cost: 1500 },
            { id: 'ironball',  type: 'ammo',     cost: 2000 },
            { id: 'missile',   type: 'ammo',     cost: 3000 },
            { id: 'exit',      type: 'system',   cost: 0 },
        ];
        // Advance gacha queue on confirm
        if (this.gachaQueue && this.gachaQueue.length > 0) {
            if (this.input.menuConfirm || this.input.back) {
                const next = this.gachaQueue.shift();
                this.gachaAdventureRarity = next.rarity || 1;
                this.gachaAdventureTimer = 90; // 1.5秒冒険演出
                this.gachaResult = next;
                this.sound.play('confirm');
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
                    : (item.id === 'goldBoost' ? CONFIG.UPGRADES.GOLD_BOOST.MAX_LEVEL : CONFIG.UPGRADES.CAPACITY.MAX_LEVEL);
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
            } else if (item.type === 'ammo') {
                if (!this.saveData.unlockedAmmo.includes(item.id)) {
                    this.saveData.gold -= item.cost;
                    this.saveData.unlockedAmmo.push(item.id);
                    this.sound.play('powerup');
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '弾GET！', '#4CAF50');
                    SaveManager.save(this.saveData);
                } else {
                    this.sound.play('damage');
                    this.particles.damageNum(CONFIG.CANVAS_WIDTH / 2, 200, '入手済み', '#888');
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

    // Bug Fix: buyGacha (single) was called but never defined
    buyGacha() {
        const rand = Math.random();
        let type, name, color, darkColor, rarity;
        if (rand < 0.35) {
            const v = [
                { type:'slime',      name:'スライム',       color:'#4CAF50', darkColor:'#2E7D32', rarity:1 },
                { type:'slime_red',  name:'レッドスライム', color:'#F44336', darkColor:'#B71C1C', rarity:2 },
                { type:'slime_blue', name:'ブルースライム', color:'#2196F3', darkColor:'#0D47A1', rarity:2 },
            ][Math.floor(Math.random()*3)];
            ({ type,name,color,darkColor,rarity } = v);
        } else if (rand < 0.65) {
            const v = [
                { type:'slime_metal',name:'クロームスライム',  color:'#B0BEC5',darkColor:'#78909C',rarity:3 },
                { type:'ninja',      name:'ニンジャスライム',color:'#212121',darkColor:'#000000',rarity:3 },
                { type:'defender',   name:'ディフェンダー',  color:'#607D8B',darkColor:'#455A64',rarity:3 },
                { type:'healer',     name:'ヒーラースライム',color:'#81C784',darkColor:'#388E3C',rarity:3 },
                { type:'ghost',      name:'どろろん',        color:'#CE93D8',darkColor:'#7B1FA2',rarity:3 },
            ][Math.floor(Math.random()*5)];
            ({ type,name,color,darkColor,rarity } = v);
        } else if (rand < 0.85) {
            const v = [
                { type:'wizard',    name:'魔法使いスライム',color:'#7B1FA2',darkColor:'#4A148C',rarity:4 },
                { type:'golem',     name:'ゴーレムスライム',color:'#795548',darkColor:'#5D4037',rarity:4 },
                { type:'slime_gold',name:'ゴールデンスライム',color:'#FFD700',darkColor:'#FFA000',rarity:4 },
            ][Math.floor(Math.random()*3)];
            ({ type,name,color,darkColor,rarity } = v);
        } else if (rand < 0.99) {
            // ウルトラレア (rarity5): 14%
            const v = [
                { type:'angel',    name:'エンゼルスライム',color:'#FFF59D',darkColor:'#FBC02D',rarity:5 },
                { type:'master',   name:'老師',            color:'#880E4F',darkColor:'#560027',rarity:5 },
                { type:'drone',    name:'ドローン',        color:'#607D8B',darkColor:'#455A64',rarity:5 },
                { type:'boss',     name:'ボススライム',    color:'#9C27B0',darkColor:'#6A1B9A',rarity:5 },
                { type:'metalking',name:'クロームキング',  color:'#B0BEC5',darkColor:'#78909C',rarity:5 },
                { type:'ultimate', name:'究極スライム',    color:'#FF6F00',darkColor:'#E65100',rarity:5 },
            ][Math.floor(Math.random()*6)];
            ({ type,name,color,darkColor,rarity } = v);
        } else {
            // SSR (rarity6): 1%
            const v = [
                { type:'dragon_lord',  name:'ドラゴンロード',    color:'#C62828',darkColor:'#7F0000',rarity:6 },
                { type:'shadow_mage',  name:'シャドウメイジ',    color:'#5E35B1',darkColor:'#311B92',rarity:6 },
                { type:'sage_slime',   name:'賢者スライム',      color:'#448AFF',darkColor:'#1565C0',rarity:6 },
            ][Math.floor(Math.random()*3)];
            ({ type,name,color,darkColor,rarity } = v);
        }
        const existing = this.saveData.unlockedAllies.find(a => a.type === type);
        if (existing) {
            existing.level = (existing.level||1) + 1;
            this.gachaResult = { ...existing, isLimitBreak: true };
        } else {
            const LARGE_TYPES_GACHA = new Set(['titan_golem', 'platinum_golem', 'dragon_lord']);
            const cost = LARGE_TYPES_GACHA.has(type) ? 2 : 1;
            const a = { id:`ally_${Date.now()}`, type, name, color, darkColor, rarity, level:1, cost };
            this.saveData.unlockedAllies.push(a);
            this.gachaResult = { ...a };
        }
        // ガチャ冒険演出トリガー
        this.gachaAdventureRarity = rarity || 1;
        this.gachaAdventureTimer = 100;
        this.sound.play('confirm');
    }

    // Bug Fix: updateEnding was called but never defined
    updateEnding() {
        if (this.frame > 180 && (this.input.menuConfirm || this.input.back)) {
            this.sound.play('confirm');
            this.state = 'complete_clear';
        }
    }

    // =====================================================
    // ★新規: 設定画面ロジック
    // =====================================================
    updateSettings() {
        const ITEMS_COUNT = 4; // 音量・書き出し・読み込み・戻る

        if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
            this.settingsCursor = (this.settingsCursor - 1 + ITEMS_COUNT) % ITEMS_COUNT;
            this.sound.play('cursor');
        }
        if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
            this.settingsCursor = (this.settingsCursor + 1) % ITEMS_COUNT;
            this.sound.play('cursor');
        }

        // 音量スライダー (cursor=0) は ◀▶ で操作
        if (this.settingsCursor === 0) {
            if (this.input.pressed('ArrowLeft')) {
                this.saveData.settings.vol = Math.max(0, Math.round((this.saveData.settings.vol - 0.1) * 10) / 10);
                this.sound.vol = this.saveData.settings.vol;
                SaveManager.save(this.saveData);
            }
            if (this.input.pressed('ArrowRight')) {
                this.saveData.settings.vol = Math.min(1, Math.round((this.saveData.settings.vol + 0.1) * 10) / 10);
                this.sound.vol = this.saveData.settings.vol;
                SaveManager.save(this.saveData);
            }
        }

        if (this.input.menuConfirm) {
            this.sound.play('confirm');
            switch (this.settingsCursor) {
                case 1: // 書き出し
                    if (SaveManager.exportData(this.saveData)) {
                        this.particles.damageNum(300, 400, '💾 保存しました！', '#4CAF50');
                    }
                    break;
                case 2: // 読み込み
                    SaveManager.importData(
                        () => { location.reload(); },
                        (err) => { this.particles.damageNum(300, 400, '⚠ 読み込み失敗', '#FF4444'); }
                    );
                    break;
                case 3: // 戻る
                    this.state = 'title';
                    break;
            }
        }

        if (this.input.back) {
            this.sound.play('cancel');
            this.state = 'title';
        }
    }

    // =====================================================
    // ★新規: タップ座標をヒット領域と照合してメニュー操作
    // =====================================================
    _processTap(pos) {
        const regions = window._menuHitRegions;
        if (!regions) {
            // ヒット領域がない → 決定キー相当
            this.input.keys['Space'] = true;
            setTimeout(() => { this.input.keys['Space'] = false; }, 80);
            return;
        }

        // 音量スライダーのタップ判定 (設定画面のみ)
        if (this.state === 'settings' && this.settingsCursor === 0 && window._volSliderRect) {
            const r = window._volSliderRect;
            if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                const newVol = Math.round(((pos.x - r.x) / r.w) * 10) / 10;
                this.saveData.settings.vol = Math.max(0, Math.min(1, newVol));
                this.sound.vol = this.saveData.settings.vol;
                SaveManager.save(this.saveData);
                this.sound.play('cursor');
                return;
            }
        }

        // ★バグ修正⑤: スクロールオフセットを画面ごとに個別適用
        // (以前は _stageSelectScrollY が 0 のとき _allyScrollY が stage 判定に漏れていた)
        for (const region of regions) {
            const ry = region.y
                + (region.type === 'stage'    ? (window._stageSelectScrollY || 0) : 0)
                + (region.type === 'allyItem' ? (window._allyScrollY        || 0) : 0);
            if (
                pos.x >= region.x && pos.x <= region.x + region.w &&
                pos.y >= ry       && pos.y <= ry + region.h
            ) {
                const currentIdx = this._getCurrentCursor();

                if (currentIdx === region.index) {
                    // すでに選択中 → 決定
                    this.input.keys['Space'] = true;
                    setTimeout(() => { this.input.keys['Space'] = false; }, 80);
                } else {
                    // 未選択 → カーソルを移動 (差分分だけ上下キーを発火)
                    const diff = region.index - currentIdx;
                    const key = diff > 0 ? 'ArrowDown' : 'ArrowUp';
                    const steps = Math.abs(diff);
                    for (let i = 0; i < steps; i++) {
                        setTimeout(() => {
                            this.input.keys[key] = true;
                            setTimeout(() => { this.input.keys[key] = false; }, 60);
                        }, i * 30);
                    }
                    // 最後に移動完了後 "確定" タップと同じ動作にする場合は2回目タップを待つ
                    // → 今回は1タップで選択のみ（2回目タップで確定）
                }
                this.sound.play('cursor');
                return;
            }
        }

        // どこにもヒットしなかった → 決定扱い
        this.input.keys['Space'] = true;
        setTimeout(() => { this.input.keys['Space'] = false; }, 80);
    }

    _getCurrentCursor() {
        switch (this.state) {
            case 'title':       return this.titleCursor;
            case 'stage_select':return this.selectedStage;
            case 'event_select':return this.selectedStage;
            case 'deck_edit':   return this.deckCursor;
            case 'ally_edit':   return this.deckCursor;
            case 'upgrade':     return this.deckCursor;
            case 'settings':    return this.settingsCursor;
            case 'result':      return this.resultCursor || 0;
            default:            return 0;
        }
    }

    // ===== 10連スカウト =====
    buy10Gacha() {
        const results = [];
        for (let i = 0; i < 10; i++) {
            // buyGachaの内部ロジックをここで直接呼び出す
            const rand = Math.random();
            let type, name, color, darkColor, rarity;

            if (rand < 0.35) {
                const variants = [
                    { type: 'slime',      name: 'スライム',       color: '#4CAF50', darkColor: '#2E7D32', rarity: 1 },
                    { type: 'slime_red',  name: 'レッドスライム', color: '#F44336', darkColor: '#B71C1C', rarity: 2 },
                    { type: 'slime_blue', name: 'ブルースライム', color: '#2196F3', darkColor: '#0D47A1', rarity: 2 },
                ];
                const v = variants[Math.floor(Math.random() * variants.length)];
                ({ type, name, color, darkColor, rarity } = v);
            } else if (rand < 0.65) {
                const variants = [
                    { type: 'slime_metal', name: 'クロームスライム',   color: '#B0BEC5', darkColor: '#78909C', rarity: 3 },
                    { type: 'ninja',       name: 'ニンジャスライム', color: '#212121', darkColor: '#000000', rarity: 3 },
                    { type: 'defender',    name: 'ディフェンダー',   color: '#607D8B', darkColor: '#455A64', rarity: 3 },
                    { type: 'healer',      name: 'ヒーラースライム', color: '#81C784', darkColor: '#388E3C', rarity: 3 },
                    { type: 'ghost',       name: 'どろろん',         color: '#CE93D8', darkColor: '#7B1FA2', rarity: 3 },
                ];
                const v = variants[Math.floor(Math.random() * variants.length)];
                ({ type, name, color, darkColor, rarity } = v);
            } else if (rand < 0.85) {
                const variants = [
                    { type: 'wizard',     name: '魔法使いスライム', color: '#7B1FA2', darkColor: '#4A148C', rarity: 4 },
                    { type: 'golem',      name: 'ゴーレムスライム', color: '#795548', darkColor: '#5D4037', rarity: 4 },
                    { type: 'slime_gold', name: 'ゴールデンスライム', color: '#FFD700', darkColor: '#FFA000', rarity: 4 },
                ];
                const v = variants[Math.floor(Math.random() * variants.length)];
                ({ type, name, color, darkColor, rarity } = v);
            } else if (rand < 0.99) {
                // ウルトラレア (rarity5): 14%
                const variants = [
                    { type: 'angel',     name: 'エンジェルスライム', color: '#FFF59D', darkColor: '#FBC02D', rarity: 5 },
                    { type: 'master',    name: '老師',             color: '#880E4F', darkColor: '#560027', rarity: 5 },
                    { type: 'drone',     name: 'ドローン',         color: '#607D8B', darkColor: '#455A64', rarity: 5 },
                    { type: 'boss',      name: 'ボススライム',     color: '#9C27B0', darkColor: '#6A1B9A', rarity: 5 },
                    { type: 'metalking', name: 'クロームキング',   color: '#B0BEC5', darkColor: '#78909C', rarity: 5 },
                    { type: 'ultimate',  name: '究極スライム',     color: '#FF6F00', darkColor: '#E65100', rarity: 5 },
                ];
                const v = variants[Math.floor(Math.random() * variants.length)];
                ({ type, name, color, darkColor, rarity } = v);
            } else {
                // SSR (rarity6): 1%
                const variants = [
                    { type: 'dragon_lord', name: 'ドラゴンロード', color: '#C62828', darkColor: '#7F0000', rarity: 6 },
                    { type: 'shadow_mage', name: 'シャドウメイジ', color: '#5E35B1', darkColor: '#311B92', rarity: 6 },
                    { type: 'sage_slime',  name: '賢者スライム',   color: '#448AFF', darkColor: '#1565C0', rarity: 6 },
                ];
                const v = variants[Math.floor(Math.random() * variants.length)];
                ({ type, name, color, darkColor, rarity } = v);
            }

            const existing = this.saveData.unlockedAllies.find(a => a.type === type);
            let result;
            if (existing) {
                existing.level = (existing.level || 1) + 1;
                result = { ...existing, isLimitBreak: true };
            } else {
                const LARGE_10 = new Set(['titan_golem', 'platinum_golem', 'dragon_lord']);
                const newAlly = {
                    id: `ally_${Date.now() + i * 100}_${i}`,
                    type, name, color, darkColor, rarity,
                    level: 1,
                    cost: LARGE_10.has(type) ? 2 : 1,
                };
                this.saveData.unlockedAllies.push(newAlly);
                SaveManager.addAllyToCollection(this.saveData, newAlly.type); // 図鑑登録
                result = { ...newAlly };
            }
            result._queueIndex = i + 1;
            result._queueTotal = 10;
            results.push(result);
        }

        SaveManager.save(this.saveData);

        // レアリティ昇順に並べ替え（最後に一番いいのが来るように）
        results.sort((a, b) => a.rarity - b.rarity);
        results.forEach((r, i) => { r._queueIndex = i + 1; });

        this.gachaQueue = results.slice(1);
        this.gachaResult = results[0];
        this.sound.play('confirm');
    }


}

// Start the game when page loads
window.addEventListener('load', () => {
    try {
        new Game();
    } catch (e) {
        console.error("FATAL GAME START ERROR:", e);
        if (window.confirm("Game failed to start. Reset save data?")) {
            localStorage.removeItem('slime_tank_v2');
            location.reload();
        }
    }
});
