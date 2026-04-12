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
                { actor: 'king', text: 'おぬしに頼みごとがあるのじゃ。' },
                { actor: 'slime', text: 'なになに？王様、何でも言って！' },
                { actor: 'king', text: 'この世界を支配するドロドロ王を倒す冒険の旅に出てほしいのじゃ。' },
                { actor: 'slime', text: '分かったよ！' },
                { actor: 'ally', text: '私も一緒に行く！' },
                { actor: 'king', text: '頼もしいのう。では旅のためにこの戦車を用意したからそれで敵を倒してくれ！' },
                { actor: 'ally', text: 'うわぁ！スライム戦車！。' },
                { actor: 'system', text: 'スラりんたちの冒険が、いま始まる。' }
            ],
            stage2_pre: [
                { actor: 'slaoh', text: '久しぶりだな、スラリン' },
                { actor: 'slime', text: 'スラお!なぜここに！？その戦車はいったい！？' },
                { actor: 'slaoh', text: '気やすく話しかけるな！俺はドロドロ王の側近、スラおだ。' },
                { actor: 'ally', text: 'スラお……！？どうしちゃったの！？' },
                { actor: 'slime', text: '勝つしかないな...' }
            ],
            stage3_pre: [
                { actor: 'ninja', text: '侵入者！発見！直ちに排除！' },
                { actor: 'slime', text: 'うわっ、忍者だ！でも、怖がってる場合じゃないよね。' },
                { actor: 'ally', text: '悪いけど、倒させてもらうよ！' }
            ],
            stage4_pre: [
                { actor: 'rival', text: 'フン、よくここまで来たな。だが、これ以上は通さん！' },
                { actor: 'rival', text: 'ドロドロ団は我スフィンクスが守る！！' },
                { actor: 'ally', text: 'スフィンクス……！？' },
                { actor: 'slime', text: '強そうだけど、大丈夫だよ。' },
                { actor: 'ally', text: 'うん...' }
            ],
            stage5_pre: [
                { actor: 'king', text: 'おぬしの旅は順調なようじゃのう。だが、次の相手はかなり手強いぞ。' },
                { actor: 'slime', text: 'えっ、王様！？' },
                { actor: 'ally', text: '違うよ！王様に化けているんだ！' },
                { actor: 'demon', text: 'フフフ……見破られたか。実は私はドロスケ魔王だ。' },
                { actor: 'ally', text: '王様に化けるなんて！卑劣な奴！！！……。' },
                { actor: 'slime', text: 'でも引かないよ。いこう。' }
            ],
            stage_boss_pre: [
                { actor: 'boss', text: 'よく来たな。ここから先は本当の勝負だ。' },
                { actor: 'slime', text: '望むところだよ。' }
            ],
            stage_boss_ending: [
                { actor: 'boss', text: 'まさかここまでやるとはな……。' },
                { actor: 'ally', text: 'まだ終わりじゃない。次の戦いもあるんだよね。' }
            ],
            stage8_pre: [
                { actor: 'devil', text: 'ついに来たな。最後の門へ。' },
                { actor: 'slime', text: 'ここで終わらせるよ。' }
            ],
            ending: [
                { actor: 'system', text: '戦いは終わり、静かな空が戻ってきた。' },
                { actor: 'ally', text: 'おつかれさま、スラりん。' }
            ],
            // 👑 スライム王誕生シーン（配合でslime_king_godを作ったとき）
            king_god_born: [
                { actor: 'system', text: 'プラチナゴーレムとゴッドキングスライムが、眩い光に包まれた——。' },
                { actor: 'king', text: '……ふぉっふぉっふぉ。これはこれは。久しぶりに力が漲ってきたのう。' },
                { actor: 'slime', text: 'ス、スライム王！？いつの間に！？' },
                { actor: 'king', text: '儂は常にそこにいたのじゃ。プラチナの鎧に、神の魂が宿った——それだけのことよ。' },
                { actor: 'ally', text: 'すごい……。王様が仲間に！？これって……最強なんじゃ？' },
                { actor: 'king', text: '最強かどうかは、使い手次第じゃ。だが——儂が全力を出せば、弾倉が一瞬で埋まるくらいは造作もないぞ。' },
                { actor: 'slime', text: 'た、頼もしすぎる！！王様、一緒に戦ってください！' },
                { actor: 'king', text: 'フォッフォッ。よかろう。この老骨、もうひと働きしてやろうではないか。——行くぞ！' },
                { actor: 'system', text: '👑 スライム王が仲間になった！ 弾を全大砲に一斉装填！ ほぼ無敵の王が戦線に加わった！' },
            ],
            chapter2_intro: [
                { actor: 'system', text: '鉄と歯車の気配が、新たな章の始まりを告げる。' },
                { actor: 'ally', text: 'ここからはちょっとメカメカしい相手ばっかりだね。' },
                { actor: 'slime', text: '怖いけど行くしかない！' }
            ],
            c2_stage1_pre: [
                { actor: 'rusty', text: '廃村に足を踏み入れるなら、覚悟はできてるんだろうな。' },
                { actor: 'slime', text: 'もちろん。ここで立ち止まるつもりはないよ。' }
            ],
            c2_stage2_pre: [
                { actor: 'c2meadow', text: 'のどかな景色ほど、油断を誘うものさ。' },
                { actor: 'ally', text: 'だったら、先にこっちが本気を見せるだけだよ。' }
            ],
            c2_stage3_pre: [
                { actor: 'tempest', text: '荒波を越えられるかな。' },
                { actor: 'slime', text: '越えてみせるよ。この戦車でね。' }
            ],
            c2_stage4_pre: [
                { actor: 'c2steamy', text: '湯気の向こうは見えにくいでしょう？' },
                { actor: 'ally', text: '見えなくても、進む方向は決まってるよ。' }
            ],
            c2_stage5_pre: [
                { actor: 'c2guard', text: 'ここが最後の防衛線だ。' },
                { actor: 'slime', text: 'だったら突破するだけだ。' }
            ],
            c2_boss_pre: [
                { actor: 'gear', text: 'ようこそ。我がギア城へ。' },
                { actor: 'ally', text: '機械っぽさ、すごいね。' },
                { actor: 'slime', text: 'でも勝つよ。ここで終わらせる。' }
            ],
            chapter2_ending: [
                { actor: 'gear', text: 'バカな……。私の完璧な戦略が……感情に負けた、だと？' },
                { actor: 'slime', text: '強さは機械じゃない。仲間と繋がる「心」だ。わかったか！' },
                { actor: 'gear', text: '……フッ。負けを認めよう。だが覚えておけ。この先には、私より遥かに危険な存在がいる。' },
                { actor: 'system', text: '〜 第2章「ギアギアどきどき大作戦！」 かんりょう〜♪ 〜' },
                { actor: 'system', text: '第3章へと続く……' }
            ],
            chapter3_intro: [
                { actor: 'system', text: 'まばゆい雲海の向こうに、新しい道がひらけた。風は甘く、雲は静かに歌っている。' },
                { actor: 'slime', text: 'ここが第3章……空気までふわふわしてる。でも、足もとがないぶん、ちょっとだけ怖いな。' },
                { actor: 'ally', text: 'うん。でも見て、雲の橋の先。鐘みたいな光がずっと点いてる。誰かが待ってるんだ。' },
                { actor: 'king', text: '天の門は、力よりも心を試すと聞く。迷い、後悔、願い……そのすべてを抱えたまま進まねばならぬ。' },
                { actor: 'slime', text: 'じゃあ、今までの旅で手に入れたもの全部を持っていくよ。負けたくない気持ちも、守りたい気持ちも。' },
                { actor: 'ally', text: 'それに、ここまで来たのは二人だけの力じゃないよ。出会ったみんなの声が、ちゃんと後ろから押してくれてる。' },
                { actor: 'system', text: '雲の下では、かつて救われた村々の灯が小さくまたたいていた。ここは空の果てであり、旅の記憶が重なる場所。' },
                { actor: 'king', text: 'もし心が折れそうになったら、地上を思い出すのじゃ。おぬしたちを待つ者がおることを。' },
                { actor: 'slime', text: 'うん。ぼくらの旅が本物かどうか、ここで確かめる。逃げないよ。' },
                { actor: 'ally', text: '初見でびっくりする景色も、強そうな敵も、ぜんぶ越えていこう。いこう、スラりん。' },
                { actor: 'system', text: '第3章「天門のスカイパレード」開幕。雲海の向こうで、光の砲塔がゆっくりと目を覚ます。' }
            ],
            chapter4_intro: [
                { actor: 'system', text: '天門をくぐった先——そこは光ではなく、深い暗闇だった。上も下もなく、ただ深淵だけがある。' },
                { actor: 'slime', text: 'セラフィムは「次の空へ」って言ったのに……ここ、全然空じゃない。底なしの闇だ。' },
                { actor: 'ally', text: 'でも、落ちてはいないよ。ちゃんと立ってる。ここも、誰かの「世界」なんだと思う。' },
                { actor: 'king', text: '深淵とは、光が届かぬ場所にあらず——光を恐れて目を閉じた者が作る場所じゃ。進む心があれば、必ず道は見える。' },
                { actor: 'slime', text: 'じゃあぼくらの目が、ここの光になればいい。今まで出会ってきた全員の分も、ちゃんと前を照らす。' },
                { actor: 'ally', text: 'うん。怖いけど、一人じゃないし。スラりん、私ずっとそこにいるよ。' },
                { actor: 'system', text: '深淵の底から、かすかな気配が届いた。混沌と虚無の支配者——「ニヒルム」が、旅人たちを待っている。' },
                { actor: 'slime', text: 'ここまで来たなら、もう迷わない。深淵の一番底まで——行くぞ！' },
                { actor: 'system', text: '第4章「深淵のカオスゾーン」開幕。漆黒の砲塔が、静かに目を覚ます。' },
            ],
            chapter4_ending: [
                { actor: 'system', text: '最後の混沌が晴れると、深淵の底に一筋の光が差し込んだ。虚無の主が——初めて、笑っていた。' },
                { actor: 'nihilum', text: '……長い夢を見ていた気がする。光を拒んでいたあの時間が、今は少し遠い。' },
                { actor: 'slime', text: 'ニヒルム、一緒に地上に戻ろう。ぼくらの村、絶対に気に入ると思うから。' },
                { actor: 'ally', text: 'うん。混沌の主も、帰る場所があっていいはずだよ。一人で深淵に残ることないんだ。' },
                { actor: 'nihilum', text: '……「帰る場所」か。私にも、そんなものが作れるだろうか。' },
                { actor: 'king', text: '場所は作るものじゃ。人と繋がることで、自然と生まれる——おぬしにはもう、その繋がりがある。' },
                { actor: 'slime', text: 'この旅で出会った全員が待ってるよ。ドロスケ団長も、ギア将軍も、セラフィムも——ぜんぶ繋がってる。' },
                { actor: 'nihilum', text: 'ならば——共に行こう。私も、その旅の続きを見てみたい。' },
                { actor: 'ally', text: 'よし！じゃあ出発だ。次はどんな空が待ってるんだろうね。' },
                { actor: 'system', text: '第4章クリア。深淵に光が満ち、新たな仲間を得た旅人たちの物語は、まだ終わらない。' },
            ],
            chapter3_ending: [
                { actor: 'system', text: '最後の砲火がほどけると、雲海は音もなく割れ、はるか上空にもう一つの空路が姿を現した。' },
                { actor: 'seraph', text: '見事です。あなたたちは傷つきながらも、最後まで願いを手放さなかった。その心は、光よりも強く響いていました。' },
                { actor: 'slime', text: 'ぼくらだけの力じゃないよ。ここまで来る途中で、たくさん助けられて、たくさん支えられてきたんだ。' },
                { actor: 'ally', text: 'うん。だからこの景色、ただの思い出にはしたくない。次の場所へ進むための約束にしたいんだ。' },
                { actor: 'seraph', text: 'ならば門は開かれます。願いを独り占めしない者にこそ、さらに高い空は応えるでしょう。' },
                { actor: 'king', text: 'よくやったのう。天の試練を越えた今、おぬしたちはもう誰にも侮れぬ。王国の空も、もう昔の空ではない。' },
                { actor: 'slime', text: 'ありがとう。でも、まだ終わりじゃない。上に道があるなら、その先にもきっと守るべきものがある。' },
                { actor: 'ally', text: 'だったら次も一緒だね。怖くても、泣きそうでも、ちゃんと笑って進もう。' },
                { actor: 'seraph', text: '進みなさい、旅人たち。あなたたちの戦車には、もう地上と天上の両方の祈りが宿っています。' },
                { actor: 'system', text: '第3章クリア。祝福の粒子が空へ舞い、新たな空路が静かに姿を現した。物語は、さらに深い蒼へ続いていく。' }
            ],
            c4_stage1_pre: [
                { actor: 'system', text: '深淵の入り口——漆黒の霧が渦巻き、足元さえ見えない。それでも、二人の砲車は前へ進んだ。' },
                { actor: 'ally', text: 'スラりん……ここ、なんか声が聞こえる気がする。「帰れ」って。' },
                { actor: 'slime', text: 'ぼくも聞こえてる。でも、これは脅しだよ。本当に危険なら、近づくなってわかるはずだ。' },
                { actor: 'void_knight', text: '……よくここまで来た。だが、深淵に足を踏み入れた者は、光を忘れて戻れなくなる。それでも進むか？' },
                { actor: 'slime', text: '進む。光を忘れないために戦うんだ。誰かが混沌に飲まれる前に、道を切り開く！' },
            ],
            c4_stage1_post: [
                { actor: 'ally', text: 'やった！最初の関門、突破だよ！' },
                { actor: 'void_knight', text: '……強い。だが、この先は本当の混沌が待つ。君たちの「光」が、どこまで届くか見てやろう。' },
                { actor: 'system', text: '虚無の騎士が道を開いた。深淵の霧が少し晴れ、歪んだ景色の向こうに次の戦場が見えてくる。' },
            ],
            c4_stage2_pre: [
                { actor: 'system', text: '逆さまの廃都——建物が宙に浮き、重力が狂い、時間すら歪んで見える場所。' },
                { actor: 'ally', text: 'うわ……空と地面が逆さまだ。あの廃墟、落ちてるんじゃなくて浮いてるの？' },
                { actor: 'slime', text: 'ここの物理法則、全部おかしい。でも砲弾は正直だ。狙えば当たる。それだけ信じよう。' },
                { actor: 'chaos_mage', text: 'クックック……この都市は私の「実験場」。真実と虚偽、現実と幻想を混ぜ合わせた究極の迷宮よ。' },
                { actor: 'ally', text: '実験場って……私たちをモルモットにするつもり？そんなの、させないよ！' },
            ],
            c4_stage2_post: [
                { actor: 'chaos_mage', text: '……まさか、この混沌の中で正気を保てるとは。面白い旅人たちだわ。' },
                { actor: 'slime', text: '正気を保てるのは、隣に信頼できる仲間がいるからだよ。一人じゃきっと無理だった。' },
                { actor: 'system', text: '廃都の歪みが静まり、重力が少し戻った。混沌の魔導師は去り、次の道が開かれる。' },
            ],
            c4_stage3_pre: [
                { actor: 'system', text: '嘘の楽園——輝く花園と穏やかな光。だが、その美しさはすべて「偽物」だと、二人は気づいていた。' },
                { actor: 'ally', text: 'ここ……きれいだね。でも、なんか居心地が悪い。きれいすぎて、かえって怖い。' },
                { actor: 'slime', text: 'うん。本物の楽園なら、傷跡がある。完璧すぎるものは、信じちゃいけない。' },
                { actor: 'nihilum', text: '……よく気づいた。ここは私が作った「理想の世界」。誰も傷つかず、争いもない——でも、誰も生きてもいない。' },
                { actor: 'slime', text: 'ニヒルム……！やっと声が聞けた。でも、それは楽園じゃない。傷つくことも、生きることの一部だよ。' },
            ],
            c4_stage3_post: [
                { actor: 'nihilum', text: '……あなたたちは、痛みを知りながらも前へ進む。私には、それが理解できなかった。' },
                { actor: 'ally', text: '理解しなくていいよ。一緒に感じればいい。次も、一緒に前へ行こう。' },
                { actor: 'system', text: '嘘の花々が散り、本当の深淵の空気が戻ってくる。ニヒルムの声が、少しだけ柔らかくなった気がした。' },
            ],
            c4_stage4_pre: [
                { actor: 'system', text: '記憶の断層——過去の戦いの残像が、断片的に空間に刻まれている。スラりんたちの記憶も、ここでは形を持つ。' },
                { actor: 'ally', text: 'あ……あれ、ドロスケ将軍との戦いの記憶だ。あの時、本当に怖かったな。' },
                { actor: 'slime', text: 'でも、乗り越えてきた。この記憶は傷跡じゃない——ぼくらが歩んできた証拠だ。' },
                { actor: 'nihilum', text: '記憶とは残酷なものだ。美しかった日々も、消えた仲間も——すべて「失ったもの」として残る。だから私は忘れることを選んだ。' },
                { actor: 'slime', text: '忘れることと、乗り越えることは違うよ。ニヒルム、君が深淵に閉じこもった理由を——聞かせてほしい。' },
            ],
            c4_stage4_post: [
                { actor: 'nihilum', text: '……昔、守ろうとした者たちがいた。だが私の力は及ばず、すべて失った。だから「何も持たなければ、何も失わない」と思った。' },
                { actor: 'ally', text: 'ニヒルム……それは悲しいよ。でも、だから一人で深淵にいたんだね。' },
                { actor: 'slime', text: '一人で抱えてたんだ。もう、そうしなくていいよ。ぼくらが来たんだから。' },
                { actor: 'system', text: '記憶の断層が静かに溶けていく。ニヒルムの瞳に、わずかな光が灯った。' },
            ],
            c4_stage5_pre: [
                { actor: 'system', text: '深淵の玉座間——混沌の核心、ニヒルムが長い年月をかけて作り上げた「虚無の城」の最奥。' },
                { actor: 'ally', text: 'ここが……最後の場所だね。すごく重たい空気がする。でも、怖くない。スラりんがいるから。' },
                { actor: 'slime', text: 'うん。ニヒルム、ここで決着をつけよう。戦いたいんじゃない——君を「深淵から連れ出したい」んだ。' },
                { actor: 'nihilum', text: '……最後まで来たか。だが、ここを越えるということは、私の「すべての混沌」を受け止めるということだ。それでも？' },
                { actor: 'slime', text: 'それでも！ぼくらの砲弾には、地上で出会ったみんなの想いが全部込めてある。絶対に届かせる！' },
            ],

            // ============================================================
            // ★★★ 負けイベント：ニヒルム戦・第1ラウンド敗北 ★★★
            // ============================================================
            c4_boss_lose_event: [
                { actor: 'system', text: '轟音とともに、スラりんたちの砲弾が全て弾き返された。龍の機械鎧が——まったく揺らいでいない。' },
                { actor: 'nihilum', text: 'ハァ……ハァ……まだだ。まだ、終わっていない。' },
                { actor: 'slime', text: '（ダメだ、この龍の鎧……どこかに当たってる気がしない。全弾跳ね返されてる——）' },
                { actor: 'ally', text: 'スラりん……！？戦車が、止まってる。エンジンが——' },
                { actor: 'system', text: '深淵の虚無が戦車全体を包み込み、システムが次々とシャットダウンされていく——。' },
                { actor: 'nihilum', text: '……終わりだ。お前たちの旅も、ここで幕を引く。「帰る場所」など、最初からなかったのだ。' },
                { actor: 'slime', text: '…………（意識が、遠くなる——）' },
                { actor: 'system', text: '静寂……。戦車の全システムが落ちた。漆黒の中で、スラッチの声だけが、かすかに響く。' },
                { actor: 'ally', text: 'スラりん……！スラりん、起きて！！ねえ——戦車が、まだ動いてる！！' },
                { actor: 'ally', text: 'コアがまだ光ってる！エンジン出力、59%！！戦車は、まだここにいる！！' },
                { actor: 'system', text: 'どこかで——小さな砲音が鳴った。戦車の奥深く、まだ熱を持ったコアが、静かに再鼓動を始める。' },
                { actor: 'slime', text: '……（ぼくは……まだここに……いる）' },
                { actor: 'ally', text: 'そうだよ！ここにいる！ドロスケ団長も、ギア将軍も、セラフィムも——みんな、覚えてる！？' },
                { actor: 'slime', text: '…………覚えてる。全部——ぜんぶ、覚えてる。' },
                { actor: 'system', text: 'エンジン出力：78%。主砲冷却システム：再起動。装甲強化プログラム：フル展開——。' },
                { actor: 'slime', text: 'ニヒルム……。お前が「帰る場所はない」って言ったけど——ぼくには、ある。みんなが待ってる、あの場所が。' },
                { actor: 'slime', text: 'だから——まだ、終わらない！！戦車よ……もう一度だ！！全力で、行くぞ！！！' },
                { actor: 'system', text: '戦車のエンジンが轟音と共に覚醒した。出力：MAX。新たな炎が、深淵を照らし出す——！' },
            ],

            // ============================================================
            // ★★★ 第2ラウンド開始演出 ★★★
            // ============================================================
            c4_boss_second_chance: [
                { actor: 'nihilum', text: '……なに!? 戦車が——まだ動いているだと!?' },
                { actor: 'slime', text: 'ぼくらはまだここにいる。諦めたなんて、言ってない！！' },
                { actor: 'ally', text: '全システム再起動完了！攻撃力・速度——全部MAXに引き上げた！！スラりん、行けるよ！！' },
                { actor: 'nihilum', text: '……バカな。あれだけの虚無を受けて……いったい何が、お前たちをそこまで動かす！？' },
                { actor: 'slime', text: '仲間だよ。旅の全部が、今ここに来てくれてる。ニヒルム——もう一回、今度こそ本気で行くぞ！！' },
            ],

            // ============================================================
            // CHAPTER 5 STORIES - 原初の光と終焉の砲火
            // ============================================================
            chapter5_intro: [
                { actor: 'system', text: '深淵の果てを越えた先——そこは光でも闇でもない、「何かが始まる前」の空間だった。' },
                { actor: 'slime', text: 'ニヒルムが言ってた「その先」が、ここか。……音がない。風もない。でも、確かに「何か」がいる。' },
                { actor: 'ally', text: 'スラりん、見て。あの光——点いたり消えたりしてる。まるで、呼吸してるみたいだよ。' },
                { actor: 'nihilum', text: '……ここは「原初の回廊」。世界が始まる前から存在する空間だ。私でさえ、ここには近づかなかった。' },
                { actor: 'king', text: '怖れるな。ここまで来た者たちには、ここに立つ資格がある。お前たちの旅は、この場所を目指していたのじゃ。' },
                { actor: 'slime', text: '……そっか。村から出た時は、こんな場所まで来るなんて思ってなかった。でも、来るべくして来たんだな。' },
                { actor: 'ally', text: 'うん。一人じゃ絶対来られなかった。スラりん、みんなと一緒に——行こう。' },
                { actor: 'nihilum', text: '……「原初の意志」ルーメン。この世界を作った存在が、お前たちを待っている。覚悟しろ。' },
                { actor: 'slime', text: '覚悟なら、旅の初日からずっとしてきた。今さら怖くない——行くぞ！！' },
                { actor: 'system', text: '第5章「原初の光と終焉の砲火」開幕。世界の始まりに、スラりんたちの砲火が轟く。' },
            ],
            chapter5_ending: [
                { actor: 'system', text: '原初の光が静まると——世界のどこかで、小さな砲音が鳴り響いた。それは始まりの音だった。' },
                { actor: 'lumen', text: '……こんなに清々しい気持ちになったのは、初めてだ。世界を作ってから、ずっと一人だったが——もう、そうじゃない。' },
                { actor: 'slime', text: 'ルーメン、ぼくらの村に来てよ。一緒に、今日のお昼ごはんを食べよう。' },
                { actor: 'ally', text: '（笑）スラりんらしい。でも、そういうことだよね。一緒にいるって、そういうことだよね。' },
                { actor: 'nihilum', text: '……ルーメン。あなたが作った世界は、不完全だったかもしれない。でも、その不完全さが——私たちを繋げた。' },
                { actor: 'lumen', text: 'そうか。不完全だったから、誰かを必要とした。必要としたから、出会えた。……ならば、不完全で良かったのかもしれない。' },
                { actor: 'king', text: '旅は終わりじゃ。しかし、世界は続く。スラりん——お前たちの砲火は、世界の始まりまで届いた。これからも、前を向いて歩くのじゃ。' },
                { actor: 'slime', text: '……うん。ドロスケ団長も、ギア将軍も、セラフィムも、ニヒルムも、ルーメンも——全員で、村に帰ろう。' },
                { actor: 'ally', text: '全員でご飯食べたら、すごい人数になるね。（笑）でも、それがいいんだ。' },
                { actor: 'lumen', text: '……私は長い時間、「光」だけを信じていた。でも今は——隣に誰かがいる「光」の方が、断然温かいとわかった。' },
                { actor: 'slime', text: '決まり！みんな——帰ろう。ぼくらの村に、全員でっ！！' },
                { actor: 'system', text: '全章クリア。スラりんたちの旅は、世界の始まりから村の台所まで、繋がった。ありがとう、旅人たち。' },
            ],
            c5_stage1_pre: [
                { actor: 'system', text: '原初の回廊——静寂と光の粒子だけが存在する、世界の「前」の空間。' },
                { actor: 'ally', text: 'スラりん……ここ、なんか懐かしい気がする。会ったことないのに。' },
                { actor: 'slime', text: 'ぼくも。全部の始まりがここにある気がして——だから、知ってる気がするのかも。' },
            ],
            c5_stage1_post: [
                { actor: 'slime', text: 'やった……！でも、まだ先がある。行くぞ、スラッチ！' },
                { actor: 'primo', text: '……お前たちは、本物だ。先へ進め。ただし——ここより先は、もう戻れない。覚悟を持て。' },
            ],
            c5_stage2_pre: [
                { actor: 'system', text: '創造の砂漠——まだ形を持たない可能性が、砂の一粒一粒に宿る場所。' },
                { actor: 'ally', text: 'この砂……踏んだら何か生まれそうな気がする。怖いような、ワクワクするような。' },
                { actor: 'slime', text: '「形なき者」が来る。形がなくても——ぼくらの砲弾は本物だ。負けない！' },
            ],
            c5_stage2_post: [
                { actor: 'ally', text: 'やった！形が変わっても、諦めなかったから勝てたんだよ！' },
                { actor: 'slime', text: 'うん。どんな形であっても、「そこにいる」ことを信じれば当たる。それがぼくらの戦い方だ。' },
            ],
            c5_stage3_pre: [
                { actor: 'system', text: '記憶の宮殿——過去の全ての戦いが、透明な鏡に映し出されている。' },
                { actor: 'nihilum', text: '……ここは私も来たくなかった。自分の記憶が全て見える。逃げられない。' },
                { actor: 'slime', text: 'でも、見てみろよニヒルム。お前の記憶の中に——ぼくらもいるじゃないか。' },
                { actor: 'nihilum', text: '……そうだな。（静かに）……そうだな。行こう。' },
            ],
            c5_stage3_post: [
                { actor: 'ally', text: 'エイドロン……あなたは旅人の覚悟を問う役目だったんだね。ありがとう。' },
                { actor: 'eidolon', text: '……感謝を言う者は初めてだ。旅人たち、最後まで——その心のまま進め。' },
            ],
            c5_stage4_pre: [
                { actor: 'system', text: '終焉の砲台群——原初の意志への最後の障壁。全ての道がここに収束する。' },
                { actor: 'nihilum', text: 'アポカリア……「終焉の鎧」。私と同じ時代から存在する番人だ。強い。' },
                { actor: 'slime', text: '強くても、越えるだけだ。ぼくらにはここまでの全部がある。行くぞ！！' },
            ],
            c5_stage4_post: [
                { actor: 'apocaria', text: '……ルーメンが「待っていた」と言っていた意味が、今わかった。お前たちは——本当に、来るべくして来た者たちだ。' },
                { actor: 'ally', text: 'スラりん……あと一つだよ。光の玉座を越えたら——ルーメンに会える。' },
                { actor: 'slime', text: 'うん。みんな——あと少しだ。一緒に行こう！' },
            ],
            c5_stage5_pre: [
                { actor: 'system', text: '光の玉座——原初の意志「ルーメン」の居城に繋がる最後の扉。全ての光がここに集まっている。' },
                { actor: 'ally', text: 'わあ……まぶしい。でも、目を逸らしたくない。ちゃんと、見たい。' },
                { actor: 'slime', text: 'ルクセイン……「光の守護者」か。強そうだけど——怖くない。なんでだろう。' },
                { actor: 'nihilum', text: '……それは、お前たちが「光」を信じているからだ。恐れる必要がない光は、守護者も越えられる。' },
            ],
            c5_stage5_post: [
                { actor: 'luxein', text: '……お前たちの光は、私が守ってきたものより——遥かに温かかった。ルーメンに会いに行け。待っている。' },
                { actor: 'slime', text: 'よし……！ルーメン、今行くぞ！！' },
                { actor: 'ally', text: 'スラりん、手を貸して。一緒に——扉を開こう。' },
            ],
        }; // ★修正: this.scripts の閉じ括弧にセミコロンを追加
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
