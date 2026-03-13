// ======================================
// CONFIG - Game Constants
// ======================================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 800, // Vertical (DS style)
    GRAVITY: 0, // No gravity in top-down (Unused?)

    PHYSICS: {
        GRAVITY: 0.5,
        FRICTION: 0.85,
    },

    PLAYER: {
        WIDTH: 24,
        HEIGHT: 28,
        SPEED: 3.5,
        STUN_DURATION: 60, // frames player is paralyzed when hit
    },

    TANK: {
        // Interior drawing offset (Lower Screen)
        OFFSET_X: 20,
        OFFSET_Y: 420, // Lower half
        INTERIOR_W: 560,
        INTERIOR_H: 360,
        DEFAULT_HP: 100,
        WALL_THICKNESS: 18,
        COCKPIT: { x: 440, y: 150, w: 80, h: 40 }, // Position of control console
    },

    CANNON: {
        LOAD_TIME: 35,
        WIDTH: 90,
        HEIGHT: 36,
    },

    AMMO: {
        DROP_INTERVAL: 55,
        MAX_ON_FLOOR: 10,
        SIZE: 16,
        FALL_SPEED: 2.5,
    },

    ALLY: {
        SPEED: 3.0,
        THINK_INTERVAL: 15,
        JUMP_FORCE: -9,
    },

    PROJECTILE: {
        SPEED: 1.5, // Much slower for tactical dodging/interception
        TRAVEL_TIME: 120, // Live longer to cross screen
        CROSSHAIR_SPEED: 4,
        DODGE_SPEED: 8,
        DODGE_DURATION: 20,
    },

    ENEMY: {
        BASE_FIRE_INTERVAL: 120,  // 射撃頻度アップ 200 → 120
        BASE_DAMAGE: 12,  // 18から12に戻す（序盤の難易度を緩和）
        // ステージ番号に応じた倍率（stages.jsで stage.damageMult を参照）
        // 未設定のステージは 1.0 扱い。後半ステージは 1.3〜1.6 程度を推奨。
        STAGE_DAMAGE_MULT_DEFAULT: 1.0,
        TYPES: {
            // HP大幅強化！全タイプのHPを2倍以上に
            NORMAL: { id: 'normal', dodgeProb: 0.15, speedMod: 1.2, hpMod: 6.0, color: '#ED7D31' },
            HEAVY: { id: 'heavy', dodgeProb: 0.08, speedMod: 0.9, hpMod: 12.0, sizeMod: 1.3, color: '#8B4513' },
            SCOUT: { id: 'scout', dodgeProb: 0.4, speedMod: 1.6, hpMod: 5.0, fireRateMod: 0.6, color: '#32CD32' },
            MAGICAL: { id: 'magical', dodgeProb: 0.25, speedMod: 1.2, hpMod: 7.0, specialAmmoProb: 0.7, color: '#9C27B0' },
            DEFENSE: { id: 'defense', dodgeProb: 0.05, speedMod: 0.7, hpMod: 15.0, sizeMod: 1.4, color: '#FBC02D' },
            BOSS: { id: 'boss', dodgeProb: 0.2, speedMod: 1.3, hpMod: 18.0, sizeMod: 1.5, fireRateMod: 0.5, specialAmmoProb: 0.8, color: '#212121' },
            TRUE_BOSS: { id: 'true_boss', dodgeProb: 0.3, speedMod: 1.8, hpMod: 25.0, sizeMod: 1.6, fireRateMod: 0.4, specialAmmoProb: 0.95, color: '#4A148C' }
        }
    },

    SPECIAL: {
        GAUGE_MAX: 100,
        GAIN_ON_HIT: 15,     // 当てた時 (Increased from 7 to 15)
        GAIN_ON_DAMAGE: 25,  // 食らった時 (Increased from 10 to 25)
        RUSH_DURATION: 150, // 発動時間（フレーム）
    },

    SUPPORT: {
        HP_THRESHOLD: 35,   // 35%以下で支援開始
        PROBABILITY: 0.003, // 毎フレームの支援発生率
        // ITEMS removed (Now uses Deck)
    },

    ENGINE_CORE: {
        HP: 150, // 大幅強化 50 → 150
        WIDTH: 50,
        HEIGHT: 45,
    },

    COLORS: {
        PLAYER: '#F5F5F5',
        PLAYER_DARK: '#BDBDBD',
        PLAYER_LIGHT: '#FFFFFF',
        ALLY: '#4CAF50',
        ALLY_DARK: '#2E7D32',
        ENEMY_SLIME: '#ED7D31',
        ENEMY_SLIME_DARK: '#C45E1A',
        BOSS: '#9C27B0',
        BOSS_DARK: '#6A1B9A',

        TANK_OUTER: '#58CCF5', // Slime Blue
        TANK_OUTER_DARK: '#2A9FD6',
        TANK_INNER_BG: '#D4C4A0',
        TANK_TOWER: '#E6C685', // Brick tower
        TANK_ROOF: '#FF6F3C',  // Orange roof
        PLATFORM: '#A08450',
        PLATFORM_DARK: '#806030',
        CANNON: '#4A5060',
        CANNON_DARK: '#3A4050',
        CANNON_BARREL: '#6A7080',

        SKY_TOP: '#3A80C0',
        SKY_BOT: '#88C8F0',
        GROUND: '#6B8E23',
        GROUND_DARK: '#4A6B10',

        HP_GREEN: '#4CAF50',
        HP_YELLOW: '#FFC107',
        HP_RED: '#F44336',
        HP_BG: '#333',
        UI_BG: 'rgba(0,0,0,0.75)',

        // HUD Colors
        HUD_BLUE: '#2A4A9A',
        HUD_BLUE_DARK: '#1A2A6A',
        HUD_BLUE_LIGHT: '#4A6ABA',
        HUD_GOLD: '#FFD700',
        HUD_WHITE: '#FFFFFF',
        MAP_BG: 'rgba(0,0,0,0.5)',
        MAP_PLAYER: '#F5F5F5',
        MAP_PLATFORM: '#AAA',
    },

    AMMO_TYPES: {
        rock: { name: 'いしころ', damage: 8, weight: 30, color: '#888', icon: '🪨' },
        bomb: { name: 'ばくだん岩', damage: 18, weight: 10, color: '#333', icon: '💣' },
        arrow: { name: 'や', damage: 12, weight: 20, color: '#8B4513', icon: '🏹' },
        ironball: { name: 'てっきゅう', damage: 25, weight: 5, color: '#555', icon: '⚫' },
        herb: { name: 'かいふくのみ', damage: 0, weight: 20, color: '#2E7D32', icon: '🌿', heal: 15 },
        shield: { name: 'たて', damage: 0, weight: 15, color: '#DAA520', icon: '🛡️', block: true },
        missile: { name: 'ミサイル', damage: 30, weight: 8, color: '#FF4400', icon: '🚀' },

        // Magic Shells
        fire: { name: 'ファイア弾', damage: 15, weight: 12, color: '#FF5722', icon: '🔥', effect: 'burn' },
        ice: { name: 'アイス弾', damage: 10, weight: 12, color: '#4FC3F7', icon: '❄️', effect: 'freeze' },
        thunder: { name: 'サンダー弾', icon: '⚡', color: '#FFEB3B', damage: 45, effect: 'shock', speedMod: 1.2 },

        // Special Items
        water_bucket: { name: '水バケツ', icon: '🪣', color: '#2196F3', damage: 0, firefighting: true },
        rock_p: { name: 'パワフルいし', damage: 15, weight: 0, color: '#FFD700', icon: '✨' },

        // Stage Rewards (Missing definitions)
        crown: { name: 'おうかん', damage: 0, weight: 15, color: '#FFD700', icon: '👑', special: 'victory' },
        leaf_storm: { name: 'リーフストーム', damage: 20, weight: 12, color: '#2E7D32', icon: '🍃', effect: 'wind' },
        sun_stone: { name: 'たいようのいし', damage: 28, weight: 8, color: '#FFA000', icon: '☀️', effect: 'burn' },
        wood_armor: { name: 'もくのよろい', damage: 5, weight: 18, color: '#6D4C41', icon: '🛡️', defense: 10 },

        // Event Rewards
        gold_coin: { name: 'きんか', damage: 5, weight: 10, color: '#FFD700', icon: '💰' },
        rare_metal: { name: 'レアメタル', damage: 40, weight: 5, color: '#B0BEC5', icon: '💎' },
        turbo_parts: { name: 'ターボパーツ', damage: 10, weight: 15, color: '#03A9F4', icon: '⚙️' },
        mega_herb: { name: 'せいめいのは', damage: 0, weight: 10, color: '#81C784', icon: '🍃', heal: 100 },
        iron_shield: { name: 'てつのたて', damage: 0, weight: 5, color: '#607D8B', icon: '🛡️', block: true },
        exp_boost: { name: 'きんのたまご', damage: 0, weight: 20, color: '#FFF176', icon: '🥚' },
        legendary_core: { name: 'でんせつのコア', damage: 100, weight: 0, color: '#FFD700', icon: '🌟' },
        master_emblem: { name: 'おうじゃのしるし', damage: 50, weight: 0, color: '#C0C0C0', icon: '🎖️' },
        ultimate_parts: { name: 'アルティメットパーツ', damage: 80, weight: 0, color: '#E91E63', icon: '🛠️' },
    },

    FIRE: {
        DAMAGE_TO_PLAYER: 5,
        DAMAGE_TO_TANK: 0.05, // DoT for tank HP per frame per fire
        EXTINGUISH_DIST: 50,
        LIFETIME: 600, // Optional: fires die out eventually? (Let's make them persistent until extinguished)
    },

    DIFFICULTY: {
        EASY: {
            id: 'easy',
            name: 'イージー',
            enemyDamageMult: 0.7,
            ammoDropRateMult: 1.2,
            playerHPMult: 1.2,
            color: '#4CAF50'
        },
        NORMAL: {
            id: 'normal',
            name: 'ノーマル',
            enemyDamageMult: 1.0,
            ammoDropRateMult: 1.0,
            playerHPMult: 1.0,
            color: '#2196F3'
        },
        HARD: {
            id: 'hard',
            name: 'ハード',
            enemyDamageMult: 1.3,
            ammoDropRateMult: 0.85,
            playerHPMult: 1.0,
            color: '#FF5722'
        },
    },

    POWERUP: {
        DOUBLE_AMMO: {
            id: 'double_ammo',
            name: '２ばい弾',
            icon: '⚡',
            duration: 300, // 5 seconds
            color: '#FFD700',
            description: 'しばらく弾が2倍になる！'
        },
        SHIELD: {
            id: 'shield_buff',
            name: 'シールド',
            icon: '🛡️',
            duration: 300,
            color: '#4FC3F7',
            absorption: 30,
            description: 'ダメージを少し無効化する'
        },
        SLOW_TIME: {
            id: 'slow_time',
            name: 'スローモー',
            icon: '⏱️',
            duration: 240,
            color: '#9C27B0',
            slowFactor: 0.5,
            description: 'ゆっくり時間が流れる'
        },
        SPEED_UP: {
            id: 'speed_up',
            name: 'スピード',
            icon: '🚀',
            duration: 360,
            color: '#FF6F00',
            speedMult: 1.5,
            description: 'スピードがアップする'
        },
        HEAL: {
            id: 'heal',
            name: 'リカバー',
            icon: '💚',
            duration: 0, // Instant
            color: '#4CAF50',
            healAmount: 50,
            description: 'HPが回復する'
        }
    },

    POWERUP_SPAWN_RATE: 0.008, // Probability per enemy killed

    UPGRADES: {
        GOLD_BOOST: {
            MAX_LEVEL: 5,
            COSTS: [1500, 2500, 4000, 6000, 8000], // Cost for each upgrade level
            BOOST_MULTIPLIER: [1.0, 1.06, 1.12, 1.18, 1.24, 1.30], // Gold multiplier by level (0-5) - Max 30% boost at level 5
        },
        HP: {
            BASE_COST: 500,
            COST_MULTIPLIER: 1.6, // Cost increases by 1.6x each level
            MAX_LEVEL: 30,
        },
        ATTACK: {
            BASE_COST: 800,
            COST_MULTIPLIER: 1.6, // Cost increases by 1.6x each level
            MAX_LEVEL: 30,
        },
        CAPACITY: {
            MAX_LEVEL: 5,
            COSTS: [2000, 3500, 5500, 8000, 12000], // Cost for each capacity upgrade level
            CAPACITY_INCREASE: [0, 2, 4, 6, 8, 10], // Additional slots by level (0-5)
        },
        MAX_ALLY_SLOT: {
            MAX_LEVEL: 2,
            COSTS: [5000, 10000], // 仲間コスト枠+1（最大+2まで）
        },
    },

    // ======================================
    // ALLY_RARITY_STATS - レア度別ステータス定義
    // ★が上がるほど攻撃力・速度・クリティカル・攻撃間隔が大幅強化
    // ======================================
    // ★レア度別ステータス
    // 攻撃力は対数カーブ（隣接★の倍率を約1.4倍前後に統一）
    // クリティカル・速度・攻撃間隔もなだらかに調整
    ALLY_RARITY_STATS: {
        1: { baseDamage: 8,  speedMult: 1.0,  critChance: 0.05, atkInterval: 45, label: '★1' }, // 基準
        2: { baseDamage: 12, speedMult: 1.1,  critChance: 0.08, atkInterval: 38, label: '★2' }, // ×1.5 (★1より明確に強く)
        3: { baseDamage: 18, speedMult: 1.2,  critChance: 0.12, atkInterval: 30, label: '★3' }, // ×1.5
        4: { baseDamage: 26, speedMult: 1.32, critChance: 0.16, atkInterval: 23, label: '★4' }, // ×1.44
        5: { baseDamage: 38, speedMult: 1.48, critChance: 0.22, atkInterval: 16, label: '★5' }, // ×1.46
        6: { baseDamage: 55, speedMult: 1.65, critChance: 0.30, atkInterval: 11, label: '★6' }, // ×1.45
        7: { baseDamage: 80, speedMult: 1.85, critChance: 0.40, atkInterval:  9, label: '★7' }, // ×1.45
    },

    // タイプ → デフォルトレア度マップ（configにrarity未設定の場合のフォールバック）
    ALLY_TYPE_RARITY: {
        // === 通常ガチャ ★1〜★5 ===
        slime: 1,
        slime_red: 2, slime_blue: 2,
        slime_metal: 3, ninja: 3, defender: 3, healer: 3, ghost: 3,
        slime_gold: 4, wizard: 4, golem: 4,
        angel: 5, master: 5, drone: 5, boss: 5,
        metalking: 5, ultimate: 5,
        // === ステージ報酬 ===
        special: 5,
        // === 配合産 ★4 ===
        slime_purple: 4, slime_aqua: 4, // ★修正B4: 配合産は★4相当
        platinum_slime: 6, steel_ninja: 4,
        // === 配合産 ★5（ガチャ×ガチャ）===
        shadow_mage: 5, arch_angel: 6, sage_slime: 5, alchemist: 5, // ★修正B1: ガチャ★6の正しいレア度
        fortress_golem: 5, royal_guard: 5, paladin: 5,
        war_machine: 5, wyvern_lord: 6, legend_metal: 6, // ★修正B1
        phantom: 5, angel_golem: 5,
        // === 配合産 ★6（配合産×配合産 → 最強）===
        titan_golem: 6, platinum_golem: 6, dragon_lord: 6,
    },

    MASTER_ALLY_LIST: [
        // === 通常ガチャ ★1〜★2 ===
        { type: 'slime',         name: 'スライム' },
        { type: 'slime_blue',    name: 'ブルースライム' },
        { type: 'slime_red',     name: 'レッドスライム' },
        // === 通常ガチャ ★3 ===
        { type: 'slime_metal',   name: 'クロームスライム' },
        { type: 'slime_gold',    name: 'ゴールデンスライム' },
        { type: 'ninja',         name: 'ニンジャスライム' },
        { type: 'defender',      name: 'ディフェンダー' },
        { type: 'healer',        name: 'ヒーラースライム' },
        { type: 'ghost',         name: 'どろろん' },
        // === 通常ガチャ ★4 ===
        { type: 'wizard',        name: '魔法使いスライム' },
        { type: 'golem',         name: 'ゴーレムスライム' },
        // === 通常ガチャ ★5 ===
        { type: 'angel',         name: 'エンジェルスライム' },
        { type: 'master',        name: '老師' },
        { type: 'boss',          name: 'ボススライム' },
        { type: 'drone',         name: 'ドローン' },
        { type: 'metalking',     name: 'クロームキング' },
        { type: 'ultimate',      name: '究極スライム' },
        // === ステージ報酬 ===
        { type: 'special',       name: 'ダークJr' },
        // === 配合産 ★4（ガチャ×ガチャ）===
        { type: 'slime_purple',  name: 'パープルスライム', isFusion: true },
        { type: 'slime_aqua',    name: 'アクアスライム',   isFusion: true },
        { type: 'platinum_slime',name: 'プラチナスライム', isFusion: true },
        { type: 'steel_ninja',   name: 'スティールニンジャ', isFusion: true },
        // === 配合産 ★5（ガチャ×ガチャ）===
        { type: 'shadow_mage',   name: 'シャドウメイジ',       isFusion: true },
        { type: 'arch_angel',    name: 'アークエンジェル',     isFusion: true },
        { type: 'sage_slime',    name: '賢者スライム',         isFusion: true },
        { type: 'alchemist',     name: '錬金術師',             isFusion: true },
        { type: 'fortress_golem',name: 'フォートレスゴーレム', isFusion: true },
        { type: 'royal_guard',   name: 'ロイヤルガード',       isFusion: true },
        { type: 'paladin',       name: 'パラディン',           isFusion: true },
        { type: 'war_machine',   name: 'ウォーマシン',         isFusion: true },
        { type: 'wyvern_lord',   name: 'ワイバーンロード',     isFusion: true },
        { type: 'legend_metal',  name: 'レジェンドメタル',     isFusion: true },
        { type: 'phantom',       name: 'ファントム',           isFusion: true },
        { type: 'angel_golem',   name: 'エンジェルゴーレム',     isFusion: true },
        // === 配合産 ★6（配合産×配合産 → 最強）===
        { type: 'titan_golem',   name: 'タイタンゴーレム', isFusion: true },
        { type: 'platinum_golem',name: 'プラチナゴーレム', isFusion: true },
        { type: 'dragon_lord',   name: 'ドラゴンロード',   isFusion: true },
    ],
};

// ======================================
// FUSION_RECIPES - 配合レシピ図鑑データ
// ======================================
// 【整理済み】23件 → 13件。3本の明確なツリーに統一。
//
//  🔴 攻撃ツリー  : slime_purple → shadow_mage → phantom → dragon_lord★
//  🛡 防衛ツリー  : steel_ninja  → war_machine  → wyvern_lord → titan_golem★
//  ✨ 聖ツリー    : fortress_golem → royal_guard → arch_angel → platinum_golem★
//
const FUSION_RECIPES = [

    // ─── 🔴 攻撃ツリー ───────────────────────────────────────────
    // Step1: ブルー + レッド → パープル（★3）
    { cat: '攻撃', p1: { type: 'slime_blue', name: 'ブルースライム', color: '#2196F3' }, p2: { type: 'slime_red',  name: 'レッドスライム', color: '#F44336' }, child: { type: 'slime_purple', name: 'パープルスライム', color: '#9C27B0', darkColor: '#6A1B9A' } },
    // Step2: パープル + ウィザード → シャドウメイジ（★4）
    { cat: '攻撃', p1: { type: 'slime_purple', name: 'パープルスライム', color: '#9C27B0' }, p2: { type: 'wizard', name: '魔法使いスライム', color: '#7B1FA2' }, child: { type: 'shadow_mage', name: 'シャドウメイジ', color: '#5E35B1', darkColor: '#311B92' } },
    // Step3: シャドウメイジ + 老師 → ファントム（★5）
    { cat: '攻撃', p1: { type: 'shadow_mage', name: 'シャドウメイジ', color: '#5E35B1' }, p2: { type: 'master', name: '老師', color: '#880E4F' }, child: { type: 'phantom', name: 'ファントム', color: '#4A148C', darkColor: '#12005e' } },
    // Step4: ファントム + ボススライム → ドラゴンロード★（★6）
    { cat: '攻撃', p1: { type: 'phantom', name: 'ファントム', color: '#4A148C' }, p2: { type: 'boss', name: 'ボススライム', color: '#9C27B0' }, child: { type: 'dragon_lord', name: 'ドラゴンロード★', color: '#C62828', darkColor: '#7f0000' }, large: true },

    // ─── 🛡 防衛ツリー ───────────────────────────────────────────
    // Step1: クローム + ニンジャ → スティールニンジャ（★3）
    { cat: '防衛', p1: { type: 'slime_metal', name: 'クロームスライム', color: '#B0BEC5' }, p2: { type: 'ninja', name: 'ニンジャスライム', color: '#424242' }, child: { type: 'steel_ninja', name: 'スティールニンジャ', color: '#90A4AE', darkColor: '#546E7A' } },
    // Step2: スティールニンジャ + ドローン → ウォーマシン（★4）
    { cat: '防衛', p1: { type: 'steel_ninja', name: 'スティールニンジャ', color: '#90A4AE' }, p2: { type: 'drone', name: 'ドローン', color: '#607D8B' }, child: { type: 'war_machine', name: 'ウォーマシン', color: '#424242', darkColor: '#1a1a1a' } },
    // Step3: ウォーマシン + クロームキング → ワイバーンロード（★5）
    { cat: '防衛', p1: { type: 'war_machine', name: 'ウォーマシン', color: '#424242' }, p2: { type: 'metalking', name: 'クロームキング', color: '#B0BEC5' }, child: { type: 'wyvern_lord', name: 'ワイバーンロード', color: '#1B5E20', darkColor: '#003300' } },
    // Step4: ワイバーンロード + 究極スライム → タイタンゴーレム★（★6）
    { cat: '防衛', p1: { type: 'wyvern_lord', name: 'ワイバーンロード', color: '#1B5E20' }, p2: { type: 'ultimate', name: '究極スライム', color: '#FF6F00' }, child: { type: 'titan_golem', name: 'タイタンゴーレム★', color: '#212121', darkColor: '#000000' }, large: true },

    // ─── ✨ 聖ツリー ──────────────────────────────────────────────
    // Step1: ディフェンダー + ゴーレム → フォートレスゴーレム（★3）
    { cat: '聖', p1: { type: 'defender', name: 'ディフェンダー', color: '#607D8B' }, p2: { type: 'golem', name: 'ゴーレムスライム', color: '#795548' }, child: { type: 'fortress_golem', name: 'フォートレスゴーレム', color: '#37474F', darkColor: '#102027' } },
    // Step2: フォートレス + ヒーラー → ロイヤルガード（★4）
    { cat: '聖', p1: { type: 'fortress_golem', name: 'フォートレスゴーレム', color: '#37474F' }, p2: { type: 'healer', name: 'ヒーラースライム', color: '#81C784' }, child: { type: 'royal_guard', name: 'ロイヤルガード', color: '#F57F17', darkColor: '#bf360c' } },
    // Step3: ロイヤルガード + エンジェル → アークエンジェル（★5）
    { cat: '聖', p1: { type: 'royal_guard', name: 'ロイヤルガード', color: '#F57F17' }, p2: { type: 'angel', name: 'エンジェルスライム', color: '#FFF59D' }, child: { type: 'arch_angel', name: 'アークエンジェル', color: '#E3F2FD', darkColor: '#90CAF9' } },
    // Step4: アークエンジェル + レジェンドメタル → プラチナゴーレム★（★6）
    { cat: '聖', p1: { type: 'arch_angel', name: 'アークエンジェル', color: '#E3F2FD' }, p2: { type: 'legend_metal', name: 'レジェンドメタル', color: '#78909C' }, child: { type: 'platinum_golem', name: 'プラチナゴーレム★', color: '#CFD8DC', darkColor: '#78909C' }, large: true },

    // ─── ✨ 番外：レジェンドメタル入手レシピ（聖ツリー終点の素材）──
    // 老師 + クロームキング → レジェンドメタル（★5）
    { cat: '聖', p1: { type: 'master', name: '老師', color: '#880E4F' }, p2: { type: 'metalking', name: 'クロームキング', color: '#B0BEC5' }, child: { type: 'legend_metal', name: 'レジェンドメタル', color: '#78909C', darkColor: '#455A64' } },

];
window.FUSION_RECIPES = FUSION_RECIPES;

// ======================================
// ALLY_SOURCE_MAP - 仲間の入手先マップ
// ======================================
// type => { stage: '表示名', how: '入手方法' }
const ALLY_SOURCE_MAP = {
    // ステージクリア報酬
    'healer': { stage: 'スカウト', how: 'ガチャ (★3)' },
    'ninja': { stage: 'スカウト', how: 'ガチャ (★3)' },
    'angel': { stage: 'St.5 魔王の城', how: 'クリア報酬' },
    'defender': { stage: 'ボス戦', how: 'クリア報酬' },
    'master': { stage: '？？？（隠しステージ）', how: 'クリア報酬' },
    'special': { stage: 'St.8 月面基地', how: 'クリア報酬' },
    'ghost': { stage: 'イベ.1 金貨争奪戦', how: 'クリア報酬' },
    'metalking': { stage: 'イベ.4 ボスラッシュ', how: 'クリア報酬' },
    'ultimate': { stage: 'EX3 終焉の戦場', how: 'クリア報酬' },
    // ガチャ
    'slime': { stage: 'スカウト', how: 'ガチャ (★1)' },
    'slime_red': { stage: 'スカウト', how: 'ガチャ (★2)' },
    'slime_blue': { stage: 'スカウト', how: 'ガチャ (★2)' },
    'slime_metal': { stage: 'スカウト', how: 'ガチャ (★3)' },
    'slime_gold': { stage: 'スカウト', how: 'ガチャ (★4)' },
    'wizard': { stage: 'スカウト', how: 'ガチャ (★4)' },
    'golem': { stage: 'スカウト', how: 'ガチャ (★4)' },
    'drone': { stage: 'スカウト', how: 'ガチャ (★5)' },
    'angel': { stage: 'スカウト', how: 'ガチャ (★5)' },
    'master': { stage: 'スカウト', how: 'ガチャ (★5)' },
    'boss': { stage: 'スカウト', how: 'ガチャ (★5)' },
    // 配合のみ（素材から生まれる）
    'slime_purple': { stage: '配合のみ', how: 'ブルー＋レッド' },
    'slime_aqua': { stage: '配合のみ', how: 'ブルー＋ゴールド' },
    'platinum_slime': { stage: 'ガチャ★6 / 配合', how: 'スカウト(★6)または配合' }, // ★修正B2
    'steel_ninja': { stage: '配合のみ', how: 'メタル＋ニンジャ' },
    'shadow_mage': { stage: '配合のみ', how: 'ニンジャ＋魔法使い' },
    'arch_angel': { stage: 'ガチャ★6 / 配合', how: 'スカウト(★6)または配合' }, // ★修正B2
    'sage_slime': { stage: '配合のみ', how: 'ヒーラー＋魔法使い' },
    'fortress_golem': { stage: '配合のみ', how: '防衛兵＋ゴーレム' },
    'royal_guard': { stage: '配合のみ', how: '老師＋防衛兵' },
    'titan_golem': { stage: '配合のみ', how: 'フォートレス＋ロイヤル' },
    'dragon_lord': { stage: '配合のみ', how: 'シャドウ＋アーク' },
    'platinum_golem': { stage: '配合のみ', how: 'プラチナ＋フォートレス' },
    'angel_golem': { stage: '配合のみ', how: '天使＋ゴーレム' },
    'legend_metal': { stage: 'ガチャ★6 / 配合', how: 'スカウト(★6)または配合' }, // ★修正B2
    'war_machine': { stage: '配合のみ', how: 'ドローン＋ボス' },
    'phantom': { stage: '配合のみ', how: 'どろろん＋ニンジャ' },
    'paladin': { stage: '配合のみ', how: 'ヒーラー＋防衛兵' },
    'alchemist': { stage: '配合のみ', how: 'ゴールド＋魔法使い' },
    'wyvern_lord': { stage: 'ガチャ★6 / 配合', how: 'スカウト(★6)または配合' }, // ★修正B2
};
window.ALLY_SOURCE_MAP = ALLY_SOURCE_MAP;
