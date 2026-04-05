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
            chaos_mage: { name: '混沌の魔導師', color: '#CC44AA', align: 'right', portrait: { base: '#E066CC', accent: '#FFE0F8', eye: '#440030', mark: 'star' } }
        };

        this.scripts = {
            intro: [
                { actor: 'slime', text: 'やっとここまで来たね。空も大地も、ぜんぶ冒険の舞台だ。' },
                { actor: 'ally', text: 'うん。どんな相手でも、一緒ならきっと越えていけるよ。' },
                { actor: 'system', text: 'スラりんたちの冒険が、いま始まる。' }
            ],
            stage2_pre: [
                { actor: 'slaoh', text: 'ここから先は、ただの試し合いじゃないぞ。' },
                { actor: 'slime', text: 'わかってる。だからこそ、ちゃんと勝ちたいんだ。' }
            ],
            stage3_pre: [
                { actor: 'ninja', text: '音を立てるな。森はすべてを見ている。' },
                { actor: 'ally', text: '気配は消せなくても、気持ちは曲げないよ。' }
            ],
            stage4_pre: [
                { actor: 'king', text: '砂漠の試練じゃ。焦るでないぞ。' },
                { actor: 'slime', text: 'うん。落ち着いて、一歩ずつ進むよ。' }
            ],
            stage5_pre: [
                { actor: 'ally', text: 'ここ、空気まで熱いね……。' },
                { actor: 'slime', text: 'でも引かない。最後まで一緒に行こう。' }
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
            chapter2_intro: [
                { actor: 'system', text: '鉄と歯車の気配が、新たな章の始まりを告げる。' },
                { actor: 'ally', text: 'ここからはちょっとメカメカしい相手ばっかりだね。' },
                { actor: 'slime', text: 'でも行こう。第2章、開始だ。' }
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
                { actor: 'ally', text: 'ラスボスっぽさ、すごいね。' },
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
        };
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

        ctx.save();

        // 背景暗転（グラデーション）
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        const boxX = 36;
        const boxY = H - 175;
        const boxW = W - 72;
        const boxH = 150;
        const iconSize = 55; // アイコンサイズ大きく
        const isRight = actor.align === 'right';
        const iconX = isRight ? boxX + boxW - 56 : boxX + 56;
        const iconY = boxY - iconSize + 10; // 吹き出しの上に配置

        // ── アイコン（吹き出しの上）──
        if (actor.name) {
            // アイコン背景グロー
            ctx.save();
            ctx.shadowColor = actor.color || '#fff';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(iconX, iconY, iconSize + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(8,12,20,0.95)';
            ctx.fill();
            ctx.strokeStyle = actor.color || '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();

            // アイコン描画（大きく）
            this._drawPortrait(ctx, iconX, iconY, iconSize, actor);
        }

        // ── 吹き出し本体 ──
        ctx.save();
        ctx.shadowColor = actor.color || '#fff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(8, 12, 20, 0.95)';
        ctx.strokeStyle = actor.color || '#fff';
        ctx.lineWidth = 3;
        if (window.Renderer && Renderer._roundRect) {
            Renderer._roundRect(ctx, boxX, boxY, boxW, boxH, 14);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);
        }
        ctx.restore();

        // ── キャラ名 ──
        if (actor.name) {
            // 名前背景タグ
            const nameX = isRight ? boxX + boxW - 100 : boxX + 100;
            const nameTextAlign = isRight ? 'right' : 'left';
            const nameTagX = isRight ? boxX + boxW - 170 : boxX + 12;

            ctx.fillStyle = actor.color || '#fff';
            ctx.globalAlpha = 0.18;
            if (window.Renderer && Renderer._roundRect) {
                Renderer._roundRect(ctx, nameTagX, boxY + 8, 160, 28, 6);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            ctx.fillStyle = actor.color || '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = nameTextAlign;
            ctx.fillText(actor.name, isRight ? boxX + boxW - 20 : boxX + 172, boxY + 27);
        }

        // ── テキスト ──
        ctx.fillStyle = '#f0f0ff';
        ctx.font = '19px Arial';
        ctx.textAlign = 'left';
        const textStartX = boxX + 18;
        const textStartY = boxY + 55;
        const textMaxW = boxW - 36;
        this.wrapText(ctx, this.textToDraw, textStartX, textStartY, textMaxW, 27);

        // ── 操作ヒント ──
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'right';
        ctx.fillText(
            this.waitingInput ? '▶ Z / TAP: つぎへ　　B: スキップ' : '▶ Z / TAP: 早送り',
            boxX + boxW - 14, boxY + boxH - 12
        );

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
