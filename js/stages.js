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
        reward: ['arrow', 'shield'],
        invasion: { switches: 2, defenders: 2, lasers: 0 },
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
        reward: ['missile', 'ice'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
        enemySkin: 'skin_maou',
        partReward: [
            { id: 'skin_maou', category: 'skins', name: '👿 魔王城スキン', icon: '👿' },
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
        reward: ['gold_coin', 'herb'],
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
        reward: ['leaf_storm', 'sun_stone'],
        invasion: { switches: 4, defenders: 4, lasers: 2 },
        enemySkin: 'skin_mecha',
        partReward: [
            { id: 'skin_mecha', category: 'skins', name: '🤖 メカニカルスキン', icon: '🤖' },
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
        reward: ['missile', 'wood_armor'],
        invasion: { switches: 5, defenders: 5, lasers: 2 },
        allyReward: { type: 'master', name: '老師', color: '#880E4F', darkColor: '#560027', rarity: 5 },
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
        reward: ['sun_stone', 'missile'],
        invasion: { switches: 5, defenders: 5, lasers: 3 },
        partReward: [
            { id: 'skin_ghost', category: 'skins', name: '👻 ゴーストスキン', icon: '👻' },
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
        reward: ['bomb', 'gold_coin', 'gold_coin'],
        invasion: { switches: 2, defenders: 2, lasers: 1 },
        enemySkin: 'skin_shakkin',
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
        reward: ['iron_shield', 'missile', 'leaf_storm'],
        invasion: { switches: 4, defenders: 3, lasers: 2 },
        enemySkin: 'skin_crab',
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
        reward: ['thunder', 'rare_metal', 'master_emblem'],
        invasion: { switches: 5, defenders: 4, lasers: 3 },
        enemySkin: 'skin_maou',
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
        dialogue: [
            { speaker: 'オールスター', text: '全ての強者がここに集う！お前の全力を見せろ！' },
            { speaker: 'スラッチ',    text: 'これが最後の戦い……みんなで力を合わせましょう！' },
        ],
    }
];


const STAGES_CHAPTER2 = [
    // ============================================================
    // CH2 STAGE 1 - さびさびの村はずれ
    // ============================================================
    {
        id: 'c2_stage1',
        isChapter2: true,
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
        dialogue: [
            { speaker: 'スラッチ', text: 'この廃村……かつては賑やかな場所だったはずなのに。' },
            { speaker: 'スラりん', text: '誰かいるのか？こんな錆びついた戦車まで……' },
            { speaker: 'ラスティ', text: '……帰れ。ここはもう終わった場所だ。お前たちが来るべき所ではない。' },
            { speaker: 'スラッチ', text: 'でも、この廃村には何かが……スラりん！' },
        ],
        defeatDialogue: [
            { speaker: 'ラスティ', text: '……強い。お前たちは本物だ。ならば——話を聞かせてやる。' },
        ],
    },

    // ============================================================
    // CH2 STAGE 2 - てくてく！きらきら草原
    // ============================================================
    {
        id: 'c2_stage2',
        isChapter2: true,
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
        dialogue: [
            { speaker: 'スラりん', text: 'わあ、草原だ！……あれ、なんかいる。' },
            { speaker: 'メドウ', text: 'む、侵入者か。この草原は我々鉄仮面軍団の見張り地点だ。通すわけにはいかん。' },
            { speaker: 'スラッチ', text: '（でも……なんか、のんびりしてますね？）' },
            { speaker: 'スラりん', text: 'あなどってたら負けるよスラッチ！いくぞ！' },
        ],
        defeatDialogue: [
            { speaker: 'メドウ', text: 'う……負けた。先を急ぐがいい。でも気をつけろよ……海岸は荒れてるぞ。' },
        ],
    },

    // ============================================================
    // CH2 STAGE 3 - ざっぱーん！あらしの浜辺
    // ============================================================
    {
        id: 'c2_stage3',
        isChapter2: true,
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
        dialogue: [
            { speaker: 'スラりん', text: 'この海岸……嵐みたいに荒れてるな。' },
            { speaker: 'テンペスト', text: 'ガハハ！邪魔をするなよ、ちびスライム！この海は俺のもんだ！' },
            { speaker: 'スラッチ', text: '海を封鎖して交易路を断っているのはあなたですね！村の人たちが困っています！' },
            { speaker: 'テンペスト', text: '知ったことか！海の法は強い奴が作る——来るなら来い！！' },
        ],
        defeatDialogue: [
            { speaker: 'テンペスト', text: 'くっ……まさか負けるとは。……お前ら、あの「鉄仮面の軍団」を知ってるか？' },
        ],
    },

    // ============================================================
    // CH2 STAGE 4 - ぽかぽか！まほうの温泉地帯
    // ============================================================
    {
        id: 'c2_stage4',
        isChapter2: true,
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
        dialogue: [
            { speaker: 'スラッチ', text: 'わあ……温泉！すごい量の湯気ですね。' },
            { speaker: 'ステーミー', text: 'ほほほ〜♪ここは我々の研究所ですのよ〜。魔法エネルギーを温泉から補充しておりますの。' },
            { speaker: 'スラりん', text: 'え、研究所？鉄仮面軍団って機械じゃないの！？' },
            { speaker: 'ステーミー', text: 'まあ失礼ですこと！では魔法で追い返して差し上げますわ〜♪' },
        ],
        defeatDialogue: [
            { speaker: 'ステーミー', text: 'あらあら……負けましたわ。でも奥には恐ろしい子たちがいますのよ。ご覚悟を〜♪' },
        ],
    },

    // ============================================================
    // CH2 STAGE 5 - がっちゃんこの鉄の谷
    // ============================================================
    {
        id: 'c2_stage5',
        isChapter2: true,
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
        dialogue: [
            { speaker: 'スラりん', text: 'あいつらが「鉄仮面軍団」か。ドロドロ団とは全然違う……もっと組織的だ。' },
            { speaker: '前衛大将', text: '侵入者確認。排除命令が下っている。感情はない——ただ任務を遂行する。' },
            { speaker: 'スラッチ', text: '（スラりん……あの戦車、改造の痕が。誰かに無理やり……？）' },
            { speaker: 'スラりん', text: '関係ない。ここを通らせてもらうぞ！' },
        ],
        defeatDialogue: [
            { speaker: '前衛大将', text: '……想定外の戦力。本部に報告……する。「鉄仮面のギア将軍」が……待っている。' },
        ],
    },

    // ============================================================
    // CH2 BOSS - ギアギア将軍のおしろ♪
    // ============================================================
    {
        id: 'c2_boss',
        isChapter2: true,
        isBoss: true,
        hasPhaseTwo: true,
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
        enemySkin: 'skin_mecha',
        enemySkinPhase2: 'skin_ghost',
        skyColors: ['#000000', '#0a0a14', '#14141e', '#000000'],
        reward: ['legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス',     color: '#FF69B4', darkColor: '#C7458B' },
        ],
        dialogue: [
            { speaker: 'ギア将軍', text: '……よく来た、スラりん。お前の噂は聞いている。ドロドロ団を倒した英雄、か。' },
            { speaker: 'スラりん', text: 'お前が鉄仮面軍団のトップか！なんで王国を狙う！何が目的だ！' },
            { speaker: 'ギア将軍', text: 'ふむ……目的？「完璧な秩序」だ。感情に揺れる者は弱い。機械のように動く世界こそ、最強だ。' },
            { speaker: 'スラッチ', text: 'そんな世界は——誰も幸せじゃない！スラりん、行きましょう！' },
            { speaker: 'ギア将軍', text: '感傷的だな。では証明してみせろ——その「心」とやらの強さを！！' },
        ],
        defeatDialogue: [
            { speaker: 'ギア将軍', text: 'バカな……。私の完璧な戦略が……感情に負けた、だと？' },
            { speaker: 'スラりん', text: '強さは機械じゃない。仲間と繋がる「心」だ。わかったか！' },
            { speaker: 'ギア将軍', text: '……フッ。負けを認めよう。だが覚えておけ——この先には、私より遥かに危険な存在がいる。' },
            { speaker: 'スラッチ', text: '……続きが、あるんですか？' },
            { speaker: 'ギア将軍', text: '「闇の評議会」……それ以上は言えない。お前たちの力を……信じるとしよう。' },
        ],
    },
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
window.STAGES_CHAPTER2 = STAGES_CHAPTER2;
