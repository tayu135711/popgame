// ======================================
// STORY - Visual Novel Style Dialogue System
// ======================================
class StoryManager {
    constructor() {
        this.active = false;
        this.sceneId = null;
        this.lineIndex = 0;
        this.charTimer = 0;
        this.textToDraw = '';
        this.waitingInput = false;
        this.callback = null;
        this._inputConsumed = false;
        this._skipConsumed = false;

        this.actors = {
            // ── メインキャラ ──
            slime:        { name: 'スラりん',         color: '#4CAF50', align: 'left',  portrait: { base: '#67D66F', accent: '#E8FFE9', eye: '#16351A', mark: 'slime'  } },
            ally:         { name: 'スラッチ',          color: '#2196F3', align: 'right', portrait: { base: '#5BB8FF', accent: '#E4F5FF', eye: '#10304A', mark: 'ribbon' } },
            king:         { name: 'スライム王',        color: '#FFD700', align: 'right', portrait: { base: '#FFE27A', accent: '#FFF8D8', eye: '#5A4300', mark: 'crown'  } },
            // ── 第1章 ──
            rival:        { name: 'ドロドロ王',        color: '#F44336', align: 'right', portrait: { base: '#FF796D', accent: '#FFE4E0', eye: '#4A1010', mark: 'crown'  } },
            slaoh:        { name: 'スラお',            color: '#FF6B35', align: 'right', portrait: { base: '#FF9B68', accent: '#FFF0E7', eye: '#4A2310', mark: 'flame'  } },
            ninja:        { name: 'カゲマル',          color: '#555',    align: 'right', portrait: { base: '#7B7B7B', accent: '#F1F1F1', eye: '#111',    mark: 'mask'   } },
            boss:         { name: 'ドロスケ将軍',      color: '#9C27B0', align: 'right', portrait: { base: '#C46AE0', accent: '#F6E8FF', eye: '#341042', mark: 'horn'   } },
            orange:       { name: 'オレンジ',          color: '#FB8C00', align: 'right', portrait: { base: '#FFB85C', accent: '#FFF2DE', eye: '#5B3500', mark: 'star'   } },
            sphinx:       { name: 'スフィンクス',      color: '#C9A227', align: 'right', portrait: { base: '#E5C76D', accent: '#FFF7DE', eye: '#5A4300', mark: 'crown'  } },
            darkmatter:   { name: 'ダークマター',      color: '#6A1B9A', align: 'right', portrait: { base: '#A65BCF', accent: '#F7E8FF', eye: '#2F0A42', mark: 'horn'   } },
            shakkin:      { name: '借金王',            color: '#F9A825', align: 'right', portrait: { base: '#FFD15F', accent: '#FFF8DE', eye: '#5B4300', mark: 'crown'  } },
            mystery:      { name: '謎の声',            color: '#8D6E63', align: 'right', portrait: { base: '#B59A90', accent: '#FAF1EC', eye: '#3C2A23', mark: 'star'   } },
            master:       { name: '老師',              color: '#6D4C41', align: 'right', portrait: { base: '#B08B62', accent: '#F8EBDD', eye: '#3C2A1A', mark: 'leaf'   } },
            devil:        { name: '闇の魔王',          color: '#CE0000', align: 'right', portrait: { base: '#F04B4B', accent: '#FFE3E3', eye: '#3E0000', mark: 'horn'   } },
            truedevil:    { name: '真・魔王',          color: '#C62828', align: 'right', portrait: { base: '#F04B4B', accent: '#FFE3E3', eye: '#3E0000', mark: 'horn'   } },
            treasure:     { name: 'トレジャー',        color: '#FFB300', align: 'right', portrait: { base: '#FFD95E', accent: '#FFF9E0', eye: '#5A4300', mark: 'crown'  } },
            turbo:        { name: 'ターボ',            color: '#29B6F6', align: 'right', portrait: { base: '#7AD8FF', accent: '#E8FAFF', eye: '#0E3550', mark: 'wave'   } },
            fortress:     { name: 'フォートレス',      color: '#78909C', align: 'right', portrait: { base: '#A2B6BF', accent: '#F0F7FA', eye: '#23323A', mark: 'shield' } },
            four_kings:   { name: '四天王',            color: '#EF5350', align: 'right', portrait: { base: '#FF8B86', accent: '#FFE9E8', eye: '#4A1515', mark: 'horn'   } },
            dimension:    { name: 'ディメンション',    color: '#7E57C2', align: 'right', portrait: { base: '#A98CE2', accent: '#F2EBFF', eye: '#2E1C4A', mark: 'star'   } },
            titan:        { name: 'タイタン',          color: '#8D6E63', align: 'right', portrait: { base: '#C2A79B', accent: '#FAF0EB', eye: '#3E2B25', mark: 'shield' } },
            allstar:      { name: 'オールスター',      color: '#FFD54F', align: 'right', portrait: { base: '#FFE38A', accent: '#FFFCEE', eye: '#5B4800', mark: 'star'   } },
            // ── 第2章 ──
            rusty:        { name: 'ラスティ',          color: '#8B7355', align: 'right', portrait: { base: '#B08B62', accent: '#F8EBDD', eye: '#3C2A1A', mark: 'gear'   } },
            c2meadow:     { name: 'メドウ',            color: '#558B2F', align: 'right', portrait: { base: '#8BCB62', accent: '#F1FFE8', eye: '#233816', mark: 'leaf'   } },
            tempest:      { name: 'テンペスト',        color: '#1565C0', align: 'right', portrait: { base: '#4D9CFF', accent: '#E5F2FF', eye: '#0F2A4A', mark: 'wave'   } },
            c2steamy:     { name: 'ステーミー',        color: '#CE93D8', align: 'right', portrait: { base: '#E1B1EB', accent: '#FFF0FF', eye: '#47244D', mark: 'steam'  } },
            vanguard:     { name: '前衛大将',          color: '#546E7A', align: 'right', portrait: { base: '#7D97A2', accent: '#EDF4F7', eye: '#20313A', mark: 'shield' } },
            gear:         { name: 'ギアギア将軍',      color: '#37474F', align: 'right', portrait: { base: '#607D8B', accent: '#E7F7FF', eye: '#122028', mark: 'gear'   } },
            // ── 第3章 ──
            cloud_guard:  { name: '雲門の番人',        color: '#90CAF9', align: 'right', portrait: { base: '#D2ECFF', accent: '#FFFFFF', eye: '#2B4960', mark: 'wave'   } },
            holy_knight:  { name: '聖騎士',            color: '#FBC02D', align: 'right', portrait: { base: '#FFE28A', accent: '#FFFBEA', eye: '#5B4700', mark: 'crown'  } },
            guardian:     { name: '守護像',            color: '#B0BEC5', align: 'right', portrait: { base: '#D5DDE1', accent: '#FFFFFF', eye: '#37474F', mark: 'shield' } },
            star_priest:  { name: '星詠みの司祭',      color: '#AB47BC', align: 'right', portrait: { base: '#D29BE0', accent: '#FFF0FF', eye: '#40204A', mark: 'star'   } },
            archangel:    { name: '大天使',            color: '#29B6F6', align: 'right', portrait: { base: '#C6F0FF', accent: '#FFFFFF', eye: '#1E3E55', mark: 'halo'   } },
            seraph:       { name: 'セラフィム',        color: '#FBCB61', align: 'right', portrait: { base: '#FFE49A', accent: '#FFFBEF', eye: '#5B4700', mark: 'halo'   } },
            // ── 第4章 ──
            void_knight:  { name: '虚無の騎士',        color: '#4A4A8A', align: 'right', portrait: { base: '#6A6ABF', accent: '#E0E0FF', eye: '#0A0A2A', mark: 'shield' } },
            mirage:       { name: 'ミラージュ',        color: '#7E57C2', align: 'right', portrait: { base: '#A98CE2', accent: '#F2EBFF', eye: '#2E1C4A', mark: 'star'   } },
            falsum:       { name: 'ファルスム',        color: '#43A047', align: 'right', portrait: { base: '#81C784', accent: '#F1FFF2', eye: '#1B5E20', mark: 'leaf'   } },
            amnesia:      { name: 'アムネシア',        color: '#5C6BC0', align: 'right', portrait: { base: '#9FA8DA', accent: '#E8EAF6', eye: '#1A237E', mark: 'star'   } },
            chaos_lord:   { name: 'カオスロード',      color: '#D50000', align: 'right', portrait: { base: '#FF6D6D', accent: '#FFE8E8', eye: '#4A0000', mark: 'horn'   } },
            nihilum:      { name: 'ニヒルム',          color: '#7B68EE', align: 'right', portrait: { base: '#9B88FF', accent: '#E8E4FF', eye: '#1A0050', mark: 'star'   } },
            chaos_mage:   { name: '混沌の魔導師',      color: '#CC44AA', align: 'right', portrait: { base: '#E066CC', accent: '#FFE0F8', eye: '#440030', mark: 'star'   } },
            // ── 第5章 ──
            amorphous:    { name: 'アモルファス',      color: '#78909C', align: 'right', portrait: { base: '#A2B6BF', accent: '#F0F7FA', eye: '#23323A', mark: 'star'   } },
            eidolon:      { name: '記憶の幻影・エイドロン',  color: '#C8A0FF', align: 'right', portrait: { base: '#DCC0FF', accent: '#F5F0FF', eye: '#2A1050', mark: 'star'   } },
            apocaria:     { name: '終焉の鎧・アポカリア',    color: '#FF6040', align: 'right', portrait: { base: '#FF9070', accent: '#FFF0ED', eye: '#4A1000', mark: 'horn'   } },
            luxein:       { name: '光の守護者・ルクセイン',  color: '#FFFFA0', align: 'right', portrait: { base: '#FFFFE0', accent: '#FFFFFF', eye: '#5A5000', mark: 'halo'   } },
            primo:        { name: '原初の番人・プリモス',    color: '#A0C8FF', align: 'right', portrait: { base: '#C0DEFF', accent: '#F0F8FF', eye: '#1A3A5A', mark: 'shield' } },
            lumen:        { name: '原初の意志・ルーメン',    color: '#FFD700', align: 'right', portrait: { base: '#FFF0A0', accent: '#FFFFF0', eye: '#5A4000', mark: 'star'   } },
            // ── システム ──
            system:       { name: '',                  color: '#888',    align: 'center', portrait: { base: '#90A4AE', accent: '#F4FAFD', eye: '#263238', mark: 'star'   } },
        };

        this.scripts = {

            // ============================================================
            // オープニング
            // ============================================================
            intro: [
                { actor: 'slime',  text: 'やっとここまで来たね。空も大地も、ぜんぶ冒険の舞台だ。' },
                { actor: 'ally',   text: 'うん。どんな相手でも、一緒ならきっと越えていけるよ。' },
                { actor: 'system', text: 'スラりんたちの冒険が、いま始まる。' },
            ],

            // ============================================================
            // 第1章
            // ============================================================
            stage1_pre: [
                { actor: 'ally',   text: 'スラりん、弾を拾って大砲に込めれば発射できるよ！まず落ち着いて！' },
                { actor: 'slime',  text: 'わかった！やってみる！' },
                { actor: 'orange', text: 'ゲヘヘ！村の資材は全部いただきだ！誰にも止められん！' },
                { actor: 'ally',   text: 'させません！スラりん、一緒に戦いましょう！' },
            ],
            stage2_pre: [
                { actor: 'slaoh',  text: 'ここから先は、ただの腕試しじゃないぞ。' },
                { actor: 'slime',  text: 'わかってる。だからこそ、ちゃんと勝ちたいんだ。' },
                { actor: 'slaoh',  text: 'さあ来い！俺の改造スカウト戦車を止められるものならな！' },
                { actor: 'ally',   text: 'スラりん、速い敵には焦らず、タイミングを計って！' },
                { actor: 'slime',  text: '落ち着いてやる。スラお、絶対退かせてみせる！' },
                { actor: 'slaoh',  text: '仲良しごっこか！甘ったれんな！容赦せんぞ！！' },
            ],
            stage3_pre: [
                { actor: 'ninja',  text: '音を立てるな。森はすべてを見ている。' },
                { actor: 'ally',   text: '気配は消せなくても、気持ちは曲げないよ。' },
            ],
            stage4_pre: [
                { actor: 'king',   text: '砂漠の試練じゃ。焦るでないぞ。' },
                { actor: 'slime',  text: 'うん。落ち着いて、一歩ずつ進むよ。' },
                { actor: 'sphinx', text: '我が眠りを妨げる者よ……この砂漠の熱で焼き尽くしてくれる！' },
                { actor: 'ally',   text: '装甲が厚い……！焦らず、弾を確実に当てましょう！' },
                { actor: 'slime',  text: '（スラッチが隣にいる。絶対に負けない……！）' },
                { actor: 'sphinx', text: '小賢しい！だがここは越えさせん！全力で来い！！' },
            ],
            stage5_pre: [
                { actor: 'ally',       text: 'ここ、空気まで熱いね……。' },
                { actor: 'slime',      text: 'でも引かない。最後まで一緒に行こう。' },
                { actor: 'darkmatter', text: 'よくぞここまで来た……だがここが終わりだ！' },
                { actor: 'ally',       text: '村のみんなが待っています。絶対に負けられません！' },
                { actor: 'slime',      text: 'スラッチ、ずっと支えてくれてありがとう。もうひと踏ん張りだ！' },
                { actor: 'ally',       text: 'スラりん……（っ）……一緒に、終わらせましょう！！' },
                { actor: 'darkmatter', text: '感傷に浸る暇はないぞ！全力で来い！！' },
            ],
            stage_shakkin_pre: [
                { actor: 'shakkin', text: 'お前……お金の匂いがするな🤔' },
                { actor: 'ally',    text: 'な、なんだこの人！？' },
                { actor: 'shakkin', text: '俺に投資させてくれや！25倍にしたるわ！絶対や！' },
                { actor: 'slime',   text: '断る！！というか戦車で来るな！！' },
                { actor: 'shakkin', text: 'ちくしょーーーー！！借金返せんやんけ！！' },
            ],
            stage_boss_pre: [
                { actor: 'boss',  text: 'ここが終着点だ！この超戦車の前にひれ伏せ！' },
                { actor: 'ally',  text: '絶対に負けません……みんな、最後の力を振り絞りましょう！' },
                { actor: 'boss',  text: '面白い……来るがいい！！' },
                { actor: 'slime', text: '望むところだよ。' },
            ],
            stage_boss_ending: [
                { actor: 'boss', text: 'まさかここまでやるとはな……。' },
                { actor: 'ally', text: 'まだ終わりじゃない。次の戦いもあるんだよね。' },
            ],
            stage_secret_pre: [
                { actor: 'mystery', text: 'フォッフォッフォ…ここまで来るとはな。わしの動き、ついてこれるか？' },
                { actor: 'master',  text: '試させてもらおう——手加減はせんぞ！' },
            ],
            stage8_pre: [
                { actor: 'truedevil', text: 'ここが貴様らの墓場だ……真の力、思い知れ！' },
                { actor: 'slime',     text: '負けるもんか！みんなで来たんだ——行くぞ！！' },
                { actor: 'devil',     text: 'ついに来たな。最後の門へ。' },
                { actor: 'slime',     text: 'ここで終わらせるよ。' },
            ],
            ending: [
                { actor: 'system', text: '戦いは終わり、静かな空が戻ってきた。' },
                { actor: 'ally',   text: 'おつかれさま、スラりん。' },
            ],
            event1_pre: [
                { actor: 'ally',     text: 'あ、金色に輝く戦車が！？' },
                { actor: 'treasure', text: 'キラーン！この黄金の輝き、狙えるものなら狙ってみな！' },
            ],
            event2_pre: [
                { actor: 'turbo', text: 'ビュン！俺のスピードについてこれるかな？' },
                { actor: 'ally',  text: '制限時間内にクリアしないと！急ぎましょう！' },
            ],
            event3_pre: [
                { actor: 'fortress', text: 'ガシャーン！この鉄壁を破れるかな？' },
                { actor: 'ally',     text: '体力がものすごく高い……長期戦になります。腰を据えましょう！' },
            ],
            event4_pre: [
                { actor: 'four_kings', text: '我々四天王を倒さねば先には進めんぞ！' },
                { actor: 'ally',       text: 'これは……今まで最強の敵です！気を抜かないで！' },
            ],
            stage_ex1_pre: [
                { actor: 'dimension', text: 'ここは異次元……お前たちの常識は通用せん！' },
                { actor: 'ally',      text: '次元が歪んでいます！気をつけてください！' },
            ],
            stage_ex2_pre: [
                { actor: 'titan', text: '伝説の力を見せてやろう……覚悟せよ！' },
                { actor: 'ally',  text: 'これが最強の敵……！全力でいきます！' },
            ],
            stage_ex3_pre: [
                { actor: 'allstar', text: '全ての強者がここに集う！お前の全力を見せろ！' },
                { actor: 'ally',    text: 'これが最後の戦い……みんなで力を合わせましょう！' },
            ],

            // ============================================================
            // 第2章
            // ============================================================
            chapter2_intro: [
                { actor: 'system', text: '鉄と歯車の気配が、新たな章の始まりを告げる。' },
                { actor: 'ally',   text: 'ここからはメカっぽい相手ばかりだね。' },
                { actor: 'slime',  text: 'でも行こう。第2章、開始だ。' },
            ],
            c2_stage1_pre: [
                { actor: 'ally',   text: 'この廃村……昔は賑やかな場所だったはずなのに。' },
                { actor: 'slime',  text: '誰かいるのか？こんな錆びついた戦車まで……' },
                { actor: 'rusty',  text: '……帰れ。ここはもう終わった場所だ。お前たちが来るべき所ではない。' },
                { actor: 'ally',   text: 'でも、この廃村には何かが……スラりん！' },
                { actor: 'rusty',  text: '廃村に足を踏み入れるなら、覚悟はできてるんだろうな。' },
                { actor: 'slime',  text: 'もちろん。ここで立ち止まるつもりはないよ。' },
            ],
            c2_stage2_pre: [
                { actor: 'slime',    text: 'わあ、草原だ！……あれ、なんかいる。' },
                { actor: 'c2meadow', text: 'む、侵入者か。この草原は我々鉄仮面軍団の見張り地点だ。通すわけにはいかん。' },
                { actor: 'ally',     text: '（なんか……のんびりしてる？）' },
                { actor: 'slime',    text: 'あなどってたら負けるよスラッチ！いくぞ！' },
                { actor: 'c2meadow', text: 'のどかな景色ほど、油断を誘うものさ。' },
                { actor: 'ally',     text: 'だったら、先にこっちが本気を見せるだけだよ。' },
            ],
            c2_stage3_pre: [
                { actor: 'slime',   text: 'この海岸……嵐みたいに荒れてるな。' },
                { actor: 'tempest', text: 'ガハハ！邪魔をするなよ、ちびスライム！この海は俺のもんだ！' },
                { actor: 'ally',    text: '海を封鎖して交易路を断っているのはあなたですね！村のみんなが困っています！' },
                { actor: 'tempest', text: '知ったことか！海の法は強い奴が作る——来るなら来い！！' },
                { actor: 'slime',   text: '越えてみせるよ。この戦車でね。' },
            ],
            c2_stage4_pre: [
                { actor: 'ally',      text: 'わあ……温泉！すごい量の湯気ですね。' },
                { actor: 'c2steamy', text: 'ほほほ〜♪ここは我々の研究所ですのよ〜。魔法エネルギーを温泉から補充しておりますの。' },
                { actor: 'slime',     text: '研究所？鉄仮面軍団って機械じゃなかったの！？' },
                { actor: 'c2steamy', text: 'まあ失礼！では魔法でお引き取り願いますわ〜♪' },
                { actor: 'ally',      text: '湯気の向こうは見えにくいけど、進む方向は決まってるよ。' },
            ],
            c2_stage5_pre: [
                { actor: 'slime',    text: 'あいつらが「鉄仮面軍団」か。ドロドロ団とは全然違う……もっと組織的だ。' },
                { actor: 'vanguard', text: '侵入者確認。排除命令が下っている。感情はない——ただ任務を遂行する。' },
                { actor: 'ally',     text: '（スラりん……あの戦車、改造の痕が。誰かに無理やり……？）' },
                { actor: 'slime',    text: '関係ない。ここを通らせてもらうぞ！' },
                { actor: 'vanguard', text: 'ここが最後の防衛線だ。' },
                { actor: 'slime',    text: 'だったら突破するだけだ。' },
            ],
            c2_boss_pre: [
                { actor: 'gear',  text: '……よく来た、スラりん。お前の噂は聞いている。ドロドロ団を倒した英雄、か。' },
                { actor: 'slime', text: 'お前が鉄仮面軍団のトップか！なんで王国を狙う！何が目的だ！' },
                { actor: 'gear',  text: 'ふむ……目的？「完璧な秩序」だ。感情に流される者は弱い。機械のように動く世界こそ、最強だ。' },
                { actor: 'ally',  text: 'そんな世界は——誰も幸せじゃない！スラりん、行きましょう！' },
                { actor: 'gear',  text: '感傷的だな。では証明してみせろ——その「心」とやらの強さを！！' },
                { actor: 'slime', text: 'でも勝つよ。ここで終わらせる。' },
            ],
            chapter2_ending: [
                { actor: 'gear',   text: 'バカな……。私の完璧な戦略が……感情に負けた、だと？' },
                { actor: 'slime',  text: '強さは機械じゃない。仲間と繋がる「心」だ。わかったか！' },
                { actor: 'gear',   text: '……フッ。負けを認めよう。だが覚えておけ。この先には、私より遥かに危険な存在がいる。' },
                { actor: 'system', text: '〜第2章「ギアギアどきどき大作戦！」かんりょう〜♪' },
                { actor: 'system', text: '第3章へと続く……' },
            ],

            // ============================================================
            // 第3章
            // ============================================================
            chapter3_intro: [
                { actor: 'system', text: 'まばゆい雲海の向こうに、新しい道がひらけた。風は甘く、雲は静かに歌っている。' },
                { actor: 'slime',  text: 'ここが第3章……空気までふわふわしてる。でも、足もとがないぶん、ちょっとだけ怖いな。' },
                { actor: 'ally',   text: 'うん。でも見て、雲の橋の先。鐘みたいな光がずっと点いてる。誰かが待ってるんだ。' },
                { actor: 'king',   text: '天の門は、力よりも心を試すと聞く。迷い、後悔、願い……そのすべてを抱えたまま進まねばならぬ。' },
                { actor: 'slime',  text: 'じゃあ、今までの旅で得たもの全部を持っていくよ。負けたくない気持ちも、守りたい気持ちも。' },
                { actor: 'ally',   text: 'それに、ここまで来たのは二人だけの力じゃないよ。出会ったみんなが、ちゃんと背中を押してくれてる。' },
                { actor: 'system', text: '雲の下では、かつて救われた村々の灯が小さくまたたいていた。ここは空の果てであり、旅の記憶が重なる場所。' },
                { actor: 'king',   text: 'もし心が折れそうになったら、地上を思い出すのじゃ。おぬしたちを待つ者がおることを。' },
                { actor: 'slime',  text: 'うん。ぼくらの旅が本物かどうか、ここで確かめる。逃げないよ。' },
                { actor: 'ally',   text: '見たことのない景色も、強そうな敵も、ぜんぶ越えていこう。いこう、スラりん。' },
                { actor: 'system', text: '第3章「天門のスカイパレード」開幕。雲海の向こうで、光の砲塔がゆっくりと目を覚ます。' },
            ],
            c3_stage1_pre: [
                { actor: 'ally',        text: 'うわあ……空の上まで来ちゃった。ここ、本当に天国みたいだね。雲が道になってる。' },
                { actor: 'slime',       text: 'きれいだけど、気配はあるよ。誰かに見られてるみたい。油断しないでいこう。' },
                { actor: 'cloud_guard', text: '生きた者よ。ここは試される場所。軽い願いも、偽りの勇気も、この門は通さない。' },
                { actor: 'ally',        text: '歓迎されてる感じじゃないけど……ここで引いたら第3章の意味がなくなっちゃう。' },
                { actor: 'slime',       text: '望むところだよ。ぼくらの気持ち、ちゃんと見せてあげる。' },
            ],
            c3_stage2_pre: [
                { actor: 'slime',      text: '床が虹色に光ってる……きれいだけど、足を止めたら吸い込まれそうで落ち着かないね。' },
                { actor: 'ally',       text: 'でもちょっと楽しいかも。ほら、反対側の雲まで光がつながってる。……あ、来た！' },
                { actor: 'holy_knight', text: 'この回廊を進むなら、速さと信念の両方を示しなさい。迷いながらでは光に置いていかれます。' },
                { actor: 'ally',       text: 'じゃあ両方でいこう。置いていかれないでね、スラりん。' },
                { actor: 'slime',      text: 'うん。速さも気持ちも、ちゃんと前に向けてみせる！' },
            ],
            c3_stage3_pre: [
                { actor: 'ally',     text: '鐘の音が近いね。なんだか胸の奥まで見透かされてる気がする。隠し事までばれそう。' },
                { actor: 'guardian', text: '急ぐ心は曇りを生む。ここでは、一撃よりも揺るがぬ意志が問われる。お前たちは何を背負って進む。' },
                { actor: 'slime',    text: 'ぼくらだって、ただ突っ走ってきたわけじゃないよ。怖かった時も、迷った時も、そのたびに自分で選んできた。' },
                { actor: 'ally',     text: 'うん。ここまで来たぶんだけ、ちゃんと強くなってる。だから今回は逃げない。' },
            ],
            c3_stage4_pre: [
                { actor: 'star_priest', text: '星の巡りは語っている。あなたたちはまだ、終点に届いていないと。ここは通過点にすぎません。' },
                { actor: 'slime',       text: 'だったら、その終点までの道をここで開くよ。見えないなら、自分たちで切り開く。' },
                { actor: 'ally',        text: '天国でも占いは当たるのかな。だったら、ぼくらが外れ値になるしかないね。' },
                { actor: 'star_priest', text: 'よろしい。では、星々の加護を受けた戦車で応えましょう。あなたたちの軌道、ここで測らせてもらいます。' },
            ],
            c3_stage5_pre: [
                { actor: 'slime',    text: '風が強い……でも、ここを越えれば一番上だ。もう少しで、空のてっぺんに手が届く。' },
                { actor: 'archangel', text: 'ここまで登った勇気は認めよう。だが、頂へ至る者は希望そのものを示さねばならない。言葉ではなく、戦いで。' },
                { actor: 'ally',     text: '希望なら、ずっと運んできたよ。泣きそうな時も、ちゃんと前を向いてきた。' },
                { actor: 'slime',    text: 'もちろん。ぼくらの戦い方を見せよう。ここまで来た理由ごと、全部ぶつける。' },
            ],
            c3_boss_pre: [
                { actor: 'seraph', text: '旅の終わりではない。ここは、願いの重さを量る門。軽い憧れだけでは、この高さに届かない。' },
                { actor: 'slime',  text: '重さなら十分あるよ。守りたいものも、一緒に帰りたい気持ちも、ここまで来た時間も。' },
                { actor: 'ally',   text: 'だから止まれない。たとえ相手が天国の番人でもね。わたしたち、帰る場所を知ってるから。' },
                { actor: 'seraph', text: 'ならば受けなさい。この光が、あなたたちの真意を暴くでしょう。偽りがあれば、ここで砕けます。' },
            ],
            chapter3_ending: [
                { actor: 'system', text: '最後の砲火がほどけると、雲海は音もなく割れ、はるか上空にもう一つの空路が姿を現した。' },
                { actor: 'seraph', text: '見事です。あなたたちは傷つきながらも、最後まで願いを手放さなかった。その心は、光よりも強く響いていました。' },
                { actor: 'slime',  text: 'ぼくらだけの力じゃないよ。ここまで来る途中で、たくさん助けられて、たくさん支えられてきたんだ。' },
                { actor: 'ally',   text: 'うん。だからこの景色、ただの思い出にはしたくない。次の場所へ進むための約束にしたいんだ。' },
                { actor: 'seraph', text: 'ならば門は開かれます。願いを独り占めしない者にこそ、さらに高い空は応えるでしょう。' },
                { actor: 'king',   text: 'よくやったのう。天の試練を越えた今、おぬしたちはもう誰にも侮れぬ。王国の空も、もう昔の空ではない。' },
                { actor: 'slime',  text: 'ありがとう。でも、まだ終わりじゃない。上に道があるなら、その先にもきっと守るべきものがある。' },
                { actor: 'ally',   text: 'だったら次も一緒だね。怖くても、泣きそうでも、ちゃんと笑って進もう。' },
                { actor: 'seraph', text: '進みなさい、旅人たち。あなたたちの戦車には、もう地上と天上の両方の祈りが宿っています。' },
                { actor: 'system', text: '第3章クリア。祝福の粒子が空へ舞い、新たな空路が静かに姿を現した。物語は、さらに深い蒼へ続いていく。' },
            ],

            // ============================================================
            // 第4章
            // ============================================================
            chapter4_intro: [
                { actor: 'system', text: '天門をくぐった先——そこは光ではなく、深い暗闇だった。上も下もなく、ただ深淵だけがある。' },
                { actor: 'slime',  text: 'セラフィムは「次の空へ」って言ったのに……ここ、全然空じゃない。底なしの闇だ。' },
                { actor: 'ally',   text: 'でも、落ちてはいないよ。ちゃんと立ってる。ここも、誰かの「世界」なんだと思う。' },
                { actor: 'king',   text: '深淵とは、光が届かぬ場所にあらず——光を恐れて目を閉じた者が作る場所じゃ。進む心があれば、必ず道は見える。' },
                { actor: 'slime',  text: 'じゃあぼくらの目が、ここの光になればいい。今まで出会ってきたみんなの分も、ちゃんと前を照らす。' },
                { actor: 'ally',   text: 'うん。怖いけど、一人じゃないし。スラりん、私ずっとそばにいるよ。' },
                { actor: 'system', text: '深淵の底から、かすかな気配が届いた。混沌と虚無の支配者——「ニヒルム」が、旅人たちを待っている。' },
                { actor: 'slime',  text: 'ここまで来たなら、もう迷わない。深淵の一番底まで——行くぞ！' },
                { actor: 'system', text: '第4章「深淵のカオスゾーン」開幕。漆黒の砲塔が、静かに目を覚ます。' },
            ],
            c4_stage1_pre: [
                { actor: 'system',      text: '深淵の入り口——漆黒の霧が渦巻き、足元さえ見えない。それでも、二人の砲車は前へ進んだ。' },
                { actor: 'slime',       text: 'ここが……深淵か。光が届かない。足元も見えない。' },
                { actor: 'ally',        text: 'セラフィムが「次の空へ」って言ったのに、ここは空じゃなくて……底？' },
                { actor: 'void_knight', text: '……ようこそ、逆さまの天国へ。光が強いほど、影も深い。天門をくぐった者は必ずここへ落ちる。' },
                { actor: 'slime',       text: '落ちたなら登り返すだけだ。退かないぞ！' },
                { actor: 'void_knight', text: 'フフ……その意気、深淵が喜んでいる。だが、深淵に足を踏み入れた者は、光を忘れて戻れなくなる。それでも進むか？' },
                { actor: 'ally',        text: 'スラりん……ここ、なんか声が聞こえる気がする。「帰れ」って。' },
                { actor: 'slime',       text: 'ぼくも聞こえてる。でも、これは脅しだよ。本当に危険なら、近づくなってわかるはずだ。進む。光を忘れないために戦うんだ！' },
            ],
            c4_stage1_post: [
                { actor: 'ally',        text: 'やった！最初の関門、突破だよ！' },
                { actor: 'void_knight', text: '……強い。だが、この先は本当の混沌が待つ。君たちの「光」が、どこまで届くか見てやろう。' },
                { actor: 'system',      text: '虚無の騎士が道を開いた。深淵の霧が少し晴れ、歪んだ景色の向こうに次の戦場が見えてくる。' },
            ],
            c4_stage2_pre: [
                { actor: 'system', text: '逆さまの廃都——建物が宙に浮き、重力が狂い、時間すら歪んで見える場所。' },
                { actor: 'ally',   text: 'この街……建物が全部逆向きに生えてる。重力がおかしい！' },
                { actor: 'mirage', text: 'ここでは「上」も「下」も意味を持たない。あなたたちの常識が、最大の弱点です。' },
                { actor: 'slime',  text: 'じゃあ常識なんて捨てればいいだけだ。こっちは最初からそのつもりだぞ！' },
                { actor: 'ally',   text: '（スラりん……なんか頼もしくなったね。）よし、行きましょう！' },
                { actor: 'chaos_mage', text: 'クックック……この都市は私の「実験場」。真実と虚偽、現実と幻想を混ぜ合わせた究極の迷宮よ。' },
                { actor: 'ally',   text: '実験場って……私たちをモルモットにするつもり？そんなの、させないよ！' },
            ],
            c4_stage2_post: [
                { actor: 'chaos_mage', text: '……まさか、この混沌の中で正気を保てるとは。面白い旅人たちだわ。' },
                { actor: 'slime',      text: '正気を保てるのは、隣に信頼できる仲間がいるからだよ。一人じゃきっと無理だった。' },
                { actor: 'system',     text: '廃都の歪みが静まり、重力が少し戻った。混沌の魔導師は去り、次の道が開かれる。' },
            ],
            c4_stage3_pre: [
                { actor: 'system', text: '嘘の楽園——輝く花園と穏やかな光。だが、その美しさはすべて「偽物」だと、二人は気づいていた。' },
                { actor: 'slime',  text: 'なんだここ……急に明るくなった。花畑まである。でも……なんか変だ。' },
                { actor: 'falsum', text: 'ようこそ！ここは完璧な楽園。戦わなくていい。疲れた心を休めなさい。ずっとここにいられますよ。' },
                { actor: 'ally',   text: 'ダメです！これは全部嘘です！花の香りに魔法がかかってる！スラりん、騙されないで！' },
                { actor: 'slime',  text: '安心しろスラッチ。帰る場所を知ってる奴は、偽物の楽園には留まれないんだ。' },
                { actor: 'nihilum', text: '……よく気づいた。ここは私が作った「理想の世界」。誰も傷つかず、争いもない——でも、誰も生きてもいない。' },
                { actor: 'slime',  text: 'ニヒルム……！やっと声が聞けた。でも、それは楽園じゃない。傷つくことも、生きることの一部だよ。' },
                { actor: 'falsum', text: 'ちっ……見破られましたか。では正面から相手しましょう！' },
            ],
            c4_stage3_post: [
                { actor: 'nihilum', text: '……あなたたちは、痛みを知りながらも前へ進む。私には、それが理解できなかった。' },
                { actor: 'ally',    text: '理解しなくていいよ。一緒に感じればいい。次も、一緒に前へ行こう。' },
                { actor: 'system',  text: '嘘の花々が散り、本当の深淵の空気が戻ってくる。ニヒルムの声が、少しだけ柔らかくなった気がした。' },
            ],
            c4_stage4_pre: [
                { actor: 'system',  text: '記憶の断層——過去の戦いの残像が、断片的に空間に刻まれている。スラりんたちの記憶も、ここでは形を持つ。' },
                { actor: 'amnesia', text: '見なさい——お前たちが通り過ぎてきた場所の残像だ。どれが本当の記憶か、もうわからないだろう。' },
                { actor: 'ally',    text: '……ほんとだ。村の光、ギア将軍の言葉、セラフィムの門……全部見える。' },
                { actor: 'slime',   text: '全部本物だ。辛かったことも、嬉しかったことも、ぜんぶ。消えてたまるか！' },
                { actor: 'amnesia', text: '記憶を力にするか……ならば、その記憶が本物かどうか、この鉄の壁でもう一度確かめてみせよ！' },
                { actor: 'nihilum', text: '記憶とは残酷なものだ。美しかった日々も、消えた仲間も——すべて「失ったもの」として残る。だから私は忘れることを選んだ。' },
                { actor: 'slime',   text: '忘れることと、乗り越えることは違うよ。ニヒルム、君が深淵に閉じこもった理由を——聞かせてほしい。' },
            ],
            c4_stage4_post: [
                { actor: 'nihilum', text: '……昔、守ろうとした者たちがいた。だが私の力は及ばず、すべて失った。だから「何も持たなければ、何も失わない」と思った。' },
                { actor: 'ally',    text: 'ニヒルム……それは悲しいよ。でも、だから一人で深淵にいたんだね。' },
                { actor: 'slime',   text: '一人で抱えてたんだ。もう、そうしなくていいよ。ぼくらが来たんだから。' },
                { actor: 'system',  text: '記憶の断層が静かに溶けていく。ニヒルムの瞳に、わずかな光が灯った。' },
            ],
            c4_stage5_pre: [
                { actor: 'system',     text: '深淵の玉座間——混沌の核心、ニヒルムが長い年月をかけて作り上げた「虚無の城」の最奥。' },
                { actor: 'slime',      text: 'でかい……玉座間まるごと戦車だ。こいつが最後の関門か。' },
                { actor: 'chaos_lord', text: '深淵の主・ニヒルムの前哨戦士だ。おまえたちの旅の総決算をしてやろう。全力を出してみせろ！' },
                { actor: 'ally',       text: 'スラりん、私たちの旅は全部ここに繋がってた。あの村から、ここまで。' },
                { actor: 'slime',      text: 'そうだな。じゃあその全部を、今ここで使い切る。行くぞ、スラッチ！！' },
                { actor: 'nihilum',    text: '……ここが最後の場所だね。すごく重たい空気がする。でも、怖くない。スラりんがいるから。' },
                { actor: 'slime',      text: 'うん。ニヒルム、ここで決着をつけよう。戦いたいんじゃない——君を「深淵から連れ出したい」んだ。' },
            ],
            c4_boss_pre: [
                { actor: 'nihilum', text: '……来たか。天門を越え、深淵の底まで。お前たちは、何を求めてここまで来た？' },
                { actor: 'slime',   text: '求めてきたわけじゃない。ただ、守りたいものがあって、前に進んできただけだ。' },
                { actor: 'nihilum', text: '守る……か。では問おう。お前が守ってきたものは、本当に「守れて」いたか？' },
                { actor: 'ally',    text: '……失ったものも、傷つけてしまったことも、あります。でも——それを知ってるから、また立ち上がれる。' },
                { actor: 'slime',   text: 'そうだ。完璧じゃないから、まだ歩ける。お前の「虚無」には、絶対に沈まない！' },
                { actor: 'nihilum', text: '……面白い答えだ。では——この龍の鎧に込めた、私の「全力」を受けてみろ！！' },
            ],

            // ============================================================
            // ★★★ 負けイベント：ニヒルム戦・第1ラウンド敗北 ★★★
            // ============================================================
            c4_boss_lose_event: [
                { actor: 'system',  text: '轟音とともに、スラりんたちの砲弾が全て弾き返された。龍の機械鎧が——まったく揺らいでいない。' },
                { actor: 'nihilum', text: 'ハァ……ハァ……まだだ。まだ、終わっていない。' },
                { actor: 'slime',   text: '（ダメだ、この龍の鎧……どこかに当たってる気がしない。全弾跳ね返されてる——）' },
                { actor: 'ally',    text: 'スラりん……！？戦車が、止まってる。エンジンが——' },
                { actor: 'system',  text: '深淵の虚無が戦車全体を包み込み、システムが次々とシャットダウンされていく——。' },
                { actor: 'nihilum', text: '……終わりだ。お前たちの旅も、ここで幕を引く。「帰る場所」など、最初からなかったのだ。' },
                { actor: 'slime',   text: '…………（意識が、遠くなる——）' },
                { actor: 'system',  text: '静寂……。戦車の全システムが落ちた。漆黒の中で、スラッチの声だけが、かすかに響く。' },
                { actor: 'ally',    text: 'スラりん……！スラりん、起きて！！ねえ——戦車が、まだ動いてる！！' },
                { actor: 'ally',    text: 'コアがまだ光ってる！エンジン出力、59%！！戦車は、まだここにいる！！' },
                { actor: 'system',  text: 'どこかで——小さな砲音が鳴った。戦車の奥深く、まだ熱を持ったコアが、静かに再鼓動を始める。' },
                { actor: 'slime',   text: '……（ぼくは……まだここに……いる）' },
                { actor: 'ally',    text: 'そうだよ！ここにいる！ドロスケ団長も、ギア将軍も、セラフィムも——みんな、覚えてる！？' },
                { actor: 'slime',   text: '…………覚えてる。全部——ぜんぶ、覚えてる。' },
                { actor: 'system',  text: 'エンジン出力：78%。主砲冷却システム：再起動。装甲強化プログラム：フル展開——。' },
                { actor: 'slime',   text: 'ニヒルム……。お前が「帰る場所はない」って言ったけど——ぼくには、ある。みんなが待ってる、あの場所が。' },
                { actor: 'slime',   text: 'だから——まだ、終わらない！！戦車よ……もう一度だ！！全力で、行くぞ！！！' },
                { actor: 'system',  text: '戦車のエンジンが轟音と共に覚醒した。出力：MAX。新たな炎が、深淵を照らし出す——！' },
            ],

            // ============================================================
            // ★★★ 第2ラウンド開始演出 ★★★
            // ============================================================
            c4_boss_second_chance: [
                { actor: 'nihilum', text: '……なに!? 戦車が——まだ動いているだと!?' },
                { actor: 'slime',   text: 'ぼくらはまだここにいる。諦めたなんて、言ってない！！' },
                { actor: 'ally',    text: '全システム再起動完了！攻撃力・速度——全部MAXに引き上げた！！スラりん、行けるよ！！' },
                { actor: 'nihilum', text: '……バカな。あれだけの虚無を受けて……いったい何が、お前たちをそこまで動かす！？' },
                { actor: 'slime',   text: '仲間だよ。旅の全部が、今ここに来てくれてる。ニヒルム——もう一回、今度こそ本気で行くぞ！！' },
            ],
            chapter4_ending: [
                { actor: 'system',  text: '最後の混沌が晴れると、深淵の底に一筋の光が差し込んだ。虚無の主が——初めて、笑っていた。' },
                { actor: 'nihilum', text: '……長い夢を見ていた気がする。光を拒んでいたあの時間が、今は少し遠い。' },
                { actor: 'slime',   text: 'ニヒルム、一緒に地上に戻ろう。ぼくらの村、絶対に気に入ると思うから。' },
                { actor: 'ally',    text: 'うん。混沌の主も、帰る場所があっていいはずだよ。一人で深淵に残ることはないんだ。' },
                { actor: 'nihilum', text: '……「帰る場所」か。私にも、そんなものが作れるだろうか。' },
                { actor: 'king',    text: '場所は作るものじゃ。人と繋がることで、自然と生まれる——おぬしにはもう、その繋がりがある。' },
                { actor: 'slime',   text: 'この旅で出会った全員が待ってるよ。ドロスケ団長も、ギア将軍も、セラフィムも——ぜんぶ繋がってる。' },
                { actor: 'nihilum', text: 'ならば——共に行こう。私も、その旅の続きを見てみたい。' },
                { actor: 'ally',    text: 'よし！じゃあ出発だ。次はどんな空が待ってるんだろうね。' },
                { actor: 'system',  text: '第4章クリア。深淵に光が満ち、新たな仲間を得た旅人たちの物語は、まだ終わらない。' },
            ],

            // ============================================================
            // 第5章
            // ============================================================
            chapter5_intro: [
                { actor: 'system',  text: '深淵の果てを越えた先——そこは光でも闇でもない、「何かが始まる前」の空間だった。' },
                { actor: 'slime',   text: 'ニヒルムが言ってた「その先」が、ここか。……音がない。風もない。でも、確かに「何か」がいる。' },
                { actor: 'ally',    text: 'スラりん、見て。あの光——点いたり消えたりしてる。まるで、呼吸してるみたいだよ。' },
                { actor: 'nihilum', text: '……ここは「原初の回廊」。世界が始まる前から存在する空間だ。私でさえ、ここには近づかなかった。' },
                { actor: 'king',    text: '怖れるな。ここまで来た者たちには、ここに立つ資格がある。お前たちの旅は、この場所を目指していたのじゃ。' },
                { actor: 'slime',   text: '……そっか。村から出た時は、こんな場所まで来るとは思ってなかった。でも、来るべくして来たんだな。' },
                { actor: 'ally',    text: 'うん。一人じゃ絶対に来られなかった。スラりん、みんなと一緒に——行こう。' },
                { actor: 'nihilum', text: '……「原初の意志」ルーメン。この世界を作った存在が、先で待っている。覚悟しろ。' },
                { actor: 'slime',   text: '覚悟なら、旅の初日からずっとしてきた。今さら怖くない——行くぞ！！' },
                { actor: 'system',  text: '第5章「原初の光と終焉の砲火」開幕。世界の始まりに、スラりんたちの砲火が轟く。' },
            ],
            c5_stage1_pre: [
                { actor: 'system', text: '原初の回廊——静寂と光の粒子だけが存在する、世界の「前」の空間。' },
                { actor: 'slime',  text: '……何もない。音もない。でも何かが、ここには「ある」。' },
                { actor: 'ally',   text: '（ニヒルムが言ってた——深淵の先に「始まり」があると。ここがそうなんだ）' },
                { actor: 'ally',   text: 'スラりん……ここ、なんか懐かしい気がする。会ったことないのに。' },
                { actor: 'slime',  text: 'ぼくも。全部の始まりがここにある気がして——だから、知ってる気がするのかも。' },
                { actor: 'primo',  text: '……訪問者か。久しぶりだ。光と闇が分かれる前からここを守っている。何しに来た？' },
                { actor: 'slime',  text: 'ぼくらが歩いてきた全部の旅が、ここに繋がってた気がして。答えを知りたい。' },
                { actor: 'primo',  text: '答えは戦いの先にある。通りたければ——越えてみせよ。' },
            ],
            c5_stage1_post: [
                { actor: 'slime',  text: 'やった……！でも、まだ先がある。行くぞ、スラッチ！' },
                { actor: 'primo',  text: '……お前たちは、本物だ。先へ進め。ただし——ここより先は、もう戻れない。覚悟を持て。' },
            ],
            c5_stage2_pre: [
                { actor: 'system',    text: '創造の砂漠——まだ形を持たない可能性が、砂の一粒一粒に宿る場所。' },
                { actor: 'ally',      text: 'スラりん……この砂漠、砂の一粒一粒が光ってる。でも踏むと消える。' },
                { actor: 'ally',      text: 'この砂……踏んだら何か生まれそうな気がする。怖いような、ワクワクするような。' },
                { actor: 'amorphous', text: 'ここは「可能性の砂漠」。あらゆる形になれる——そして、あらゆる形で壊せる。' },
                { actor: 'slime',     text: '形がないなら、どこを狙えばいい？（……でも、ぼくらの弾は正直だ。当たれば傷つく）' },
                { actor: 'ally',      text: 'スラりん！形が変わっても、「そこにいる」ことは変わらない。しっかり見て！' },
                { actor: 'slime',     text: '「形なき者」が来る。形がなくても——ぼくらの砲弾は本物だ。負けない！' },
            ],
            c5_stage2_post: [
                { actor: 'ally',  text: 'やった！形が変わっても、諦めなかったから勝てたんだよ！' },
                { actor: 'slime', text: 'うん。どんな形であっても、「そこにいる」ことを信じれば当たる。それがぼくらの戦い方だ。' },
            ],
            c5_stage3_pre: [
                { actor: 'system',  text: '記憶の宮殿——過去の全ての戦いが、透明な鏡に映し出されている。' },
                { actor: 'eidolon', text: 'ようこそ、旅人たち。ここは全ての記憶が鏡に映る場所。見てみなさい——お前たちの旅を。' },
                { actor: 'ally',    text: '……！あの村での最初の戦いが見える。ぎこちなくて、怖くて。' },
                { actor: 'nihilum', text: '……ここは私も来たくなかった。自分の記憶が全て見える。逃げられない。' },
                { actor: 'slime',   text: 'でも、見てみろよニヒルム。お前の記憶の中に——ぼくらもいるじゃないか。' },
                { actor: 'nihilum', text: '……そうだな。（静かに）……そうだな。行こう。' },
                { actor: 'slime',   text: 'ドロスケ団長も、ギア将軍も、セラフィムも、ニヒルムも。全員の顔が映ってる。' },
                { actor: 'eidolon', text: '問おう——それだけの人と出会い、傷つけ、助けられた旅を経て、お前たちは今何者だ？' },
                { actor: 'slime',   text: 'ぼくらは……ただのスラりんとスラッチだよ。でも、それで十分だ。一緒に歩いてきたから！' },
                { actor: 'eidolon', text: '……答えは聞いた。ならばその「今」を、この刃で証明してみせよ！！' },
            ],
            c5_stage3_post: [
                { actor: 'ally',    text: 'エイドロン……あなたは旅人の覚悟を問う役目だったんだね。ありがとう。' },
                { actor: 'eidolon', text: '……感謝を言う者は初めてだ。旅人たち、最後まで——その心のまま進め。' },
            ],
            c5_stage4_pre: [
                { actor: 'system',   text: '終焉の砲台群——原初の意志への最後の障壁。全ての道がここに収束する。' },
                { actor: 'slime',    text: '……あれが、最後の壁か。圧が全然違う。' },
                { actor: 'apocaria', text: '原初の意志「ルーメン」に至る道は、ここで終わりだ。世界の始まりは——誰にも触れさせない。' },
                { actor: 'ally',     text: 'なんで？世界の始まりを知ることが、そんなに危険なの！？' },
                { actor: 'apocaria', text: '知れば変えたくなる。変えれば壊れる。無知のまま生きるのが、被造物の正しい姿だ。' },
                { actor: 'nihilum',  text: 'アポカリア……「終焉の鎧」。私と同じ時代から存在する番人だ。強い。' },
                { actor: 'slime',    text: '強くても、越えるだけだ。ぼくらにはここまでの全部がある。行くぞ！！' },
            ],
            c5_stage4_post: [
                { actor: 'apocaria', text: '……ルーメンが「待っていた」と言っていた意味が、今わかった。お前たちは——本当に、来るべくして来た者たちだ。' },
                { actor: 'ally',     text: 'スラりん……あと一つだよ。光の玉座を越えたら——ルーメンに会える。' },
                { actor: 'slime',    text: 'うん。みんな——あと少しだ。一緒に行こう！' },
            ],
            c5_stage5_pre: [
                { actor: 'system',  text: '光の玉座——原初の意志「ルーメン」の居城に繋がる最後の扉。全ての光がここに集まっている。' },
                { actor: 'ally',    text: 'わあ……まぶしい。でも、目を逸らしたくない。ちゃんと、見たい。' },
                { actor: 'slime',   text: 'ルクセイン……「光の守護者」か。強そうだけど——なんか怖くないな。なんでだろう。' },
                { actor: 'nihilum', text: '……それは、お前たちが「光」を信じているからだ。恐れる必要がない光は、守護者も越えられる。' },
                { actor: 'luxein',  text: '旅人よ——よくここまで来た。私は原初の意志「ルーメン」の最後の護衛。お前たちの心を、最後に問う。' },
                { actor: 'ally',    text: '試されるのは、もう嫌じゃないよ。だって今まで全部、試練の先に本物があったから。' },
                { actor: 'slime',   text: 'ルクセイン。ぼくらは「ルーメン」に会いに来た。邪魔はさせない。行くぞ！！' },
                { actor: 'luxein',  text: '……それでこそ。では、その覚悟を見せてもらおう！！' },
            ],
            c5_stage5_post: [
                { actor: 'luxein', text: '……お前たちの光は、私が守ってきたものより——遥かに温かかった。ルーメンに会いに行け。待っている。' },
                { actor: 'slime',  text: 'よし……！ルーメン、今行くぞ！！' },
                { actor: 'ally',   text: 'スラりん、手を貸して。一緒に——扉を開こう。' },
            ],

            // ============================================================
            // 第5章 ラスボス：スライム王（ルーメンの意志が宿りし王）
            // ============================================================
            c5_boss_pre: [
                { actor: 'system', text: '原初の回廊の最奥——眩い光の中に、見知った影が静かに立っていた。' },
                { actor: 'slime',  text: '……王様！？なんでここに！？' },
                { actor: 'king',   text: '……スラりん。よくぞここまで来た。だが今の我は——ただのスライム王ではない。' },
                { actor: 'ally',   text: '王様の中に……ルーメンの意志が宿ってる？どうして！' },
                { actor: 'lumen',  text: '（スライム王を通じて）……この旅を、最後まで見届けたかった。王は自ら申し出てくれた。「私の体を使え」と。' },
                { actor: 'king',   text: '案じるな、スラりん。これは我が選んだことじゃ。お前たちの旅の総仕上げ——王として、全力で受けとめてやろう。' },
                { actor: 'nihilum', text: '……王。本当にいいのか。あれだけの意志を受け止めれば——' },
                { actor: 'king',   text: 'スラりんが村を出た日から、ずっと見守ってきた。この最後の戦いを、一番近くで感じたかったのじゃ。' },
                { actor: 'slime',  text: '王様……！絶対に取り戻す。王様もルーメンも——二人とも、一緒に帰ろう！行くぞ！！' },
            ],
            chapter5_ending: [
                { actor: 'system',  text: '最後の光が静まると——スライム王の瞳に、懐かしい温かさがゆっくりと戻ってきた。' },
                { actor: 'lumen',   text: '……これが「誰かと共にある」ということか。長い孤独の時間では、決して知れなかった。' },
                { actor: 'king',    text: '（ゆっくりと目を開け）……スラりん。心配をかけたな。でも——これが最後の試練じゃった。お前たちは、見事に答えを出した。' },
                { actor: 'slime',   text: '王様……！良かった、ちゃんと戻ってきてくれた。' },
                { actor: 'ally',    text: '王様もルーメンも——二人とも、旅の最後に一緒にいてくれたんだね。' },
                { actor: 'nihilum', text: '……ルーメン。あなたが作った世界は不完全だったかもしれない。でも、その不完全さが——この旅を生んだ。' },
                { actor: 'lumen',   text: 'そうか。不完全だったから、誰かを必要とした。必要としたから、出会えた。……ならば、不完全で良かったのかもしれない。' },
                { actor: 'king',    text: 'さあ——旅は終わりじゃ。しかし世界は続く。スラりん、お前たちの砲火は世界の始まりまで届いた。これからも、前を向いて歩くのじゃ。' },
                { actor: 'slime',   text: 'うん。……みんなで、村に帰ろう。ドロスケ団長も、ギア将軍も、セラフィムも、ニヒルムも、ルーメンも、王様も——全員で！' },
                { actor: 'ally',    text: '全員でご飯食べたら、すごい人数になるね（笑）。でも、それがいいんだ。' },
                { actor: 'system',  text: '全章クリア。スラりんたちの旅は、世界の始まりから村の台所まで、ひとつに繋がった。ありがとう、旅人たち。' },
            ],

        }; // this.scripts 終了
    }

    start(sceneId, callback) {
        if (!this.scripts[sceneId]) {
            if (callback) callback();
            return;
        }
        this.active = true;
        this.sceneId = sceneId;
        this.lineIndex = 0;
        this.charTimer = 0;
        this.textToDraw = '';
        this.waitingInput = false;
        this.callback = callback;
        this._inputConsumed = false;
        this._skipConsumed = false;
    }

    next() {
        if (!this.active || !this.sceneId) return;
        const lines = this.scripts[this.sceneId];
        if (this.waitingInput) {
            this.lineIndex++;
            if (this.lineIndex >= lines.length) {
                this.active = false;
                const cb = this.callback;
                this.callback = null;
                if (cb) cb();
            } else {
                this.charTimer = 0;
                this.textToDraw = '';
                this.waitingInput = false;
            }
        } else {
            this.charTimer = 9999;
            this.textToDraw = lines[this.lineIndex].text;
            this.waitingInput = true;
        }
    }

    update(input) {
        if (!this.active || !this.sceneId) return;

        if (input.back) {
            if (!this._skipConsumed) {
                this._skipConsumed = true;
                this.active = false;
                const cb = this.callback;
                this.callback = null;
                if (cb) cb();
                if (window.game) window.game.sound.play('select');
            }
            return;
        }
        this._skipConsumed = false;

        const line = this.scripts[this.sceneId][this.lineIndex];
        if (!line) return;

        if (!this.waitingInput) {
            this.charTimer += 1.4;
            const len = Math.floor(this.charTimer);
            this.textToDraw = line.text.slice(0, len);
            if (len >= line.text.length) {
                this.textToDraw = line.text;
                this.waitingInput = true;
            }
        }

        const confirmPressed = input.menuConfirm || input.action;
        if (confirmPressed) {
            if (!this._inputConsumed) {
                this._inputConsumed = true;
                this.next();
                if (window.game) window.game.sound.play('confirm');
            }
        } else {
            this._inputConsumed = false;
        }
    }

    _drawPortrait(ctx, cx, cy, size, actor) {
        const p = (actor && actor.portrait) || { base: '#90A4AE', accent: '#FFFFFF', eye: '#263238', mark: 'star' };
        const f = window.game ? window.game.frame : 0;
        ctx.save();

        // ── 顔の輪郭（グラデーション） ──
        const faceGrad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, 0, cx, cy, size);
        faceGrad.addColorStop(0, p.accent);
        faceGrad.addColorStop(0.5, p.base);
        faceGrad.addColorStop(1, p.base);
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();

        // 輪郭線
        ctx.strokeStyle = actor.color || '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── ほっぺの赤み ──
        ctx.fillStyle = 'rgba(255, 160, 160, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - size * 0.42, cy + size * 0.12, size * 0.22, size * 0.14, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + size * 0.42, cy + size * 0.12, size * 0.22, size * 0.14, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // ── 目（大きめ・キラキラ） ──
        const eyeOffX = size * 0.28;
        const eyeOffY = size * 0.05;
        const eyeR = size * 0.14;
        const bounce = Math.sin(f * 0.05) * size * 0.015; // まばたき風揺れ

        for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
            // 目の白目
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(ex, cy - eyeOffY + bounce, eyeR * 1.3, eyeR * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 瞳
            ctx.fillStyle = p.eye;
            ctx.beginPath();
            ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.1 + bounce, eyeR * 0.9, eyeR * 1.1, 0, 0, Math.PI * 2);
            ctx.fill();

            // 瞳のハイライト（大）
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.ellipse(ex - eyeR * 0.3, cy - eyeOffY - eyeR * 0.3 + bounce, eyeR * 0.35, eyeR * 0.35, -0.5, 0, Math.PI * 2);
            ctx.fill();

            // 瞳のハイライト（小）
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.ellipse(ex + eyeR * 0.25, cy - eyeOffY + eyeR * 0.2 + bounce, eyeR * 0.18, eyeR * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── 口（笑顔） ──
        ctx.strokeStyle = p.eye;
        ctx.lineWidth = size * 0.06;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.18, size * 0.28, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // ── マーク ──
        this._drawPortraitMark(ctx, cx, cy, size, p);
        ctx.restore();
    }

    _drawPortraitMark(ctx, cx, cy, size, portrait) {
        ctx.save();
        ctx.fillStyle = portrait.accent;
        ctx.strokeStyle = portrait.eye;
        ctx.lineWidth = 1.5;
        switch (portrait.mark) {
        case 'crown':
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.55, cy - size * 0.65);
            ctx.lineTo(cx - size * 0.35, cy - size * 1.00);
            ctx.lineTo(cx - size * 0.08, cy - size * 0.68);
            ctx.lineTo(cx + size * 0.12, cy - size * 1.02);
            ctx.lineTo(cx + size * 0.36, cy - size * 0.66);
            ctx.lineTo(cx + size * 0.55, cy - size * 0.65);
            ctx.lineTo(cx + size * 0.50, cy - size * 0.42);
            ctx.lineTo(cx - size * 0.50, cy - size * 0.42);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'horn':
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.55, cy - size * 0.35);
            ctx.lineTo(cx - size * 0.78, cy - size * 0.95);
            ctx.lineTo(cx - size * 0.35, cy - size * 0.60);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + size * 0.55, cy - size * 0.35);
            ctx.lineTo(cx + size * 0.78, cy - size * 0.95);
            ctx.lineTo(cx + size * 0.35, cy - size * 0.60);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'halo':
            ctx.strokeStyle = '#F7C948';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(cx, cy - size * 0.92, size * 0.48, size * 0.18, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'ribbon':
            ctx.beginPath();
            ctx.arc(cx, cy - size * 0.80, size * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.12, cy - size * 0.62);
            ctx.lineTo(cx - size * 0.28, cy - size * 0.35);
            ctx.lineTo(cx - size * 0.02, cy - size * 0.42);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + size * 0.12, cy - size * 0.62);
            ctx.lineTo(cx + size * 0.28, cy - size * 0.35);
            ctx.lineTo(cx + size * 0.02, cy - size * 0.42);
            ctx.closePath();
            ctx.fill();
            break;
        case 'mask':
            ctx.fillStyle = portrait.eye;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(cx - size * 0.62, cy - size * 0.32, size * 1.24, size * 0.36, size * 0.12) : ctx.rect(cx - size * 0.62, cy - size * 0.32, size * 1.24, size * 0.36);
            ctx.fill();
            break;
        case 'gear':
            ctx.strokeStyle = portrait.eye;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 * i) / 8;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * size * 0.72, cy - size * 0.74 + Math.sin(a) * size * 0.18);
                ctx.lineTo(cx + Math.cos(a) * size * 0.92, cy - size * 0.74 + Math.sin(a) * size * 0.24);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(cx, cy - size * 0.74, size * 0.18, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'wave':
            ctx.strokeStyle = portrait.eye;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.52, cy - size * 0.70);
            ctx.quadraticCurveTo(cx - size * 0.20, cy - size * 0.96, cx, cy - size * 0.70);
            ctx.quadraticCurveTo(cx + size * 0.20, cy - size * 0.44, cx + size * 0.52, cy - size * 0.70);
            ctx.stroke();
            break;
        case 'leaf':
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 1.00);
            ctx.quadraticCurveTo(cx + size * 0.38, cy - size * 0.78, cx, cy - size * 0.48);
            ctx.quadraticCurveTo(cx - size * 0.38, cy - size * 0.78, cx, cy - size * 1.00);
            ctx.fill();
            ctx.stroke();
            break;
        case 'steam':
            ctx.strokeStyle = portrait.eye;
            ctx.lineWidth = 2;
            for (const offset of [-0.22, 0, 0.22]) {
                ctx.beginPath();
                ctx.moveTo(cx + size * offset, cy - size * 0.98);
                ctx.quadraticCurveTo(cx + size * (offset + 0.08), cy - size * 1.18, cx + size * offset, cy - size * 1.30);
                ctx.stroke();
            }
            break;
        case 'shield':
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 1.05);
            ctx.lineTo(cx + size * 0.28, cy - size * 0.82);
            ctx.lineTo(cx + size * 0.18, cy - size * 0.48);
            ctx.lineTo(cx, cy - size * 0.28);
            ctx.lineTo(cx - size * 0.18, cy - size * 0.48);
            ctx.lineTo(cx - size * 0.28, cy - size * 0.82);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'slime':
            ctx.beginPath();
            ctx.arc(cx, cy - size * 0.92, size * 0.20, Math.PI, 0);
            ctx.fill();
            break;
        case 'flame':
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 1.08);
            ctx.quadraticCurveTo(cx + size * 0.24, cy - size * 0.82, cx, cy - size * 0.54);
            ctx.quadraticCurveTo(cx - size * 0.22, cy - size * 0.82, cx, cy - size * 1.08);
            ctx.fill();
            break;
        case 'star':
        default:
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + i * Math.PI / 5;
                const r = i % 2 === 0 ? size * 0.28 : size * 0.12;
                const px = cx + Math.cos(a) * r;
                const py = cy - size * 0.82 + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        }
        ctx.restore();
    }

    draw(ctx, W, H) {
        if (!this.active || !this.sceneId) return;
        const line = this.scripts[this.sceneId][this.lineIndex];
        if (!line) return;
        const actor = this.actors[line.actor] || this.actors.system;
        const isRight = actor.align === 'right';
        const isCenter = actor.align === 'center';

        ctx.save();

        // 背景暗転
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.fillRect(0, 0, W, H);

        // ── レイアウト定義 ──
        const boxX = 10;
        const boxY = H - 185;
        const boxW = W - 20;
        const boxH = 160;
        const iconSize = 72; // ゆっくり風の大きなアイコン

        // アイコン位置（ゆっくり実況風：画面下部に顔が並ぶ）
        const iconY = boxY + boxH - iconSize * 0.3; // 吹き出しに少しめり込む感じ
        const iconX = isRight ? boxX + boxW - iconSize - 4
                    : isCenter ? W / 2
                    : boxX + iconSize + 4;

        // ── 吹き出し本体（ゆっくり風：白背景・黒枠） ──
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        if (window.Renderer && Renderer._roundRect) {
            Renderer._roundRect(ctx, boxX, boxY, boxW, boxH, 10);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);
        }

        // ── 名前タグ（吹き出し上部・ゆっくり風） ──
        if (actor.name) {
            const nameTagW = 120;
            const nameTagX = isRight ? boxX + boxW - nameTagW - 8 : boxX + 8;
            ctx.fillStyle = actor.color || '#333';
            if (window.Renderer && Renderer._roundRect) {
                Renderer._roundRect(ctx, nameTagX, boxY - 22, nameTagW, 24, 5);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = isRight ? 'right' : 'left';
            ctx.fillText(actor.name, isRight ? nameTagX + nameTagW - 8 : nameTagX + 8, boxY - 5);
        }

        // ── テキスト（黒文字・ゆっくり風） ──
        ctx.fillStyle = '#111';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        const textPadL = isRight ? boxX + 16 : boxX + iconSize * 2 + 8;
        const textPadR = isRight ? boxX + boxW - iconSize * 2 - 8 : boxX + boxW - 16;
        const textMaxW = textPadR - textPadL;
        this.wrapText(ctx, this.textToDraw, textPadL, boxY + 38, textMaxW, 26);

        // ── 操作ヒント ──
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.textAlign = 'right';
        ctx.fillText(
            this.waitingInput ? '▼ タップ/Z: つぎへ　B: スキップ' : '▼ タップ/Z: 早送り',
            boxX + boxW - 10, boxY + boxH - 8
        );

        // ── アイコン（ゆっくり風：大きく・吹き出しに重なる） ──
        if (!isCenter) {
            // 影
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(iconX, iconY + iconSize * 0.85, iconSize * 0.55, iconSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();

            // アイコン本体（白縁取り）
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(iconX, iconY, iconSize + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // アイコン描画
            this._drawPortrait(ctx, iconX, iconY, iconSize, actor);

            // カラー縁取り
            ctx.strokeStyle = actor.color || '#333';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(iconX, iconY, iconSize + 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const chars = text.split('');
        let line = '';
        let currentY = y;
        ctx.textAlign = 'left';
        for (let n = 0; n < chars.length; n++) {
            const testLine = line + chars[n];
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = chars[n];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
}

window.StoryManager = StoryManager;
