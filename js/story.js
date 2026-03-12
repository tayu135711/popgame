// ======================================
// STORY - Visual Novel Style Dialogue System
// ======================================
class StoryManager {
    constructor() {
        this.active = false;
        this.sceneId = null;
        this.lineIndex = 0;
        this.charTimer = 0; // Typewriter effect
        this.textToDraw = "";
        this.waitingInput = false;
        this.callback = null;
        this._inputConsumed = false; // 入力の二重処理防止フラグ
        this._skipConsumed = false;  // スキップ入力の二重処理防止フラグ

        // Character Portraits (Colors/Shapes for now, maybe images later)
        this.actors = {
            'slime':  { name: 'スラりん',   color: '#4CAF50', align: 'left' },
            'ally':   { name: '仲間スラッチ', color: '#2196F3', align: 'right' },
            'rival':  { name: 'ドロドロ団',  color: '#F44336', align: 'right' },
            'king':   { name: '王様',        color: '#FFD700', align: 'right' },
            'devil':  { name: '真・魔王',    color: '#9C27B0', align: 'right' },
            'system': { name: '',            color: '#333',    align: 'center' }
        };

        // Story Scripts
        // ※ stages.js の dialogue（バトル直前の短い掛け合い）とは別物。
        // こちらはバトル開始前に一度だけ表示されるビジュアルノベル形式のストーリー。
        // seenStories に記録されるため2周目以降はスキップされる。
        this.scripts = {
            // ゲーム開幕：スライム王国に初めて敵が攻めてくる
            'intro': [
                { actor: 'slime', text: "ふぅ、今日もいい天気だなぁ。" },
                { actor: 'ally', text: "大変だスラりん！「ドロドロ団」の戦車部隊が村に攻めてきたぞ！" },
                { actor: 'slime', text: "なんだって！？平和なスライム王国になんてことを！" },
                { actor: 'rival', text: "ゲヘヘ！この村の資材はいただきだ！逆らう奴はぶっ飛ばす！" },
                { actor: 'ally', text: "スラりん、「スライムタンク」に乗り込んで迎撃しよう！" },
                { actor: 'system', text: "こうして、スラりんたちとドロドロ団の戦いが始まった――" }
            ],
            // stage2前：スラお（ドロドロ団の偵察隊長）との遭遇
            'stage2_pre': [
                { actor: 'rival', text: "へへっ、よく来たな！俺様はスラお、ドロドロ団偵察隊長だ！" },
                { actor: 'slime', text: "道を開けろ！ドロドロ団の野望は絶対に止める！" },
                { actor: 'rival', text: "フン、その勢い……俺のスピードについてこれたらな！" }
            ],
            // stage3前：謎の忍者戦車が森を封鎖している
            'stage3_pre': [
                { actor: 'ally', text: "この森……なんか静かすぎませんか？" },
                { actor: 'rival', text: "ニンニン！これ以上は通さん！拙者がドロドロ団の命を受け、この森を守る！" },
                { actor: 'slime', text: "ドロドロ団の手先か！退けなければ力ずくだ！" },
                { actor: 'rival', text: "フフ、面白い。拙者の忍者戦車、見くびるでないぞ！" }
            ],
            // stage4前：砂漠を越えた先に王様が現れる
            'stage4_pre': [
                { actor: 'king', text: "おおっ、スラりんよ。よくぞこの灼熱の砂漠まで来たのう。" },
                { actor: 'slime', text: "王様！なぜこんな危険な場所に！？" },
                { actor: 'king', text: "わしはただの通りすがりじゃ。ほれ、餞別じゃ。使うがよい。" },
                { actor: 'system', text: "金貨 500G を手に入れた！" },
                { actor: 'king', text: "この先のスフィンクス号は手強いぞ……気をつけるのじゃ。" }
            ],
            // stage5前：魔王の城の前で覚悟を決める
            'stage5_pre': [
                { actor: 'ally', text: "……ここが魔王の城ですか。とても嫌な気配がします。" },
                { actor: 'slime', text: "でも、ここを突破しないとドロドロ団の本拠地には辿り着けない！" },
                { actor: 'ally', text: "スラりん……みんな信じてます。一緒に行きましょう！" },
                { actor: 'system', text: "金貨 500G を手に入れた！" }
            ],
            // stage_boss前：ドロドロ団団長との決戦
            'stage_boss_pre': [
                { actor: 'rival', text: "……よくぞここまで来た。正直、驚いているよ。" },
                { actor: 'slime', text: "あんたがドロドロ団の団長か！奪った物を全部返せ！" },
                { actor: 'rival', text: "フッ……返す？ありえんな。我がドロドロ団の野望のためならば！" },
                { actor: 'rival', text: "最強の超戦車で相手をしてやろう。覚悟しろ！" }
            ],
            // stage_boss クリア後エンディング
            'ending': [
                { actor: 'rival', text: "グヌヌ……まさかここまでやられるとは……" },
                { actor: 'slime', text: "やった！ドロドロ団を倒したぞ！これで平和が戻る！" },
                { actor: 'ally', text: "さすがスラりん！みんながいてくれたおかげです！" },
                { actor: 'king', text: "見事じゃ、スラりんよ！褒美として「伝説のステージ」への地図をやろう。" },
                { actor: 'system', text: "しかし、物語はまだ終わらない……" },
                { actor: 'system', text: "〜 STAFF ROLL 〜" },
                { actor: 'system', text: "SPECIAL THANKS: You, the Player!" },
                { actor: 'system', text: "〜 THE END 〜" }
            ],
            // stage8前（隠しステージ）：真の魔王が復活
            'stage8_pre': [
                { actor: 'ally', text: "スラりん……月面基地から謎の信号が！これって……" },
                { actor: 'devil', text: "……フッ。ドロドロ団を倒したからといって、終わりだと思うなよ。" },
                { actor: 'slime', text: "この声は……まさか、真の黒幕がいたのか！" },
                { actor: 'devil', text: "私が真の魔王だ。さあ、最後の戦いを始めよう……！" }
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
        this._inputConsumed = false; // 開始時にリセット
        this._skipConsumed = false;  // 開始時にリセット
    }

    next() {
        if (this.waitingInput) {
            this.lineIndex++;
            if (this.lineIndex >= this.scripts[this.sceneId].length) {
                // End of scene
                this.active = false;
                if (this.callback) this.callback();
            } else {
                // Next line
                this.charTimer = 0;
                this.textToDraw = "";
                this.waitingInput = false;
            }
        } else {
            // Instant finish text
            this.charTimer = 9999;
            const line = this.scripts[this.sceneId][this.lineIndex];
            this.textToDraw = line.text;
            this.waitingInput = true;
        }
    }

    update(input) {
        if (!this.active) return;

        // Bキー/ESCでストーリーを全スキップ
        if (input.back) {
            if (!this._skipConsumed) {
                this._skipConsumed = true;
                this.active = false;
                if (this.callback) this.callback();
                if (window.game) window.game.sound.play('select');
            }
            return;
        } else {
            this._skipConsumed = false;
        }

        if (input.action || input.confirm) {
            // Note: input.action / input.confirm are read-only getters (pressed() ベース)
            // 代わりにStoryManagerがフラグで二重呼び出しを防ぐ
            if (!this._inputConsumed) {
                this._inputConsumed = true;
                this.next();
                if (window.game) window.game.sound.play('click');
            }
        } else {
            this._inputConsumed = false;
        }

        // Typewriter effect
        if (!this.waitingInput) {
            const line = this.scripts[this.sceneId][this.lineIndex];
            const fullText = line.text;
            this.charTimer++; // Speed
            const len = Math.floor(this.charTimer / 2); // 1 char every 2 frames
            if (len >= fullText.length) { // Fixed condition
                this.textToDraw = fullText;
                this.waitingInput = true;
            } else {
                this.textToDraw = fullText.substring(0, len);
            }
        }
    }

    draw(ctx, w, h) {
        if (!this.active) return;

        // Overlay Dim
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);

        const line = this.scripts[this.sceneId][this.lineIndex];
        const info = this.actors[line.actor] || this.actors['system'];

        // Message Box（テキスト行数に応じて高さを動的計算）
        const lineHeight = 30;
        const textX = 50;
        const textMaxWidth = w - 100;
        // テキストの行数を事前計算
        const tempLines = this._countLines(ctx, this.textToDraw || '', textMaxWidth);
        const boxH = Math.max(130, 50 + tempLines * lineHeight + 20);
        const boxY = h - boxH - 20;

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        Renderer._roundRect(ctx, 20, boxY, w - 40, boxH, 10);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Name Tag
        if (info.name) {
            ctx.fillStyle = info.color;
            ctx.fillRect(40, boxY - 30, 200, 30);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(info.name, 50, boxY - 8);
        }

        // Character Portrait (Placeholder Bubble)
        if (line.actor !== 'system') {
            const px = (info.align === 'left') ? 100 : w - 100;
            const py = h - 200;

            // Draw Circle Portrait
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.arc(px, py, 60, 0, Math.PI * 2);
            ctx.fill();

            // Simple Eyes (Slime style)
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(px - 20, py - 10, 15, 0, Math.PI * 2);
            ctx.arc(px + 20, py - 10, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(px - 20, py - 10, 5, 0, Math.PI * 2);
            ctx.arc(px + 20, py - 10, 5, 0, Math.PI * 2);
            ctx.fill();

            // Simple Mouth
            ctx.beginPath();
            ctx.arc(px, py + 10, 10, 0, Math.PI, false);
            ctx.stroke();
        }

        // Text
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        this.wrapText(ctx, this.textToDraw, textX, boxY + 45, textMaxWidth, lineHeight);

        // Blinking cursor
        if (this.waitingInput && Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillStyle = '#FFF';
            ctx.font = '20px Arial';
            ctx.fillText('▼', w - 55, boxY + boxH - 14);
        }

        // スキップヒント
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('[B / ESC] スキップ', w - 25, boxY - 8);
    }

    // テキストが何行になるか数える（高さ計算用）
    _countLines(ctx, text, maxWidth) {
        if (!text) return 1;
        ctx.font = '20px Arial';
        const chars = text.split('');
        let line = '';
        let lines = 1;
        for (let n = 0; n < chars.length; n++) {
            const testLine = line + chars[n];
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                line = chars[n];
                lines++;
            } else {
                line = testLine;
            }
        }
        return lines;
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const chars = text.split(''); // Char by char for Japanese
        let line = '';
        let currentY = y;

        for (let n = 0; n < chars.length; n++) {
            const testLine = line + chars[n];
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = chars[n];
                currentY += lineHeight;
            }
            else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
}

// Make globally available
window.StoryManager = StoryManager;
