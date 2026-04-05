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
            slime: { name: 'スラりん', color: '#4CAF50', align: 'left' },
            ally: { name: 'スラッチ', color: '#2196F3', align: 'right' },
            rival: { name: 'ドロドロ王', color: '#F44336', align: 'right' },
            slaoh: { name: 'スラお', color: '#FF6B35', align: 'right' },
            ninja: { name: 'カゲマル', color: '#555', align: 'right' },
            king: { name: 'スライム王', color: '#FFD700', align: 'right' },
            boss: { name: 'ドロスケ将軍', color: '#9C27B0', align: 'right' },
            devil: { name: '闇の魔王', color: '#CE0000', align: 'right' },
            system: { name: '', color: '#888', align: 'center' },
            rusty: { name: 'ラスティ', color: '#8B7355', align: 'right' },
            tempest: { name: 'テンペスト', color: '#1565C0', align: 'right' },
            c2guard: { name: '鉄壁ガード', color: '#546E7A', align: 'right' },
            gear: { name: 'ギアギア将軍', color: '#37474F', align: 'right' },
            c2meadow: { name: 'メドウ', color: '#558B2F', align: 'right' },
            c2steamy: { name: 'スチーミー', color: '#CE93D8', align: 'right' },
            seraph: { name: 'セラフィム', color: '#FBCB61', align: 'right' }
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
                { actor: 'system', text: 'まばゆい雲海の向こうに、新しい道がひらけた。' },
                { actor: 'slime', text: 'ここが第3章……空気までふわふわしてる。' },
                { actor: 'ally', text: 'でも、ただきれいなだけじゃないよ。上のほう、ずっと光が見てる。' },
                { actor: 'king', text: '天の門は、力よりも心を試すと聞く。気を引きしめるのじゃ。' },
                { actor: 'slime', text: 'うん。ぼくらの旅が本物かどうか、ここで確かめられるんだね。' },
                { actor: 'ally', text: '初見でびっくりするような景色、いっぱい見せてあげるよ。いこう、スラりん。' },
                { actor: 'system', text: '第3章「天門のスカイパレード」開幕。' }
            ],
            chapter3_ending: [
                { actor: 'seraph', text: '見事です。あなたたちは傷つきながらも、最後まで願いを手放さなかった。' },
                { actor: 'slime', text: 'ぼくらだけの力じゃないよ。出会ってきたみんながいたから、ここまで来れた。' },
                { actor: 'ally', text: 'うん。だからこの景色、ちゃんと持って帰りたいんだ。' },
                { actor: 'seraph', text: 'ならば門は開かれます。この先には、さらに深い空が待っているでしょう。' },
                { actor: 'king', text: 'よくやったのう。天の試練を越えた今、おぬしたちはもう誰にも侮れぬ。' },
                { actor: 'slime', text: 'ありがとう。まだ終わりじゃないなら、次もきっと越えてみせる。' },
                { actor: 'system', text: '第3章クリア。新たな空路が静かに姿を現した。' }
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

    draw(ctx, W, H) {
        if (!this.active || !this.sceneId) return;
        const line = this.scripts[this.sceneId][this.lineIndex];
        if (!line) return;
        const actor = this.actors[line.actor] || this.actors.system;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, W, H);

        const boxX = 36;
        const boxY = H - 180;
        const boxW = W - 72;
        const boxH = 140;
        ctx.fillStyle = 'rgba(8, 12, 20, 0.92)';
        ctx.strokeStyle = actor.color || '#fff';
        ctx.lineWidth = 3;
        if (window.Renderer && Renderer._roundRect) {
            Renderer._roundRect(ctx, boxX, boxY, boxW, boxH, 12);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);
        }

        if (actor.name) {
            ctx.fillStyle = actor.color || '#fff';
            ctx.font = 'bold 22px Arial';
            ctx.fillText(actor.name, boxX + 18, boxY + 30);
        }

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        this.wrapText(ctx, this.textToDraw, boxX + 18, boxY + 62, boxW - 36, 28);

        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'right';
        ctx.fillText(this.waitingInput ? 'Z / TAP: つぎへ    B: スキップ' : 'Z / TAP: 早送り', boxX + boxW - 18, boxY + boxH - 16);
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
