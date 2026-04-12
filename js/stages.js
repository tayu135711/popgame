// ======================================
// STAGES - Stage Definitions
// ======================================
// === バランス設計方針 ===
// stage1: チュートリアル。敵弱め、手加減あり
// stage2: スピード系。火力は並だが速い
// stage3: 忍者系。回避力・連射が特徴
// stage4: 重装甲。HP高め、削り合い
// stage5: 魔王城。圧力高め、詰め将棋的
// stage_boss: 団長戦。多彩な攻撃パターン
// stage8: 真ラスボス。第二形態あり、最高難度
// EX系: 全クリ後の超高難度コンテンツ

const STAGES = [
    // ============================================================
    // STAGE 1 - はじまりの戦い（チュートリアル）
    // ============================================================
    {
        id: 'stage1',
        name: 'はじまりの戦い',
        desc: '最初の砲車バトル！弾を拾って大砲に込めよう！',
        enemyHP: 220,
        playerHP: 100,
        enemyFireInterval: 240,   // ゆっくり撃ってくる
        enemyDamage: 8,
        enemyName: 'オレンジスライム号',
        enemyColor: '#ED7D31',
        tankType: 'NORMAL',
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
        ],
        reward: ['rock', 'herb'],
        invasion: { switches: 2, defenders: 2, lasers: 0 },
    },

    // ============================================================
    // STAGE 2 - スラおの挑戦（スピード戦）
    // ============================================================
    {
        id: 'stage2',
        name: 'スラおの挑戦',
        desc: '敵の動きが速い！隙を突いて弾を入れろ！',
        enemyHP: 320,
        playerHP: 100,
        enemyFireInterval: 180,   // stage1より速い
        enemyDamage: 10,
        enemyName: 'スラお改・スカウト号',
        enemyColor: '#FF6B35',
        tankType: 'SCOUT',
        skyColors: ['#2A60A0', '#4A90D0', '#78B8E8', '#A8D8F8'],
        reward: ['arrow', 'shield'],
        invasion: { switches: 2, defenders: 2, lasers: 0 },
    },

    // ============================================================
    // STAGE 3 - 迷いの森（忍者戦）
    // ============================================================
    {
        id: 'stage3',
        name: '迷いの森',
        desc: '暗い森に潜む忍者戦車。連続攻撃に備えろ！',
        enemyHP: 480,
        playerHP: 110,
        enemyFireInterval: 150,
        enemyDamage: 11,
        enemyName: '忍者戦車・カゲマル',
        enemyColor: '#333',
        tankType: 'SCOUT',
        theme: 'forest',
        reward: ['fire', 'bomb'],
        invasion: { switches: 3, defenders: 3, lasers: 1 },
        enemySkin: 'skin_ninja',
        partReward: [
            { id: 'skin_ninja', category: 'skins', name: '🥷 シノビスキン', icon: '🥷' },
        ],
    },

    // ============================================================
    // STAGE 4 - 灼熱の砂漠（重装甲戦）
    // ============================================================
    {
        id: 'stage4',
        name: '灼熱の砂漠',
        desc: '鉄壁の装甲！長期戦を覚悟してじっくり削れ！',
        enemyHP: 860,
        playerHP: 130,
        enemyFireInterval: 130,
        enemyDamage: 13,
        enemyName: 'スフィンクス重装甲号',
        enemyColor: '#FBC02D',
        tankType: 'DEFENSE',
        theme: 'desert',
        reward: ['ironball', 'herb'],
        invasion: { switches: 3, defenders: 3, lasers: 1 },
        enemySkin: 'skin_crab',
        partReward: [
            { id: 'skin_crab', category: 'skins', name: '🦀 カニカマスキン', icon: '🦀' },
        ],
    },

    // ============================================================
    // STAGE 5 - 魔王の城（圧力型）
    // ============================================================
    {
        id: 'stage5',
        name: '魔王の城',
        desc: '強烈な攻撃圧力！防御も大事にしながら攻めろ！',
        enemyHP: 1100,
        playerHP: 150,
        enemyFireInterval: 105,
        enemyDamage: 16,
        enemyName: 'ダークマター砲台',
        enemyColor: '#212121',
        tankType: 'BOSS',
        theme: 'volcano',
        reward: ['missile', 'ice'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
        enemySkin: 'skin_maou',
        partReward: [
            { id: 'skin_maou', category: 'skins', name: '👿 魔王城スキン', icon: '👿' },
        ],
    },

    // ============================================================
    // STAGE 5.5 - 借金王との遭遇（中ボス）
    // ============================================================
    {
        id: 'stage_shakkin',
        name: '借金王・襲来',
        desc: 'お金の匂いを嗅ぎつけた謎の男が現れた！',
        isMidBoss: true,
        enemyHP: 900,
        playerHP: 150,
        enemyFireInterval: 130,
        enemyDamage: 12,
        enemyName: '借金王の爆走戦車',
        enemyColor: '#B8860B',
        tankType: 'SHAKKIN',
        theme: 'grassland',
        reward: ['gold_coin', 'herb'],
        invasion: { switches: 3, defenders: 3, lasers: 1 },
        partReward: [{ id: 'skin_shakkin', category: 'skins', name: '💰 借金王スキン', icon: '💰' }], // ★バグ修正: オブジェクトリテラルだったものを配列に統一（他ステージと一致させてイテレート可能に）
    },

    // ============================================================
    // STAGE_BOSS - ドロドロ団最終決戦（多彩な攻撃パターン）
    // ============================================================
    {
        id: 'stage_boss',
        name: 'ドロドロ団・最終決戦',
        desc: 'ボス戦！多彩な攻撃に対応しながら仲間と戦え！',
        isBoss: true,
        enemyHP: 1200,
        playerHP: 150,
        enemyFireInterval: 160,
        enemyDamage: 15,
        enemyName: 'ドロスケ団長・超戦車',
        enemyColor: '#9C27B0',
        tankType: 'MAGICAL',
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス',     color: '#FF69B4', darkColor: '#C7458B' },
            { name: 'ロッキー', color: '#FFA000', darkColor: '#C67C00' },
        ],
        skyColors: ['#000000', '#1A1A1A', '#330000', '#660000'],
        reward: ['leaf_storm', 'sun_stone'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
        enemySkin: 'skin_mecha',
        partReward: [
            { id: 'skin_mecha', category: 'skins', name: '🤖 メカニカルスキン', icon: '🤖' },
        ],
    },

    // ============================================================
    // STAGE_SECRET - 隠しステージ「老師の試練」
    // ============================================================
    {
        id: 'stage_secret',
        isExtra: true,
        name: '？？？',
        desc: '謎の信号をキャッチした…。',
        enemyHP: 1600,
        playerHP: 150,
        enemyFireInterval: 95,
        enemyDamage: 16,
        enemyName: 'Dr. ドローン・メカ',
        enemyColor: '#00FFFF',
        tankType: 'MAGICAL',
        enemySkin: 'skin_ninja',
        skyColors: ['#000033', '#000066', '#8800FF', '#FF00FF'],
        reward: ['missile', 'wood_armor'],
        invasion: { switches: 5, defenders: 5, lasers: 2 },
        allyReward: { type: 'master', name: '老師', color: '#880E4F', darkColor: '#560027', rarity: 5 },
    },

    // ============================================================
    // STAGE 8 - 月面基地（真ラスボス・二段階）
    // ============================================================
    {
        id: 'stage8',
        name: '月面基地・最終決戦',
        desc: '真の魔王との決戦！第二形態に備えよ！',
        isBoss: true,
        hasPhaseTwo: true,
        skipInvasion: false,
        enemyHP: 800,
        enemyHPPhase2: 3000,
        playerHP: 200,
        enemyFireInterval: 115,
        enemyDamage: 22,
        enemyName: '真・魔王タンク',
        enemyColor: '#4A148C',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_ghost',
        enemySkinPhase2: 'skin_true_maou', // 第二形態：真・魔王覚醒形態（黒×金オーラ・3本角・炎翼）
        theme: 'space',
        skyColors: ['#000000', '#1A237E', '#311B92', '#000000'],
        reward: ['sun_stone', 'missile'],
        invasion: { switches: 5, defenders: 5, lasers: 3 },
        partReward: [
            { id: 'skin_ghost', category: 'skins', name: '👻 ゴーストスキン', icon: '👻' },
        ],
    },

    // ============================================================
    // EVENT STAGES
    // ============================================================
    {
        id: 'event1',
        name: '⭐ 金貨争奪戦',
        desc: 'イベント限定！大量の金貨を手に入れよう！',
        isEvent: true,
        enemyHP: 420,
        playerHP: 120,
        enemyFireInterval: 150,
        enemyDamage: 10,
        enemyName: 'トレジャースライム号',
        enemyColor: '#FFD700',
        tankType: 'HEAVY',
        theme: 'forest',
        reward: ['bomb', 'gold_coin', 'gold_coin'],
        invasion: { switches: 2, defenders: 2, lasers: 1 },
        enemySkin: 'skin_shakkin',
    },
    {
        id: 'event2',
        name: '⭐ スピードチャレンジ',
        desc: 'イベント限定！60秒以内にクリアで特別報酬！',
        isEvent: true,
        timeLimit: 60,
        enemyHP: 520,
        playerHP: 150,
        enemyFireInterval: 100,
        enemyDamage: 12,
        enemyName: 'ターボスライム号',
        enemyColor: '#00BFFF',
        tankType: 'SCOUT',
        theme: 'desert',
        reward: ['turbo_parts', 'rare_metal'],
        invasion: { switches: 3, defenders: 2, lasers: 1 },
        enemySkin: 'skin_ninja',
    },
    {
        id: 'event3',
        name: '⭐ 耐久サバイバル',
        desc: 'イベント限定！長期戦に耐えて勝利せよ！',
        isEvent: true,
        enemyHP: 2200,
        playerHP: 200,
        enemyFireInterval: 175,
        enemyDamage: 9,
        enemyName: 'アイアンフォートレス',
        enemyColor: '#708090',
        tankType: 'DEFENSE',
        theme: 'volcano',
        reward: ['iron_shield', 'missile', 'leaf_storm'],
        invasion: { switches: 4, defenders: 3, lasers: 2 },
        enemySkin: 'skin_crab',
    },
    {
        id: 'event4',
        name: '⭐ ボスラッシュ',
        desc: 'イベント限定！連続ボス戦を制覇せよ！',
        isEvent: true,
        isBossRush: true,
        enemyHP: 900,
        playerHP: 250,
        enemyFireInterval: 110,
        enemyDamage: 19,
        enemyName: '四天王連合',
        enemyColor: '#8B008B',
        tankType: 'BOSS',
        bosses: ['HEAVY', 'SCOUT', 'MAGICAL', 'BOSS'],
        theme: 'space',
        reward: ['thunder', 'rare_metal', 'master_emblem'],
        invasion: { switches: 5, defenders: 4, lasers: 3 },
        enemySkin: 'skin_maou',
    },

    // ============================================================
    // EX STAGES - 全クリ後限定コンテンツ
    // ============================================================
    {
        id: 'stage_ex1',
        name: '異次元の扉',
        desc: '全クリア後限定！謎の異次元から現れた敵！',
        isExtra: true,
        enemyHP: 3200,
        playerHP: 250,
        enemyFireInterval: 80,
        enemyDamage: 26,
        enemyName: 'ディメンションロード',
        enemyColor: '#00FFFF',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_ghost',
        theme: 'space',
        skyColors: ['#000033', '#330066', '#660099', '#9900CC'],
        reward: ['legendary_core', 'ultimate_parts', 'rare_metal'],
        invasion: { switches: 6, defenders: 6, lasers: 4 },
    },
    {
        id: 'stage_ex2',
        name: '伝説の試練',
        desc: '全クリア後限定！最強の敵が待ち受ける！',
        isExtra: true,
        isBoss: true,
        hasPhaseTwo: true,
        enemyHP: 2800,
        enemyHPPhase2: 5500,
        playerHP: 300,
        enemyFireInterval: 70,
        enemyDamage: 32,
        enemyName: 'レジェンドタイタン',
        enemyColor: '#FFD700',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_mecha',
        enemySkinPhase2: 'skin_legend_titan', // 第二形態：レジェンドタイタン覚醒形態（金×白発光・二連砲・プラズマ翼）
        theme: 'volcano',
        skyColors: ['#330000', '#660000', '#990000', '#CC0000'],
        reward: ['legendary_core', 'legendary_core', 'master_emblem'],
        invasion: { switches: 7, defenders: 7, lasers: 5 },
    },
    {
        id: 'stage_ex3',
        name: '終焉の戦場',
        desc: '全クリア後限定！全強敵が集結する究極の戦い！',
        isExtra: true,
        isBossRush: true,
        enemyHP: 4500,
        playerHP: 350,
        enemyFireInterval: 60,
        enemyDamage: 38,
        enemyName: 'オールスターズ',
        enemyColor: '#FF00FF',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_maou',
        bosses: ['HEAVY', 'SCOUT', 'MAGICAL', 'DEFENSE', 'BOSS', 'TRUE_BOSS'],
        theme: 'space',
        skyColors: ['#000000', '#330033', '#660066', '#990099'],
        reward: ['legendary_core', 'legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 8, defenders: 8, lasers: 6 },
    }
];


const STAGES_CHAPTER2 = [
    // ============================================================
    // CH2 STAGE 1 - さびさびの村はずれ
    // ============================================================
    {
        id: 'c2_stage1',
        isChapter2: true,
        enemyTankTheme: 'mecha',
        name: 'さびさびの村はずれ',
        desc: '第2章スタート！ふしぎな廃村にドキドキ探検♪',
        enemyHP: 2500,
        playerHP: 180,
        enemyFireInterval: 130,
        enemyDamage: 35,
        enemyName: '廃村の番人・ラスティ改',
        enemyColor: '#8B6914',
        tankType: 'BOSS',
        enemySkin: 'skin_maou',
        skyColors: ['#2a1a0a', '#4a2a10', '#6a3a18', '#3a2008'],
        reward: ['thunder', 'rare_metal', 'master_emblem'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
    },

    // ============================================================
    // CH2 STAGE 2 - てくてく！きらきら草原
    // ============================================================
    {
        id: 'c2_stage2',
        isChapter2: true,
        enemyTankTheme: 'mecha',
        name: 'てくてく！きらきら草原',
        desc: '広い草原にヘンな敵が！のんびり見えてあなどれないよ♪',
        enemyHP: 3200,
        playerHP: 190,
        enemyFireInterval: 115,
        enemyDamage: 40,
        enemyName: '草原の見張り・メドウ強化型',
        enemyColor: '#1B5E20',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_crab',
        skyColors: ['#1a3a10', '#2a5a18', '#3a7a20', '#1a3a10'],
        reward: ['legendary_core', 'rare_metal', 'master_emblem'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
    },

    // ============================================================
    // CH2 STAGE 3 - ざっぱーん！あらしの浜辺
    // ============================================================
    {
        id: 'c2_stage3',
        isChapter2: true,
        enemyTankTheme: 'mecha',
        name: 'ざっぱーん！あらしの浜辺',
        desc: 'ざぶーん♪波がすごい！スピード系のてきに注意！',
        enemyHP: 3800,
        playerHP: 200,
        enemyFireInterval: 100,
        enemyDamage: 45,
        enemyName: '海賊戦車・テンペスト改',
        enemyColor: '#0D47A1',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_ghost',
        skyColors: ['#0a1a3a', '#102060', '#1a3080', '#0a1040'],
        reward: ['legendary_core', 'ultimate_parts', 'rare_metal'],
        invasion: { switches: 5, defenders: 4, lasers: 2 },
    },

    // ============================================================
    // CH2 STAGE 4 - ぽかぽか！まほうの温泉地帯
    // ============================================================
    {
        id: 'c2_stage4',
        isChapter2: true,
        enemyTankTheme: 'mecha',
        name: 'ぽかぽか！まほうの温泉地帯',
        desc: 'ゆげがもくもく♪まほう系てきがぽわぽわ攻撃してくるよ！',
        enemyHP: 4500,
        playerHP: 210,
        enemyFireInterval: 88,
        enemyDamage: 50,
        enemyName: '湯けむり魔導士・ステーミー覚醒',
        enemyColor: '#6A1B9A',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_maou',
        skyColors: ['#2a0a3a', '#3a1050', '#4a1860', '#2a0a3a'],
        reward: ['master_emblem', 'legendary_core', 'ultimate_parts'],
        invasion: { switches: 5, defenders: 5, lasers: 3 },
    },

    // ============================================================
    // CH2 STAGE 5 - がっちゃんこの鉄の谷
    // ============================================================
    {
        id: 'c2_stage5',
        isChapter2: true,
        enemyTankTheme: 'mecha',
        name: 'がっちゃんこの鉄の谷',
        desc: 'てきのアジトが見えてきた！ガシャガシャ進め♪',
        enemyHP: 5500,
        playerHP: 220,
        enemyFireInterval: 75,
        enemyDamage: 58,
        enemyName: '鉄仮面軍団・前衛大将',
        enemyColor: '#263238',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_mecha',
        skyColors: ['#1a1a2a', '#252535', '#303045', '#1a1a2a'],
        reward: ['ultimate_parts', 'legendary_core', 'master_emblem'],
        invasion: { switches: 6, defenders: 5, lasers: 3 },
    },

    // ============================================================
    // CH2 BOSS - ギアギア将軍のおしろ♪
    // ============================================================
    {
        id: 'c2_boss',
        isChapter2: true,
        isBoss: true,
        hasPhaseTwo: true,
        enemyTankTheme: 'mecha',
        name: 'ギアギア将軍のおしろ♪',
        desc: '第2章ラスボス！ギアギア将軍とドキドキ決戦だよ！',
        enemyHP: 9000,
        enemyHPPhase2: 18000,
        playerHP: 280,
        enemyFireInterval: 60,
        enemyDamage: 72,
        enemyName: 'ギア将軍・超鋼鉄アルマダ',
        enemyColor: '#37474F',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_dragon_knight',
        enemySkinPhase2: 'skin_abyss', // ★エリスグール第二形態
        skyColors: ['#000000', '#0a0a14', '#14141e', '#000000'],
        reward: ['legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
        partReward: [{ id: 'skin_dragon_knight', category: 'skins', name: '🐉 竜騎士スキン', icon: '🐉' }], // ★バグ修正: オブジェクト→配列に統一
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス',     color: '#FF69B4', darkColor: '#C7458B' },
        ],
    },
];

// === STAGESの事前計算パーティション ===
const STAGES_NORMAL = STAGES.filter(s => s && !s.isEvent && !s.isExtra && !s.isMidBoss);
const STAGES_MAIN   = STAGES_NORMAL;
const STAGES_EVENT  = STAGES.filter(s => s && s.isEvent);
const STAGES_EX     = STAGES.filter(s => s && s.isExtra);
const STAGES_CHAPTER3 = [
    {
        id: 'c3_stage1',
        isChapter3: true,
        enemyTankTheme: 'heaven',
        name: 'はじまりの雲の門',
        desc: '第3章スタート。まぶしい雲海の先で、やさしげな番人が待っている。',
        enemyHP: 9800,
        playerHP: 300,
        enemyFireInterval: 64,
        enemyDamage: 76,
        enemyName: '雲門のガーディアン',
        enemyColor: '#E8F4FF',
        tankType: 'SCOUT',
        enemySkin: 'skin_ghost',
        skyColors: ['#5B8DB8', '#7AAAD4', '#92BFE8', '#4A7AA8'],
        reward: ['mega_herb', 'sun_stone', 'master_emblem'],
        invasion: { switches: 5, defenders: 5, lasers: 2 },
    },
    {
        id: 'c3_stage2',
        isChapter3: true,
        enemyTankTheme: 'heaven',
        name: 'きらめき回廊',
        desc: '虹の回廊には、すばやい聖騎士が待ちかまえる。',
        enemyHP: 10800,
        playerHP: 315,
        enemyFireInterval: 58,
        enemyDamage: 80,
        enemyName: '虹回廊の聖騎士',
        enemyColor: '#F8EFD0',
        tankType: 'SCOUT',
        enemySkin: 'skin_mecha',
        skyColors: ['#7A9CB8', '#8AACCC', '#9ABCDC', '#6A8CA8'],
        reward: ['thunder', 'sun_stone', 'ultimate_parts'],
        invasion: { switches: 5, defenders: 5, lasers: 2 },
    },
    {
        id: 'c3_stage3',
        isChapter3: true,
        enemyTankTheme: 'heaven',
        name: '鐘鳴る白庭園',
        desc: '白い庭園に響く鐘の音。重装の守護者が静かに待つ。',
        enemyHP: 12000,
        playerHP: 330,
        enemyFireInterval: 60,
        enemyDamage: 84,
        enemyName: '白庭園の守護像',
        enemyColor: '#DDE7F5',
        tankType: 'DEFENSE',
        enemySkin: 'skin_crab',
        skyColors: ['#6B90B8', '#7BA0C8', '#8BB0D8', '#5A80A8'],
        reward: ['iron_shield', 'master_emblem', 'sun_stone'],
        invasion: { switches: 6, defenders: 5, lasers: 2 },
    },
    {
        id: 'c3_stage4',
        isChapter3: true,
        enemyTankTheme: 'heaven',
        name: '星読みの聖堂',
        desc: '星図が浮かぶ聖堂で、まほうじかけの砲撃が降りそそぐ。',
        enemyHP: 13200,
        playerHP: 350,
        enemyFireInterval: 54,
        enemyDamage: 88,
        enemyName: '星詠みの司祭',
        enemyColor: '#EADFFF',
        tankType: 'MAGICAL',
        enemySkin: 'skin_maou',
        skyColors: ['#7080B8', '#8090C8', '#90A0D8', '#6070A8'],
        reward: ['leaf_storm', 'ultimate_parts', 'legendary_core'],
        invasion: { switches: 6, defenders: 6, lasers: 3 },
    },
    {
        id: 'c3_stage5',
        isChapter3: true,
        enemyTankTheme: 'heaven',
        name: '大天使の見晴らし台',
        desc: '雲を切り裂く風の上。最終決戦の前に、最後の守りが立ちはだかる。',
        enemyHP: 14500,
        playerHP: 365,
        enemyFireInterval: 50,
        enemyDamage: 92,
        enemyName: '蒼天の大天使',
        enemyColor: '#F6FBFF',
        tankType: 'BOSS',
        enemySkin: 'skin_ghost',
        skyColors: ['#5A88B8', '#6A98C8', '#7AA8D8', '#4A78A8'],
        reward: ['legendary_core', 'master_emblem', 'ultimate_parts'],
        invasion: { switches: 6, defenders: 6, lasers: 3 },
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
        ],
    },
    {
        id: 'c3_boss',
        isChapter3: true,
        isBoss: true,
        hasPhaseTwo: true,
        enemyTankTheme: 'heaven',
        name: '天門の審判者セラフィム',
        desc: '第3章ラスボス。まばゆい天門を背に、審判の戦車が降り立つ。',
        enemyHP: 18000,
        enemyHPPhase2: 26000,
        playerHP: 400,
        enemyFireInterval: 44,
        enemyDamage: 102,
        enemyName: '審判者セラフィム',
        enemyColor: '#FFF7D6',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_seraph',
        enemySkinPhase2: 'skin_lumen', // ★バグ修正: 第2形態は原初の光スキン（skin_abyss=深淵の主は不適切） // ★エリスグール第二形態
        skyColors: ['#c8dff5', '#d8eaf8', '#b8d4ee', '#cce0f0'],
        reward: ['legendary_core', 'ultimate_parts', 'master_emblem', 'sun_stone'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
        partReward: [{ id: 'skin_seraph', category: 'skins', name: '✨ 天門騎士スキン', icon: '✨' }], // ★バグ修正: オブジェクト→配列に統一
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス', color: '#FF69B4', darkColor: '#C7458B' },
        ],
    },
];

const STAGES_CHAPTER4 = [
    // ============================================================
    // CH4 STAGE 1 - 混沌の入り口
    // ============================================================
    {
        id: 'c4_stage1',
        isChapter4: true,
        enemyTankTheme: 'chaos',
        name: '混沌の入り口',
        desc: '第4章スタート。天門の下に広がる深淵——闇の底から何かが蠢いている。',
        enemyHP: 22000,
        playerHP: 420,
        enemyFireInterval: 48,
        enemyDamage: 108,
        enemyName: '深淵の門番・ヴォイド',
        enemyColor: '#1A0030',
        tankType: 'BOSS',
        enemySkin: 'skin_ghost',
        skyColors: ['#0a0015', '#12002a', '#1e0040', '#0a0015'],
        reward: ['legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
    },

    // ============================================================
    // CH4 STAGE 2 - 逆さまの廃都
    // ============================================================
    {
        id: 'c4_stage2',
        isChapter4: true,
        enemyTankTheme: 'chaos',
        name: '逆さまの廃都',
        desc: '重力が歪んだ廃墟都市。床と天井の区別がない戦場で、スピード型の敵が迫る！',
        enemyHP: 24500,
        playerHP: 435,
        enemyFireInterval: 44,
        enemyDamage: 114,
        enemyName: '廃都の幻影兵・ミラージュ',
        enemyColor: '#2B0050',
        tankType: 'SCOUT',
        enemySkin: 'skin_ninja',
        skyColors: ['#100020', '#1a0035', '#28004e', '#100020'],
        reward: ['legendary_core', 'rare_metal', 'ultimate_parts'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
    },

    // ============================================================
    // CH4 STAGE 3 - 嘘の楽園
    // ============================================================
    {
        id: 'c4_stage3',
        isChapter4: true,
        enemyTankTheme: 'chaos',
        name: '嘘の楽園',
        desc: 'にせものの光が輝く偽りの楽園。魔法系の罠が至る所に仕掛けられている。',
        enemyHP: 27000,
        playerHP: 450,
        enemyFireInterval: 42,
        enemyDamage: 120,
        enemyName: '楽園の詐欺師・ファルスム',
        enemyColor: '#3D0070',
        tankType: 'MAGICAL',
        enemySkin: 'skin_maou',
        skyColors: ['#150028', '#220040', '#320060', '#150028'],
        reward: ['master_emblem', 'legendary_core', 'sun_stone'],
        invasion: { switches: 7, defenders: 7, lasers: 5 },
    },

    // ============================================================
    // CH4 STAGE 4 - 記憶の断層
    // ============================================================
    {
        id: 'c4_stage4',
        isChapter4: true,
        enemyTankTheme: 'chaos',
        name: '記憶の断層',
        desc: '過去の記憶が断片として浮かぶ空間。重装の守護者が旅の重さを問いかける。',
        enemyHP: 30000,
        playerHP: 470,
        enemyFireInterval: 40,
        enemyDamage: 126,
        enemyName: '記憶の封印者・アムネシア',
        enemyColor: '#4A0080',
        tankType: 'DEFENSE',
        enemySkin: 'skin_mecha',
        skyColors: ['#1c0030', '#2a0050', '#3a0070', '#1c0030'],
        reward: ['ultimate_parts', 'legendary_core', 'master_emblem'],
        invasion: { switches: 8, defenders: 7, lasers: 5 },
    },

    // ============================================================
    // CH4 STAGE 5 - 深淵の玉座間
    // ============================================================
    {
        id: 'c4_stage5',
        isChapter4: true,
        enemyTankTheme: 'chaos',
        name: '深淵の玉座間',
        desc: '混沌の支配者の居城。あらゆる力が渦巻く最後の前哨戦——ここを越えれば、真の終点が見える。',
        enemyHP: 33000,
        playerHP: 490,
        enemyFireInterval: 38,
        enemyDamage: 132,
        enemyName: '混沌の先鋒・カオスロード',
        enemyColor: '#5C0099',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_ghost',
        skyColors: ['#200035', '#300055', '#440077', '#200035'],
        reward: ['legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 8, defenders: 8, lasers: 6 },
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
        ],
    },

    // ============================================================
    // CH4 BOSS - 深淵の主・ニヒルム（最終決戦・龍の機械戦車）
    // ============================================================
    {
        id: 'c4_boss',
        isChapter4: true,
        isBoss: true,
        isFinalBoss: true,        // ★最終ボスフラグ
        isLoseEvent: true,         // ★1回目は必ず負けるイベントバトル
        hasPhaseTwo: false,        // 第二形態は負けイベント後の本番バトルで実装
        enemyTankTheme: 'chaos',
        name: '深淵の主・ニヒルム',
        desc: '最終決戦。混沌の底に君臨する絶対的な虚無——真の力を解放した深淵の主。',
        enemyHP: 4000,             // 適度なボスのHPに戻す
        playerHP: 520,
        enemyFireInterval: 34,     // 元の速度
        enemyDamage: 148,          // 元の攻撃
        enemyName: '深淵の主・ニヒルム',
        enemyColor: '#1A0000',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_abyss',   // ラスボス用のスキンに戻す（skin_dragonはプレイヤー用）
        skipInvasion: true,         // 侵攻フェーズをスキップして即バトル結末へ
        skyColors: ['#000000', '#08001a', '#10002e', '#000000'],
        reward: ['legendary_core', 'legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 9, defenders: 8, lasers: 6 },
        partReward: [{ id: 'skin_abyss', category: 'skins', name: '🌑 深淵の主スキン', icon: '🌑' }],
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス',     color: '#FF69B4', darkColor: '#C7458B' },
        ],
    },
];

window.STAGES       = STAGES;
window.STAGES_NORMAL = STAGES_NORMAL;
window.STAGES_EVENT  = STAGES_EVENT;
window.STAGES_MAIN   = STAGES_MAIN;
window.STAGES_EX     = STAGES_EX;
window.STAGES_CHAPTER2 = STAGES_CHAPTER2;
window.STAGES_CHAPTER3 = STAGES_CHAPTER3;
window.STAGES_CHAPTER4 = STAGES_CHAPTER4;

// ============================================================
// CHAPTER 5 - 真の最終章「原初の光と終焉の砲火」
// ============================================================
// 第4章クリア後に解放。深淵の先にある「始まりの世界」——
// 全ての創造と破壊の源泉に眠る究極の存在に挑む。
// ============================================================
const STAGES_CHAPTER5 = [
    // ============================================================
    // CH5 STAGE 1 - 原初の回廊
    // ============================================================
    {
        id: 'c5_stage1',
        isChapter5: true,
        enemyTankTheme: 'genesis',
        name: '原初の回廊',
        desc: '第5章スタート。深淵の先に広がる「始まりの世界」——光と闇が生まれる前の空間に足を踏み入れた。',
        enemyHP: 42000,
        playerHP: 560,
        enemyFireInterval: 36,
        enemyDamage: 155,
        enemyName: '原初の番人・プリモス',
        enemyColor: '#001428',
        tankType: 'BOSS',
        enemySkin: 'skin_mecha',
        skyColors: ['#000814', '#001428', '#002240', '#000814'],
        reward: ['legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 9, defenders: 8, lasers: 6 },
    },

    // ============================================================
    // CH5 STAGE 2 - 創造の砂漠
    // ============================================================
    {
        id: 'c5_stage2',
        isChapter5: true,
        enemyTankTheme: 'genesis',
        name: '創造の砂漠',
        desc: '何もかもが「生まれる前」の砂漠。形を持たぬ敵が、高速で形を変えながら迫る！',
        enemyHP: 47000,
        playerHP: 580,
        enemyFireInterval: 33,
        enemyDamage: 163,
        enemyName: '形なき者・アモルファス',
        enemyColor: '#0a0a2a',
        tankType: 'SCOUT',
        enemySkin: 'skin_ghost',
        skyColors: ['#030310', '#08082a', '#0f0f3a', '#030310'],
        reward: ['legendary_core', 'rare_metal', 'ultimate_parts'],
        invasion: { switches: 9, defenders: 8, lasers: 7 },
    },

    // ============================================================
    // CH5 STAGE 3 - 記憶の宮殿（最後の審問）
    // ============================================================
    {
        id: 'c5_stage3',
        isChapter5: true,
        enemyTankTheme: 'genesis',
        name: '記憶の宮殿',
        desc: 'これまでの旅の全記憶が具現化した宮殿。魔法系の「鏡の番人」が旅人の覚悟を問う。',
        enemyHP: 52000,
        playerHP: 600,
        enemyFireInterval: 30,
        enemyDamage: 172,
        enemyName: '鏡の番人・エイドロン',
        enemyColor: '#151515',
        tankType: 'MAGICAL',
        enemySkin: 'skin_seraph',
        skyColors: ['#0a0a1a', '#121224', '#1a1a30', '#0a0a1a'],
        reward: ['master_emblem', 'legendary_core', 'sun_stone'],
        invasion: { switches: 10, defenders: 9, lasers: 7 },
    },

    // ============================================================
    // CH5 STAGE 4 - 終焉の砲台群
    // ============================================================
    {
        id: 'c5_stage4',
        isChapter5: true,
        enemyTankTheme: 'genesis',
        name: '終焉の砲台群',
        desc: 'ラスボスへの最後の防衛線。重装の「終焉の鎧」が全力でスラりんたちを阻む！',
        enemyHP: 58000,
        playerHP: 625,
        enemyFireInterval: 28,
        enemyDamage: 182,
        enemyName: '終焉の鎧・アポカリア',
        enemyColor: '#1a0000',
        tankType: 'DEFENSE',
        enemySkin: 'skin_abyss',
        skyColors: ['#0f0000', '#1a0505', '#250a08', '#0f0000'],
        reward: ['ultimate_parts', 'legendary_core', 'master_emblem'],
        invasion: { switches: 10, defenders: 9, lasers: 8 },
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
        ],
    },

    // ============================================================
    // CH5 STAGE 5 - 光の玉座（最後の前哨）
    // ============================================================
    {
        id: 'c5_stage5',
        isChapter5: true,
        enemyTankTheme: 'genesis',
        name: '光の玉座',
        desc: '原初の光が集まる玉座。全ての章の力が一つに収束する——これを越えれば、真の終点だ。',
        enemyHP: 65000,
        playerHP: 650,
        enemyFireInterval: 26,
        enemyDamage: 193,
        enemyName: '光の守護者・ルクセイン',
        enemyColor: '#1a1400',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_seraph',
        skyColors: ['#100c00', '#1c1600', '#2a2000', '#100c00'],
        reward: ['legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 10, defenders: 10, lasers: 8 },
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ニヒルム', color: '#7700CC', darkColor: '#440088' },
        ],
    },

    // ============================================================
    // CH5 BOSS - 原初の意志・ルーメン（真の最終決戦）
    // ============================================================
    {
        id: 'c5_boss',
        isChapter5: true,
        isBoss: true,
        hasPhaseTwo: true,
        enemyTankTheme: 'genesis',
        name: '原初の意志・ルーメンの審判',
        desc: '第5章＆真の最終ボス。光と闇の全てを生み出した原初の意志——この旅の答えを、今、証明する。',
        enemyHP: 72000,
        enemyHPPhase2: 95000,
        playerHP: 700,
        enemyFireInterval: 22,
        enemyDamage: 210,
        enemyName: '原初の意志・ルーメン',
        enemyColor: '#0a0800',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_seraph',
        enemySkinPhase2: 'skin_abyss',
        skyColors: ['#000000', '#050400', '#0a0800', '#000000'],
        reward: ['legendary_core', 'legendary_core', 'legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 10, defenders: 10, lasers: 9 },
        partReward: [{ id: 'skin_lumen', category: 'skins', name: '✨ 原初の光スキン', icon: '✨' }],
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ニヒルム', color: '#7700CC', darkColor: '#440088' },
            { name: 'ベス',     color: '#FF69B4', darkColor: '#C7458B' },
        ],
    },
];

window.STAGES_CHAPTER5 = STAGES_CHAPTER5;
