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
        reward: ['arrow', 'shield'],
        invasion: { switches: 2, defenders: 2, lasers: 0 },
        partReward: [
            { id: 'cannon_double', category: 'cannons', name: '二連装砲', icon: '🔫' },
            { id: 'color_moonlight', category: 'colors', name: '🌙 ムーンライト', icon: '🌙' },
        ],
        dialogue: [
            { speaker: 'スラッチ', text: 'スラりん、弾を拾って大砲に込めれば発射できます！まずは落ち着いて！' },
            { speaker: 'スラりん', text: 'わかった！やってみる！' },
            { speaker: 'オレンジ', text: 'ゲヘヘ！村の資材は全部いただきだ！誰にも止められん！' },
            { speaker: 'スラッチ', text: 'させません！スラりん、一緒に戦いましょう！' },
        ],
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
        reward: ['bomb', 'fire'],
        invasion: { switches: 2, defenders: 2, lasers: 0 },
        partReward: [
            { id: 'color_red', category: 'colors', name: 'クリムゾンレッド', icon: '🔴' },
            { id: 'effect_fire', category: 'effects', name: '炎エフェクト', icon: '🔥' },
        ],
        dialogue: [
            { speaker: 'スラお',   text: 'さあ来い！俺の改造スカウト戦車を止められるものならな！' },
            { speaker: 'スラッチ', text: 'スラりん、速い敵には焦らず！タイミングを計って！' },
            { speaker: 'スラりん', text: '落ち着いてやる。スラお、絶対退かせてみせる！' },
            { speaker: 'スラお',   text: '仲良しこよしか！甘ったれんな！容赦せんぞ！！' },
        ],
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
        reward: ['wood_armor', 'leaf_storm'],
        invasion: { switches: 3, defenders: 3, lasers: 1 },
        enemySkin: 'skin_ninja',
        partReward: [
            { id: 'skin_ninja', category: 'skins', name: '🥷 シノビスキン', icon: '🥷' },
            { id: 'color_green', category: 'colors', name: 'フォレストグリーン', icon: '💚' },
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
        reward: ['sun_stone'],
        invasion: { switches: 3, defenders: 3, lasers: 1 },
        enemySkin: 'skin_crab',
        partReward: [
            { id: 'skin_crab',    category: 'skins',   name: '🦀 カニカマスキン', icon: '🦀' },
            { id: 'armor_spike',   category: 'armors',  name: 'スパイク装甲', icon: '🔩' },
        ],
        dialogue: [
            { speaker: 'スフィンクス', text: '我が眠りを妨げる者よ……この砂漠の熱で焼き尽くしてくれる！' },
            { speaker: 'スラッチ', text: '装甲が厚い……！焦らず、弾を確実に当てましょう！' },
            { speaker: 'スラりん', text: '（スラッチが隣にいる。絶対に負けない……！）' },
            { speaker: 'スフィンクス', text: '小賢しい！だがここは越えさせん！全力で来い！！' },
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
        reward: ['crown'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
        enemySkin: 'skin_maou',
        partReward: [
            { id: 'skin_maou', category: 'skins', name: '👿 魔王城スキン', icon: '👿' },
            { id: 'cannon_magic',  category: 'cannons', name: '魔法杖砲',     icon: '🪄' },
        ],
        dialogue: [
            { speaker: 'ダークマター', text: 'よくぞここまで来た……だがここが終わりだ！' },
            { speaker: 'スラッチ',    text: '村の皆が待っています。絶対に負けられません！' },
            { speaker: 'スラりん',    text: 'スラッチ、今まで支えてくれてありがとう。もう一踏ん張りだ！' },
            { speaker: 'スラッチ',    text: 'スラりん……（っ）……一緒に、終わらせましょう！！' },
            { speaker: 'ダークマター', text: '感傷に浸る暇はないぞ！全力で来い！！' },
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
        reward: ['gold_coin', 'gold_coin'],
        invasion: { switches: 3, defenders: 3, lasers: 1 },
        partReward: { id: 'skin_shakkin', category: 'skins', name: '💰 借金王スキン', icon: '💰' },
        dialogue: [
            { speaker: '借金王', text: 'お前……お金の匂いがするな🤔' },
            { speaker: 'スラッチ', text: 'な、なんだこの人！？' },
            { speaker: '借金王', text: '俺に投資させてくれや！25倍にしたるわ！絶対や！' },
            { speaker: 'スラりん', text: '断る！！というか戦車で来るな！！' },
            { speaker: '借金王', text: 'ちくしょーーーー！！借金返せんやんけ！！' },
        ],
        defeatDialogue: [
            { speaker: '借金王', text: 'ちくしょーーーーーーーーーーーーー！！！' },
            { speaker: 'スラッチ', text: '……なんか可哀想になってきた' },
            { speaker: 'スラりん', text: 'ほっとけ。行くぞ。' },
        ],
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
        reward: ['thunder', 'herb'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
        enemySkin: 'skin_mecha',
        partReward: [
            { id: 'skin_mecha', category: 'skins', name: '🤖 メカニカルスキン', icon: '🤖' },
            { id: 'effect_ice',   category: 'effects', name: '氷エフェクト',    icon: '❄️' },
            { id: 'armor_shield', category: 'armors',  name: 'シールド型装甲', icon: '🛡️' },
        ],
        dialogue: [
            { speaker: 'ドロスケ', text: 'ここが終着点だ！この超戦車の前に跪け！' },
            { speaker: 'スラッチ', text: '絶対に負けません……みんな、最後の力を振り絞りましょう！' },
            { speaker: 'ドロスケ', text: '面白い……来るがいい！！' },
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
        reward: ['rock_p'],
        invasion: { switches: 5, defenders: 5, lasers: 2 },
        allyReward: { type: 'master', name: '老師', color: '#880E4F', darkColor: '#560027', rarity: 5 },
        partReward: [
            { id: 'color_purple', category: 'colors', name: 'ミスティックパープル', icon: '💜' },
            { id: 'color_white',  category: 'colors', name: 'アークホワイト', icon: '🤍' },
        ],
        dialogue: [
            { speaker: '謎の声', text: 'フォッフォッフォ…ここまで来るとはな。わしの動き、ついてこれるか？' },
            { speaker: '老師',   text: '試させてもらおう——手加減はせんぞ！' },
        ],
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
        reward: ['rock_p'],
        invasion: { switches: 5, defenders: 5, lasers: 3 },
        partReward: [
            { id: 'skin_ghost',    category: 'skins',   name: '👻 ゴーストスキン', icon: '👻' },
            { id: 'effect_thunder', category: 'effects', name: '雷エフェクト',   icon: '⚡' },
            { id: 'effect_holy',   category: 'effects', name: '聖光エフェクト', icon: '✨' },
            { id: 'armor_wings',   category: 'armors',  name: '天使の翼',       icon: '🪽' },
        ],
        dialogue: [
            { speaker: '真・魔王', text: 'ここが貴様らの墓場だ……真の力、思い知れ！' },
            { speaker: 'スラりん', text: '負けるもんか！みんなで来たんだ——行くぞ！！' },
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
        reward: ['gold_coin', 'gold_coin', 'gold_coin'],
        invasion: { switches: 2, defenders: 2, lasers: 1 },
        enemySkin: 'skin_shakkin',
        partReward: { id: 'color_gold', category: 'colors', name: 'サンダーゴールド', icon: '✨' },
        dialogue: [
            { speaker: 'スラッチ',   text: 'おや？金色に輝く戦車が…！' },
            { speaker: 'トレジャー', text: 'キラーン！この黄金の輝き、狙えるものなら狙ってみな！' },
        ],
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
        partReward: { id: 'color_moonlight', category: 'colors', name: '🌙 ムーンライト', icon: '🌙' },
        dialogue: [
            { speaker: 'ターボ',   text: 'ビュン！俺のスピードについてこれるかな？' },
            { speaker: 'スラッチ', text: '制限時間内にクリアしないと…！急ぎましょう！' },
        ],
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
        reward: ['mega_herb', 'iron_shield', 'exp_boost'],
        invasion: { switches: 4, defenders: 3, lasers: 2 },
        enemySkin: 'skin_crab',
        partReward: { id: 'armor_crab', category: 'armors', name: '🦀 カニ装甲', icon: '🦀' },
        dialogue: [
            { speaker: 'フォートレス', text: 'ガシャーン！この鉄壁を破れるかな？' },
            { speaker: 'スラッチ',    text: '体力がすごく高い……長期戦になります！腰を据えましょう！' },
        ],
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
        reward: ['legendary_core', 'master_emblem', 'ultimate_parts'],
        invasion: { switches: 5, defenders: 4, lasers: 3 },
        enemySkin: 'skin_maou',
        partReward: { id: 'armor_shield', category: 'armors', name: 'シールド型装甲', icon: '🛡️' },
        dialogue: [
            { speaker: '四天王',   text: '我々四天王を倒さねば先には進めんぞ！' },
            { speaker: 'スラッチ', text: 'これは……過去最強の敵です！気を抜かないで！' },
        ],
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
        partReward: [
            { id: 'color_black',  category: 'colors',  name: 'シャドウブラック', icon: '🖤' },
            { id: 'effect_dark', category: 'effects', name: '暗黒エフェクト', icon: '🌑' },
        ],
        dialogue: [
            { speaker: 'ディメンション', text: 'ここは異次元……お前たちの常識は通用せん！' },
            { speaker: 'スラッチ',      text: '次元が歪んでいます！気をつけてください！' },
        ],
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
        partReward: [
            { id: 'cannon_laser',   category: 'cannons', name: 'レーザー砲',       icon: '🔫' },
            { id: 'cannon_rainbow', category: 'cannons', name: '🌈 レインボー砲',  icon: '🌈' },
        ],
        dialogue: [
            { speaker: 'タイタン',   text: '伝説の力を見せてやろう…覚悟せよ！' },
            { speaker: 'スラッチ',   text: 'これが最強の敵……！全力で行きます！' },
        ],
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
        partReward: { id: 'color_rainbow', category: 'colors', name: '✨レインボー', icon: '🌈' },
        dialogue: [
            { speaker: 'オールスター', text: '全ての強者がここに集う！お前の全力を見せろ！' },
            { speaker: 'スラッチ',    text: 'これが最後の戦い……みんなで力を合わせましょう！' },
        ],
    }
];

// === STAGESの事前計算パーティション ===
const STAGES_NORMAL = STAGES.filter(s => s && !s.isEvent && !s.isExtra && !s.isMidBoss);
const STAGES_MAIN   = STAGES_NORMAL;
const STAGES_EVENT  = STAGES.filter(s => s && s.isEvent);
const STAGES_EX     = STAGES.filter(s => s && s.isExtra);

window.STAGES       = STAGES;
window.STAGES_NORMAL = STAGES_NORMAL;
window.STAGES_EVENT  = STAGES_EVENT;
window.STAGES_MAIN   = STAGES_MAIN;
window.STAGES_EX     = STAGES_EX;
