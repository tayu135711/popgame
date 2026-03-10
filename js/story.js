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
            'slime': { name: 'スラりん', color: '#4CAF50', align: 'left' },
            'ally': { name: '仲間', color: '#2196F3', align: 'right' },
            'rival': { name: 'ライバル', color: '#F44336', align: 'right' },
            'king': { name: '王様', color: '#FFD700', align: 'right' },
            'devil': { name: '魔王', color: '#9C27B0', align: 'right' },
            'system': { name: '', color: '#333', align: 'center' }
        };

        // Story Scripts
        this.scripts = {
            'intro': [
                { actor: 'slime', text: "ふぅ、今日もいい天気だなぁ。" },
                { actor: 'ally', text: "大変だスラりん！隣の国の戦車部隊が攻めてきたぞ！" },
                { actor: 'slime', text: "なんだって！？平和なスライム王国になんてことを！" },
                { actor: 'ally', text: "「スライムタンク」に乗り込んで迎撃しよう！" },
                { actor: 'system', text: "こうして、スライムたちの戦いが始まった……" }
            ],
            'stage3_pre': [
                { actor: 'rival', text: "へぇ、ここまで来るとはな。だが森の奥は通さんぞ！" },
                { actor: 'slime', text: "その赤いスカーフ……お前は「スラ吉」！？" },
                { actor: 'rival', text: "フン、俺の改造戦車のパワーを見せてやる！" }
            ],
            'stage5_pre': [
                { actor: 'king', text: "よくぞ来た勇者よ。この先は灼熱の火山じゃ。" },
                { actor: 'slime', text: "王様！なぜこんなところに？" },
                { actor: 'king', text: "わしはただの通りすがりじゃ。気にするな。ホレ、お小遣いじゃ。" },
                { actor: 'system', text: "金貨 500G を手に入れた！" }
            ],
            'stage_boss_pre': [
                { actor: 'devil', text: "クックック……よくぞここまで来たな、下等生物どもよ。" },
                { actor: 'slime', text: "貴様が黒幕か！みんなを返せ！" },
                { actor: 'devil', text: "返してほしければ、この最強戦車「デビル・タンク」を倒してみるがいい！" }
            ],
            'ending': [
                { actor: 'devil', text: "グヌヌ……まさかこの私が敗れるとは……" },
                { actor: 'slime', text: "やった！平和が戻ったぞ！" },
                { actor: 'ally', text: "さすがスラりん！僕たちの勝利だ！" },
                { actor: 'king', text: "見事じゃ！褒美として「伝説のステージ」への地図をやろう。" },
                { actor: 'system', text: "CAST: Slime, Ally, Rival, King, Devil" },
                { actor: 'system', text: "SPECIAL THANKS: You!" },
                { actor: 'system', text: "〜 THE END 〜" }
            ],
            'stage8_pre': [
                { actor: 'devil', text: "……まだ終わらんよ……！" },
                { actor: 'slime', text: "なにっ！？まだ動くのか！？" },
                { actor: 'devil', text: "真の力、見せてやる！！" }
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

        // Message Box
        const boxH = 150;
        const boxY = h - boxH - 20;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(20, boxY, w - 40, boxH);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, boxY, w - 40, boxH);

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
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        this.wrapText(ctx, this.textToDraw, 50, boxY + 50, w - 100, 35);

        // Blinking cursor
        if (this.waitingInput && Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillText('▼', w - 60, boxY + boxH - 20);
        }

        // スキップヒント（右下に小さく表示）
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('[B / ESC] スキップ', w - 25, boxY - 8);
    }

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
