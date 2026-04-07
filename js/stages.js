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
        partReward: [{ id: 'skin_shakkin', category: 'skins', name: '💰 借金王スキン', icon: '💰' }], // ★バグ修正: オブジェクトリテラルだったものを配列に統一（他ステージと一致させてイテレート可能に）
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
        dialogue: [
            { speaker: 'スラりん', text: 'わあ、草原だ！……あれ、なんかいる。' },
            { speaker: 'メドウ', text: 'む、侵入者か。この草原は我々鉄仮面軍団の見張り地点だ。通すわけにはいかん。' },
            { speaker: 'スラッチ', text: '（でも……なんか、のんびりしてる...？）' },
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
        enemySkin: 'skin_dragon',
        enemySkinPhase2: 'skin_abyss', // ★エリスグール第二形態
        skyColors: ['#000000', '#0a0a14', '#14141e', '#000000'],
        reward: ['legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
        partReward: [{ id: 'skin_dragon', category: 'skins', name: '🐉 竜騎士スキン', icon: '🐉' }], // ★バグ修正: オブジェクト→配列に統一
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
        dialogue: [
        { speaker: 'スラッチ', text: 'うわあ……空の上まで来ちゃった。ここ、本当に天国みたいだね。雲が道になってる。' },
        { speaker: 'スラりん', text: 'きれいだけど、気配はあるよ。誰かに見られてるみたいだ。油断しないでいこう。' },
        { speaker: '雲門の番人', text: '生きた者よ。ここは試される場所。軽い願いも、偽りの勇気も、この門は通さない。' },
        { speaker: 'スラッチ', text: '歓迎されてる感じじゃないね……でも、ここで引いたら第3章の意味がなくなっちゃう。' },
        { speaker: 'スラりん', text: '望むところだよ。ぼくらの気持ち、ちゃんと見せてあげる。' },
        ],
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
        dialogue: [
        { speaker: 'スラりん', text: '床が虹色に光ってる……きれいだけど、足を止めたら吸いこまれそうで落ち着かないね。' },
        { speaker: 'スラッチ', text: 'でもちょっと楽しいかも。ほら、反対側の雲まで光がつながってる。……あ、来た！' },
        { speaker: '聖騎士', text: 'この回廊を進むなら、速さと信念のどちらも示しなさい。迷いながらでは光に置いていかれます。' },
        { speaker: 'スラッチ', text: 'じゃあ両方でいこう。置いていかれないでね、スラりん。' },
        { speaker: 'スラりん', text: 'うん。速さも気持ちも、ちゃんと前に向けてみせる！' },
        ],
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
        dialogue: [
        { speaker: 'スラッチ', text: '鐘の音が近いね。なんだか胸の奥まで見られてる気がする。ちょっとだけ、隠し事までばれそう。' },
        { speaker: '守護像', text: '急ぐ心は曇りを生む。ここでは、一撃よりも揺るがぬ意志が問われる。お前たちは何を背負って進む。' },
        { speaker: 'スラりん', text: 'ぼくらだって、ただ突っ走ってきたわけじゃないよ。怖かった時も、迷った時も、そのたびに選んできた。' },
        { speaker: 'スラッチ', text: 'うん。ここまで来たぶんだけ、ちゃんと強くなってる。だから今回は逃げない。' },
        ],
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
        dialogue: [
        { speaker: '星詠みの司祭', text: '星の巡りは語っている。あなたたちはまだ、終点に届いていないと。ここは通過点にすぎません。' },
        { speaker: 'スラりん', text: 'だったら、その終点までの道をここで開くよ。見えないなら、自分たちで進む道を作る。' },
        { speaker: 'スラッチ', text: '天国でも占いは当たるのかな。だったら、ぼくらが外れ値になるしかないね。' },
        { speaker: '星詠みの司祭', text: 'よろしい。では、星々の加護を受けた戦車で応えましょう。あなたたちの軌道、ここで測らせてもらいます。' },
        ],
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
        dialogue: [
        { speaker: 'スラりん', text: '風が強い……でも、ここを越えれば一番上だ。もう少しで、空のてっぺんに手が届く。' },
        { speaker: '大天使', text: 'ここまで登った勇気は認めよう。だが、頂へ至る者は希望そのものを示さねばならない。言葉ではなく、戦いで。' },
        { speaker: 'スラッチ', text: '希望なら、わたしたちずっと運んできたよ。泣きそうな時も、ちゃんと前を向いてきた。' },
        { speaker: 'スラりん', text: 'もちろん。見せよう、ぼくらの戦い方を。ここまで来た理由ごと、全部ぶつける。' },
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
        enemySkinPhase2: 'skin_abyss', // ★エリスグール第二形態
        skyColors: ['#c8dff5', '#d8eaf8', '#b8d4ee', '#cce0f0'],
        reward: ['legendary_core', 'ultimate_parts', 'master_emblem', 'sun_stone'],
        invasion: { switches: 7, defenders: 6, lasers: 4 },
        partReward: [{ id: 'skin_seraph', category: 'skins', name: '✨ 天門騎士スキン', icon: '✨' }], // ★バグ修正: オブジェクト→配列に統一
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス', color: '#FF69B4', darkColor: '#C7458B' },
        ],
        dialogue: [
        { speaker: 'セラフィム', text: '旅の終わりではない。ここは、願いの重さを量る門。軽い憧れだけでは、この高さに届かない。' },
        { speaker: 'スラりん', text: '重さなら十分あるよ。守りたいものも、連れて帰りたい気持ちも、ここまで来た時間も。' },
        { speaker: 'スラッチ', text: 'だから止まれない。たとえ相手が天国の番人でもね。わたしたち、帰る場所を知ってるから。' },
        { speaker: 'セラフィム', text: 'ならば受けなさい。この光が、あなたたちの真意を暴くでしょう。もし偽りがあれば、ここで砕けます。' },
        ],
        defeatDialogue: [
        { speaker: 'セラフィム', text: '見事です。力ではなく、結びつきでここまで届いたのですね。光は、あなたたちの嘘を見つけられなかった。' },
        { speaker: 'スラりん', text: 'ぼくらだけじゃない。出会ったみんなが、ここまで押し上げてくれたんだ。だから次も、ちゃんと前を向ける。' },
        { speaker: 'セラフィム', text: 'その答えなら、門は開かれます。次の空へ進みなさい。あなたたちなら、まだ見ぬ景色にも辿り着けるでしょう。' },
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
        dialogue: [
            { speaker: 'スラりん', text: 'ここが……深淵か。光が届かない。足下も見えない。' },
            { speaker: 'スラッチ', text: 'セラフィムが「次の空へ」って言ったのに、ここは空じゃなくて……底？' },
            { speaker: 'ヴォイド', text: '……ようこそ、逆さまの天国へ。光が強いほど、影も深い。天門をくぐった者は必ずここへ落ちる。' },
            { speaker: 'スラりん', text: '落ちたなら登り返すだけだ。退かないぞ！' },
            { speaker: 'ヴォイド', text: 'フフ……その意気、深淵が喜んでいる。では、試してみなさい。' },
        ],
        defeatDialogue: [
            { speaker: 'ヴォイド', text: '……混沌を通り抜けるか。では先へ進むがいい。ただし——ここより深い闇は、心まで溶かすぞ。' },
        ],
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
        dialogue: [
            { speaker: 'スラッチ', text: 'こ、この街……建物が全部逆向きに生えてる。重力がおかしい！' },
            { speaker: 'ミラージュ', text: 'ここでは「上」も「下」も意味を持たない。あなたたちの常識が、最大の弱点です。' },
            { speaker: 'スラりん', text: 'じゃあ常識なんて捨てればいいだけだ。こっちは最初からそのつもりだぞ！' },
            { speaker: 'スラッチ', text: '（スラりん……なんか頼もしくなったね。）よし、行きましょう！' },
        ],
        defeatDialogue: [
            { speaker: 'ミラージュ', text: '幻の都を抜けるとは……。この先には、混沌の心臓部がある。覚悟を決めなさい。' },
        ],
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
        dialogue: [
            { speaker: 'スラりん', text: 'なんだここ……急に明るくなった。花畑まである。でも……なんか変だ。' },
            { speaker: 'ファルスム', text: 'ようこそ！ここは完璧な楽園。戦わなくていい。疲れた心を休めなさい。ずっとここにいられますよ。' },
            { speaker: 'スラッチ', text: 'ダメです！これは全部嘘です！花の香りに魔法がかかってる！スラりん、騙されないで！' },
            { speaker: 'スラりん', text: '安心しろスラッチ。帰る場所を知ってる奴は、偽物の楽園には留まれないんだ。' },
            { speaker: 'ファルスム', text: 'ちっ……見破られましたか。では正面から相手してあげましょう！' },
        ],
        defeatDialogue: [
            { speaker: 'ファルスム', text: 'くっ……「帰る場所」か。私には、そういうものがなかったな。……先へ行きなさい。' },
        ],
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
        dialogue: [
            { speaker: 'アムネシア', text: '見なさい——お前たちが通り過ぎてきた場所の残像だ。どれが本当の記憶か、もうわからないだろう。' },
            { speaker: 'スラッチ', text: '……ほんとだ。村の光、ギア将軍の言葉、セラフィムの門……全部見える。' },
            { speaker: 'スラりん', text: '全部本物だ。辛かったことも、嬉しかったことも、ぜんぶ。消えてたまるか！' },
            { speaker: 'アムネシア', text: '記憶を力にするか……ならば、その記憶が本物かどうか、この鉄の壁でもう一度確かめてみせよ！' },
        ],
        defeatDialogue: [
            { speaker: 'アムネシア', text: '……記憶は、重さだ。それをここまで持ち続けてきたお前たちを、私は認めよう。次が最後だ。覚悟しろ。' },
        ],
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
        dialogue: [
            { speaker: 'スラりん', text: 'でかい……玉座間まるごと戦車だ。こいつが最後の関門か。' },
            { speaker: 'カオスロード', text: '深淵の主・ニヒルムの前哨戦士だ。おまえたちの旅の総決算をしてやろう。全力を出してみせろ！' },
            { speaker: 'スラッチ', text: 'スラりん、私たちの旅は全部ここに繋がってた。あの村から、ここまで。' },
            { speaker: 'スラりん', text: 'そうだな。じゃあその全部を、今ここで使い切る。行くぞ、スラッチ！！' },
        ],
        defeatDialogue: [
            { speaker: 'カオスロード', text: 'ぐ……これほどとは。ニヒルム様は、お前たちを認めるだろう。覚悟して向かうがいい。' },
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
        name: '深淵の主・ニヒルムの真の姿',
        desc: '最終決戦。混沌の底に君臨する絶対的な虚無——龍の機械鎧を纏い、世界の終わりを告げる審判者。',
        enemyHP: 30000,            // ★HP 30000
        playerHP: 520,
        enemyFireInterval: 17,     // ★速度+100%（元34の半分）
        enemyDamage: 296,          // ★攻撃+100%（元148の2倍）
        enemyName: '深淵の龍機・ニヒルム＝ドラゴン',
        enemyColor: '#1A0000',
        tankType: 'TRUE_BOSS',
        enemySkin: 'skin_dragon',   // ★龍型機械戦車スキン
        skipInvasion: true,         // 侵攻フェーズをスキップして即バトル結末へ
        skyColors: ['#000000', '#08001a', '#10002e', '#000000'],
        reward: ['legendary_core', 'legendary_core', 'legendary_core', 'ultimate_parts', 'master_emblem'],
        invasion: { switches: 9, defenders: 8, lasers: 6 },
        partReward: [{ id: 'skin_dragon', category: 'skins', name: '🐉 深淵龍機スキン', icon: '🐉' }],
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス',     color: '#FF69B4', darkColor: '#C7458B' },
        ],
        dialogue: [
            { speaker: 'ニヒルム', text: '……来たか。天門を越え、深淵の底まで。お前たちは、何を求めてここまで来た？' },
            { speaker: 'スラりん', text: '求めてきたわけじゃない。ただ、守りたいものがあって、前に進んできただけだ。' },
            { speaker: 'ニヒルム', text: '守る……か。では問おう。お前が守ってきたものは、本当に「守れて」いたか？' },
            { speaker: 'スラッチ', text: '……失ったものも、傷つけてしまったことも、あります。でも——それを知ってるから、また立ち上がれる。' },
            { speaker: 'スラりん', text: 'そうだ。完璧じゃないから、まだ歩ける。お前の「虚無」には、絶対に沈まない！' },
            { speaker: 'ニヒルム', text: '……面白い答えだ。では——この龍の鎧に込めた、私の「全力」を受けてみろ！！' },
        ],
        defeatDialogue: [
            { speaker: 'ニヒルム', text: '……私は、長い時間をかけて全てを否定してきた。光も、記憶も、絆も。それが虚無だと思っていた。' },
            { speaker: 'スラりん', text: 'でも違う。お前はずっと、何かを求めてたんじゃないか。だから深淵にいたんだろう。' },
            { speaker: 'ニヒルム', text: '……気づかぬうちに、私はお前たちの旅を……見ていた。羨ましかったのかもしれない。帰る場所のある、旅を。' },
            { speaker: 'スラッチ', text: 'ニヒルム、あなたも来ませんか。地上には、きっとまだ居場所がある。' },
            { speaker: 'ニヒルム', text: '……フッ。私を誘うか。虚無の主を。……悪くない。悪くないな、旅人たち。' },
            { speaker: 'スラりん', text: '決まりだ。ぼくらの旅は、ここで終わりじゃない。次の空へ——みんなで行くぞ！' },
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
        dialogue: [
            { speaker: 'スラりん', text: '……何もない。音もない。でも何かが、ここには「ある」。' },
            { speaker: 'スラッチ', text: '（ニヒルムが言ってた——深淵の先に「始まり」があると。ここがそうなんだ）' },
            { speaker: 'プリモス', text: '……訪問者か。久しぶりだ。光と闇が分かれる前からここを守っている。何しに来た？' },
            { speaker: 'スラりん', text: 'ぼくらが歩いてきた全部の旅が、ここに繋がってた気がして。答えを知りたい。' },
            { speaker: 'プリモス', text: '答えは戦いの先にある。通りたければ——越えてみせよ。' },
        ],
        defeatDialogue: [
            { speaker: 'プリモス', text: '……深淵を越えた者が、ここまで来るとは。先へ進むがいい。ただし、この先は「原初」そのものだ。心して向かえ。' },
        ],
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
        dialogue: [
            { speaker: 'スラッチ', text: 'スラりん……この砂漠、砂の一粒一粒が光ってる。でも踏むと消える。' },
            { speaker: 'アモルファス', text: 'ここは「可能性の砂漠」。あらゆる形になれる——そして、あらゆる形で壊せる。' },
            { speaker: 'スラりん', text: '形がないなら、どこを狙えばいい？（……でも、ぼくらの弾は正直だ。当たれば傷つく）' },
            { speaker: 'スラッチ', text: 'スラりん！形が変わっても、「そこにいる」ことは変わらない。しっかり見て！' },
        ],
        defeatDialogue: [
            { speaker: 'アモルファス', text: '……私は全ての形を持っていた。なのに、あなたたちの「決意」という形は、私には作れなかった。先へ行きなさい。' },
        ],
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
        dialogue: [
            { speaker: 'エイドロン', text: 'ようこそ、旅人たち。ここは全ての記憶が鏡に映る場所。見てみなさい——お前たちの旅を。' },
            { speaker: 'スラッチ', text: '……！あの村での最初の戦いが見える。ぎこちなくて、怖くて。' },
            { speaker: 'スラりん', text: 'ドロスケ団長も、ギア将軍も、セラフィムも、ニヒルムも。全員の顔が映ってる。' },
            { speaker: 'エイドロン', text: '問おう——それだけの人と出会い、傷つけ、助けられた旅を経て、お前たちは今何者だ？' },
            { speaker: 'スラりん', text: 'ぼくらは……ただのスラりんとスラッチだよ。でも、それで十分だ。一緒に歩いてきたから！' },
            { speaker: 'エイドロン', text: '……答えは聞いた。ならばその「今」を、この刃で証明してみせよ！！' },
        ],
        defeatDialogue: [
            { speaker: 'エイドロン', text: 'すべての記憶が、お前たちの力になっていた。私は試す役目を終えた。先の「光の核」へ——原初の意志があなたたちを待っている。' },
        ],
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
        dialogue: [
            { speaker: 'スラりん', text: '……あれが、最後の壁か。圧が全然違う。' },
            { speaker: 'アポカリア', text: '原初の意志「ルーメン」に至る道は、ここで終わりだ。世界の始まりは——誰にも触れさせない。' },
            { speaker: 'スラッチ', text: 'なんで？世界の始まりを知ることが、そんなに危険なの！？' },
            { speaker: 'アポカリア', text: '知れば変えたくなる。変えれば壊れる。無知のまま生きるのが、被造物の正しい姿だ。' },
            { speaker: 'スラりん', text: '知ることより、変えようとすることより——ぼくらは今日も戦うことを選ぶ。それが答えだ。行くぞ！！' },
        ],
        defeatDialogue: [
            { speaker: 'アポカリア', text: 'くっ……これほどの意志を持つ者が現れるとは。……ルーメンは「待っていた」と言っていた。その意味が、今わかった気がする。' },
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
        dialogue: [
            { speaker: 'スラりん', text: '……まばゆい。目が開けられないくらい、光が強い。' },
            { speaker: 'ルクセイン', text: '旅人よ——よくここまで来た。私は原初の意志「ルーメン」の最後の護衛。お前たちの心を、最後に問う。' },
            { speaker: 'スラッチ', text: '試されるのは、もう嫌じゃないよ。だって今まで全部、試練の先に本物があったから。' },
            { speaker: 'ニヒルム', text: '……（私は旅の途中から加わった身だ。だが——この光の中にいても、揺るぎない気持ちがある）' },
            { speaker: 'スラりん', text: 'ルクセイン。ぼくらは「ルーメン」に会いに来た。邪魔はさせない。行くぞ！！' },
            { speaker: 'ルクセイン', text: '……それでこそ。では、その覚悟を見せてもらおう！！' },
        ],
        defeatDialogue: [
            { speaker: 'ルクセイン', text: '……見事だ。全ての試練を越え、全員の力を一つにしてここまで来た。ルーメンが待っている——迷わず進め、旅人たち。' },
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
        dialogue: [
            { speaker: 'ルーメン', text: '……来たか。光と闇、天と深淵、全ての世界を越えてここまで。スラりん——お前の旅は、何のためにあった？' },
            { speaker: 'スラりん', text: '最初は、村を守るため。でも気づいたら——出会った全員のために、前に進んでた。' },
            { speaker: 'ルーメン', text: '「全員のために」か。だが問おう——その重さに、お前は耐えられるか？守れなかったものは？届かなかった想いは？' },
            { speaker: 'スラッチ', text: '……届かなかったことも、守れなかったことも、あります。でも、ルーメン——それを知ってるから、また歩けるんです。' },
            { speaker: 'ニヒルム', text: '私は長い時間、光を拒んでいた。でも彼らが手を伸ばしてくれた。不完全なままで、それでも繋がれることを——私は初めて知った。' },
            { speaker: 'ルーメン', text: '……面白い。不完全なまま、傷を抱えたまま、それでも前を向く。それが「生きる」ということか。では——私の全力を受けよ！！原初の光を、今ここで解き放つ！！' },
        ],
        defeatDialogue: [
            { speaker: 'ルーメン', text: '……私は永い時間、完璧な答えを探し続けていた。光か闇か。始まりか終わりか。だが——お前たちが示した答えは、どちらでもなかった。' },
            { speaker: 'スラりん', text: '「今、ここにいる誰かと、一緒に歩くこと」。それがぼくらの答えだよ、ルーメン。' },
            { speaker: 'ルーメン', text: '……そうか。私が探していたのは、完璧な理論ではなく——不完全な者たちが紡ぐ、この瞬間だったのかもしれない。' },
            { speaker: 'スラッチ', text: 'ルーメン……一緒に来ませんか？地上には、まだたくさんの「瞬間」があります。' },
            { speaker: 'ニヒルム', text: '私も最初は「帰る場所」を知らなかった。でも今はある。あなたにも、きっと作れる。' },
            { speaker: 'ルーメン', text: '……フフ。原初の意志が、旅人たちに誘われる日が来るとは。だが——悪くない。この光を、誰かのために使う日が来るとは思っていなかった。' },
            { speaker: 'スラりん', text: '決まりだ。みんな——帰ろう。ぼくらの村に、全員で。旅は終わりじゃない。ここからが、新しい始まりだ！！' },
            { speaker: 'ルーメン', text: '……「新しい始まり」か。それは——私が長い間、夢見ていたものだ。一緒に行こう、スラりん。光は、誰かの隣にある時が一番美しい。' },
        ],
    },
];

window.STAGES_CHAPTER5 = STAGES_CHAPTER5;
