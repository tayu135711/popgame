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
            // bodyShape: 'round'|'wide'|'angular'|'tall'|'ghost'|'ethereal'
            // eyeShape:  'normal'|'wide'|'cute'|'stern'|'narrow'|'half'|'hollow'|'glow'
            // mouthShape:'smile'|'smirk'|'stern'|'grin'|'frown'
            slime:       { name: 'スラりん',           color: '#4CAF50', align: 'left',  bodyShape: 'round',    eyeShape: 'wide',   mouthShape: 'smile', portrait: { base: '#67D66F', accent: '#E8FFE9', eye: '#16351A', mark: 'slime'  } },
            ally:        { name: 'スラッチ',           color: '#2196F3', align: 'right', bodyShape: 'round',    eyeShape: 'cute',   mouthShape: 'smile', portrait: { base: '#5BB8FF', accent: '#E4F5FF', eye: '#10304A', mark: 'ribbon' } },
            rival:       { name: 'ドロドロ王',         color: '#F44336', align: 'right', bodyShape: 'wide',     eyeShape: 'stern',  mouthShape: 'grin',  portrait: { base: '#FF796D', accent: '#FFE4E0', eye: '#4A1010', mark: 'crown'  } },
            slaoh:       { name: 'スラお',             color: '#FF6B35', align: 'right', bodyShape: 'round',    eyeShape: 'stern',  mouthShape: 'smirk', portrait: { base: '#FF9B68', accent: '#FFF0E7', eye: '#4A2310', mark: 'flame'  } },
            ninja:       { name: 'カゲマル',           color: '#555555', align: 'right', bodyShape: 'angular',  eyeShape: 'narrow', mouthShape: 'stern', portrait: { base: '#5A5A5A', accent: '#C8C8C8', eye: '#111111', mark: 'mask'   } },
            king:        { name: 'スライム王',         color: '#FFD700', align: 'right', bodyShape: 'wide',     eyeShape: 'stern',  mouthShape: 'stern', portrait: { base: '#FFE27A', accent: '#FFF8D8', eye: '#5A4300', mark: 'crown'  } },
            boss:        { name: 'ドロスケ将軍',       color: '#9C27B0', align: 'right', bodyShape: 'wide',     eyeShape: 'stern',  mouthShape: 'smirk', portrait: { base: '#C46AE0', accent: '#F6E8FF', eye: '#341042', mark: 'horn'   } },
            devil:       { name: '闇の魔王',           color: '#CE0000', align: 'right', bodyShape: 'angular',  eyeShape: 'narrow', mouthShape: 'grin',  portrait: { base: '#F04B4B', accent: '#FFE3E3', eye: '#3E0000', mark: 'horn'   } },
            demon:       { name: 'ドロスケ魔王',       color: '#880000', align: 'right', bodyShape: 'angular',  eyeShape: 'narrow', mouthShape: 'frown', portrait: { base: '#CC3333', accent: '#FFE0E0', eye: '#3E0000', mark: 'horn'   } },
            system:      { name: '',                   color: '#888888', align: 'center',bodyShape: 'round',    eyeShape: 'normal', mouthShape: 'smile', portrait: { base: '#90A4AE', accent: '#F4FAFD', eye: '#263238', mark: 'star'   } },
            rusty:       { name: 'ラスティ',           color: '#8B7355', align: 'right', bodyShape: 'angular',  eyeShape: 'half',   mouthShape: 'stern', portrait: { base: '#B08B62', accent: '#F8EBDD', eye: '#3C2A1A', mark: 'gear'   } },
            tempest:     { name: 'テンペスト',         color: '#1565C0', align: 'right', bodyShape: 'round',    eyeShape: 'wide',   mouthShape: 'smirk', portrait: { base: '#4D9CFF', accent: '#E5F2FF', eye: '#0F2A4A', mark: 'wave'   } },
            c2guard:     { name: '鉄壁ガード',         color: '#546E7A', align: 'right', bodyShape: 'wide',     eyeShape: 'stern',  mouthShape: 'stern', portrait: { base: '#7D97A2', accent: '#EDF4F7', eye: '#20313A', mark: 'shield' } },
            gear:        { name: 'ギアギア将軍',       color: '#37474F', align: 'right', bodyShape: 'angular',  eyeShape: 'narrow', mouthShape: 'stern', portrait: { base: '#607D8B', accent: '#E7F7FF', eye: '#122028', mark: 'gear'   } },
            c2meadow:    { name: 'メドウ',             color: '#558B2F', align: 'right', bodyShape: 'round',    eyeShape: 'cute',   mouthShape: 'smile', portrait: { base: '#8BCB62', accent: '#F1FFE8', eye: '#233816', mark: 'leaf'   } },
            c2steamy:    { name: 'スチーミー',         color: '#CE93D8', align: 'right', bodyShape: 'round',    eyeShape: 'wide',   mouthShape: 'smile', portrait: { base: '#E1B1EB', accent: '#FFF0FF', eye: '#47244D', mark: 'steam'  } },
            seraph:      { name: 'セラフィム',         color: '#FBCB61', align: 'right', bodyShape: 'tall',     eyeShape: 'cute',   mouthShape: 'smile', portrait: { base: '#FFE49A', accent: '#FFFBEF', eye: '#5B4700', mark: 'halo'   } },
            nihilum:     { name: 'ニヒルム',           color: '#7B68EE', align: 'right', bodyShape: 'angular',  eyeShape: 'narrow', mouthShape: 'stern', portrait: { base: '#9B88FF', accent: '#E8E4FF', eye: '#1A0050', mark: 'hood'   } },
            void_knight: { name: '虚無の騎士',         color: '#4A4A8A', align: 'right', bodyShape: 'angular',  eyeShape: 'hollow', mouthShape: 'stern', portrait: { base: '#6A6ABF', accent: '#E0E0FF', eye: '#0A0A2A', mark: 'shield' } },
            chaos_mage:  { name: '混沌の魔導師',       color: '#CC44AA', align: 'right', bodyShape: 'round',    eyeShape: 'wide',   mouthShape: 'grin',  portrait: { base: '#E066CC', accent: '#FFE0F8', eye: '#440030', mark: 'star'   } },
            // ★バグ修正: 第5章で使われるアクターが未定義だったため名無し・グレーで表示されていた
            lumen:       { name: '原初の意志・ルーメン', color: '#FFD700', align: 'right', bodyShape: 'ethereal', eyeShape: 'glow',   mouthShape: 'smile', portrait: { base: '#FFF0A0', accent: '#FFFFF0', eye: '#5A4000', mark: 'rays'   } },
            primo:       { name: '原初の番人・プリモス', color: '#A0C8FF', align: 'right', bodyShape: 'wide',     eyeShape: 'stern',  mouthShape: 'stern', portrait: { base: '#C0DEFF', accent: '#F0F8FF', eye: '#1A3A5A', mark: 'shield' } },
            eidolon:     { name: '記憶の幻影・エイドロン', color: '#C8A0FF', align: 'right', bodyShape: 'ghost',   eyeShape: 'narrow', mouthShape: 'stern', portrait: { base: '#DCC0FF', accent: '#F5F0FF', eye: '#2A1050', mark: 'star'   } },
            apocaria:    { name: '終焉の鎧・アポカリア', color: '#FF6040', align: 'right', bodyShape: 'angular',  eyeShape: 'stern',  mouthShape: 'frown', portrait: { base: '#FF9070', accent: '#FFF0ED', eye: '#4A1000', mark: 'horn'   } },
            luxein:      { name: '光の守護者・ルクセイン', color: '#FFFFA0', align: 'right', bodyShape: 'ethereal', eyeShape: 'glow',  mouthShape: 'smile', portrait: { base: '#FFFFE0', accent: '#FFFFFF', eye: '#5A5000', mark: 'halo'   } },
        };

        this.scripts = {
            intro: [
                { actor: 'king', text: 'スラりんよ、大事な話がある。落ち着いて聞くのじゃ。' },
                { actor: 'slime', text: 'なになに！？ぼく、何かやらかした？' },
                { actor: 'king', text: 'ドロドロ王が、この王国を脅かし始めておる。おぬしに、そやつを止める旅に出てほしいのじゃ。' },
                { actor: 'slime', text: 'ぼくが……！わかった。やってみせる！' },
                { actor: 'ally', text: '待って！私も行く。スラりん一人には絶対させない！' },
                { actor: 'king', text: 'ふたりとも、なんと頼もしい。では、この特製スライム戦車を持っていくがよい。おぬしたちの力になるじゃろう。' },
                { actor: 'ally', text: 'わあ、すごい……！本物の戦車だ！かっこいい！' },
                { actor: 'slime', text: 'よし、出発だ！ぼくらならきっとやれる！' },
                { actor: 'system', text: 'スラりんとスラッチの冒険が、いま始まった。' }
            ],
            stage2_pre: [
                { actor: 'slaoh', text: '……久しぶりだな、スラりん。' },
                { actor: 'slime', text: 'スラお！？なんでここに！その戦車……どういうこと！？' },
                { actor: 'slaoh', text: '馴れ馴れしく呼ぶな。俺はもうお前の仲間じゃない。ドロドロ王の右腕として、お前たちを止めに来た。' },
                { actor: 'ally', text: 'スラお……！ どうして……！ どうしてそんなことに……！' },
                { actor: 'slime', text: '（スラお……お前には、ちゃんと話を聞きたいことがある。だから、倒して連れ戻す！）' }
            ],
            stage3_pre: [
                { actor: 'ninja', text: '侵入者、確認。……直ちに排除する。' },
                { actor: 'slime', text: 'うわっ！忍者だ！ びっくりした……でも、止まるつもりはないよ！' },
                { actor: 'ally', text: '悪いけど、ここは通してもらう。行くよ、スラりん！' }
            ],
            stage4_pre: [
                { actor: 'rival', text: 'よくぞここまで来たな、スライムども。だが、この先は通さん。' },
                { actor: 'rival', text: '俺はドロドロ王が誇る四天王が一人、ドロドロ王の剣！ お前たちの旅はここで終わりだ！！' },
                { actor: 'ally', text: '四天王……！ やっぱり簡単には進めないよね……。' },
                { actor: 'slime', text: '強敵ほど、倒したときが気持ちいいんだ。行くよ！' },
                { actor: 'ally', text: 'うん……！ 絶対勝とう！' }
            ],
            stage5_pre: [
                { actor: 'king', text: 'スラりんよ、よくやっておるのう。この調子で——' },
                { actor: 'slime', text: 'あれ……？ 王様、今日はどうしてここに？' },
                { actor: 'ally', text: 'スラりん、待って！ 何かおかしい……その声、少しだけ違う！' },
                { actor: 'demon', text: 'フフフ……さすが、気づくのが早いな。化けの皮が剥がれるのも悪くない。' },
                { actor: 'demon', text: '私こそがドロスケ魔王。この姿でお前たちを惑わせるつもりだったが……まあいい。正面から潰してやろう。' },
                { actor: 'ally', text: '王様に化けるなんて……最低だ！！' },
                { actor: 'slime', text: 'スラッチ、怒りは当然だよ。でも今は戦いに集中しよう。行くぞ！' }
            ],
            stage_boss_pre: [
                { actor: 'boss', text: 'よくここまで来た、スラりん。だがここから先は、これまでとはわけが違う。' },
                { actor: 'boss', text: '私はドロスケ将軍。ドロドロ王の盾にして矛……お前たちの冒険はここで終わりにしてやろう。' },
                { actor: 'slime', text: '将軍か……！ 望むところだよ。ここを越えて、ドロドロ王のところへ行く！' }
            ],
            stage_boss_ending: [
                { actor: 'boss', text: 'くっ……まさか、ここまで追い詰められるとは。お前たちは……本物だな。' },
                { actor: 'slime', text: '将軍、ドロドロ王への道を教えてくれ。あんたも分かってるはずだ。あの人の暴走を、止めなきゃいけないって。' },
                { actor: 'boss', text: '……フン。ならば行け。だが覚えておけ——ドロドロ王は、弱い奴には会いもしない。' },
                { actor: 'ally', text: '大丈夫。私たちは弱くない。ここまで来たんだから。' }
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
                { actor: 'system', text: '鉄と歯車の匂いが漂ってくる。次の章の幕が、静かに上がった。' },
                { actor: 'ally', text: 'ここからはメカメカした敵ばかりみたいだね。なんかいつもと雰囲気が違う……。' },
                { actor: 'slime', text: '怖くないって言ったら嘘になる。でも、止まれないよ。一緒に行こう、スラッチ！' },
                { actor: 'ally', text: 'うん！ どんな相手でも、ふたりなら大丈夫！' }
            ],
            c2_stage1_pre: [
                { actor: 'rusty', text: 'この廃村に踏み込むとは……覚悟はできてるんだろうな。ここは生半可な奴が来る場所じゃない。' },
                { actor: 'slime', text: '覚悟なら、旅に出た日からずっとしてきた。ここで足を止めるつもりはないよ。' },
                { actor: 'rusty', text: '……いい目をしてる。だが、その目が最後まで輝き続けるかどうかは、戦ってみなけりゃわからない！' }
            ],
            c2_stage2_pre: [
                { actor: 'c2meadow', text: 'のどかな景色でしょう？ でもね、油断した瞬間が一番危ない。それが私の戦い方よ。' },
                { actor: 'ally', text: 'そっちがその気なら、こっちも本気を見せるだけだよ。行くよ、スラりん！' }
            ],
            c2_stage3_pre: [
                { actor: 'tempest', text: 'ここまで来たか、小さな旅人。荒波を越えられるかな……試させてもらおう。' },
                { actor: 'slime', text: 'どんな波でも、この戦車で乗り越えてみせる。かかってきて！' }
            ],
            c2_stage4_pre: [
                { actor: 'c2steamy', text: 'ふふ……湯気の向こうは見えにくいでしょう。霞の中に全てを隠してしまえば、私の勝ちよ。' },
                { actor: 'ally', text: '見えなくても、前に進む方向は決まってるよ。スラりん、行こう！' }
            ],
            c2_stage5_pre: [
                { actor: 'c2guard', text: 'ここが最後の防衛線だ。何があろうと、私は引かない。お前たちの旅はここで終わりだ！' },
                { actor: 'slime', text: '最後の防衛線なら、突破したらギア将軍に会えるってことだよね。全力で行くよ！' }
            ],
            c2_boss_pre: [
                { actor: 'gear', text: 'ようこそ、私の「ギア城」へ。無駄なことをしたものだ——ここまで来られる者はいないと計算していたが。' },
                { actor: 'ally', text: '完璧な計算が外れたんだね。それって、私たちが予想外の力を持ってるってことじゃないかな。' },
                { actor: 'slime', text: '計算で動くあんたには、ぼくらの戦い方は読めないよ。ここで決める！' }
            ],
            chapter2_ending: [
                { actor: 'gear', text: 'バカな……。完璧な戦略で、完璧に動いていたはずだ。なのに……「感情」に、負けた……だと？' },
                { actor: 'slime', text: '強さって、計算や機械だけじゃないよ。仲間を信じる気持ち、絶対に諦めない心——そっちの方がずっと強いんだ。わかったか！' },
                { actor: 'gear', text: '…………フッ。認めよう。私の敗北だ。だが——覚えておけ。この先には、私などより遥かに危険な存在が待っている。心して進め。' },
                { actor: 'ally', text: '…………ありがとう、ギア将軍。あなた、本当は悪い人じゃないね。' },
                { actor: 'system', text: '〜 第2章「ギアギアどきどき大作戦！」 かんりょう 〜' },
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
                { actor: 'system', text: '深淵の入り口——漆黒の霧が渦巻き、足元さえ見えない。それでも、ふたりの砲車は前へ進んだ。' },
                { actor: 'ally', text: 'スラりん……ここ、どこかから声が聞こえる気がする。「帰れ」って。' },
                { actor: 'slime', text: 'ぼくも聞こえてる。でも、これは脅しだよ。本当に怖いものなら、忠告じゃなくて直接来るはずだ。' },
                { actor: 'void_knight', text: '……よくここまで来た。だが、深淵に踏み込んだ者は光を忘れ、二度と戻れなくなる。それでも——進むか？' },
                { actor: 'slime', text: '進む。光を忘れないために戦うんだ。誰かが混沌に飲まれる前に、道を切り開く！' },
            ],
            c4_stage1_post: [
                { actor: 'ally', text: 'やった！最初の関門、突破だよ！ スラりん、すごい！' },
                { actor: 'void_knight', text: '……確かに強い。だが、この先には本物の混沌が待っている。お前たちの「光」が、どこまで届くか……見届けてやろう。' },
                { actor: 'system', text: '虚無の騎士が道を開いた。深淵の霧が薄れ、歪んだ景色の向こうに、次の戦場が姿を現す。' },
            ],
            c4_stage2_pre: [
                { actor: 'system', text: '逆さまの廃都——建物が宙を漂い、重力が狂い、時間さえも歪んで見える場所。' },
                { actor: 'ally', text: 'うわ……空と地面が逆さまだ。あの廃墟、落ちてるんじゃなくて浮いてるの？' },
                { actor: 'slime', text: 'ここの物理法則は全部おかしい。でも、砲弾は正直だ。狙えば当たる——それだけ信じよう。' },
                { actor: 'chaos_mage', text: 'ふふふ……この都市は私の「実験場」よ。真実と虚偽、現実と幻想を混ぜ合わせた究極の迷宮——楽しんでいきなさい。' },
                { actor: 'ally', text: '実験場って……私たちをモルモット扱いするつもり！？そんなこと、絶対させない！' },
            ],
            c4_stage2_post: [
                { actor: 'chaos_mage', text: '……まさか、この混沌の中で正気を保てるとは。面白い旅人たちね。' },
                { actor: 'slime', text: '正気でいられるのは、隣に信頼できる仲間がいるからだよ。一人だったら、きっとダメだった。' },
                { actor: 'system', text: '廃都の歪みが静まり、重力が少し戻った。混沌の魔導師は去り、次の道が開かれる。' },
            ],
            c4_stage3_pre: [
                { actor: 'system', text: '嘘の楽園——輝く花々と穏やかな光。でも、その美しさは全て「作り物」だと、ふたりには分かった。' },
                { actor: 'ally', text: 'ここ……きれいだね。でも、なんか居心地が悪い。きれいすぎて、かえって怖いくらい。' },
                { actor: 'slime', text: 'うん。本物の楽園なら、傷跡がある。完璧すぎるものは、信じちゃいけない。' },
                { actor: 'nihilum', text: '……よく気づいた。ここは私が作った「理想の世界」。誰も傷つかず、争いもない——でも、誰も笑ってもいない。' },
                { actor: 'slime', text: 'ニヒルム……！ やっと声が聞けた。でも、それは楽園じゃないよ。傷つくことも、泣くことも、生きることの一部なんだ。' },
            ],
            c4_stage3_post: [
                { actor: 'nihilum', text: '……あなたたちは、痛みを知りながらも前へ進む。私には長い間、それが理解できなかった。' },
                { actor: 'ally', text: '理解しなくていいよ。一緒に感じればいい。次も、一緒に前へ行こう、ニヒルム。' },
                { actor: 'system', text: '嘘の花々が散り、深淵の空気が戻ってくる。ニヒルムの声が、少しだけ柔らかくなった気がした。' },
            ],
            c4_stage4_pre: [
                { actor: 'system', text: '記憶の断層——過去の戦いの残像が、断片的に空間に刻まれている。スラりんたちの記憶も、ここでは形を持つ。' },
                { actor: 'ally', text: 'あ……あれ、ドロスケ将軍との戦いの記憶だ。あの時は、本当に怖かったな。' },
                { actor: 'slime', text: '怖かったけど、乗り越えてきた。この記憶は傷跡じゃない——ぼくらが歩んできた証拠だよ。' },
                { actor: 'nihilum', text: '記憶とは残酷なものだ。美しかった日々も、失った仲間も——全て「失ったもの」として残り続ける。だから私は、忘れることを選んだ。' },
                { actor: 'slime', text: '忘れることと、乗り越えることは違うよ。ニヒルム——君が深淵に閉じこもった理由を、ちゃんと聞かせてほしい。' },
            ],
            c4_stage4_post: [
                { actor: 'nihilum', text: '……かつて、守ろうとした者たちがいた。だが私の力は届かず、全てを失った。「何も持たなければ、何も失わない」——そう思って、ここにいた。' },
                { actor: 'ally', text: 'ニヒルム……それは、悲しいね。一人で抱えてたんだね、ずっと。' },
                { actor: 'slime', text: 'もう一人で抱えなくていいよ。ぼくらが来たんだから。一緒に前に進もう。' },
                { actor: 'system', text: '記憶の断層が静かに溶けていく。ニヒルムの瞳に、わずかな光が灯った。' },
            ],
            c4_stage5_pre: [
                { actor: 'system', text: '深淵の玉座間——混沌の核心、ニヒルムが長い年月をかけて作り上げた「虚無の城」の最奥。' },
                { actor: 'ally', text: 'ここが……最後の場所だね。すごく重たい空気がする。でも、怖くない。スラりんが隣にいるから。' },
                { actor: 'slime', text: 'ニヒルム、ここで決着をつけよう。戦いたいんじゃない——ぼくは、君を「深淵から連れ出したい」んだ。' },
                { actor: 'nihilum', text: '……最後まで来たか。だがここを越えるということは、私の「全ての混沌」を受け止めるということだ。それでも来るか？' },
                { actor: 'slime', text: 'それでも！ ぼくらの砲弾には、ここまで出会ってきたみんなの想いが全部込めてある。絶対に届かせる！！' },
            ],

            // ============================================================
            // ★★★ 負けイベント：ニヒルム戦・第1ラウンド敗北 ★★★
            // ============================================================
            c4_boss_lose_event: [
                { actor: 'system', text: '轟音とともに、スラりんたちの砲弾が全て弾き返された。虚無の鎧が——まったく揺らいでいない。' },
                { actor: 'nihilum', text: 'ハァ……ハァ……まだだ。まだ、終わっていない。' },
                { actor: 'slime', text: '（ダメだ……全弾、弾き返されてる。どこに当たっているのかすら分からない——）' },
                { actor: 'ally', text: 'スラりん……！ 戦車が止まってる。エンジンの音が——聞こえない！' },
                { actor: 'system', text: '深淵の虚無が戦車全体を包み込み、システムが次々とシャットダウンされていく——。' },
                { actor: 'nihilum', text: '……終わりだ。お前たちの旅も、ここで幕を引く。「帰る場所」など、最初からなかったのだ。' },
                { actor: 'slime', text: '…………（意識が……遠くなる——）' },
                { actor: 'system', text: '静寂。戦車の全システムが落ちた。漆黒の闇の中で——スラッチの声だけが、かすかに響いた。' },
                { actor: 'ally', text: 'スラりん……！ スラりん、起きて！！ ねえ——戦車の、コアがまだ光ってる！！' },
                { actor: 'ally', text: 'エンジン出力、59%！！ 戦車はまだここにいる！！ スラりん、聞こえてる！？' },
                { actor: 'system', text: 'どこかで——小さな砲音が鳴った。戦車の奥深く、まだ熱を持ったコアが、静かに再鼓動を始める。' },
                { actor: 'slime', text: '……（ぼくは……まだ……ここにいる）' },
                { actor: 'ally', text: 'そうだよ！ ここにいる！ ドロスケ将軍も、ギア将軍も、セラフィムも——みんなの顔、覚えてる！？' },
                { actor: 'slime', text: '…………覚えてる。全部——ぜんぶ、覚えてる。' },
                { actor: 'system', text: 'エンジン出力：78%。主砲冷却システム：再起動。装甲強化プログラム：フル展開——。' },
                { actor: 'slime', text: 'ニヒルム……。お前は「帰る場所はない」と言ったけど——ぼくには、ある。みんなが待ってる、あの場所が。' },
                { actor: 'slime', text: 'だから——まだ、終わらない！！ 戦車よ……もう一度だ！！ 全力で、行くぞ！！！' },
                { actor: 'system', text: '戦車のエンジンが轟音と共に覚醒した。出力：MAX。新たな炎が、深淵を照らし出す——！' },
            ],

            // ============================================================
            // ★★★ 第2ラウンド開始演出 ★★★
            // ============================================================
            c4_boss_second_chance: [
                { actor: 'nihilum', text: '……な、何!? 戦車が——まだ動いているだと!?' },
                { actor: 'slime', text: 'ぼくらはまだここにいる。諦めたなんて、一言も言ってない！！' },
                { actor: 'ally', text: '全システム再起動完了！ 攻撃力・速度——全部MAXに引き上げた！！ スラりん、行けるよ！！' },
                { actor: 'nihilum', text: '……バカな。あれだけの虚無を受けて……いったい何が、お前たちをそこまで動かす！？' },
                { actor: 'slime', text: '仲間だよ。旅で出会ったみんなが、今ここに来てくれてる。ニヒルム——もう一回、今度こそ本気でいくぞ！！' },
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
                { actor: 'ally', text: 'スラりん……ここ、なんか懐かしい気がする。会ったことないのに、どこかで知ってるような。' },
                { actor: 'slime', text: 'ぼくも。全ての始まりがここにある気がして——だから、知ってる気がするんだと思う。' },
                { actor: 'primo', text: '……旅人よ。この場所は、お前たちが来るべき場所だ。ならば——通る資格を示せ。' },
            ],
            c5_stage1_post: [
                { actor: 'slime', text: 'やった……！ でも、まだ先がある。行くぞ、スラッチ！' },
                { actor: 'primo', text: '……お前たちは、本物だ。先へ進め。ただし——ここより先は、もう後戻りはできない。覚悟を持て。' },
            ],
            c5_stage2_pre: [
                { actor: 'system', text: '創造の砂漠——まだ形を持たない無限の可能性が、砂の一粒一粒に宿る場所。' },
                { actor: 'ally', text: 'この砂……踏んだら何か生まれそうな気がする。怖いような、ワクワクするような、不思議な感じ。' },
                { actor: 'slime', text: '「形なき者」が来る。形がなくても——ぼくらの砲弾は本物だ。絶対に負けない！' },
            ],
            c5_stage2_post: [
                { actor: 'ally', text: 'やった！ 形がどんなに変わっても、諦めなかったから勝てたんだよ！' },
                { actor: 'slime', text: 'うん。どんな形であっても、「そこにいる」と信じれば当たる。それがぼくらの戦い方だ。' },
            ],
            c5_stage3_pre: [
                { actor: 'system', text: '記憶の宮殿——過去の全ての戦いが、透明な鏡に映し出されている。' },
                { actor: 'nihilum', text: '……ここは私も来たくなかった。自分の記憶が全部見える。逃げ場がない。' },
                { actor: 'slime', text: 'でも、見てみろよニヒルム。お前の記憶の中に——ぼくらもいるじゃないか。' },
                { actor: 'nihilum', text: '……そうだな。（静かに）……そうだな。——行こう。' },
            ],
            c5_stage3_post: [
                { actor: 'ally', text: 'エイドロン……あなたは旅人の覚悟を問う役目だったんだね。ありがとう。' },
                { actor: 'eidolon', text: '……感謝を言う者は初めてだ。旅人たちよ、最後まで——その心のまま進め。' },
            ],
            c5_stage4_pre: [
                { actor: 'system', text: '終焉の砲台群——原初の意志への最後の障壁。全ての道がここに収束する。' },
                { actor: 'nihilum', text: 'アポカリア……「終焉の鎧」。私と同じ時代から存在する番人だ。強い——相当、強い。' },
                { actor: 'slime', text: '強くても、越えるだけだよ。ぼくらにはここまでの全部がある——行くぞ！！' },
            ],
            c5_stage4_post: [
                { actor: 'apocaria', text: '……ルーメンが「待っていた」と言っていた意味が、今ようやくわかった。お前たちは——本当に、来るべくして来た者たちだ。' },
                { actor: 'ally', text: 'スラりん……あと一つだよ。光の玉座を越えたら——ルーメンに会える。' },
                { actor: 'slime', text: 'うん。みんな——あと少しだ。一緒に行こう！！' },
            ],
            c5_stage5_pre: [
                { actor: 'system', text: '光の玉座——原初の意志「ルーメン」の居城に繋がる最後の扉。全ての光がここに集まっている。' },
                { actor: 'ally', text: 'わあ……まぶしい。でも、目を逸らしたくない。ちゃんと、見ていたい。' },
                { actor: 'slime', text: 'ルクセイン……「光の守護者」か。強そうだけど——なぜか、怖くないんだよな。' },
                { actor: 'nihilum', text: '……それは、お前たちが「光」を信じているからだ。恐れる必要がない光は、守護者も越えられる。' },
            ],
            c5_stage5_post: [
                { actor: 'luxein', text: '……お前たちの光は、私が守ってきたどんな輝きよりも——遥かに温かかった。ルーメンに会いに行け。待っている。' },
                { actor: 'slime', text: 'よし……！ ルーメン、今行くぞ！！' },
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
        const bodyShape  = (actor && actor.bodyShape)  || 'round';
        const eyeShape   = (actor && actor.eyeShape)   || 'normal';
        const mouthShape = (actor && actor.mouthShape) || 'smile';
        const f = window.game ? window.game.frame : 0;
        ctx.save();

        // ── 体型 (Body silhouette) ──
        const faceGrad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, 0, cx, cy, size);
        faceGrad.addColorStop(0, p.accent);
        faceGrad.addColorStop(0.5, p.base);
        faceGrad.addColorStop(1, p.base);
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        if (bodyShape === 'wide') {
            ctx.ellipse(cx, cy + size * 0.05, size * 1.18, size * 0.88, 0, 0, Math.PI * 2);
        } else if (bodyShape === 'angular') {
            const pts = 8;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i / pts) - Math.PI / 8;
                const r = size * (i % 2 === 0 ? 1.0 : 0.82);
                const px2 = cx + Math.cos(a) * r;
                const py2 = cy + Math.sin(a) * r * 0.92;
                if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
            }
            ctx.closePath();
        } else if (bodyShape === 'tall') {
            ctx.ellipse(cx, cy - size * 0.06, size * 0.86, size * 1.08, 0, 0, Math.PI * 2);
        } else if (bodyShape === 'ghost') {
            ctx.arc(cx, cy - size * 0.1, size * 0.95, Math.PI, 0);
            ctx.lineTo(cx + size * 0.95, cy + size * 0.55);
            for (let i = 3; i >= 0; i--) {
                const wx = cx - size * 0.95 + (i + 0.5) * (size * 1.9 / 4);
                const dir = i % 2 === 0 ? 1 : -1;
                ctx.quadraticCurveTo(wx, cy + size * 0.9 + dir * size * 0.28,
                    wx - size * (1.9 / 4) * 0.5, cy + size * 0.55);
            }
            ctx.closePath();
        } else if (bodyShape === 'ethereal') {
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
        } else {
            ctx.arc(cx, cy, size, 0, Math.PI * 2); // round
        }
        ctx.fill();

        // 輪郭線
        ctx.strokeStyle = actor ? (actor.color || '#fff') : '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── 特殊エフェクト ──
        if (bodyShape === 'ghost') {
            const ghostFade = ctx.createLinearGradient(cx, cy, cx, cy + size * 0.9);
            ghostFade.addColorStop(0, 'rgba(0,0,0,0)');
            ghostFade.addColorStop(1, 'rgba(50,0,80,0.5)');
            ctx.fillStyle = ghostFade;
            ctx.beginPath();
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        if (bodyShape === 'ethereal') {
            const aColor = actor ? (actor.color || '#FFD700') : '#FFD700';
            ctx.strokeStyle = aColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.25 + Math.sin(f * 0.08) * 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 1.18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.12 + Math.sin(f * 0.05 + 1) * 0.08;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 1.36, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // ── ほっぺの赤み（中立・善寄りキャラのみ）──
        if (eyeShape !== 'hollow' && eyeShape !== 'narrow') {
            ctx.fillStyle = 'rgba(255, 140, 140, 0.30)';
            ctx.beginPath();
            ctx.ellipse(cx - size * 0.42, cy + size * 0.14, size * 0.22, size * 0.13, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + size * 0.42, cy + size * 0.14, size * 0.22, size * 0.13, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── 眉毛（stern系） ──
        if (eyeShape === 'stern') {
            ctx.strokeStyle = p.eye;
            ctx.lineWidth = size * 0.075;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.44, cy - size * 0.27);
            ctx.lineTo(cx - size * 0.14, cy - size * 0.16);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + size * 0.14, cy - size * 0.16);
            ctx.lineTo(cx + size * 0.44, cy - size * 0.27);
            ctx.stroke();
        }

        // ── 目 ──
        const eyeOffX = size * 0.28;
        const eyeOffY = size * 0.06;
        const eyeR    = size * 0.14;
        const bounce  = Math.sin(f * 0.05) * size * 0.015;

        if (eyeShape === 'hollow') {
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = p.eye;
                ctx.beginPath();
                ctx.arc(ex, cy - eyeOffY + bounce, eyeR * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.beginPath();
                ctx.arc(ex, cy - eyeOffY + bounce, eyeR * 0.68, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (eyeShape === 'narrow') {
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = p.eye;
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + bounce, eyeR * 1.25, eyeR * 0.48, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.65)';
                ctx.beginPath();
                ctx.ellipse(ex - eyeR * 0.3, cy - eyeOffY - eyeR * 0.08 + bounce, eyeR * 0.35, eyeR * 0.18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (eyeShape === 'cute') {
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + bounce, eyeR * 1.55, eyeR * 1.80, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = p.eye;
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.18 + bounce, eyeR * 1.05, eyeR * 1.28, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.beginPath();
                ctx.ellipse(ex - eyeR * 0.42, cy - eyeOffY - eyeR * 0.48 + bounce, eyeR * 0.48, eyeR * 0.48, -0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(ex + eyeR * 0.32, cy - eyeOffY + bounce, eyeR * 0.24, eyeR * 0.24, 0, 0, Math.PI * 2);
                ctx.fill();
                // まつ毛
                ctx.strokeStyle = p.eye;
                ctx.lineWidth = size * 0.038;
                ctx.lineCap = 'round';
                for (let l = -2; l <= 2; l++) {
                    const lx = ex + l * eyeR * 0.48;
                    ctx.beginPath();
                    ctx.moveTo(lx, cy - eyeOffY - eyeR * 1.72 + bounce);
                    ctx.lineTo(lx + l * eyeR * 0.18, cy - eyeOffY - eyeR * 2.22 + bounce);
                    ctx.stroke();
                }
            }
        } else if (eyeShape === 'glow') {
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + bounce, eyeR * 1.3, eyeR * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                const aColor = actor ? (actor.color || p.eye) : p.eye;
                ctx.fillStyle = aColor;
                ctx.shadowColor = aColor;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.1 + bounce, eyeR * 0.92, eyeR * 1.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.beginPath();
                ctx.ellipse(ex - eyeR * 0.3, cy - eyeOffY - eyeR * 0.32 + bounce, eyeR * 0.38, eyeR * 0.38, -0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (eyeShape === 'wide') {
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + bounce, eyeR * 1.38, eyeR * 1.62, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = p.eye;
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.1 + bounce, eyeR * 0.98, eyeR * 1.18, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.beginPath();
                ctx.ellipse(ex - eyeR * 0.3, cy - eyeOffY - eyeR * 0.3 + bounce, eyeR * 0.38, eyeR * 0.38, -0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(ex + eyeR * 0.25, cy - eyeOffY + eyeR * 0.22 + bounce, eyeR * 0.2, eyeR * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (eyeShape === 'half') {
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.55 + bounce, eyeR * 1.3, eyeR * 1.0, 0, Math.PI, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = p.eye;
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.55 + bounce, eyeR * 0.9, eyeR * 0.65, 0, Math.PI, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = p.eye;
                ctx.lineWidth = size * 0.065;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(ex - eyeR * 1.3, cy - eyeOffY + eyeR * 0.55 + bounce);
                ctx.lineTo(ex + eyeR * 1.3, cy - eyeOffY + eyeR * 0.55 + bounce);
                ctx.stroke();
            }
        } else {
            // normal
            for (const ex of [cx - eyeOffX, cx + eyeOffX]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + bounce, eyeR * 1.3, eyeR * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = p.eye;
                ctx.beginPath();
                ctx.ellipse(ex, cy - eyeOffY + eyeR * 0.1 + bounce, eyeR * 0.9, eyeR * 1.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.beginPath();
                ctx.ellipse(ex - eyeR * 0.3, cy - eyeOffY - eyeR * 0.3 + bounce, eyeR * 0.35, eyeR * 0.35, -0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath();
                ctx.ellipse(ex + eyeR * 0.25, cy - eyeOffY + eyeR * 0.2 + bounce, eyeR * 0.18, eyeR * 0.18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── 口 ──
        ctx.strokeStyle = p.eye;
        ctx.lineWidth = size * 0.062;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 0;
        if (mouthShape === 'smirk') {
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.10, cy + size * 0.28);
            ctx.quadraticCurveTo(cx + size * 0.10, cy + size * 0.22, cx + size * 0.32, cy + size * 0.16);
            ctx.stroke();
        } else if (mouthShape === 'stern') {
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.26, cy + size * 0.28);
            ctx.lineTo(cx + size * 0.26, cy + size * 0.28);
            ctx.stroke();
        } else if (mouthShape === 'grin') {
            ctx.beginPath();
            ctx.arc(cx, cy + size * 0.10, size * 0.36, 0.12, Math.PI - 0.12);
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy + size * 0.10, size * 0.26, 0.12, Math.PI - 0.12);
            ctx.fill();
        } else if (mouthShape === 'frown') {
            ctx.beginPath();
            ctx.arc(cx, cy + size * 0.58, size * 0.26, Math.PI + 0.22, Math.PI * 2 - 0.22);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy + size * 0.18, size * 0.28, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        // ── マーク ──
        this._drawPortraitMark(ctx, cx, cy, size, p, actor);
        ctx.restore();
    }

    _drawPortraitMark(ctx, cx, cy, size, portrait, actor) {
        ctx.save();
        ctx.fillStyle = portrait.accent;
        ctx.strokeStyle = portrait.eye;
        ctx.lineWidth = 1.5;
        const aColor = actor ? (actor.color || portrait.eye) : portrait.eye;
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
        case 'hood':
            // フード：ニヒルム用・頭をすっぽり覆う闇の外套
            ctx.fillStyle = 'rgba(20,0,60,0.88)';
            ctx.strokeStyle = aColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy - size * 0.08, size * 1.05, Math.PI * 1.18, Math.PI * 1.82);
            ctx.lineTo(cx + size * 0.82, cy + size * 0.18);
            ctx.quadraticCurveTo(cx, cy - size * 0.38, cx - size * 0.82, cy + size * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // フードの影
            ctx.fillStyle = 'rgba(80,40,180,0.22)';
            ctx.beginPath();
            ctx.ellipse(cx, cy - size * 0.55, size * 0.48, size * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'rays': {
            // 光芒：ルーメン用・後光のように光線が放射する
            ctx.strokeStyle = aColor;
            ctx.lineCap = 'round';
            const rayCount = 10;
            for (let r = 0; r < rayCount; r++) {
                const a = (Math.PI * 2 * r / rayCount) - Math.PI / 2;
                const alpha = 0.18 + (r % 2 === 0 ? 0.22 : 0.08);
                ctx.globalAlpha = alpha;
                ctx.lineWidth = r % 2 === 0 ? 3 : 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * size * 1.02, cy + Math.sin(a) * size * 1.02);
                ctx.lineTo(cx + Math.cos(a) * size * 1.55, cy + Math.sin(a) * size * 1.55);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // 中心の輝き
            const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
            glowGrad.addColorStop(0, 'rgba(255,255,200,0.55)');
            glowGrad.addColorStop(1, 'rgba(255,255,200,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
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
            // ★バグ修正: measureText の前にフォントを設定しないと、デフォルトフォントで
            //   幅が計算されてしまい名前タグが狭くなっていた。
            ctx.font = 'bold 13px Arial';
            const nameTagW = ctx.measureText(actor.name).width + 24;
            const nameTagX = isRight ? boxX + boxW - nameTagW - 8 : boxX + 8;
            ctx.fillStyle = actor.color || '#5BA3E6';
            if (window.Renderer && Renderer._roundRect) {
                Renderer._roundRect(ctx, nameTagX, boxY - 24, nameTagW, 24, 6);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.textAlign = isRight ? 'right' : 'left';
            ctx.fillText(actor.name, isRight ? nameTagX + nameTagW - 10 : nameTagX + 10, boxY - 6);
        }

        // ── テキスト（明るい文字色） ──
        ctx.fillStyle = '#F0F4FF';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'left';
        // ★バグ修正: isCenter（systemアクター）はアイコンを描画しないのに
        //   iconSize * 2 の左余白が取られ、テキストが大きく右寄りになっていた。
        //   center の場合は左右とも 16px のみのパディングにする。
        const textPadL = isRight  ? boxX + 16
                       : isCenter ? boxX + 16
                       :            boxX + iconSize * 2 + 12;
        const textPadR = isRight  ? boxX + boxW - iconSize * 2 - 12
                       : isCenter ? boxX + boxW - 16
                       :            boxX + boxW - 16;
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
