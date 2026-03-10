// ======================================
// STAGES - Stage Definitions
// ======================================
const STAGES = [
    {
        id: 'stage1',
        name: 'はじまりの戦い',
        desc: '最初の砲車バトル！弾を拾って大砲に入れよう！',
        enemyHP: 240,
        playerHP: 100,
        enemyFireInterval: 220,
        enemyDamage: 10,
        enemyName: 'オレンジスライム号',
        enemyColor: '#ED7D31',
        tankType: 'NORMAL',
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
        ],
        reward: ['arrow', 'shield'], // Rewards
        invasion: { switches: 2, defenders: 2, lasers: 0 }, // Invasion difficulty
        dialogue: [
            { speaker: 'スラッチ', text: 'たいへんです！「ドロドロ団」が攻めてきました！' },
            { speaker: 'スラッチ', text: '砲車に乗って、彼らを追い払いましょう！' },
            { speaker: 'オレンジ', text: 'ゲヘヘ、この村の資材はいただきだ！' }
        ]
    },
    {
        id: 'stage2',
        name: 'スラおの挑戦',
        desc: '敵の攻撃が激しくなる！かいふくのみを上手く使おう。',
        enemyHP: 240,
        playerHP: 100,
        enemyFireInterval: 170,
        enemyDamage: 8,
        enemyName: 'スラお',
        enemyColor: '#FF4444',
        tankType: 'SCOUT',
        skyColors: ['#2A60A0', '#4A90D0', '#78B8E8', '#A8D8F8'],
        reward: ['bomb', 'fire'], // Rewards
        invasion: { switches: 2, defenders: 2, lasers: 0 }, // Invasion difficulty
        allyReward: { id: 'healer1', name: 'リカバリス', type: 'healer', color: '#42A5F5', darkColor: '#0D47A1', rarity: 2 },
        dialogue: [
            { speaker: 'スラお', text: 'へへっ、よく来たな！俺様が相手だ！' },
            { speaker: 'スラお', text: '俺のスピードについてこれるかな？' }
        ]
    },
    {
        id: 'stage3',
        name: '迷いの森',
        desc: '静寂の森。素早い敵が潜んでいるらしい。',
        enemyHP: 360,
        playerHP: 120,
        enemyFireInterval: 140,
        enemyDamage: 8,
        enemyName: 'ジャングルタンク',
        enemyColor: '#1B5E20',
        tankType: 'SCOUT',
        theme: 'forest',
        reward: ['wood_armor', 'leaf_storm'],
        invasion: { switches: 3, defenders: 3, lasers: 1 }, // Invasion difficulty (増加)
        allyReward: { id: 'ninja1', name: 'ハンゾー', type: 'ninja', color: '#333', darkColor: '#000', rarity: 3 },
        dialogue: [
            { speaker: 'スラッチ', text: 'この森には忍者のようなスライムがいる噂です。' },
            { speaker: '敵', text: 'ニンニン！拙者のスピードについて来れるかな？' }
        ]
    },
    {
        id: 'stage4',
        name: '灼熱の砂漠',
        desc: '暑さで体力が奪われそうだ…！強敵に注意。',
        enemyHP: 960,
        playerHP: 150,
        enemyFireInterval: 120,
        enemyDamage: 12,
        enemyName: 'スフィンクス号',
        enemyColor: '#FBC02D',
        tankType: 'DEFENSE',
        theme: 'desert',
        reward: ['sun_stone'],
        invasion: { switches: 3, defenders: 3, lasers: 1 }, // Invasion difficulty
        allyReward: { id: 'dragon1', name: 'ドラたん', type: 'dragon', color: '#F44336', darkColor: '#8B0000', rarity: 4 },
        dialogue: [
            { speaker: 'スラッチ', text: 'うう…暑いです…。' },
            { speaker: 'スフィンクス', text: '我が眠りを妨げる者は誰だ…焼き尽くしてくれる！' }
        ]
    },
    {
        id: 'stage5',
        name: '魔王の城',
        desc: '最終決戦！全ての技術を駆使して戦おう！',
        enemyHP: 1200,
        playerHP: 200,
        enemyFireInterval: 100,
        enemyDamage: 15,
        enemyName: 'ダークマター',
        enemyColor: '#212121',
        tankType: 'BOSS',
        theme: 'volcano',
        reward: ['crown'],
        invasion: { switches: 4, defenders: 4, lasers: 2 }, // Invasion difficulty (さらに増加)
        allyReward: { id: 'angel1', name: 'セラフィ', type: 'angel', color: '#FFF59D', darkColor: '#FBC02D', rarity: 4 },
        dialogue: [
            { speaker: 'スラッチ', text: 'ここが本拠地…！負けられません！' },
            { speaker: '魔王', text: 'よくぞ来た。だがここまでだ。「絶望」を味わうがいい！' }
        ]
    },
    {
        id: 'stage_boss',
        name: 'ドロドロ団ラストバトル',
        desc: 'ボス戦！エンジンを破壊して勝利をつかめ！',
        isBoss: true, // ラスボス演出フラグ
        enemyHP: 900,
        playerHP: 130,
        enemyFireInterval: 180, // 通常攻撃を遅く（必殺技がメイン）
        enemyDamage: 13,
        enemyName: 'ドロドロ団 超戦車',
        enemyColor: '#9C27B0',
        tankType: 'MAGICAL',
        allies: [
            { name: 'スラッチ', color: '#4CAF50', darkColor: '#2E7D32' },
            { name: 'ベス', color: '#FF69B4', darkColor: '#C7458B' },
            { name: 'ロッキー', color: '#FFA000', darkColor: '#C67C00' },
        ],
        skyColors: ['#000000', '#1A1A1A', '#330000', '#660000'],
        reward: ['thunder', 'herb'], // Rewards
        invasion: { switches: 4, defenders: 4, lasers: 2 }, // Invasion difficulty (ボス戦)
        allyReward: { id: 'defender', name: 'エリート兵', type: 'defender', color: '#E74C3C', darkColor: '#C0392B', rarity: 3 },
        dialogue: [
            { speaker: '団長', text: 'よくぞここまで来た…褒めてやろう。' },
            { speaker: '団長', text: 'だが、我がドロドロ団の野望は止められん！' },
            { speaker: '団長', text: '最強の超戦車で、粉々にしてくれるわ！！' }
        ]
    },
    {
        id: 'stage_secret',
        name: '？？？',
        desc: '謎の信号をキャッチした…。',
        enemyHP: 1500,
        playerHP: 150,
        enemyFireInterval: 90,
        enemyDamage: 15,
        enemyName: 'Dr. ドローン・メカ',
        enemyColor: '#00FFFF',
        tankType: 'MAGICAL',
        skyColors: ['#000033', '#000066', '#8800FF', '#FF00FF'],
        reward: ['rock_p'],
        invasion: { switches: 5, defenders: 5, lasers: 2 }, // Invasion difficulty (隠しステージ)
        allyReward: { id: 'master', name: '老師', type: 'master', color: '#880E4F', darkColor: '#560027', rarity: 5 },
        dialogue: [
            { speaker: '謎の声', text: 'フォッフォッフォ…ここまで来るとはな。' },
            { speaker: '老師', text: 'わしの動きについてこれるか、試させてもらおう！' }
        ]
    },
    {
        id: 'stage8',
        name: '月面基地',
        desc: '真の恐怖が蘇る……これが隠しステージだ！',
        isBoss: true, // 真・ラスボス演出フラグ
        hasPhaseTwo: true, // 第二形態あり
        skipInvasion: false, // 修正: インベージョンを有効にする
        enemyHP: 666, // 第一形態のHP
        enemyHPPhase2: 2666, // 第二形態のHP
        playerHP: 200,
        enemyFireInterval: 120, // 通常攻撃を少し遅く（必殺技重視）
        enemyDamage: 20,
        enemyName: '真・魔王タンク',
        enemyColor: '#4A148C',
        tankType: 'TRUE_BOSS',
        theme: 'space',
        skyColors: ['#000000', '#1A237E', '#311B92', '#000000'],
        reward: ['rock_p'],
        invasion: { switches: 5, defenders: 5, lasers: 3 }, // 修正: インベージョン設定を追加
        allyReward: { id: 'devil', name: 'ダークJr', type: 'special', color: '#9C27B0', darkColor: '#6A1B9A', rarity: 5 },
        dialogue: [
            { speaker: '魔王', text: 'ククク……ここが貴様らの墓場だ！' },
            { speaker: 'スラりん', text: '負けるもんか！いくぞ！！' }
        ]
    },
    {
        id: 'event1',
        name: '⭐ 金貨争奪戦',
        desc: 'イベント限定！大量の金貨を手に入れよう！',
        isEvent: true, // イベントステージフラグ
        enemyHP: 400,
        playerHP: 120,
        enemyFireInterval: 150,
        enemyDamage: 10,
        enemyName: 'トレジャースライム号',
        enemyColor: '#FFD700',
        tankType: 'SCOUT',
        theme: 'forest',
        reward: ['gold_coin', 'gold_coin', 'gold_coin'], // 金貨大量ドロップ
        invasion: { switches: 2, defenders: 2, lasers: 1 },
        allyReward: { id: 'ghost1', name: 'どろろん', type: 'ghost', color: '#F5F5F5', darkColor: '#999', rarity: 3 },
        dialogue: [
            { speaker: 'スラッチ', text: 'おや？金色に輝く戦車が…！' },
            { speaker: 'トレジャー', text: 'キラーン！この黄金の輝き、狙えるものなら狙ってみな！' }
        ]
    },
    {
        id: 'event2',
        name: '⭐ スピードチャレンジ',
        desc: 'イベント限定！60秒以内にクリアで特別報酬！',
        isEvent: true,
        timeLimit: 60, // 制限時間60秒
        enemyHP: 500,
        playerHP: 150,
        enemyFireInterval: 100,
        enemyDamage: 12,
        enemyName: 'ターボスライム号',
        enemyColor: '#00BFFF',
        tankType: 'SCOUT',
        theme: 'desert',
        reward: ['turbo_parts', 'rare_metal'], // 特別報酬
        invasion: { switches: 3, defenders: 2, lasers: 1 },
        allyReward: { id: 'merman1', name: 'マーマン', type: 'ninja', color: '#2196F3', darkColor: '#0D47A1', rarity: 3 },
        dialogue: [
            { speaker: 'ターボ', text: 'ビュン！俺のスピードについてこれるかな？' },
            { speaker: 'スラッチ', text: '制限時間内にクリアしないと…！' }
        ]
    },
    {
        id: 'event3',
        name: '⭐ 耐久サバイバル',
        desc: 'イベント限定！長期戦に耐えて勝利せよ！',
        isEvent: true,
        enemyHP: 2000,
        playerHP: 200,
        enemyFireInterval: 180,
        enemyDamage: 8,
        enemyName: 'アイアンフォートレス',
        enemyColor: '#708090',
        tankType: 'DEFENSE',
        theme: 'volcano',
        reward: ['mega_herb', 'iron_shield', 'exp_boost'], // 耐久報酬
        invasion: { switches: 4, defenders: 3, lasers: 2 },
        allyReward: { id: 'golema1', name: 'ゴーレム', type: 'defender', color: '#8D6E63', darkColor: '#4E342E', rarity: 4 },
        dialogue: [
            { speaker: 'フォートレス', text: 'ガシャーン！この鉄壁を破れるかな？' },
            { speaker: 'スラッチ', text: '体力が高い…長期戦になりそうです！' }
        ]
    },
    {
        id: 'event4',
        name: '⭐ ボスラッシュ',
        desc: 'イベント限定！連続ボス戦を制覇せよ！',
        isEvent: true,
        isBossRush: true, // ボスラッシュフラグ
        enemyHP: 800,
        playerHP: 250,
        enemyFireInterval: 110,
        enemyDamage: 18,
        enemyName: '四天王連合',
        enemyColor: '#8B008B',
        tankType: 'BOSS',
        bosses: ['HEAVY', 'SCOUT', 'MAGICAL', 'BOSS'], // 連続出現するボスのリスト
        theme: 'space',
        reward: ['legendary_core', 'master_emblem', 'ultimate_parts'], // 最高報酬
        invasion: { switches: 5, defenders: 4, lasers: 3 },
        allyReward: { id: 'metalking1', name: 'メタキン', type: 'metalking', color: '#B0BEC5', darkColor: '#546E7A', rarity: 5 },
        dialogue: [
            { speaker: '四天王', text: '我々四天王を倒さねば先には進めんぞ！' },
            { speaker: 'スラッチ', text: 'これは…過去最高の強敵です！' }
        ]
    },
    {
        id: 'stage_ex1',
        name: '異次元の扉',
        desc: '全クリア後限定！謎の異次元から現れた敵！',
        isExtra: true,
        enemyHP: 3000,
        playerHP: 250,
        enemyFireInterval: 80,
        enemyDamage: 25,
        enemyName: 'ディメンションロード',
        enemyColor: '#00FFFF',
        tankType: 'TRUE_BOSS',
        theme: 'space',
        skyColors: ['#000033', '#330066', '#660099', '#9900CC'],
        reward: ['legendary_core', 'ultimate_parts', 'rare_metal'],
        invasion: { switches: 6, defenders: 6, lasers: 4 },
        allyReward: { id: 'dimension1', name: '次元スライム', type: 'master', color: '#00FFFF', darkColor: '#008B8B', rarity: 5 },
        dialogue: [
            { speaker: 'ディメンション', text: 'ここは異次元…お前たちの常識は通用せん！' },
            { speaker: 'スラッチ', text: '次元が歪んでいます！気をつけてください！' }
        ]
    },
    {
        id: 'stage_ex2',
        name: '伝説の試練',
        desc: '全クリア後限定！最強の敵が待ち受ける！',
        isExtra: true,
        isBoss: true,
        hasPhaseTwo: true,
        enemyHP: 2500,
        enemyHPPhase2: 5000,
        playerHP: 300,
        enemyFireInterval: 70,
        enemyDamage: 30,
        enemyName: 'レジェンドタイタン',
        enemyColor: '#FFD700',
        tankType: 'TRUE_BOSS',
        theme: 'volcano',
        skyColors: ['#330000', '#660000', '#990000', '#CC0000'],
        reward: ['legendary_core', 'legendary_core', 'master_emblem'],
        invasion: { switches: 7, defenders: 7, lasers: 5 },
        allyReward: { id: 'legend1', name: 'レジェンドスライム', type: 'angel', color: '#FFD700', darkColor: '#FFA500', rarity: 5 },
        dialogue: [
            { speaker: 'タイタン', text: '伝説の力を見せてやろう…覚悟せよ！' },
            { speaker: 'スラッチ', text: 'これが最強の敵…！全力で行きます！' }
        ]
    },
    {
        id: 'stage_ex3',
        name: '終焉の戦場',
        desc: '全クリア後限定！全ての強敵が集結する究極の戦い！',
        isExtra: true,
        isBossRush: true,
        enemyHP: 4000,
        playerHP: 350,
        enemyFireInterval: 60,
        enemyDamage: 35,
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
            { speaker: 'オールスター', text: '全ての強者がここに集う！お前の力を見せてみろ！' },
            { speaker: 'スラッチ', text: 'これが最後の戦い…みんなで力を合わせましょう！' }
        ]
    }
];

// === STAGESの事前計算パーティション ===
// STAGES.filter() を毎フレーム呼ぶのは重いので起動時に1回だけ計算する
const STAGES_NORMAL = STAGES.filter(s => s && !s.isEvent && !s.isExtra);
const STAGES_EVENT = STAGES.filter(s => s && s.isEvent);
const STAGES_MAIN = STAGES.filter(s => s && !s.isEvent && !s.isExtra);

// Make globally available
window.STAGES = STAGES;
window.STAGES_NORMAL = STAGES_NORMAL;
window.STAGES_EVENT = STAGES_EVENT;
window.STAGES_MAIN = STAGES_MAIN;
