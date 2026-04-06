// ======================================
// GM_NARRATOR - ゲームマスターナレーター
// APIなし・ハードコード版
// ======================================

const GmNarrator = (() => {
    const EVENT_TYPES = {
        STAGE_CLEAR: 'stage_clear',
        GAME_OVER:   'game_over',
        BOSS_CLEAR:  'boss_clear',
    };

    // ── ナレーション定義 ──────────────────────────────────────────
    // ステージクリア
    const CLEAR_LINES = {
        stage1: [
            'はじまりの一戦、見事な勝利だ。砲声が大地に響き渡った。',
            '初陣を飾ったな。スライム砲車乗りとしての旅が始まった。',
            '最初の敵を退けた。これはまだ、長い物語の序章にすぎない。',
        ],
        stage2: [
            'スラおの猛攻をかわした。その機動力、恐るべきものだ。',
            '速さで挑んできた相手を、冷静に仕留めた。見事だ。',
            'スラおの挑戦、受けて立ち、そして打ち破った。',
        ],
        stage3: [
            '霧深き森の試練を乗り越えた。忍びの術も通じなかったぞ。',
            '迷いの森の罠をすべてかいくぐった。さすがの戦術眼だ。',
            '森の闇に潜む敵を見抜いた。その眼力、本物だ。',
        ],
        stage4: [
            '灼熱の砂漠でも、その砲撃は衰えなかった。熱砂を制した。',
            '砂嵐の中でも砲塔は正確だった。砂漠の覇者だ。',
            '熱波をものともせず敵を撃破。鋼の砲車に砂漠は似合う。',
        ],
        stage5: [
            '魔王の城が陥落した。その咆哮は今も城壁に刻まれている。',
            '闇の城を踏み越えた。魔王の呪いも砲弾には敵わなかった。',
            '魔王城の扉を砲撃でこじ開けた。この戦果は語り継がれるだろう。',
        ],
        stage_shakkin: [
            '借金王を撃退した。これで少し、平和が戻ることだろう。',
            '借金取りの追撃を振り切った。財布より砲弾のほうが強い。',
            '借金王・敗れたり。勝利の味は甘く、借金は消えた。',
        ],
        stage_boss: [
            'ドロドロ団の野望、ここに潰えた！仲間たちと掴んだ勝利だ。',
            '最終決戦、制覇！スラッチたちの想いが砲弾に宿った。',
            'ドロドロ団壊滅。長き戦いに、ついに幕が下りた。',
        ],
        stage_secret: [
            '謎の試練を乗り越えた。老師もその強さを認めるだろう。',
            '秘密のステージで真の力を示した。これが本当の実力だ。',
            '伝説の場所で、伝説の戦いをした。語り継がれるだろう。',
        ],
        stage8: [
            '月面基地、完全制圧！星空の下、砲声が宇宙に響いた。',
            '最終決戦、勝利！遥か月の彼方まで、その名声は轟く。',
            'すべての戦いが、ここに結実した。伝説の砲車乗り、誕生。',
        ],
        stage_ex1: [
            '異次元の扉を越えた。常識を超えた戦士だけが辿り着ける場所だ。',
            '次元の壁をぶち破った。その砲弾は時空をも貫く。',
            '異次元の試練、突破。あなたはもはや普通の砲車乗りではない。',
        ],
        stage_ex2: [
            '伝説の試練を制した。歴史にその名が刻まれる瞬間だ。',
            '伝説と呼ばれた戦いを、現実のものとした。恐ろしい強さだ。',
            '試練の頂に立った。ここまで来られる者など、ほとんどいない。',
        ],
        stage_ex3: [
            '終焉の戦場でさえも、あなたは立ち続けた。これが本物の英雄だ。',
            'すべての終わりを超えた先に、新たな始まりがある。',
            '世界の果てで戦い、そして勝った。スライム砲車伝説、完結。',
        ],
        default: [
            'よく戦った。その砲声は敵陣に轟き渡った。',
            '見事な勝利だ。次の戦場でもその力を示せ。',
            '敵を退けた。スライム砲車乗りの意地を見せてくれた。',
            '勝利を掴んだ。その戦いは長く語り継がれるだろう。',
        ],
    };

    // ゲームオーバー
    const GAMEOVER_LINES = [
        '今日の敗北は明日の糧だ。立ち上がれ、砲車乗り。',
        '敗北は終わりではない。ここから這い上がる者こそが真の英雄だ。',
        '倒れることは恥ではない。恥は立ち上がらないことだ。',
        'やられた…だが、まだ終わっていない。再び砲塔を向けろ。',
        '敵は強かった。だが次は違う。準備を整え、再戦だ。',
        '今回は惜しかった。あと少しで届いたはずだ。もう一度だ。',
        '鋼の意志で再び戦場へ。スライム砲車は負けを知らない。',
    ];

    // ボスクリア（stage_boss / stage8 共通）
    const BOSS_CLEAR_LINES = [
        '伝説の一戦がここに幕を下ろした。その名は歴史に刻まれる。',
        '最強の敵が膝を屈した。これが、真のスライム砲車乗りの力だ。',
        '長き戦いの果てに、栄光を手にした。もう誰もあなたを止められない。',
        'ボスを討ち取った！仲間たちの声援が、その砲弾に宿っていた。',
    ];

    // ── ランダム選択 ──────────────────────────────────────────────
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getNarration(eventType, context) {
        if (eventType === EVENT_TYPES.GAME_OVER) {
            return pick(GAMEOVER_LINES);
        }
        if (eventType === EVENT_TYPES.BOSS_CLEAR) {
            return pick(BOSS_CLEAR_LINES);
        }
        // STAGE_CLEAR
        const stageId = context?.stageId || 'default';
        const lines = CLEAR_LINES[stageId] || CLEAR_LINES.default;
        return pick(lines);
    }

    // ── UI ───────────────────────────────────────────────────────
    let overlayEl = null;
    let textEl    = null;
    let isShowing = false;

    function buildUI() {
        if (overlayEl) return;

        const style = document.createElement('style');
        style.textContent = `
            #gm-overlay {
                position: fixed;
                inset: 0;
                z-index: 9999;
                pointer-events: none;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding-bottom: 20px;
                font-family: 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ Pro', 'Noto Sans JP', sans-serif;
            }
            #gm-card {
                pointer-events: auto;
                background: linear-gradient(135deg, rgba(10,10,30,0.96) 0%, rgba(20,5,40,0.96) 100%);
                border: 1px solid rgba(180,120,255,0.4);
                border-radius: 16px;
                padding: 18px 22px;
                max-width: 480px;
                width: calc(100% - 40px);
                box-shadow: 0 0 32px rgba(140,60,255,0.35), inset 0 0 20px rgba(80,20,140,0.2);
                transform: translateY(120px);
                opacity: 0;
                transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease;
            }
            #gm-card.visible {
                transform: translateY(0);
                opacity: 1;
            }
            #gm-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
                font-size: 11px;
                letter-spacing: 0.12em;
                color: rgba(180,120,255,0.8);
                text-transform: uppercase;
            }
            #gm-header .dot {
                width: 6px; height: 6px;
                border-radius: 50%;
                background: #a060ff;
                box-shadow: 0 0 8px #a060ff;
                animation: gm-pulse 1.5s infinite;
            }
            @keyframes gm-pulse {
                0%,100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            #gm-text {
                font-size: 14px;
                line-height: 1.75;
                color: #e8e0f8;
                min-height: 2em;
            }
            #gm-text .cursor {
                display: inline-block;
                width: 2px; height: 1em;
                background: #c090ff;
                margin-left: 2px;
                vertical-align: text-bottom;
                animation: gm-blink 0.8s step-end infinite;
            }
            @keyframes gm-blink {
                0%,100% { opacity: 1; }
                50% { opacity: 0; }
            }
            #gm-close {
                margin-top: 12px;
                text-align: right;
                font-size: 11px;
                color: rgba(180,120,255,0.5);
                cursor: pointer;
                transition: color 0.2s;
                user-select: none;
            }
            #gm-close:hover { color: rgba(180,120,255,1); }
        `;
        if (document.head) document.head.appendChild(style);

        overlayEl = document.createElement('div');
        overlayEl.id = 'gm-overlay';
        overlayEl.innerHTML = `
            <div id="gm-card">
                <div id="gm-header">
                    <div class="dot"></div>
                    <span>ゲームマスター</span>
                </div>
                <div id="gm-text"></div>
                <div id="gm-close">タップして閉じる ✕</div>
            </div>
        `;
        if (document.body) document.body.appendChild(overlayEl);

        textEl = overlayEl.querySelector ? overlayEl.querySelector('#gm-text') : null;
        const card = overlayEl.querySelector ? overlayEl.querySelector('#gm-card') : null;
        overlayEl._card = card;
        const closeBtn = overlayEl.querySelector ? overlayEl.querySelector('#gm-close') : null;
        if (closeBtn) closeBtn.addEventListener('click', hide);
    }

    function show() {
        if (!overlayEl) buildUI();
        isShowing = true;
        overlayEl.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (overlayEl._card && overlayEl._card.classList) overlayEl._card.classList.add('visible');
        }));
    }

    function hide() {
        if (!overlayEl) return;
        isShowing = false;
        if (overlayEl._card && overlayEl._card.classList) overlayEl._card.classList.remove('visible');
        setTimeout(() => { if (!isShowing) overlayEl.style.display = 'none'; }, 500);
    }

    function typeText(fullText) {
        if (!textEl || typeof textEl.appendChild !== 'function') return;
        textEl.innerHTML = '';
        let i = 0;
        try {
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            textEl.appendChild(cursor);
            const iv = setInterval(() => {
                if (i >= fullText.length) {
                    clearInterval(iv);
                    if (cursor.remove) cursor.remove();
                    return;
                }
                if (typeof textEl.insertBefore === 'function') {
                    textEl.insertBefore(document.createTextNode(fullText[i++]), cursor);
                } else { i++; }
            }, 40);
        } catch(e) { /* DOM not available */ }
    }

    // ── 公開メソッド ──────────────────────────────────────────────
    function onGameEvent(eventType, gameState) {
        buildUI();
        show();
        const text = getNarration(eventType, gameState);
        typeText(text);
    }

    return { EVENT_TYPES, onGameEvent, hide };
})();
