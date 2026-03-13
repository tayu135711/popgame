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
        allyReward: { id: 'healer1', name: 'リカバリス', type: 'healer', color: '#42A5F5', darkColor: '#0D47A1', rarity: 2 },
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
        allyReward: { id: 'ninja1', name: 'ハンゾー', type: 'ninja', color: '#333', darkColor: '#000', rarity: 3 },
        dialogue: [
            { speaker: 'カゲマル', text: '……通りたければ力を示せ。拙者の忍者戦車、舐めるでないぞ！' },
            { speaker: 'スラッチ', text: '素早い！弾を無駄打ちしないで、じっくり狙って！' },
            { speaker: 'スラりん', text: '暗くて怖いけど……スラッチがいれば大丈夫！やるぞ！' },
            { speaker: 'カゲマル', text: 'ふっ……その気合、受けてみせよう！ニンッ！' },
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
        allyReward: { id: 'golem1', name: 'サンドゴーレム', type: 'golem', color: '#FBC02D', darkColor: '#F57F17', rarity: 4 },
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
        allyReward: { id: 'angel1', name: 'セラフィ', type: 'angel', color: '#FFF59D', darkColor: '#FBC02D', rarity: 4 },
        dialogue: [
            { speaker: 'ダークマター', text: 'よくぞここまで来た……だがここが終わりだ！' },
            { speaker: 'スラッチ',    text: '村の皆が待っています。絶対に負けられません！' },
            { speaker: 'スラりん',    text: 'スラッチ、今まで支えてくれてありがとう。もう一踏ん張りだ！' },
            { speaker: 'スラッチ',    text: 'スラりん……（っ）……一緒に、終わらせましょう！！' },
            { speaker: 'ダークマター', text: '感傷に浸る暇はないぞ！全力で来い！！' },
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
        allyReward: { id: 'defender1', name: 'エリート兵', type: 'defender', color: '#E74C3C', darkColor: '#C0392B', rarity: 3 },
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
        name: '？？？',
        desc: '謎の信号をキャッチした…。',
        enemyHP: 1600,
        playerHP: 150,
        enemyFireInterval: 95,
        enemyDamage: 16,
        enemyName: 'Dr. ドローン・メカ',
        enemyColor: '#00FFFF',
        tankType: 'MAGICAL',
        skyColors: ['#000033', '#000066', '#8800FF', '#FF00FF'],
        reward: ['rock_p'],
        invasion: { switches: 5, defenders: 5, lasers: 2 },
        allyReward: { id: 'master1', name: '老師', type: 'master', color: '#880E4F', darkColor: '#560027', rarity: 5 },
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
        theme: 'space',
        skyColors: ['#000000', '#1A237E', '#311B92', '#000000'],
        reward: ['rock_p'],
        invasion: { switches: 5, defenders: 5, lasers: 3 },
        allyReward: { id: 'devil1', name: 'ダークJr', type: 'special', color: '#9C27B0', darkColor: '#6A1B9A', rarity: 5 },
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
        tankType: 'SCOUT',
        theme: 'forest',
        reward: ['gold_coin', 'gold_coin', 'gold_coin'],
        invasion: { switches: 2, defenders: 2, lasers: 1 },
        allyReward: { id: 'ghost1', name: 'どろろん', type: 'ghost', color: '#F5F5F5', darkColor: '#999', rarity: 3 },
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
        allyReward: { id: 'merman1', name: 'マーマン', type: 'ninja', color: '#2196F3', darkColor: '#0D47A1', rarity: 3 },
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
        allyReward: { id: 'golema1', name: 'ゴーレムA', type: 'defender', color: '#8D6E63', darkColor: '#4E342E', rarity: 4 },
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
        allyReward: { id: 'metalking1', name: 'メタキン', type: 'metalking', color: '#B0BEC5', darkColor: '#546E7A', rarity: 5 },
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
        theme: 'space',
        skyColors: ['#000033', '#330066', '#660099', '#9900CC'],
        reward: ['legendary_core', 'ultimate_parts', 'rare_metal'],
        invasion: { switches: 6, defenders: 6, lasers: 4 },
        allyReward: { id: 'dimension1', name: '次元スライム', type: 'master', color: '#00FFFF', darkColor: '#008B8B', rarity: 5 },
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
        theme: 'volcano',
        skyColors: ['#330000', '#660000', '#990000', '#CC0000'],
        reward: ['legendary_core', 'legendary_core', 'master_emblem'],
        invasion: { switches: 7, defenders: 7, lasers: 5 },
        allyReward: { id: 'legend1', name: 'レジェンドスライム', type: 'angel', color: '#FFD700', darkColor: '#FFA500', rarity: 5 },
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
        bosses: ['HEAVY', 'SCOUT', 'MAGICAL', 'DEFENSE', 'BOSS', 'TRUE_BOSS'],
        theme: 'space',
        skyColors: ['#000000', '#330033', '#660066', '#990099'],
        reward: ['legendary_core', 'legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 8, defenders: 8, lasers: 6 },
        allyReward: { id: 'ultimate1', name: '究極スライム', type: 'ultimate', color: '#FF00FF', darkColor: '#8B008B', rarity: 6 },
        dialogue: [
            { speaker: 'オールスター', text: '全ての強者がここに集う！お前の全力を見せろ！' },
            { speaker: 'スラッチ',    text: 'これが最後の戦い……みんなで力を合わせましょう！' },
        ],
    }
];

// === STAGESの事前計算パーティション ===
const STAGES_NORMAL = STAGES.filter(s => s && !s.isEvent && !s.isExtra);
const STAGES_MAIN   = STAGES_NORMAL;
const STAGES_EVENT  = STAGES.filter(s => s && s.isEvent);
const STAGES_EX     = STAGES.filter(s => s && s.isExtra);

window.STAGES       = STAGES;
window.STAGES_NORMAL = STAGES_NORMAL;
window.STAGES_EVENT  = STAGES_EVENT;
window.STAGES_MAIN   = STAGES_MAIN;
window.STAGES_EX     = STAGES_EX;
