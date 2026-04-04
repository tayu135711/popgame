// ======================================
// STORY - Visual Novel Style Dialogue System
// ======================================
class StoryManager {
    constructor() {
        this.active = false;
        this.sceneId = null;
        this.lineIndex = 0;
        this.charTimer = 0;
        this.textToDraw = "";
        this.waitingInput = false;
        this.callback = null;
        this._inputConsumed = false;
        this._skipConsumed = false;

        this.actors = {
            'slime':  { name: 'スラりん',       color: '#4CAF50', align: 'left'   },
            'ally':   { name: 'スラッチ',        color: '#2196F3', align: 'right'  },
            'rival':  { name: 'ドロドロ団',      color: '#F44336', align: 'right'  },
            'slaoh':  { name: 'スラお',          color: '#FF6B35', align: 'right'  },
            'ninja':  { name: 'カゲマル',        color: '#555',    align: 'right'  },
            'king':   { name: 'スライム王',      color: '#FFD700', align: 'right'  },
            'boss':   { name: 'ドロスケ団長',    color: '#9C27B0', align: 'right'  },
            'devil':  { name: '真・魔王',        color: '#CE0000', align: 'right'  },
            'system': { name: '',               color: '#888',    align: 'center' },
            // 第2章キャラクター
            'rusty':    { name: 'ラスティ',       color: '#8B7355', align: 'right'  },
            'tempest':  { name: 'テンペスト',     color: '#1565C0', align: 'right'  },
            'c2guard':  { name: '前衛隊長',       color: '#546E7A', align: 'right'  },
            'gear':     { name: 'ギア将軍',       color: '#37474F', align: 'right'  },
            'c2meadow': { name: 'メドウ',           color: '#558B2F', align: 'right'  },
            'c2steamy': { name: 'ステーミー',        color: '#CE93D8', align: 'right'  }
        };

        this.scripts = {
            // ゲーム開幕
            'intro': [
                { actor: 'slime',  text: "ふあ〜……今日もいい天気だ。のんびりしてたら昼寝しちゃったよ。" },
                { actor: 'ally',   text: "スラりん！大変です！「ドロドロ団」の戦車部隊が村の外に！" },
                { actor: 'slime',  text: "なんだって！？平和なスライム王国になんてことを……！" },
                { actor: 'rival',  text: "ゲヘヘ！この村の資材も食料も全部いただくぞ！逆らう奴は轢き潰す！" },
                { actor: 'ally',   text: "スラりん、村の倉庫に古い「スライムタンク」があります。あれで戦えます！" },
                { actor: 'slime',  text: "わかった。やるしかない！スラッチ、一緒に来てくれるか？" },
                { actor: 'ally',   text: "もちろんです。あなたの隣で戦います——必ず、村を守りましょう！" },
                { actor: 'system', text: "こうして、臆病だったスラりんは初めて戦場へ踏み出した。" }
            ],

            // stage2前：スラおとの再会
            'stage2_pre': [
                { actor: 'slaoh',  text: "……止まれ。俺はスラお、ドロドロ団偵察隊長だ。" },
                { actor: 'slime',  text: "スラお……！？昔この村にいた、あのスラおじゃないのか！？" },
                { actor: 'slaoh',  text: "……黙れ。昔の話をするな。俺はもうここの住人じゃない。" },
                { actor: 'ally',   text: "（スラりん、気をつけて。彼の目は本気です……！）" },
                { actor: 'slaoh',  text: "俺のスピードを超えてみせろ。——行くぞ！" },
                { actor: 'slime',  text: "スラお、絶対に話を聞かせてもらうからな！！" }
            ],

            // stage3前：カゲマルの森
            'stage3_pre': [
                { actor: 'ally',   text: "この森……昼間なのに光が届かない。嫌な感じがします。" },
                { actor: 'ninja',  text: "……よく来たな。これ以上は通さん。この森はドロドロ団が封鎖した。" },
                { actor: 'slime',  text: "なんのために！？村の人はこの森を通らないと先へ進めないんだぞ！" },
                { actor: 'ninja',  text: "命令には従う。それだけだ。——拙者、カゲマル。本気でいくぞ。" },
                { actor: 'ally',   text: "スラりん……彼は戦いたくて戦っているわけじゃない気がします。" },
                { actor: 'slime',  text: "わかった。でも今は退いてもらうしかない。行くよ、スラッチ！" }
            ],

            // stage4前：砂漠で王様と出会う
            'stage4_pre': [
                { actor: 'king',   text: "おお……こんな灼熱の砂漠でスライムタンクとはのう。しかも子どもか。" },
                { actor: 'slime',  text: "スライム王様！？なぜこんな場所に！？危ないですよ！" },
                { actor: 'king',   text: "民の様子を見に来ただけじゃ。……なかなかやるな、スラりんよ。" },
                { actor: 'king',   text: "餞別じゃ。持っていくがよい。この先はスフィンクス号が待っておるぞ。" },
                { actor: 'system', text: "金貨 500G を受け取った！" },
                { actor: 'ally',   text: "ありがとうございます！必ずドロドロ団を止めてみせます！" },
                { actor: 'king',   text: "フォッフォ……その目が好きじゃ。信じておるぞ、スラりん。" }
            ],

            // stage5前：スラッチの打ち明け話
            'stage5_pre': [
                { actor: 'ally',   text: "……ここが、魔王の城。" },
                { actor: 'slime',  text: "スラッチ……顔色が悪いぞ。無理しなくていい。" },
                { actor: 'ally',   text: "いいえ。……実は、私の家族もドロドロ団に奪われた村の出身なんです。" },
                { actor: 'slime',  text: "えっ……そうだったのか。" },
                { actor: 'ally',   text: "だから、あなたと一緒に戦えることが——嬉しくて。ここで引けません。" },
                { actor: 'system', text: "金貨 500G を受け取った！" },
                { actor: 'slime',  text: "……一緒に終わらせよう。絶対に、二人で帰ってくる。" },
                { actor: 'ally',   text: "はい……！行きましょう、スラりん！" }
            ],

            // stage_boss前：団長ドロスケとの最終決戦
            'stage_boss_pre': [
                { actor: 'boss',   text: "……ほう。本当にここまで来るとは。正直、驚いたよ。" },
                { actor: 'slime',  text: "あんたがドロドロ団の団長か！奪ったものを全部返せ！村の人たちに謝れ！" },
                { actor: 'boss',   text: "返す？謝る？……フッ。俺たちには俺たちの事情がある。" },
                { actor: 'ally',   text: "どんな事情があっても、罪のない人を傷つけていい理由にはなりません！" },
                { actor: 'boss',   text: "……若いな。だがその目は嫌いじゃない。最強の超戦車で試してやろう——来い！" },
                { actor: 'slime',  text: "受けて立つ！これが、みんなの想いだ！！" }
            ],

            // stage_bossクリア後の中間エピローグ（真のエンディングはstage8クリア後）
            'stage_boss_ending': [
                { actor: 'boss',   text: "……グッ。まさか、本当にやってのけるとは……" },
                { actor: 'slime',  text: "もう終わりだ、ドロスケ！奪ったものを返して、もう悪いことはやめてくれ！" },
                { actor: 'boss',   text: "……ハッ。お前みたいな奴に負けるとはな。……わかった。降参だ。" },
                { actor: 'ally',   text: "スラりん……やりました。本当に、やりましたね……！" },
                { actor: 'slime',  text: "全部スラッチのおかげだよ。……ありがとな。" },
                { actor: 'king',   text: "見事じゃ、スラりん！お前の勇気が王国を救ったぞ！褒美として地図をやろう。" },
                { actor: 'ally',   text: "……地図？どこへ続くんでしょう？" },
                { actor: 'system', text: "しかし——物語は、まだ終わっていなかった……。" }
            ],

            // 真のエンディング（stage8クリア後）
            'ending': [
                { actor: 'slime',  text: "……終わった。本当に、終わったんだ。" },
                { actor: 'ally',   text: "スラりん……お疲れ様でした。あなたのおかげで、王国に平和が戻りました。" },
                { actor: 'king',   text: "スラりんよ、真の魔王をも退けるとは……お前は真の英雄じゃ！" },
                { actor: 'slime',  text: "ひとりじゃなかったから。みんながいたから、ここまで来れた。" },
                { actor: 'ally',   text: "……ありがとう、スラりん。これからも、一緒にいてくれますか？" },
                { actor: 'slime',  text: "当たり前じゃないか。ずっと一緒だよ。" },
                { actor: 'system', text: "〜 STAFF ROLL 〜" },
                { actor: 'system', text: "SPECIAL THANKS: You, the Player!" },
                { actor: 'system', text: "〜 TRUE END 〜" }
            ],

            // stage8前：真の黒幕
            'stage8_pre': [
                { actor: 'ally',   text: "スラりん……月面基地から謎の信号が！これって——" },
                { actor: 'devil',  text: "……よく来た、スラりん。待っていたぞ。" },
                { actor: 'slime',  text: "この声……お前がドロドロ団を操っていた黒幕か！？" },
                { actor: 'devil',  text: "「真の魔王」と呼べ。ドロスケは私の駒に過ぎない。真の戦いはここからだ。" },
                { actor: 'ally',   text: "スラりん……あの気配、段違いです。でも——" },
                { actor: 'slime',  text: "わかってる。でもここまで来たんだ。最後まで諦めない——行くぞ！！" },
                { actor: 'devil',  text: "フフ……その覚悟、見事だ。では——真の力、見せてやろう！" }
            ],

            // ============================================================
            // 第2章 オープニング（chapter2_select に初めて入ったとき）
            // ============================================================
            'chapter2_intro': [
                { actor: 'system', text: "——真の魔王を倒してから、数週間が過ぎた。" },
                { actor: 'slime',  text: "……また平和な日々が来るかと思ったのに。" },
                { actor: 'ally',   text: "スラりん、見てください！各地から「謎の機械部隊」の報告が相次いでいます。" },
                { actor: 'slime',  text: "機械部隊？ドロドロ団じゃないのか？" },
                { actor: 'ally',   text: "ええ……まったく別の組織のようです。「鉄仮面軍団」と名乗っているとか。" },
                { actor: 'king',   text: "スラりんよ、頼む。またこの王国を——いや、世界を守ってくれ。" },
                { actor: 'slime',  text: "……わかった。行くぞ、スラッチ。第2章の始まりだ！わくわく！" },
                { actor: 'ally',   text: "はい——あなたの隣で、また戦います！" },
                { actor: 'system', text: "〜 第2章「ギアギアどきどき大作戦！」〜" }
            ],

            // 第2章 ステージ1 前（廃村）
            'c2_stage1_pre': [
                { actor: 'ally',   text: "この廃村……かつては賑やかな場所だったはずなのに。" },
                { actor: 'slime',  text: "誰かいるのか？こんな錆びついた戦車まで……" },
                { actor: 'rusty',  text: "……帰れ。ここはもう終わった場所だ。お前たちが来るべき所ではない。" },
                { actor: 'slime',  text: "この廃村に何があった？教えてくれ！" },
                { actor: 'rusty',  text: "……うるさい。実力で答えを奪ってみせろ！" }
            ],

            // 第2章 ステージ2 前（草原）
            'c2_stage2_pre': [
                { actor: 'slime',  text: "わあ、草原だ！……あれ、なんかいる。" },
                { actor: 'c2meadow', text: "む、侵入者か。この草原は我々鉄仮面軍団の見張り地点だ。通すわけにはいかん。" },
                { actor: 'ally',   text: "（でも……なんか、のんびりしてますね？）" },
                { actor: 'slime',  text: "あなどってたら負けるよスラッチ！いくぞ！" }
            ],

            // 第2章 ステージ3 前（海岸）
            'c2_stage3_pre': [
                { actor: 'slime',  text: "この海岸……嵐みたいに荒れてるな。" },
                { actor: 'ally',   text: "廃村の番人が言っていた「鉄仮面軍団」——海岸封鎖もあいつらの仕業ですね。" },
                { actor: 'tempest', text: "ガハハ！邪魔をするなよ、ちびスライム！この海は俺のもんだ！" },
                { actor: 'slime',  text: "海を封鎖して村の物資を止めてるのはお前か！退けぇ！" },
                { actor: 'tempest', text: "知ったことか！来るなら来い！！" }
            ],

            // 第2章 ステージ4 前（温泉）
            'c2_stage4_pre': [
                { actor: 'ally',   text: "わあ……温泉！すごい量の湯気ですね。" },
                { actor: 'c2steamy', text: "ほほほ〜♪ここは我々の研究所ですのよ〜。魔法エネルギーを温泉から補充しておりますの。" },
                { actor: 'slime',  text: "え、研究所？鉄仮面軍団って機械じゃないの！？" },
                { actor: 'c2steamy', text: "まあ失礼ですこと！では魔法で追い返して差し上げますわ〜♪" }
            ],

            // 第2章 ステージ5 前（鉄の谷）
            'c2_stage5_pre': [
                { actor: 'slime',  text: "あいつらが「鉄仮面軍団」の本隊か。ドロドロ団とは全然違う……もっと組織的だ。" },
                { actor: 'ally',   text: "（スラりん……あの戦車、改造の痕が。誰かに無理やり……？）" },
                { actor: 'c2guard', text: "侵入者確認。排除命令が下っている。感情はない——ただ任務を遂行する。" },
                { actor: 'slime',  text: "関係ない。ここを通らせてもらうぞ！" }
            ],

            // 第2章 ボス前
            'c2_boss_pre': [
                { actor: 'gear',   text: "……よく来た、スラりん。お前の噂は聞いている。ドロドロ団を倒した英雄、か。" },
                { actor: 'slime',  text: "お前が鉄仮面軍団のトップか！なんで王国を狙う！何が目的だ！" },
                { actor: 'gear',   text: "「完璧な秩序」だ。感情に揺れる者は弱い。機械のように動く世界こそ、最強だ。" },
                { actor: 'ally',   text: "そんな世界は——誰も幸せじゃない！スラりん、行きましょう！" },
                { actor: 'gear',   text: "感傷的だな。では証明してみせろ——その「心」とやらの強さを！！" }
            ],

            // 第2章 エンディング
            // 第2章 エンディング
            'chapter2_ending': [
                { actor: 'gear',   text: "バカな……。私の完璧な戦略が……感情に負けた、だと？" },
                { actor: 'slime',  text: "強さは機械じゃない。仲間と繋がる「心」だ。わかったか！" },
                { actor: 'gear',   text: "……フッ。負けを認めよう。だが覚えておけ——この先には、私より遥かに危険な存在がいる。" },
                { actor: 'ally',   text: "……続きが、あるんですか？" },
                { actor: 'gear',   text: "「闇の評議会」……それ以上は言えない。お前たちの力を……信じるとしよう。" },
                { actor: 'slime',  text: "……「闇の評議会」。まだまだ、終わりじゃないな。" },
                { actor: 'ally',   text: "スラりん……疲れましたか？" },
                { actor: 'slime',  text: "いや。不思議と——全然疲れてない。お前がいるからかな。" },
                { actor: 'ally',   text: "……もう。 でも、ありがとう。次も、一緒に行きましょう。" },
                { actor: 'system', text: "〜 第2章「ギアギアどきどき大作戦！」 かんりょう〜♪ 〜" },
                { actor: 'system', text: "第3章へと続く……" }
            ]
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
        this.textToDraw = "";
        this.waitingInput = false;
        this.callback = callback;
        this._inputConsumed = false;
        this._skipConsumed = false;
    }

    next() {
        if (this.waitingInput) {
            this.lineIndex++;
            if (this.lineIndex >= this.scripts[this.sceneId].length) {
                this.active = false;
                // ★バグ修正: コールバックを null に退避してから呼ぶ（二重呼び出し防止）
                const cb = this.callback;
                this.callback = null;
                if (cb) cb();
            } else {
                this.charTimer = 0;
                this.textToDraw = "";
                this.waitingInput = false;
            }
        } else {
            this.charTimer = 9999;
            const line = this.scripts[this.sceneId][this.lineIndex];
            this.textToDraw = line.text;
            this.waitingInput = true;
        }
    }

    update(input) {
        if (!this.active) return;

        if (input.back) {
            if (!this._skipConsumed) {
                this._skipConsumed = true;
                this.active = false;
                // ★バグ修正: コールバックを null に退避してから呼ぶ（二重呼び出し防止）
                const cb = this.callback;
                this.callback = null;
                if (cb) cb();
                if (window.game) window.game.sound.play('select');
            }
            return;
        } else {
            this._skipConsumed = false;
        }

        if (input.action || input.confirm) {
            if (!this._inputConsumed) {
                this._inputConsumed = true;
                this.next();
                if (window.game) window.game.sound.play('click');
            }
        } else {
            this._inputConsumed = false;
        }

        if (!this.waitingInput) {
            const line = this.scripts[this.sceneId][this.lineIndex];
            const fullText = line.text;
            this.charTimer++;
            const len = Math.floor(this.charTimer / 2);
            if (len >= fullText.length) {
                this.textToDraw = fullText;
                this.waitingInput = true;
            } else {
                this.textToDraw = fullText.substring(0, len);
            }
        }
    }

    draw(ctx, w, h) {
        if (!this.active) return;

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, w, h);

        const line = this.scripts[this.sceneId][this.lineIndex];
        const info = this.actors[line.actor] || this.actors['system'];

        const lineHeight = 30;
        const textX = 55;
        const textMaxWidth = w - 110;
        const tempLines = this._countLines(ctx, this.textToDraw || '', textMaxWidth);
        const boxH = Math.max(130, 50 + tempLines * lineHeight + 24);
        const boxY = h - boxH - 20;

        // ボックス背景
        ctx.fillStyle = 'rgba(5,10,30,0.92)';
        Renderer._roundRect(ctx, 20, boxY, w - 40, boxH, 12);
        ctx.fill();
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 名前タグ
        if (info.name) {
            const nameW = info.name.length * 15 + 24;
            ctx.fillStyle = info.color;
            Renderer._roundRect(ctx, 35, boxY - 30, nameW, 30, 6);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(info.name, 47, boxY - 9);
        }

        // キャラクターポートレート
        if (line.actor !== 'system') {
            const isLeft = (info.align === 'left');
            const px = isLeft ? 85 : w - 85;
            const py = boxY - 95;

            // 後光
            // ★バグ修正: 3桁カラー(#555等)に'66'を連結すると#55566(5桁)になり無効になる
            // → 6桁に正規化してから透明度文字列を付加する
            const _normalizeHex = (hex) => {
                const h = hex.replace('#', '');
                const full = h.length === 3
                    ? h[0]+h[0]+h[1]+h[1]+h[2]+h[2]
                    : h.padEnd(6, '0').slice(0, 6);
                return '#' + full;
            };
            const _colorWithAlpha = _normalizeHex(info.color) + '66';
            const grad = ctx.createRadialGradient(px, py, 18, px, py, 68);
            grad.addColorStop(0, _colorWithAlpha);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(px, py, 68, 0, Math.PI * 2); ctx.fill();

            // 本体
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.arc(px, py, 50, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.stroke();

            // 目
            const eo = 14;
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(px - eo, py - 10, 11, 0, Math.PI * 2);
            ctx.arc(px + eo, py - 10, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(px - eo + 2, py - 9, 5, 0, Math.PI * 2);
            ctx.arc(px + eo + 2, py - 9, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(px - eo, py - 13, 2.5, 0, Math.PI * 2);
            ctx.arc(px + eo, py - 13, 2.5, 0, Math.PI * 2); ctx.fill();

            // 口
            ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py + 14, 9, 0.1, Math.PI - 0.1); ctx.stroke();
        }

        // テキスト
        ctx.fillStyle = '#F0F0F0';
        ctx.font = '19px Arial';
        ctx.textAlign = 'left';
        this.wrapText(ctx, this.textToDraw, textX, boxY + 44, textMaxWidth, lineHeight);

        // カーソル
        if (this.waitingInput && Math.floor(Date.now() / 450) % 2 === 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▼', w / 2, boxY + boxH - 12);
        }

        // スキップヒント
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('[B / ESC] スキップ', w - 25, boxY - 12);

        // 進行ドット
        const total = this.scripts[this.sceneId].length;
        const dotSp = 12;
        const dotStartX = w / 2 - (total * dotSp) / 2;
        for (let i = 0; i < total; i++) {
            ctx.fillStyle = i === this.lineIndex ? '#FFD700' : 'rgba(255,255,255,0.22)';
            ctx.beginPath();
            ctx.arc(dotStartX + i * dotSp, boxY - 12, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _countLines(ctx, text, maxWidth) {
        if (!text) return 1;
        ctx.font = '19px Arial';
        const chars = text.split('');
        let line = '';
        let lines = 1;
        for (let n = 0; n < chars.length; n++) {
            const testLine = line + chars[n];
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                line = chars[n]; lines++;
            } else { line = testLine; }
        }
        return lines;
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const chars = text.split('');
        let line = '';
        let currentY = y;
        for (let n = 0; n < chars.length; n++) {
            const testLine = line + chars[n];
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = chars[n]; currentY += lineHeight;
            } else { line = testLine; }
        }
        ctx.fillText(line, x, currentY);
    }
}

window.StoryManager = StoryManager;
