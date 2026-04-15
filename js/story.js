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
            slime: { name: 'スラりん', color: '#4CAF50', align: 'left', portrait: { base: '#67D66F', accent: '#E8FFE9', eye: '#16351A', mark: 'slime' } },
            ally: { name: 'スラッチ', color: '#2196F3', align: 'right', portrait: { base: '#5BB8FF', accent: '#E4F5FF', eye: '#10304A', mark: 'ribbon' } },
            rival: { name: 'ドロドロ王', color: '#F44336', align: 'right', portrait: { base: '#FF796D', accent: '#FFE4E0', eye: '#4A1010', mark: 'crown' } },
            slaoh: { name: 'スラお', color: '#FF6B35', align: 'right', portrait: { base: '#FF9B68', accent: '#FFF0E7', eye: '#4A2310', mark: 'flame' } },
            ninja: { name: 'カゲマル', color: '#555', align: 'right', portrait: { base: '#7B7B7B', accent: '#F1F1F1', eye: '#111', mark: 'mask' } },
            king: { name: 'スライム王', color: '#FFD700', align: 'right', portrait: { base: '#FFE27A', accent: '#FFF8D8', eye: '#5A4300', mark: 'crown' } },
            boss: { name: 'ドロスケ将軍', color: '#9C27B0', align: 'right', portrait: { base: '#C46AE0', accent: '#F6E8FF', eye: '#341042', mark: 'horn' } },
            devil: { name: '闇の魔王', color: '#CE0000', align: 'right', portrait: { base: '#F04B4B', accent: '#FFE3E3', eye: '#3E0000', mark: 'horn' } },
            demon: { name: 'ドロスケ魔王', color: '#880000', align: 'right', portrait: { base: '#CC3333', accent: '#FFE0E0', eye: '#3E0000', mark: 'horn' } },
            system: { name: '', color: '#888', align: 'center', portrait: { base: '#90A4AE', accent: '#F4FAFD', eye: '#263238', mark: 'star' } },
            rusty: { name: 'ラスティ', color: '#8B7355', align: 'right', portrait: { base: '#B08B62', accent: '#F8EBDD', eye: '#3C2A1A', mark: 'gear' } },
            tempest: { name: 'テンペスト', color: '#1565C0', align: 'right', portrait: { base: '#4D9CFF', accent: '#E5F2FF', eye: '#0F2A4A', mark: 'wave' } },
            c2guard: { name: '鉄壁ガード', color: '#546E7A', align: 'right', portrait: { base: '#7D97A2', accent: '#EDF4F7', eye: '#20313A', mark: 'shield' } },
            gear: { name: 'ギアギア将軍', color: '#37474F', align: 'right', portrait: { base: '#607D8B', accent: '#E7F7FF', eye: '#122028', mark: 'gear' } },
            c2meadow: { name: 'メドウ', color: '#558B2F', align: 'right', portrait: { base: '#8BCB62', accent: '#F1FFE8', eye: '#233816', mark: 'leaf' } },
            c2steamy: { name: 'スチーミー', color: '#CE93D8', align: 'right', portrait: { base: '#E1B1EB', accent: '#FFF0FF', eye: '#47244D', mark: 'steam' } },
            seraph: { name: 'セラフィム', color: '#FBCB61', align: 'right', portrait: { base: '#FFE49A', accent: '#FFFBEF', eye: '#5B4700', mark: 'halo' } },
            nihilum: { name: 'ニヒルム', color: '#7B68EE', align: 'right', portrait: { base: '#9B88FF', accent: '#E8E4FF', eye: '#1A0050', mark: 'star' } },
            void_knight: { name: '虚無の騎士', color: '#4A4A8A', align: 'right', portrait: { base: '#6A6ABF', accent: '#E0E0FF', eye: '#0A0A2A', mark: 'shield' } },
            chaos_mage: { name: '混沌の魔導師', color: '#CC44AA', align: 'right', portrait: { base: '#E066CC', accent: '#FFE0F8', eye: '#440030', mark: 'star' } },
            // ★バグ修正: 第5章で使われるアクターが未定義だったため名無し・グレーで表示されていた
            lumen:    { name: '原初の意志・ルーメン', color: '#FFD700', align: 'right', portrait: { base: '#FFF0A0', accent: '#FFFFF0', eye: '#5A4000', mark: 'star' } },
            primo:    { name: '原初の番人・プリモス', color: '#A0C8FF', align: 'right', portrait: { base: '#C0DEFF', accent: '#F0F8FF', eye: '#1A3A5A', mark: 'shield' } },
            eidolon:  { name: '記憶の幻影・エイドロン', color: '#C8A0FF', align: 'right', portrait: { base: '#DCC0FF', accent: '#F5F0FF', eye: '#2A1050', mark: 'star' } },
            apocaria: { name: '終焉の鎧・アポカリア', color: '#FF6040', align: 'right', portrait: { base: '#FF9070', accent: '#FFF0ED', eye: '#4A1000', mark: 'horn' } },
            luxein:   { name: '光の守護者・ルクセイン', color: '#FFFFA0', align: 'right', portrait: { base: '#FFFFE0', accent: '#FFFFFF', eye: '#5A5000', mark: 'halo' } }
        };

        this.scripts = {
            intro: [
                { actor: 'king', text: 'スラりんよ。この世界を救うために「コア」を集めてきておくれ。' },
                { actor: 'slime', text: 'コア？ わかったよ、王様！ ぼくに任せて！' },
                { actor: 'king', text: '最初のコアは、ドロドロ王という悪党が持っておる。倒して奪うのじゃ。' },
                { actor: 'ally', text: '私も行く！ スラりん一人じゃ危ないからね！' },
                { actor: 'king', text: 'ふぉっふぉ。では、この特製戦車を持っていくがよい。' },
                { actor: 'system', text: 'スラりんとスラッチの、世界を救う（？）冒険が始まった。' }
            ],
            stage2_pre: [
                { actor: 'slaoh', text: '……久しぶりだな、スラりん。' },
                { actor: 'slime', text: 'スラお！？ なんで邪魔するんだ！ コアを渡して！' },
                { actor: 'slaoh', text: 'これは俺たちの宝だ！ 王様なんかに渡すわけにはいかない！' }
            ],
            stage3_pre: [
                { actor: 'ninja', text: 'コアを狙う侵入者、確認……。' },
                { actor: 'slime', text: 'あのコアは世界を救うために必要なんだ！ 行くよ！' }
            ],
            stage4_pre: [
                { actor: 'rival', text: 'これ以上、俺たちのコアを奪わせるわけにはいかない！' },
                { actor: 'ally', text: 'でも、これがないと平和な世界にならないって王様が言ってたよ！' },
                { actor: 'slime', text: 'ごめんね、強行突破させてもらう！' }
            ],
            stage5_pre: [
                { actor: 'king', text: '良い調子じゃ、スラりんよ！ そのままコアを奪うのじゃ！' },
                { actor: 'demon', text: 'フフフ……王とやらも強欲だな。だが、この強大な力は私がいただく！' },
                { actor: 'slime', text: '魔王め！ 絶対に阻止するぞ！' }
            ],
            stage_boss_pre: [
                { actor: 'boss', text: 'よくここまで来たな！ 私はドロスケ！ コアは俺のものだ！' },
                { actor: 'ally', text: '平和のために、絶対に渡しません！' },
                { actor: 'slime', text: 'ドロスケ！ お前の野望を打ち砕くぞ！' }
            ],
            stage_boss_ending: [
                { actor: 'boss', text: 'くそっ……俺たちの負けだ……持っていくがいい……。' },
                { actor: 'slime', text: '王様、無事に一つ目の巨大コアをゲットしたよ！' },
                { actor: 'king', text: 'よくやった。さあ、次のコアのもとへ向かうのじゃ！' }
            ],
            stage8_pre: [
                { actor: 'devil', text: 'ついに来たか……小さなスライムよ。ここが、お前の旅の終着点だ。' },
                { actor: 'slime', text: '違う。ここはドロドロ王を倒して、みんなが安心して暮らせる未来への入り口だ。行くぞ！' }
            ],
            ending: [
                { actor: 'system', text: '長い戦いが終わった。砲煙が晴れると、穏やかな青空が広がっていた。' },
                { actor: 'ally', text: 'スラりん……本当に、お疲れ様。あなたがいたから、ここまで来れたよ。' },
                { actor: 'slime', text: 'ぼくだけの力じゃないよ。スラッチがいてくれたから戦えたんだ。ありがとう。' },
                { actor: 'king', text: 'ふぉっふぉっふぉ。二人とも、よくやってくれたのう。王国に平和が戻った。これもおぬしたちのおかげじゃ。' },
                { actor: 'system', text: 'こうして、スラりんたちの冒険は幕を下ろした。……しかし、旅の記憶は永遠に続く。' }
            ],
            // 👑 スライム王誕生シーン（配合でslime_king_godを作ったとき）
            king_god_born: [
                { actor: 'system', text: 'プラチナゴーレムとゴッドキングスライムが融合し、眩い光に包まれた——。' },
                { actor: 'king', text: 'ふぉっふぉっふぉ……久しぶりに、全身に力が漲ってくるのう。' },
                { actor: 'slime', text: 'ス、スライム王！？いつの間に戦車に乗り込んで……！？' },
                { actor: 'king', text: '儂は常にそこにおった。プラチナの鎧に王の魂が宿った——それだけのことよ。慌てるでない。' },
                { actor: 'ally', text: 'す、すごい……王様が仲間に！？これって、最強なんじゃ……？' },
                { actor: 'king', text: '最強かどうかは、使い手次第じゃ。だが——儂が全力を出せば、弾倉が瞬く間に埋まるくらいは造作もないぞ。ふぉっふぉ。' },
                { actor: 'slime', text: 'た、頼もしすぎる！！王様、一緒に戦ってください！ぼくらの力になってほしいんです！' },
                { actor: 'king', text: 'よかろう。この老骨、もうひと働きしてやろうではないか。——さあ、行くぞ！！' },
                { actor: 'system', text: '👑 スライム王が仲間になった！ 全大砲に弾を一斉装填——無敵の王が戦線に加わった！' },
            ],
            chapter2_intro: [
                { actor: 'system', text: '機械のにおいがする。第2章のスタートだ。' },
                { actor: 'ally', text: 'スラりん、ここからは機械の敵ばかりみたい。気をつけて！' },
                { actor: 'slime', text: 'うん。王様に頼まれた「次のコア」は絶対この先にあるはずだ！' },
                { actor: 'ally', text: 'さあ、行こう！ 二人なら大丈夫！' }
            ],
            c2_stage1_pre: [
                { actor: 'rusty', text: 'この廃村に迷い込むとは……よほどの覚悟があってのことか。ここは生半可な奴が踏み込む場所じゃない。' },
                { actor: 'slime', text: '覚悟なら、旅を始めた日から積み上げてきた。今さらたじろぐつもりはないよ。' },
                { actor: 'rusty', text: '……いい目をしてる。だが、その目がゴールまで輝き続けるかどうかは、拳を交えてみなけりゃ分からん！' }
            ],
            c2_stage2_pre: [
                { actor: 'c2meadow', text: 'のどかな景色でしょう？ でもね、一番危ないのは油断した瞬間よ。それが私のやり方。' },
                { actor: 'ally', text: 'そっちがそのつもりなら、こっちも本気を出すだけだよ。行こう、スラりん！' }
            ],
            c2_stage3_pre: [
                { actor: 'tempest', text: 'ここまで来たか、小さな旅人よ。この荒波を越える自信があるなら……存分に試させてもらおうか。' },
                { actor: 'slime', text: 'どんな荒波だって、この戦車で越えてみせる。かかってきてよ！' }
            ],
            c2_stage4_pre: [
                { actor: 'c2steamy', text: 'ふふ……湯気の向こうは見えにくいでしょう？ 霞の中に全てを包んでしまえば、私の勝ちよ。' },
                { actor: 'ally', text: '目が見えなくたって、進む方向は変わらないよ。スラりん、行こう！' }
            ],
            c2_stage5_pre: [
                { actor: 'c2guard', text: 'ここが最後の防衛線だ。何があっても、私は一歩も退かない。お前たちの旅路は、ここで終わりだ！' },
                { actor: 'slime', text: '最後の防衛線を突破したら、ギア将軍に会えるってことだよね。全力で行くよ！' }
            ],
            c2_boss_pre: [
                { actor: 'gear', text: 'よく来たな。だが、お前たちは王に利用されているだけだ！' },
                { actor: 'ally', text: 'またそんなことを……嘘をついてもダメですよ！' },
                { actor: 'slime', text: 'お前の持っているコアをもらうぞ！' }
            ],
            chapter2_ending: [
                { actor: 'gear', text: 'バカな……私が負けるなんて。だが、いつかお前たちも裏切られるぞ！' },
                { actor: 'slime', text: '負け惜しみはやめろ！ これで二つ目のコアをゲットだ！' },
                { actor: 'king', text: '（通信）素晴らしいぞ、スラりんよ！ つぎの場所へ向かうのじゃ！' },
                { actor: 'ally', text: 'はい、王様！ 私たち、がんばります！' },
                { actor: 'system', text: '〜 第2章「ギアギアどきどき大作戦！」 クリア 〜' },
                { actor: 'system', text: '第3章へと続く……' }
            ],
            chapter3_intro: [
                { actor: 'system', text: '雲の上に、新しい道がひろがっている。' },
                { actor: 'slime', text: 'ここが第3章……空の上だね！ 落ちないように気をつけなきゃ。' },
                { actor: 'ally', text: 'うん。あっ、王様から通信だよ。' },
                { actor: 'king', text: '（通信）この雲の先に「天使のコア」があるはずじゃ。頼んだぞ！' },
                { actor: 'slime', text: '天使のコア？ まかせて！ 悪い天使を退治するぞ！' },
                { actor: 'system', text: '第3章「天門のスカイパレード」開幕。雲の向こうで、砲塔が目を覚ます。' }
            ],
            chapter4_intro: [
                { actor: 'system', text: 'きれいな空をこえた先は、真っ暗な闇だった。' },
                { actor: 'slime', text: 'うわぁ……真っ暗だ。ここから先に最後のコアがあるのかな。' },
                { actor: 'ally', text: '王様の通信も途切れがちだよ……なんだかすごく怖い。' },
                { actor: 'king', text: '（通信）ザザ……そこにある「闇のコア」さえあれば……計画は……ザザザ……。' },
                { actor: 'slime', text: '計画？ 世界を救う計画だよね！ 行くよ、スラッチ！' },
                { actor: 'system', text: '第4章「暗黒のカオスゾーン」開幕。真っ暗な敵が、静かに待っている。' },
            ],
            chapter4_ending: [
                { actor: 'system', text: '激しい戦いが終わり、ニヒルムは静かに倒れた。' },
                { actor: 'nihilum', text: '……まさかお前たちの力が、これほどとは。だが……集めたコアは王の手に……。' },
                { actor: 'ally', text: 'スラりん、ニヒルムが言ってたこと、やっぱり本当なんじゃないかな。' },
                { actor: 'slime', text: '王様が……ぼくらを騙してた……？' },
                { actor: 'king', text: '（通信）ザザ……よくやった、スラりん！ これですべてのコアが揃った！' },
                { actor: 'slime', text: '王様！ コアを何に使うつもりなの！？ 平和のために使うんだよね！？' },
                { actor: 'king', text: '（通信）平和？ クックック……平和など不要。これでワシは最強の絶対君主となるのじゃ！' },
                { actor: 'ally', text: '嘘……そんな……！ 私たち、本当に利用されてたんだ！' },
                { actor: 'king', text: '（通信）お前たちの役目は終わりじゃ！ 玉座で待っておるぞ！ ハッハッハ！' },
                { actor: 'system', text: '第4章クリア。ついにスライム王の真の野望が明らかになった！' },
            ],
            chapter3_ending: [
                { actor: 'system', text: '戦いが終わると、空がもっと高くまで見えるようになった。' },
                { actor: 'seraph', text: '見事だ……。だが、王の言いなりになるのが本当に正しいことなのか？' },
                { actor: 'slime', text: '王様は世界を救うために頑張ってるんだ！ うるさい！' },
                { actor: 'ally', text: 'これで三つ目のコアですね！ 王様に届けなきゃ！' },
                { actor: 'king', text: '（通信）よくやったぞ！ さあ、次は最後のコアじゃ！' },
                { actor: 'system', text: '第3章クリア。残るコアはあと一つ！ 物語は暗闇の世界へ続いていく。' }
            ],
            c4_stage1_pre: [
                { actor: 'system', text: '真っ黒な世界。一寸先も見えない闇の中を進む。' },
                { actor: 'void_knight', text: 'これ以上進むな……あの王の野望を叶えさせてはならん。' },
                { actor: 'slime', text: 'また王様の邪魔をするやつだ！ どいてよ！' },
            ],
            c4_stage1_post: [
                { actor: 'ally', text: 'うーん……でも、さっきの人も王様のこと怒ってたね。' },
                { actor: 'slime', text: '気にしない！ きっとドロドロ王の仲間だったんだよ！' },
            ],
            c4_stage2_pre: [
                { actor: 'system', text: '逆さまの空間。' },
                { actor: 'chaos_mage', text: 'お前たちは自分が騙されていることに気付いていないのね。' },
                { actor: 'ally', text: '騙されている？ 王様にですか！？' },
                { actor: 'slime', text: '嘘だ！ そんな罠には引っかからないぞ！' },
            ],
            c4_stage2_post: [
                { actor: 'chaos_mage', text: '……まあいいわ。行きなさい、愚かな旅人たち。' },
            ],
            c4_stage3_pre: [
                { actor: 'nihilum', text: 'お前たちが集めたコアが王の手に渡れば……世界は終わる。' },
                { actor: 'slime', text: '世界が終わる！？ 本当なの？' },
                { actor: 'ally', text: 'スラりん、惑わされないで！ 攻撃してくるよ！' },
            ],
            c4_stage4_pre: [
                { actor: 'nihilum', text: '私はかつて、あの王に忠誠を誓い……そして捨てられた。' },
                { actor: 'slime', text: '……王様が、そんなことするはずがない！' },
            ],
            c4_stage5_pre: [
                { actor: 'nihilum', text: '私の残された「コア」まで奪いに来たのか。' },
                { actor: 'ally', text: 'スライム王様の計画が嘘だって言うなら、証明してみせてください！' },
                { actor: 'slime', text: 'ぼくらは間違ってない！ 行くぞ！' },
            ],

            // ============================================================
            // ★★★ 負けイベント：ニヒルム戦・第1ラウンド敗北 ★★★
            // ============================================================
            c4_boss_lose_event: [
                { actor: 'system', text: 'スラりんたちの攻撃がすべて防がれた！' },
                { actor: 'nihilum', text: 'もうやめろ。あの狂った王の言いなりになるのはやめるんだ。' },
                { actor: 'slime', text: 'う、うわああ……！' },
                { actor: 'ally', text: 'スラりん、目を覚まして！' },
            ],

            // ============================================================
            // ★★★ 第2ラウンド開始演出 ★★★
            // ============================================================
            c4_boss_second_chance: [
                { actor: 'nihilum', text: '……な、何！？ まだ戦うつもりか！？' },
                { actor: 'slime', text: 'たとえ王様に利用されてたとしても……ぼくの仲間を守る気持ちは本物だ！！' },
                { actor: 'ally', text: 'スラりんの言う通り！ 私たちは王様なんか関係ない！ 今ここで勝つ！' },
                { actor: 'nihilum', text: '……馬鹿な。本当に自分たちの意志で戦っているというのか！？' },
                { actor: 'slime', text: 'ぼくらは人形じゃない！ 行くぞ、ニヒルム！！' },
            ],

            // ============================================================
            // CHAPTER 5 STORIES - 原初の光と終焉の砲火
            // ============================================================
            chapter5_intro: [
                { actor: 'system', text: 'すべてのコアが集まったとき……空が割れ、巨大な城が現れた。' },
                { actor: 'slime', text: 'あれは……王様のお城だ！ どうしてこんなところに！？' },
                { actor: 'ally', text: 'スラりん、見て。お城の形がおかしい。すごくおどろおどろしいよ！' },
                { actor: 'nihilum', text: '……ついに始まったか。お前たちが集めたコアを吸収し、あの王が真の姿に入ろうとしている。' },
                { actor: 'king', text: '（大音声）ハッハッハ！ よくぞコアを集めた、スラりん！' },
                { actor: 'slime', text: '王様！ なんでこんなことを！' },
                { actor: 'ally', text: '私たち、利用されてたんだ……！ ドロスケも、ギア将軍も……みんな！' },
                { actor: 'nihilum', text: '……後悔している暇はない。王の力が完全になる前に叩くぞ！' },
                { actor: 'slime', text: 'うん。ぼくらが始めたことだから、ぼくらで終わらせる！' },
                { actor: 'system', text: '第5章「真の王と最後の戦い」開幕。スライム王の野望を打ち砕け！' },
            ],
            chapter5_ending: [
                { actor: 'system', text: '大きな爆発があがり、王の城が崩れていく……。' },
                { actor: 'king', text: 'ば、ばかな……私が集めさせたコアの力で、私自身が倒されるだと……！？' },
                { actor: 'slime', text: '力に頼るだけじゃダメなんだよ。仲間を信じる心が、本当の強さなんだ！' },
                { actor: 'ally', text: '王様……もう、こんな悪いことはやめてくださいね。' },
                { actor: 'nihilum', text: '……終わったな。だが、お前たちのおかげで世界は救われた。' },
                { actor: 'king', text: 'うう……すまなかった。私はただ、最強の国を作りたかっただけなんじゃ……。' },
                { actor: 'slime', text: 'もう最強だよ。だって、こんなに強い仲間たちがいるじゃないか！' },
                { actor: 'king', text: '……そうじゃな。お前たちこそが、我が国の誇りじゃ。' },
                { actor: 'ally', text: 'さあ帰りましょう、みんなで！ 私たちの本当の村へ！' },
                { actor: 'system', text: '全章クリア！ スラりんたちの旅は終わり、平和な日々が戻ってきた。ありがとう、勇敢な戦士たち！' },
            ],
            c5_stage1_pre: [
                { actor: 'system', text: '城の中へ突入した。' },
                { actor: 'ally', text: 'スラりん、気をつけて！ ここから先は王様の親衛隊ばかりだよ！' },
                { actor: 'slime', text: 'うん。でも、もう迷わない。前へ進むだけだ！' },
                { actor: 'primo', text: '……王様への反逆、許さん！ ここで朽ち果てろ！' },
            ],
            c5_stage1_post: [
                { actor: 'slime', text: 'よーし、勝ったぞ！ 次へ行くぞ！' },
                { actor: 'primo', text: '……くっ！ まだ終わってはいない……！' },
            ],
            c5_stage2_pre: [
                { actor: 'system', text: '城の防衛ラインに差し掛かった。' },
                { actor: 'ally', text: '敵がどんどん増えてくるね……！' },
                { actor: 'slime', text: '王様、本気だね。でもぼくらだって本気だ！' },
            ],
            c5_stage2_post: [
                { actor: 'ally', text: 'やった！ どんなに敵が多くても関係ないね！' },
                { actor: 'slime', text: 'うん。どんどん進もう！' },
            ],
            c5_stage3_pre: [
                { actor: 'system', text: '城の奥深く、怪しい光が漏れている。' },
                { actor: 'nihilum', text: '……見覚えがある。これは私が管理していた「コア」の光だ！' },
                { actor: 'slime', text: 'みんなの力が使われてるんだね！ 取り返すぞ！' },
            ],
            c5_stage3_post: [
                { actor: 'ally', text: 'よし！ この調子なら王様のところまで行けるね！' },
                { actor: 'eidolon', text: '……くっ、さすがだな。' },
            ],
            c5_stage4_pre: [
                { actor: 'system', text: '王の玉座へと続く最後のフロア。' },
                { actor: 'nihilum', text: 'これが最後の防衛ラインらしい。気をつけろ。' },
                { actor: 'slime', text: 'みんな、行くぞ！！ 最後の関門突破だ！！' },
            ],
            c5_stage4_post: [
                { actor: 'apocaria', text: '……これほどの者が現れるとは……王様……。' },
                { actor: 'ally', text: 'スラりん……あと一つだよ。この扉の先に——王様がいる。' },
                { actor: 'slime', text: 'うん。みんな——一緒に行こう！！' },
            ],
            c5_stage5_pre: [
                { actor: 'system', text: '王の玉座——ついに黒幕と対峙するときが来た。' },
                { actor: 'ally', text: 'ここが……玉座……！' },
                { actor: 'slime', text: '近衛隊が立ちふさがっている！ なんで王様を守るんだ！' },
                { actor: 'nihilum', text: '……無駄だ。洗脳されている……倒すしかない！' },
            ],
            c5_stage5_post: [
                { actor: 'luxein', text: '……王様……申し訳ありません……。' },
                { actor: 'slime', text: 'よし……！ 王様、今行くぞ！！' },
                { actor: 'ally', text: 'スラりん、手を貸して。一緒に——扉を開こう。' },
            ],
        }; // ★修正: this.scripts の閉じ括弧にセミコロンを追加
    } // constructor end

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
        // ★バグ修正: iconY = boxY+boxH-iconSize*0.3 だとアイコン下端が H+25px になり
        //   キャンバス外にはみ出して白くズレて見えていた。
        //   boxY を上げ、iconY をボックス内に収まる位置に変更。
        const boxX = 10;
        const boxH = 170;
        const boxY = H - boxH - 10; // 下から10px余白
        const boxW = W - 20;
        const iconSize = 64; // 少し小さくしてボックス内に収める

        // アイコン中心 = ボックス垂直中央
        const iconY = boxY + boxH / 2;
        const iconX = isRight ? boxX + boxW - iconSize - 8
                    : isCenter ? W / 2
                    : boxX + iconSize + 8;

        // ── 吹き出し本体（半透明ダーク背景＋カラーボーダー） ──
        ctx.fillStyle = 'rgba(10,14,30,0.92)';
        ctx.strokeStyle = actor.color || '#5BA3E6';
        ctx.lineWidth = 2.5;
        if (window.Renderer && Renderer._roundRect) {
            Renderer._roundRect(ctx, boxX, boxY, boxW, boxH, 12);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);
        }

        // ── 名前タグ（吹き出し上部） ──
        if (actor.name) {
            const nameTagW = ctx.measureText(actor.name).width + 24;
            const nameTagX = isRight ? boxX + boxW - nameTagW - 8 : boxX + 8;
            ctx.fillStyle = actor.color || '#5BA3E6';
            if (window.Renderer && Renderer._roundRect) {
                Renderer._roundRect(ctx, nameTagX, boxY - 24, nameTagW, 24, 6);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = isRight ? 'right' : 'left';
            ctx.fillText(actor.name, isRight ? nameTagX + nameTagW - 10 : nameTagX + 10, boxY - 6);
        }

        // ── テキスト（明るい文字色） ──
        ctx.fillStyle = '#F0F4FF';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'left';
        const textPadL = isRight ? boxX + 16 : boxX + iconSize * 2 + 12;
        const textPadR = isRight ? boxX + boxW - iconSize * 2 - 12 : boxX + boxW - 16;
        const textMaxW = textPadR - textPadL;
        this.wrapText(ctx, this.textToDraw, textPadL, boxY + 36, textMaxW, 25);

        // ── 操作ヒント ──
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(160,180,220,0.7)';
        ctx.textAlign = 'right';
        ctx.fillText(
            this.waitingInput ? '▼ タップ/Z: つぎへ　B: スキップ' : '▼ タップ/Z: 早送り',
            boxX + boxW - 10, boxY + boxH - 8
        );

        // ── アイコン（ボックス内に完全収納） ──
        if (!isCenter) {
            // 影
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(iconX, iconY + iconSize * 0.75, iconSize * 0.5, iconSize * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();

            // アイコン背景円（カラー）
            ctx.save();
            ctx.shadowColor = actor.color || '#5BA3E6';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(10,14,30,0.8)';
            ctx.beginPath();
            ctx.arc(iconX, iconY, iconSize + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // アイコン描画
            this._drawPortrait(ctx, iconX, iconY, iconSize, actor);

            // カラー縁取り
            ctx.strokeStyle = actor.color || '#5BA3E6';
            ctx.lineWidth = 3;
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
