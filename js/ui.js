// ======================================
// UI - HUD & Menus (Polished)
// ======================================

// HUDグラデーションキャッシュ（毎フレーム生成を回避）
let _hudGradCache = null;
let _hudGradCtx = null;
let _hudPanelCache = null; // ★追加：HUD背景キャッシュ用キャンバス

// ★パフォーマンス改善: Androidではshadowが非常に重いため完全に無効化
const _UI_IS_ANDROID = /Android/i.test(navigator.userAgent);
function _uiSetShadowBlur(ctx, val) {
    if (_UI_IS_ANDROID) { ctx.shadowBlur = 0; return; }
    ctx.shadowBlur = val;
}

const UI = {

    // =====================================================
    // ★バグ修正: ally.js と同じ2段階フォールバックで仲間アイコンを描画する共通ヘルパー
    // ninja_hanzo → drawNinjаHanzo (なければ) → drawNinja → drawSlime の順に試みる
    // =====================================================
    _uiDrawAllyIcon(ctx, cx, cy, w, h, ally, frame = 0) {
        const type = (ally && ally.type) || 'slime';
        const color = (ally && ally.color) || '#5BA3E6';
        const darkColor = (ally && ally.darkColor) || '#333';

        const _toFuncName = t => 'draw' + t.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');

        // 1段階目: 完全なtype名で検索（例: ninja_hanzo → drawNinjaHanzo）
        const fn1Name = _toFuncName(type);
        const fn1 = Renderer[fn1Name];
        if (fn1 && typeof fn1 === 'function' && fn1 !== Renderer.drawSlime) {
            // ★引数順: (ctx, x, y, w, h, color, dir, frame) - darkColorは渡さない
            fn1.call(Renderer, ctx, cx, cy, w, h, color, 1, frame);
            return;
        }

        // 2段階目: base type（_より前）でフォールバック（例: ninja_hanzo → drawNinja）
        const baseType = type.includes('_') ? type.split('_')[0] : type;
        const fn2Name = _toFuncName(baseType);
        const fn2 = Renderer[fn2Name];
        if (fn2 && typeof fn2 === 'function' && fn2 !== Renderer.drawSlime) {
            if (fn2 === Renderer.drawBoss) {
                fn2.call(Renderer, ctx, cx - w * 0.1, cy - h * 0.1, w * 1.2, h * 1.2, color);
            } else {
                // ★引数順: (ctx, x, y, w, h, color, dir, frame) - darkColorは渡さない
                fn2.call(Renderer, ctx, cx, cy, w, h, color, 1, frame);
            }
            return;
        }

        // 最終フォールバック: drawSlime（slimeTypeでスライム内分岐、darkColorは正しく渡す）
        Renderer.drawSlime(ctx, cx, cy, w, h, color, darkColor, 1, frame, 0, baseType);
    },

    // =====================================================
    // 共通ナビゲーションボタン描画ヘルパー
    // =====================================================
    drawNavBar(ctx, W, H, { showBack = true, backLabel = '< 戻る (B)', showConfirm = false, confirmLabel = '決定 (Z) >' } = {}) {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const btnH = 36;
        const margin = 12;
        const y = H - margin - btnH;
        const r = 10; // 角丸半径

        // 角丸四角形を描く汎用関数 (roundRect非対応ブラウザ対応)
        const drawRoundRect = (x, by, bw, bh) => {
            ctx.beginPath();
            ctx.moveTo(x + r, by);
            ctx.lineTo(x + bw - r, by);
            ctx.arcTo(x + bw, by, x + bw, by + bh, r);
            ctx.lineTo(x + bw, by + bh - r);
            ctx.arcTo(x + bw, by + bh, x + bw - r, by + bh, r);
            ctx.lineTo(x + r, by + bh);
            ctx.arcTo(x, by + bh, x, by + bh - r, r);
            ctx.lineTo(x, by + r);
            ctx.arcTo(x, by, x + r, by, r);
            ctx.closePath();
        };

        ctx.save();
        ctx.font = 'bold 15px Arial';

        if (showBack) {
            const bx = margin;
            const label = isTouch ? '◀ 戻る（Bボタン）' : backLabel;
            const bw = Math.max(130, ctx.measureText(label).width + 32);

            drawRoundRect(bx, y, bw, btnH);
            ctx.fillStyle = 'rgba(160, 30, 30, 0.80)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(240, 100, 100, 0.95)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            _uiSetShadowBlur(ctx, 5);
            ctx.fillText(label, bx + bw / 2, y + btnH / 2);
            ctx.shadowBlur = 0;
        }

        if (showConfirm) {
            const label = isTouch ? '決定（○ボタン）▶' : confirmLabel;
            const bw = Math.max(130, ctx.measureText(label).width + 32);
            const bx = W - margin - bw;

            drawRoundRect(bx, y, bw, btnH);
            ctx.fillStyle = 'rgba(20, 140, 50, 0.80)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(80, 240, 110, 0.95)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            _uiSetShadowBlur(ctx, 5);
            ctx.fillText(label, bx + bw / 2, y + btnH / 2);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    drawHUD(ctx, battle, stageData, hideEnemyHP = false) {
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
        const splitY = H * 0.5;
        const _isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const frame = _getFrameNow ? _getFrameNow() : 0;

        // ========================================================
        // === DQウォーズ風 HUDパネル ===
        // ========================================================
        ctx.save();

        const PANEL_H = 54;
        const panelY = splitY - PANEL_H / 2;

        // --- パネル背景（フラットな濃紺帯） ---
        if (_hudGradCtx !== ctx) { _hudGradCtx = ctx; _hudGradCache = null; _hudPanelCache = null; }
        if (!_hudPanelCache || _hudPanelCache.width !== W) {
            _hudPanelCache = document.createElement('canvas');
            _hudPanelCache.width = W; _hudPanelCache.height = PANEL_H + 2;
            const hctx = _hudPanelCache.getContext('2d');
            const bg = hctx.createLinearGradient(0, 0, 0, PANEL_H);
            bg.addColorStop(0,   '#1C2E6E');
            bg.addColorStop(0.5, '#162260');
            bg.addColorStop(1,   '#0E1840');
            hctx.fillStyle = bg; hctx.fillRect(0, 0, W, PANEL_H);
            // 上下ボーダー
            hctx.strokeStyle = '#FFD700'; hctx.lineWidth = 2;
            hctx.beginPath(); hctx.moveTo(0,1); hctx.lineTo(W,1); hctx.stroke();
            hctx.beginPath(); hctx.moveTo(0, PANEL_H-1); hctx.lineTo(W, PANEL_H-1); hctx.stroke();
            // 中央グロー線
            hctx.strokeStyle = 'rgba(255,255,255,0.08)'; hctx.lineWidth = 1;
            hctx.beginPath(); hctx.moveTo(0, PANEL_H/2); hctx.lineTo(W, PANEL_H/2); hctx.stroke();
        }
        ctx.drawImage(_hudPanelCache, 0, panelY);

        // --- タイマー & ステージ名（中央上） ---
        const totalSeconds = Math.floor(battle.battleTimer / 60);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        let timeText = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (stageData?.timeLimit) {
            const remaining = Math.max(0, stageData.timeLimit - totalSeconds);
            timeText = `${remaining}s`;
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#AAA';
        ctx.fillText(timeText, W / 2, panelY + 8);

        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(stageData?.name || 'はじまりの戦い', W / 2, panelY + 20);

        if (stageData?.isBossRush && stageData.bosses) {
            ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#FF9800';
            ctx.fillText(`RUSH ${(battle.currentBossIndex||0)+1}/${stageData.bosses.length}`, W/2, panelY + 31);
        }

        // ── 中央セパレータ（VS をシンプルなバッジで）──
        const vsR = 14;
        ctx.fillStyle = '#1C2E6E';
        ctx.beginPath(); ctx.arc(W/2, splitY, vsR, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#FFF';
        ctx.fillText('VS', W/2, splitY);

        // ── HP ボックス描画ヘルパー（DQウォーズ風）──
        const drawDQHP = (hp, max, isPlayer) => {
            if (!max || max <= 0) return;
            const ratio = Math.max(0, Math.min(1, hp / max));
            const isLow  = ratio <= 0.3;
            const isDanger = ratio <= 0.15;
            const blink = isDanger ? (Math.floor(frame/8) % 2 === 0) : true;

            // 数字ボックス（左端 or 右端）
            const boxW = 52, boxH = 34;
            const boxX = isPlayer ? 4 : W - 4 - boxW;
            const boxY = panelY + (PANEL_H - boxH) / 2;

            // 枠
            ctx.fillStyle = isDanger ? '#3A0000' : '#0A1230';
            Renderer._roundRect(ctx, boxX, boxY, boxW, boxH, 5); ctx.fill();
            ctx.strokeStyle = isDanger && blink ? '#FF3333' : isLow ? '#FF8800' : '#4466CC';
            ctx.lineWidth = 2; ctx.stroke();

            // ラベル（じぶん / あいて）
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = isPlayer ? 'left' : 'right';
            ctx.fillStyle = '#88AADD';
            ctx.fillText(isPlayer ? 'じぶん' : 'あいて', isPlayer ? boxX+4 : boxX+boxW-4, boxY+9);

            // HP数字（大きく）
            const numStr = `${Math.ceil(hp)}`;
            ctx.font = `bold 20px monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = isDanger && blink ? '#FF4444' : isLow ? '#FF9900' : '#FFFFFF';
            ctx.fillText(numStr, boxX + boxW/2, boxY + boxH - 8);

            // HPバー（数字ボックスの外側に伸びる）
            const barX = isPlayer ? boxX + boxW + 4 : W/2 + vsR + 6;
            const barEndX = isPlayer ? W/2 - vsR - 6 : boxX - 4;
            const barW2 = Math.abs(barEndX - barX);
            const barH2 = 14;
            const barY = panelY + (PANEL_H - barH2) / 2;

            // バー背景
            ctx.fillStyle = '#0A1230';
            Renderer._roundRect(ctx, barX, barY, barW2, barH2, 4); ctx.fill();
            ctx.strokeStyle = '#334488'; ctx.lineWidth = 1; ctx.stroke();

            // バー本体
            if (ratio > 0) {
                const fillW = Math.max(0, (barW2 - 2) * ratio);
                const barColor = isDanger ? (blink ? '#FF2222' : '#991111')
                               : isLow    ? '#FF6600'
                               : ratio <= 0.6 ? '#FFB300'
                               : '#3A8AFF';
                ctx.fillStyle = barColor;
                Renderer._roundRect(ctx, barX + 1, barY + 1, fillW, barH2 - 2, 3); ctx.fill();
                // ハイライト
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                Renderer._roundRect(ctx, barX + 1, barY + 1, fillW, (barH2-2)*0.45, 3); ctx.fill();
            }

            // HP残数 / 最大（バー右 or 左の下）
            ctx.font = '9px monospace';
            ctx.fillStyle = '#8899BB';
            ctx.textAlign = isPlayer ? 'right' : 'left';
            const numX = isPlayer ? barX + barW2 : barX;
            ctx.fillText(`${Math.ceil(hp)}/${max}`, numX + (isPlayer ? 0 : 0), barY + barH2 + 9);
        };

        drawDQHP(battle.playerTankHP, battle.playerTankMaxHP, true);
        if (!hideEnemyHP) drawDQHP(battle.enemyTankHP, battle.enemyTankMaxHP, false);

        // === 必殺技ゲージ（パネル下に小さく）===
        const spW = 180, spH = 6;
        const spX = W/2 - spW/2, spY = panelY + PANEL_H + 3;
        const spRatio = Math.min(1, battle.specialGauge / battle.maxSpecialGauge);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        Renderer._roundRect(ctx, spX, spY, spW, spH, 3); ctx.fill();
        if (spRatio > 0) {
            const spColor = spRatio >= 1
                ? `hsl(${(frame/5)%360},100%,55%)`
                : '#FFD700';
            ctx.fillStyle = spColor;
            Renderer._roundRect(ctx, spX+1, spY+1, (spW-2)*spRatio, spH-2, 2); ctx.fill();
        }
        if (spRatio >= 1) {
            const pulse = 0.75 + Math.sin(frame * 0.015) * 0.25;
            ctx.globalAlpha = pulse;
            ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700';
            ctx.fillText('★ Ｘで必殺技 ★', W/2, spY + spH + 13);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // === 侵入者HP表示（バトル中に侵入者が来たとき）===
        if (window.game && window.game.invader && window.game.invader.hp > 0) {
            const inv = window.game.invader;
            const iW = 200, iH = 14;
            const iX = 20, iY = H - 55;
            const iRatio = Math.max(0, inv.hp / (inv.maxHp || inv.hp));

            ctx.save();
            ctx.fillStyle = 'rgba(20,0,0,0.75)';
            Renderer._roundRect(ctx, iX - 2, iY - 16, iW + 4, iH + 20, 8);
            ctx.fill();
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            Renderer._roundRect(ctx, iX, iY, iW, iH, 5);
            ctx.fill();

            const invColor = iRatio > 0.5 ? '#FF6B6B' : (iRatio > 0.25 ? '#FF9800' : '#FF1744');
            ctx.fillStyle = invColor;
            Renderer._roundRect(ctx, iX + 1, iY + 1, Math.max(0, (iW - 2) * iRatio), iH - 2, 4);
            ctx.fill();

            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#FF4444';
            ctx.textAlign = 'left';
            ctx.fillText(`👾 侵入者！ ${inv.hp}/${inv.maxHp || inv.hp}`, iX, iY - 4);
            ctx.restore();
        }

        // === MINI-MAP (Top Right of Interior) ===
        this._drawMiniMap(ctx, W - 100, splitY + 20, 80, 60);

        // === HEART HP ROW (Bottom Left) ===
        // ★バグ修正: H-30 だと _controls のパネル(H-36〜H-6)と重なって隠れていた → H-58 に移動
        this._drawHearts(ctx, 20, H - 58, battle.playerTankHP, battle.playerTankMaxHP);

        // === タイタン＆ドラゴン 連携技ゲージ（Cボタン） ===
        // ★UI改善: 底中央→左上に移動（プレイ中の視界を邪魔しない位置）
        if (window.game && window.game.allies) {
            const g = window.game;
            const MAX_G = g.MAX_ALLY_SPECIAL_GAUGE || 3600;
            const t = _getFrameNow();
            let gaugeY = splitY + 18; // 上画面の直下から積み上げ

            // ゲージ描画ヘルパー（タイタン・ドラゴン共通）
            const drawAllyGauge = (gauge, icon, labelReady, labelCharging, colorReady, colorFill) => {
                const ratio = Math.min(1, (gauge || 0) / MAX_G);
                const isReady = ratio >= 1;
                const secsLeft = Math.ceil((MAX_G - (gauge || 0)) / 60);
                const gaugeW = 150; // 小さめに
                const gaugeH = 10;
                const gaugeX = 10; // ★左端に配置

                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                Renderer._roundRect(ctx, gaugeX - 2, gaugeY - 2, gaugeW + 28, gaugeH + 4, 6);
                ctx.fill();

                if (ratio > 0) {
                    if (isReady) {
                        const pulse = 0.65 + Math.sin(t * 0.008) * 0.35;
                        ctx.fillStyle = `rgba(${colorReady},${pulse})`;
                    } else {
                        ctx.fillStyle = colorFill[1];
                    }
                    Renderer._roundRect(ctx, gaugeX + 1, gaugeY + 1, (gaugeW - 2) * ratio, gaugeH - 2, 4);
                    ctx.fill();
                }

                // アイコン
                ctx.font = '10px Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = isReady ? '#FFD700' : '#AAA';
                ctx.fillText(icon, gaugeX + gaugeW + 2, gaugeY + gaugeH - 1);

                // テキスト（短縮）
                ctx.font = isReady ? 'bold 9px Arial' : '9px Arial';
                ctx.textAlign = 'left';
                if (isReady) {
                    const pulse = 0.75 + Math.sin(t * 0.012) * 0.25;
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText(labelReady, gaugeX, gaugeY - 2);
                    ctx.globalAlpha = 1;
                } else {
                    ctx.fillStyle = 'rgba(200,200,200,0.8)';
                    ctx.fillText(`${labelCharging} ${secsLeft}秒`, gaugeX, gaugeY - 2);
                }
                ctx.restore();
                return gaugeH + 18;
            };

            const hasTitan = g.allies.some(a => a.type === 'titan_golem' && !a.isDead);
            if (hasTitan) {
                const offset = drawAllyGauge(
                    g.titanSpecialGauge, '🦾',
                    'いかりのじしん 発動！', 'いかりのじしんチャージ',
                    '255,180,0', ['#555', '#C0A000']
                );
                gaugeY += offset; // ★左上から下へ積み上げ
            }

            const hasDragon = g.allies.some(a => a.type === 'dragon_lord' && !a.isDead);
            if (hasDragon) {
                const offset2 = drawAllyGauge(
                    g.dragonSpecialGauge, '👑',
                    'キングブレス 発動！', 'キングブレスチャージ',
                    '255,80,0', ['#6B0000', '#CC3000']
                );
                gaugeY += offset2; // ★左上から下へ積み上げ
            }

            const hasPlatinum = g.allies.some(a => a.type === 'platinum_golem' && !a.isDead);
            if (hasPlatinum) {
                drawAllyGauge(
                    g.platinumSpecialGauge, '✨',
                    'ほしのきらめき 発動！', 'ほしのきらめきチャージ',
                    '180,220,255', ['#1a2a3a', '#4488AA']
                );
            }
        }

        // === ステータスエフェクト表示（まとめてパネル表示）===
        {
            const statuses = [];
            if (battle.shieldActive)
                statuses.push({ icon: '🛡', label: 'シールド発動中', color: '#4CAF50' });
            if (battle.woodArmorActive && battle.woodArmorHP > 0)
                statuses.push({ icon: '🪵', label: `もくのよろい: ${battle.woodArmorHP}`, color: '#A1887F' });
            if (battle.turboBoostTimer > 0)
                statuses.push({ icon: '⚙', label: `ターボ ${Math.ceil(battle.turboBoostTimer / 60)}秒`, color: '#29B6F6' });
            if (battle.windEffect > 0)
                statuses.push({ icon: '💨', label: `かぜ（敵スロー） ${Math.ceil(battle.windEffect / 60)}秒`, color: '#66BB6A' });
            if (battle.burnEffect > 0)
                statuses.push({ icon: '☀', label: `やけど ${Math.ceil(battle.burnEffect / 60)}秒`, color: '#FFA726' });
            if (battle.playerIceEffect > 0)
                statuses.push({ icon: '❄', label: `こおり ${Math.ceil(battle.playerIceEffect / 60)}秒`, color: '#4FC3F7' });

            if (statuses.length > 0) {
                const panelW = 190;
                const rowH = 20;
                const padV = 6;
                const panelH = statuses.length * rowH + padV * 2;
                const px = W / 2 - panelW / 2;
                // ★上画面に移動（HUDの下、OFFSET_Yの直上あたり）
                const py = CONFIG.TANK.OFFSET_Y - panelH - 4;

                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.62)';
                Renderer._roundRect(ctx, px, py, panelW, panelH, 8);
                ctx.fill();

                statuses.forEach((s, i) => {
                    const ty = py + padV + rowH * i + rowH * 0.72;
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = s.color;
                    ctx.fillText(`${s.icon} ${s.label}`, px + 10, ty);
                });
                ctx.restore();
            }
        }

        // Controls guide (bottom)
        this._controls(ctx, W, H);

        // Held Item Display (Bottom Center)
        if (battle.phase !== 'result') {
            this._drawHeldItemPanel(ctx, W, H);
        }

        if (battle.phase === 'enemy_disabled') {
            const pulse = 0.6 + Math.sin(_getFrameNow() * 0.005) * 0.15;
            // Move to top of screen (below HUD)
            const msgY = 110;
            ctx.fillStyle = `rgba(0,0,0,${pulse})`;
            Renderer._roundRect(ctx, W * 0.1, msgY, W * 0.8, 35, 10);
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(W * 0.1 + 2, msgY + 2, W * 0.8 - 4, 31);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('敵がひるんでいる！砲台から乗り込め！', W / 2, msgY + 23);
        }

        // === ラスボス必殺技チャージ表示 ===
        if (stageData && stageData.isBoss && battle.bossSpecialTimer > 0 && !battle.bossSpecialActive) {
            const chargeRatio = Math.min(1, battle.bossSpecialTimer / battle.bossSpecialInterval);

            // 必殺技ゲージ（敵側）
            const gaugeW = 200;
            const gaugeH = 12;
            const gaugeX = W - gaugeW - 30;
            const gaugeY = splitY + 50;

            // 背景
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            Renderer._roundRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 6);
            ctx.fill();

            // チャージ部分（点滅）
            const pulse = 0.6 + Math.sin(_getFrameNow() * 0.01) * 0.4;
            const chargeColor = chargeRatio >= 0.8 ? `rgba(255, 0, 0, ${pulse})` : 'rgba(255, 100, 0, 0.8)';
            ctx.fillStyle = chargeColor;
            Renderer._roundRect(ctx, gaugeX + 2, gaugeY + 2, (gaugeW - 4) * chargeRatio, gaugeH - 4, 4);
            ctx.fill();

            // 警告テキスト
            if (chargeRatio >= 0.8) {
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
                ctx.textAlign = 'center';
                ctx.fillText('⚠ 必殺技', W - gaugeW / 2 - 30, gaugeY - 8);
            }
        }

        // 必殺技発動中の警告
        if (battle.bossSpecialActive) {
            const pulse = 0.7 + Math.sin(_getFrameNow() * 0.01) * 0.3;
            const msgY = 110;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.5})`;
            Renderer._roundRect(ctx, W * 0.1, msgY, W * 0.8, 40, 10);
            ctx.fill();
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(W * 0.1 + 2, msgY + 2, W * 0.8 - 4, 36);

            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.textAlign = 'center';
            ctx.shadowBlur = 0;
            const specialNames = { barrage: '弾幕攻撃', laser: 'レーザー', meteor: '隕石落下', shockwave: '衝撃波' };
            const typeName = specialNames[battle.bossSpecialType] || '必殺技';
            ctx.fillText(`⚠ 敵の${typeName}発動中！`, W / 2, msgY + 27);
            ctx.shadowBlur = 0;
        }

        // === BATTLE INTERACTIVE UI ===
        // 1. Incoming Shot Indicators (on upper screen)
        if (battle.incomingShots.length > 0) {
            for (const shot of battle.incomingShots) {
                // Warning triangle at the target position
                this._drawWarning(ctx, shot.tx, shot.ty, 10 + Math.sin(_getFrameNow() * 0.02) * 5);
            }
        }

        // 2. Crosshair (if at cockpit)
        if (window.game && window.game.atCockpit) {
            this._drawCrosshair(ctx, battle.crosshairX, battle.crosshairY);
        }

        // === コンボ表示 ===
        if (window.game && window.game.comboCount >= 2) {
            const g = window.game;
            const combo = g.comboCount;
            const flash = g.comboFlashTimer > 0;
            const comboColors = ['#FFF', '#FFD700', '#FF9800', '#FF6B00', '#FF4444', '#E040FB'];
            const col = comboColors[Math.min(combo - 2, 5)];

            // === 10HIT以上: 妖怪ウォッチ風・画面中央大演出 ===
            if (combo >= 10) {
                const ft = g.comboFlashTimer; // 40→0
                const popScale = ft > 30 ? 1 + (40 - ft) / 10 * 0.6 : // ズームイン
                    ft > 10 ? 1.0 :                         // ホールド
                        1 + (10 - ft) / 10 * 0.2;              // 微拡大フェード
                const popAlpha = ft > 10 ? 1.0 : ft / 10;

                ctx.save();
                ctx.globalAlpha = popAlpha;

                // 背景フラッシュ（半透明）
                if (ft > 28) {
                    ctx.fillStyle = `rgba(255,200,0,${(ft - 28) / 12 * 0.18})`;
                    ctx.fillRect(0, 0, W, H);
                }

                // 中央ポップアップ
                const cx = W / 2;
                const cy = H * 0.38;
                ctx.translate(cx, cy);
                ctx.scale(popScale, popScale);
                ctx.translate(-cx, -cy);

                // 背景パネル（グラデ）
                const panelW = 280, panelH = 80;
                const panelX = cx - panelW / 2;
                const panelY = cy - panelH / 2;
                const panelGrd = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
                const panelCol = combo >= 20 ? '#4A0080' : combo >= 15 ? '#800000' : '#1a3a00';
                // ★バグ修正: 正規表現が rgba( の先頭文字にマッチして NaN になっていた
                // 安全なヘルパーで #rrggbb → rgba(r,g,b,a) 変換
                const _hexToRgba = (hex, a) => {
                    const h = hex.replace('#', '');
                    const r = parseInt(h.substring(0, 2), 16);
                    const g = parseInt(h.substring(2, 4), 16);
                    const b = parseInt(h.substring(4, 6), 16);
                    return `rgba(${r},${g},${b},${a})`;
                };
                panelGrd.addColorStop(0, 'rgba(0,0,0,0.8)');
                panelGrd.addColorStop(0.5, _hexToRgba(panelCol, 0.85));
                panelGrd.addColorStop(1, 'rgba(0,0,0,0.8)');
                ctx.fillStyle = panelGrd;
                Renderer._roundRect(ctx, panelX - 8, panelY - 8, panelW + 16, panelH + 16, 12);
                ctx.fill();

                // 枠線（脈動）
                ctx.strokeStyle = col;
                ctx.lineWidth = 2 + Math.sin(g.frame * 0.25) * 1;
                Renderer._roundRect(ctx, panelX - 8, panelY - 8, panelW + 16, panelH + 16, 12);
                ctx.stroke();

                // コンボ数字（巨大）
                ctx.shadowColor = col;
                ctx.shadowBlur = _isMobile ? 0 : 20;
                const fontSize = combo >= 20 ? 58 : combo >= 15 ? 54 : 50;
                ctx.font = `bold italic ${fontSize}px Arial`;
                ctx.fillStyle = col;
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                ctx.lineWidth = 6;
                ctx.strokeText(`${combo} HIT!!`, cx, cy + 8);
                ctx.fillText(`${combo} HIT!!`, cx, cy + 8);
                ctx.shadowBlur = 0;

                // サブテキスト
                const subLabel = combo >= 20 ? '🔥 ULTRA COMBO!! 🔥' :
                    combo >= 15 ? '⚡ SUPER COMBO! ⚡' : '✨ GREAT COMBO! ✨';
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fillText(subLabel, cx, cy + 32);

                ctx.restore();
            } else {
                // 通常コンボ表示（右上）
                const comboX = W * 0.72;
                const comboY = H * 0.35;
                ctx.save();
                const comboScale = flash ? 1.15 : 1.0;
                ctx.translate(comboX, comboY);
                ctx.scale(comboScale, comboScale);
                ctx.translate(-comboX, -comboY);
                ctx.shadowColor = col; ctx.shadowBlur = _isMobile ? 0 : (combo >= 5 ? 25 : 12);
                ctx.font = `bold 36px Arial`;
                ctx.fillStyle = col;
                ctx.textAlign = 'center';
                ctx.fillText(`${combo} HIT!`, comboX, comboY);
                ctx.shadowBlur = 0;
                ctx.font = '14px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText('COMBO', comboX, comboY + 22);
                ctx.restore();
            }
        }
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット

        // Repair Kits Display
        if (window.game && window.game.saveData) {
            ctx.save();
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'right';
            ctx.fillText(`修理キット: ${window.game.saveData.repairKits || 0}`, CONFIG.CANVAS_WIDTH - 10, 30);
            ctx.restore();
        }
    },

    _drawWarning(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        const alpha = 0.5 + Math.sin(_getFrameNow() * 0.01) * 0.3;
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
        ctx.fill();
        ctx.restore();
    },

    _drawCrosshair(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#0FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
        ctx.moveTo(0, -20); ctx.lineTo(0, 20);
        ctx.stroke();
        // Inner dot
        ctx.fillStyle = '#0FF';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    _drawHeldItemPanel(ctx, W, H) {
        if (!window.game || !window.game.player) return;
        const player = window.game.player;
        const item = (player.heldItems && player.heldItems.length > 0) ? player.heldItems[0] : null;

        const px = 185, py = H - 38;

        if (item) {
            const itemType = (typeof item === 'object') ? item.type : item;
            const info = CONFIG.AMMO_TYPES[itemType];
            if (info) {
                const typeColors = {
                    fire: '#FF5722', freeze: '#2196F3', thunder: '#FFD700',
                    bomb: '#FF5252', missile: '#E91E63', water_bucket: '#4FC3F7',
                    herb: '#4CAF50', bomb_big: '#FF7043',
                };
                const panelAccent = typeColors[itemType] || info.color || '#5BA3E6';
                const isSpecial = ['fire', 'freeze', 'thunder', 'missile', 'bomb_big'].includes(itemType);
                const t = _getFrameNow();

                if (isSpecial) {
                    ctx.save();
                    ctx.shadowColor = panelAccent;
                    // ★パフォーマンス修正: スマホでは shadowBlur を無効化（非常に重い処理）
                    const isTouchDev = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                    ctx.shadowBlur = (isTouchDev || _UI_IS_ANDROID) ? 0 : (10 + Math.sin(t * 0.01) * 5);
                }
                ctx.fillStyle = 'rgba(0,0,0,0.82)';
                Renderer._roundRect(ctx, px, py - 22, 185, 46, 8);
                ctx.fill();
                ctx.strokeStyle = panelAccent;
                ctx.lineWidth = isSpecial ? 2.5 : 1.5;
                ctx.stroke();
                if (isSpecial) ctx.restore();

                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = 'rgba(200,200,200,0.7)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText('持ち物', px + 8, py - 10);

                ctx.font = `${isSpecial ? 30 : 26}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(info.icon, px + 28, py + 1);

                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = panelAccent;
                ctx.textAlign = 'left';
                ctx.fillText(info.name, px + 52, py - 4);

                const effectHints = {
                    fire: '🔥 燃焼効果', freeze: '❄ 凍結効果', thunder: '⚡ 感電効果',
                    bomb: '💥 範囲爆発', missile: '🎯 追尾弾', herb: '💚 HP回復',
                    water_bucket: '💧 消火可能', bomb_big: '💣 超大爆発',
                    rock: '🪨 通常弾', ironball: '⚙ 重量弾', arrow: '🏹 高速弾', shield: '🛡 守護弾',
                };
                ctx.font = '10px Arial';
                ctx.fillStyle = '#AAA';
                ctx.fillText(effectHints[itemType] || '弾を装填可能', px + 52, py + 12);
                ctx.textBaseline = 'alphabetic';
            }
        }
        // 床の弾ヒント（手ぶらのとき）
        if (!item && window.game.ammoDropper && window.game.ammoDropper.items) {
            const floorItems = window.game.ammoDropper.items.filter(i => !i.picked);
            if (floorItems.length > 0) {
                const icons = [...new Set(floorItems.slice(0, 4).map(fi => {
                    const inf = CONFIG.AMMO_TYPES[fi.type];
                    return inf ? inf.icon : '❓';
                }))].join(' ');
                ctx.font = '11px Arial';
                ctx.fillStyle = 'rgba(200,200,200,0.55)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(`床: ${icons}`, px, H - 20);
            }
        }
    },

    _hpBar(ctx, x, y, w, h, hp, max, label, accentColor) {
        // Bar background
        ctx.fillStyle = '#111';
        Renderer._roundRect(ctx, x, y, w, h + 16, 4);
        ctx.fill();

        // Label
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = accentColor || '#CCC';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 4, y + h + 13);

        // HP bar bg
        ctx.fillStyle = '#222';
        Renderer._roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 3);
        ctx.fill();

        // HP bar fill
        const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
        const color = ratio > 0.5 ? CONFIG.COLORS.HP_GREEN : (ratio > 0.25 ? CONFIG.COLORS.HP_YELLOW : CONFIG.COLORS.HP_RED);

        // Low HP Pulse
        let pulseAlpha = 1;
        if (ratio <= 0.25) {
            pulseAlpha = 0.6 + Math.sin(_getFrameNow() * 0.015) * 0.4;
        }

        ctx.save();
        ctx.globalAlpha = pulseAlpha;

        // HPバーのグラデーションをキャッシュ（色が変わった時だけ再生成）
        const barGradKey = `hpbar_${color}_${x}_${y}_${h}`;
        const grad = _getCachedGradient ? _getCachedGradient(ctx, barGradKey, () => {
            const g = ctx.createLinearGradient(x, y, x, y + h);
            g.addColorStop(0, Renderer._lighten(color, 30));
            g.addColorStop(0.5, color);
            g.addColorStop(1, this._darken(color));
            return g;
        }) : (() => {
            const g = ctx.createLinearGradient(x, y, x, y + h);
            g.addColorStop(0, Renderer._lighten(color, 30));
            g.addColorStop(0.5, color);
            g.addColorStop(1, this._darken(color));
            return g;
        })();
        ctx.fillStyle = grad;
        Renderer._roundRect(ctx, x + 1, y + 1, (w - 2) * ratio, h - 2, 3);
        ctx.fill();
        ctx.restore();

        // Shine highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x + 2, y + 1, (w - 4) * ratio, h / 2 - 1);

        // HP text (Larger & Strokered)
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';

        const hpText = `${Math.ceil(hp)} / ${max}`;
        // Stroke
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.strokeText(hpText, x + w / 2, y + h - 4);
        // Fill
        ctx.fillStyle = '#FFF';
        ctx.fillText(hpText, x + w / 2, y + h - 4);
    },

    _controls(ctx, W, H) {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const hint = isTouch
            ? '✚移動  [Z]拾う/装填  [X]攻撃/必殺技  [C]仲間/侵攻  [B]投げる  [R]修理キット'
            : '矢印: 移動   Z: 拾う/装填   X: 攻撃/必殺技   C: 仲間/突入   B: 投げる   R: 修理キット   Space: 決定';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        Renderer._roundRect(ctx, W / 2 - 300, H - 36, 600, 30, 8);
        ctx.fill();
        ctx.font = '11px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText(hint, W / 2, H - 17);
    },

    _darken(c) {
        let r, g, b;
        if (c.startsWith('#')) {
            let hex = c.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else if (c.startsWith('rgb')) {
            const m = c.match(/\d+/g);
            if (!m) return '#000';
            r = parseInt(m[0]); g = parseInt(m[1]); b = parseInt(m[2]);
        } else {
            return '#000';
        }
        r = Math.max(0, r - 40); g = Math.max(0, g - 40); b = Math.max(0, b - 40);
        return `rgb(${r},${g},${b})`;
    },

    // ===== TITLE SCREEN =====
    drawTitle(ctx, W, H, frame) {
        // Background gradient with depth
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d1025');
        bg.addColorStop(0.3, '#1a2a5a');
        bg.addColorStop(0.6, '#2a3a6a');
        bg.addColorStop(1, '#0d1530');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Animated stars (layered depth)
        for (let layer = 0; layer < 3; layer++) {
            const count = 20 + layer * 15;
            const speed = 0.001 * (layer + 1);
            const size = 0.8 + layer * 0.5;
            ctx.fillStyle = `rgba(255,255,255,${0.3 + layer * 0.15})`;
            for (let i = 0; i < count; i++) {
                const sx = (Math.sin(i * 127.3 + layer * 50 + frame * speed) * 0.5 + 0.5) * W;
                const sy = (Math.cos(i * 89.7 + layer * 70 + frame * speed * 0.7) * 0.5 + 0.5) * H;
                const ss = size + Math.sin(i * 3.7 + frame * 0.02) * 0.5;
                ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Title glow backdrop
        const glowGrad = ctx.createRadialGradient(W / 2, H * 0.25, 10, W / 2, H * 0.25, 300);
        glowGrad.addColorStop(0, 'rgba(91,163,230,0.15)');
        glowGrad.addColorStop(1, 'rgba(91,163,230,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, W, H);

        // Title text with enhanced glow
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('\u2694 \u30B9\u30E9\u30A4\u30E0\u52C7\u8ECA\u30D0\u30C8\u30EB \u2694', W / 2, H * 0.12);
        ctx.restore();

        // Subtitle with gradient
        ctx.font = '17px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        ctx.fillText('\uFF5E \u30B9\u30E9\u30A4\u30E0\u6226\u8ECA\u968A\u306E\u5927\u5192\u967A \uFF5E', W / 2, H * 0.12 + 34);

        // React UIに移行したため、メニュー項目のCanvas描画はスキップ
        // メニュー項目 (index 6 = 設定)
        /*
        const menuItems = ['ゲーム開始', 'イベントステージ', 'デイリーミッション', '図鑑', 'アップグレード', '配合', '🎨 カスタマイズ', '⚙ 設定'];
        const menuIcons = ['🎮', '🌟', '📋', '📖', '🔧', '⚗', '🎨', '⚙'];
        const startY = H * 0.40;
        const gap = 46; // 8 items

        // ★タップ判定用ヒット領域を記録
        window._menuHitRegions = menuItems.map((item, i) => ({
            type: 'titleMenu', index: i,
            x: W * 0.1, y: startY + i * gap - 26,
            w: W * 0.8, h: 50
        }));

        menuItems.forEach((item, i) => {
            const y = startY + i * gap;
            const isSelected = (window.game && window.game.titleCursor === i);

            if (isSelected) {
                ctx.save();
                ctx.shadowBlur = 0;
                ctx.font = 'bold 30px Arial';
                ctx.fillStyle = '#FFD700';
                const pulse = 0.8 + Math.sin(frame * 0.08) * 0.2;
                ctx.globalAlpha = pulse;
                ctx.fillText('▶ ' + item + ' ◀', W / 2, y);
                ctx.restore();
            } else {
                ctx.font = '26px Arial';
                ctx.fillStyle = '#8EC9F5';
                ctx.fillText(item, W / 2, y);
            }
        });
        */

        // Controls Guide (タッチデバイスはタップ案内)
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.font = '13px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        ctx.fillText(
            isTouch
                ? 'タップ/スワイプ: 選択   ○ボタン/タップ: 決定   各画面でBボタン: 戻る'
                : '↑↓ で選択 / Space・Enter: 決定 / B: 戻る',
            W / 2, H * 0.93);

        // バージョン表記
        ctx.font = '11px Arial';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText('v1.1.0  © スライム砲車バトル', W / 2, H - 8);
    },

    // ===== STAGE SELECT =====
    drawStageSelect(ctx, W, H, selectedIdx, saveData, frame, difficultyMode = false, selectedDifficulty = 'NORMAL') {
        // Background with gradient
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d1a2a');
        bg.addColorStop(1, '#1a2a3a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Subtle grid pattern
        ctx.strokeStyle = 'rgba(91,163,230,0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < W; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        }
        for (let i = 0; i < H; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
        }

        // Show difficulty select screen instead
        if (difficultyMode) {
            this.drawDifficultySelectMode(ctx, W, H, selectedDifficulty, frame);
            return;
        }

        // Title
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 34px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('\u2694 \u30B9\u30C6\u30FC\u30B8\u9078\u629E', W / 2, 48);
        ctx.restore();

        const boxW = 240, boxH = 75, gap = 16;
        // Filter out event stages for normal stage select
        // 全メインクリア後はEXステージも追加（game.jsと同じロジック）
        const allNormalForCheck = STAGES.filter(s => !s.isEvent && !s.isExtra);
        const mainStagesForCheck = allNormalForCheck.filter(s => !s.isExtra);
        const allMainClearedUI = mainStagesForCheck.every(s => saveData.clearedStages && saveData.clearedStages.includes(s.id));
        const normalStages = allMainClearedUI
            ? [...allNormalForCheck, ...(window.STAGES_EX || [])]
            : allNormalForCheck;
        // ★バグ修正: cols / startX は実際には使われていなかったデッドコードのため削除
        //   レイアウトはループ内で直接 W/2 - boxW/2 で計算している

        // Scroll Logic
        const targetY = 80 + selectedIdx * (boxH + gap);
        const centerY = H / 2;
        let scrollY = centerY - targetY;

        // Clamp scroll
        const maxScroll = 0;
        const contentH = 80 + normalStages.length * (boxH + gap) + 400;
        const minScroll = Math.min(0, H - contentH);

        // Clamp logic
        if (scrollY > maxScroll) scrollY = maxScroll;
        if (scrollY < minScroll) scrollY = minScroll;

        // スクロールインジケーター
        if (scrollY < -10) {
            // まだ上にある
            ctx.fillStyle = '#5BA3E6';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▲', W / 2, 100);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#AAA';
            ctx.fillText('上にもっとあります', W / 2, 120);
        }

        if (scrollY > minScroll + 10) {
            // まだ下にある
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▼', W / 2, H - 250);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#AAA';
            ctx.fillText('下にもっとあります', W / 2, H - 230);
        }

        // ★タップ判定用: スクロールY と ヒット領域を記録
        window._stageSelectScrollY = scrollY;
        window._menuHitRegions = normalStages.map((s, i) => ({
            type: 'stage', index: i,
            x: W / 2 - boxW / 2, y: 80 + i * (boxH + gap),
            w: boxW, h: boxH
        }));

        for (let i = 0; i < normalStages.length; i++) {
            const stage = normalStages[i];
            // Need to adjust layout for vertical screen
            // Just list them vertically for now or 1 col
            const bx = W / 2 - boxW / 2;
            const by = 80 + i * (boxH + gap) + scrollY;

            // 画面外のボックスはスキップ（最適化）
            if (by + boxH < 0 || by > H) continue;

            const selected = i === selectedIdx;
            const cleared = (saveData.clearedStages || []).includes(stage.id);

            // Selection glow
            if (selected) {
                ctx.save();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(91,163,230,0.1)';
                Renderer._roundRect(ctx, bx - 4, by - 4, boxW + 8, boxH + 8, 12);
                ctx.fill();
                ctx.restore();
            }

            // Box background (通常ステージ or EXステージ)
            const boxGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
            const isExtraStage = stage.isExtra;

            if (selected) {
                if (isExtraStage) {
                    // EXステージは金色の輝き
                    boxGrad.addColorStop(0, 'rgba(255,215,0,0.35)');
                    boxGrad.addColorStop(1, 'rgba(255,140,0,0.25)');
                } else {
                    boxGrad.addColorStop(0, 'rgba(91,163,230,0.35)');
                    boxGrad.addColorStop(1, 'rgba(60,100,160,0.25)');
                }
            } else {
                if (isExtraStage) {
                    // EXステージは暗い金色
                    boxGrad.addColorStop(0, 'rgba(80,60,20,0.8)');
                    boxGrad.addColorStop(1, 'rgba(60,40,10,0.8)');
                } else {
                    boxGrad.addColorStop(0, 'rgba(40,50,70,0.8)');
                    boxGrad.addColorStop(1, 'rgba(25,35,50,0.8)');
                }
            }
            ctx.fillStyle = boxGrad;
            Renderer._roundRect(ctx, bx, by, boxW, boxH, 8);
            ctx.fill();

            // Border color
            if (isExtraStage) {
                ctx.strokeStyle = selected ? '#FFD700' : (cleared ? '#4CAF50' : 'rgba(255,215,0,0.3)');
            } else {
                ctx.strokeStyle = selected ? '#5BA3E6' : (cleared ? '#4CAF50' : 'rgba(100,120,160,0.3)');
            }
            ctx.lineWidth = selected ? 2.5 : 1;
            Renderer._roundRect(ctx, bx, by, boxW, boxH, 8);
            ctx.stroke();

            // Stage number badge (EXステージは特別表示)
            if (isExtraStage) {
                const badgeColor = cleared ? '#4CAF50' : (selected ? '#FFD700' : '#FFA500');
                ctx.fillStyle = badgeColor;
                ctx.beginPath(); ctx.arc(bx + 20, by + 22, 13, 0, Math.PI * 2); ctx.fill();
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.fillText('EX', bx + 20, by + 27);
            } else {
                const badgeColor = cleared ? '#4CAF50' : (selected ? '#5BA3E6' : '#555');
                ctx.fillStyle = badgeColor;
                ctx.beginPath(); ctx.arc(bx + 20, by + 22, 13, 0, Math.PI * 2); ctx.fill();
                ctx.font = 'bold 13px Arial';
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.fillText(`${i + 1}`, bx + 20, by + 27);
            }

            // Stage name (EXステージは金色)
            ctx.font = selected ? 'bold 15px Arial' : '14px Arial';
            ctx.fillStyle = isExtraStage ? (selected ? '#FFD700' : '#FFA500') : (selected ? '#FFF' : '#CCC');
            ctx.textAlign = 'left';
            ctx.fillText(stage.name, bx + 40, by + 26);

            // Description
            ctx.font = '11px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(stage.desc, bx + 40, by + 46);

            // ★ハイスコア（タイム）常時表示
            const hs = saveData.highScores && saveData.highScores[stage.id];
            if (hs) {
                // ★バグ修正: hs はフレーム数(60fps)なので秒→分に正しく変換する
                const totalSec = Math.floor(hs / 60);
                const sec = totalSec % 60;
                const min = Math.floor(totalSec / 60);
                const timeStr = `⏱ ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = cleared ? '#FFD700' : '#888';
                ctx.textAlign = 'right';
                ctx.fillText(timeStr, bx + boxW - 10, by + 46);
            }

            // Cleared badge
            if (cleared) {
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = '#4CAF50';
                ctx.textAlign = 'right';
                ctx.fillText('✅ クリア', bx + boxW - 10, by + 66);
            }
        }

        // Stage info panel
        if (selectedIdx >= 0 && selectedIdx < normalStages.length) {
            const s = normalStages[selectedIdx];
            const py = H - 230;

            // Panel with glow
            ctx.save();
            // shadowColor removed for perf
            ctx.shadowBlur = 0;
            const panelGrad = ctx.createLinearGradient(W / 2 - 250, py, W / 2 + 250, py + 160);
            panelGrad.addColorStop(0, 'rgba(20,30,50,0.9)');
            panelGrad.addColorStop(1, 'rgba(15,25,45,0.9)');
            ctx.fillStyle = panelGrad;
            Renderer._roundRect(ctx, W / 2 - 250, py, 500, 160, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(91,163,230,0.2)';
            ctx.lineWidth = 1;
            Renderer._roundRect(ctx, W / 2 - 250, py, 500, 160, 10);
            ctx.stroke();
            ctx.restore();

            // VS enemy name
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText(`⚔ VS ${s.enemyName}`, W / 2, py + 22);

            // Enemy Type Badge
            const typeText = {
                'NORMAL': '通常型',
                'HEAVY': 'ヘビー型',
                'SCOUT': 'スカウト型',
                'MAGICAL': '魔法型',
                'DEFENSE': 'ディフェンス型',
                'BOSS': 'ボス',
                'TRUE_BOSS': '真ボス'
            }[s.tankType] || '通常型';

            const typeColor = {
                'NORMAL': '#FFB74D',
                'HEAVY': '#8B4513',
                'SCOUT': '#32CD32',
                'MAGICAL': '#9C27B0',
                'DEFENSE': '#FBC02D',
                'BOSS': '#FF6B6B',
                'TRUE_BOSS': '#4A148C'
            }[s.tankType] || '#FFB74D';

            ctx.fillStyle = typeColor;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`[ ${typeText} ]`, W / 2, py + 42);

            // Stats row
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';

            // HP
            ctx.fillStyle = '#FF6B6B';
            ctx.fillText(`敵HP: ${s.enemyHP}`, W / 2 - 120, py + 65);

            // Player HP
            ctx.fillStyle = '#5BA3E6';
            ctx.fillText(`自HP: ${s.playerHP || CONFIG.TANK.DEFAULT_HP}`, W / 2, py + 65);

            // Enemy Damage
            ctx.fillStyle = '#FFA726';
            ctx.fillText(`攻撃力: ${s.enemyDamage || 8}`, W / 2 + 120, py + 65);

            // Rewards row
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`💰 ${1500 + (s.enemyHP || 100)}G`, W / 2 - 100, py + 88);

            // Recommended ammo
            ctx.fillStyle = '#4CAF50';
            const recAmmo = s.recommendedAmmo ? CONFIG.AMMO_TYPES[s.recommendedAmmo[0]] : null;
            if (recAmmo) {
                ctx.fillText(`推奨: ${recAmmo.icon} ${recAmmo.name}`, W / 2 + 40, py + 88);
            }

            // Difficulty indicator
            const diffStars = Math.ceil((s.enemyHP || 100) / 50);
            ctx.font = 'bold 13px Arial';
            ctx.fillStyle = '#FFD700';
            const starStr = '⭐'.repeat(Math.min(5, diffStars));
            ctx.fillText(starStr, W / 2 - 80, py + 115);

            ctx.fillStyle = '#AAA';
            ctx.font = '11px Arial';
            ctx.fillText(`難易度: ${diffStars}/5`, W / 2 - 20, py + 115);

            // Start prompt
            const alpha2 = 0.5 + Math.sin(frame * 0.06) * 0.5;
            ctx.globalAlpha = alpha2;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            const isTouchSS = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            ctx.fillText(
                isTouchSS
                    ? '▶ ○ボタン/タップ: バトル開始   Bボタン: 戻る'
                    : '▶ Space/Enter: バトル開始   B: 戻る',
                W / 2, py + 138);
            ctx.globalAlpha = 1;

        }

        // ナビゲーションボタン（常に表示）
        UI.drawNavBar(ctx, W, H, { showBack: true });
    },

    drawEventSelect(ctx, W, H, selectedIdx, saveData, frame) {
        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1a0a2a');
        bg.addColorStop(0.5, '#2a1544');
        bg.addColorStop(1, '#1a0a2a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Title with glow
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('⭐ イベントステージ ⭐', W / 2, 60);
        ctx.restore();

        // Subtitle
        ctx.font = '16px Arial';
        ctx.fillStyle = '#DAA520';
        ctx.textAlign = 'center';
        ctx.fillText('特別なチャレンジに挑戦！', W / 2, 95);

        // イベントステージのみを抽出
        const eventStages = STAGES.filter(s => s.isEvent);

        // Stage list
        const boxW = 500;
        const boxH = 80;
        const gap = 15;
        const startY = 140;

        // タップ判定用ヒット領域を記録
        window._menuHitRegions = eventStages.map((s, i) => ({
            type: 'stage', index: i,
            x: W / 2 - boxW / 2, y: startY + i * (boxH + gap),
            w: boxW, h: boxH
        }));

        eventStages.forEach((stage, i) => {
            const bx = W / 2 - boxW / 2;
            const by = startY + i * (boxH + gap);
            const selected = i === selectedIdx;
            const stageIndex = STAGES.findIndex(s => s.id === stage.id);
            const cleared = (saveData.clearedStages || []).includes(stage.id);

            // Selection glow
            if (selected) {
                ctx.save();
                // shadowColor removed for perf
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,215,0,0.15)';
                Renderer._roundRect(ctx, bx - 5, by - 5, boxW + 10, boxH + 10, 12);
                ctx.fill();
                ctx.restore();
            }

            // Box background - golden gradient
            const boxGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
            if (selected) {
                boxGrad.addColorStop(0, 'rgba(255,215,0,0.5)');
                boxGrad.addColorStop(1, 'rgba(218,165,32,0.4)');
            } else {
                boxGrad.addColorStop(0, 'rgba(139,115,85,0.7)');
                boxGrad.addColorStop(1, 'rgba(101,67,33,0.7)');
            }
            ctx.fillStyle = boxGrad;
            Renderer._roundRect(ctx, bx, by, boxW, boxH, 10);
            ctx.fill();

            // Border
            ctx.strokeStyle = selected ? '#FFD700' : '#DAA520';
            ctx.lineWidth = selected ? 3 : 2;
            Renderer._roundRect(ctx, bx, by, boxW, boxH, 10);
            ctx.stroke();

            // Star badge
            ctx.font = '28px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('⭐', bx + 35, by + 50);

            // Stage name
            ctx.font = selected ? 'bold 20px Arial' : 'bold 18px Arial';
            ctx.fillStyle = selected ? '#FFD700' : '#DAA520';
            ctx.textAlign = 'left';
            ctx.fillText(stage.name, bx + 70, by + 35);

            // Description
            ctx.font = '13px Arial';
            ctx.fillStyle = '#E8D4A0';
            ctx.fillText(stage.desc, bx + 70, by + 58);

            // Cleared badge
            if (cleared) {
                ctx.font = 'bold 13px Arial';
                ctx.fillStyle = '#4CAF50';
                ctx.textAlign = 'right';
                ctx.fillText('✅ クリア済み', bx + boxW - 20, by + 45);
            }
        });

        // Instructions at bottom
        const alpha = 0.5 + Math.sin(frame * 0.06) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        const isTouchEV = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.fillText(
            isTouchEV ? '▶ ○ボタン/タップ: 挑戦する   Bボタン: 戻る'
                : '▶ Space/Enter: 挑戦する   B: 戻る',
            W / 2, H - 60);
        ctx.restore();

        // ナビゲーションボタン
        UI.drawNavBar(ctx, W, H, { showBack: true });
    },

    drawDifficultySelectMode(ctx, W, H, selectedDifficulty, frame) {
        // Title
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('難易度を選択', W / 2, 100);
        ctx.restore();

        // Description
        ctx.font = '16px Arial';
        ctx.fillStyle = '#AAA';
        ctx.textAlign = 'center';
        ctx.fillText('← → で選択  Z で確定', W / 2, 150);

        // Difficulty buttons
        const difficulties = [
            { id: 'EASY', name: 'イージー', color: '#4CAF50', desc: '敵ダメージ -30%\nドロップ +20%' },
            { id: 'NORMAL', name: 'ノーマル', color: '#2196F3', desc: 'バランス型\n推奨難易度' },
            { id: 'HARD', name: 'ハード', color: '#FF5722', desc: '敵ダメージ +30%\nドロップ -15%' }
        ];

        const boxW = 120;
        const boxH = 140;
        const gap = 30;
        const startX = W / 2 - (difficulties.length * (boxW + gap) - gap) / 2;

        difficulties.forEach((diff, idx) => {
            const bx = startX + idx * (boxW + gap);
            const by = H / 2 - 100;
            const selected = selectedDifficulty === diff.id;

            // Box background
            ctx.fillStyle = selected ? diff.color : 'rgba(100, 100, 100, 0.3)';
            Renderer._roundRect(ctx, bx, by, boxW, boxH, 10);
            ctx.fill();

            // Border
            if (selected) {
                ctx.strokeStyle = diff.color;
                ctx.lineWidth = 4;
                ctx.shadowColor = diff.color;
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
                ctx.lineWidth = 2;
            }
            Renderer._roundRect(ctx, bx, by, boxW, boxH, 10);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Difficulty name
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = selected ? '#000' : '#FFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(diff.name, bx + boxW / 2, by + 10);

            // Description
            ctx.font = '11px Arial';
            ctx.fillStyle = selected ? '#000' : '#AAA';
            ctx.textAlign = 'center';
            const lines = diff.desc.split('\n');
            lines.forEach((line, lidx) => {
                ctx.fillText(line, bx + boxW / 2, by + 45 + lidx * 18);
            });

            // Pulsing glow for selected
            if (selected) {
                const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
                ctx.strokeStyle = `rgba(${diff.color === '#4CAF50' ? '76,175,80' : diff.color === '#2196F3' ? '33,150,243' : '255,87,34'}, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                Renderer._roundRect(ctx, bx - 8, by - 8, boxW + 16, boxH + 16, 12);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });

        // Instructions
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        const alpha = 0.5 + Math.sin(frame * 0.06) * 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillText('▶ Z キーで難易度を確定', W / 2, H - 80);
        ctx.globalAlpha = 1;

        // B button hint
        ctx.font = '12px Arial';
        ctx.fillStyle = '#777';
        ctx.fillText('B: 戻る', W / 2, H - 40);
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    drawResult(ctx, W, H, won, stageName, frame, timeFrames = 0, isNewRecord = false, rank = null) {
        // Dark Overlay for focus
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, W, H);

        // Gradient background (Subtle)
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        if (won) {
            bg.addColorStop(0, 'rgba(20,15,5,0.2)');
            bg.addColorStop(1, 'rgba(10,8,2,0.8)');
        } else {
            bg.addColorStop(0, 'rgba(30,0,0,0.3)');
            bg.addColorStop(1, 'rgba(10,0,0,0.9)');
        }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        if (won) {
            // ... (Victory logic preserved, just enhanced background above) ...
            // Victory particles / sparkles
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            for (let i = 0; i < 30; i++) {
                const sx = (Math.sin(i * 47.3 + frame * 0.01) * 0.5 + 0.5) * W;
                const sy = (Math.cos(i * 31.7 + frame * 0.008) * 0.5 + 0.5) * H;
                const ss = Math.abs(1 + Math.sin(i + frame * 0.03) * 1.5);
                ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.1, ss), 0, Math.PI * 2); ctx.fill();
            }

            ctx.save();
            // shadowColor removed for perf
            ctx.shadowBlur = 0;
            ctx.font = 'bold 64px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('🎉 勝利！ 🎉', W / 2, H * 0.25);
            ctx.restore();

            ctx.font = '24px Arial';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'center';
            ctx.fillText(`${stageName} クリア！`, W / 2, H * 0.35);

            // === TIME ATTACK DISPLAY ===
            // ★バグ修正: timeFrames はフレーム数(60fps)なので正しく分:秒に変換する
            const totalSec = Math.floor(timeFrames / 60);
            const minutes = Math.floor(totalSec / 60);
            const seconds = totalSec % 60;
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            ctx.font = 'bold 40px monospace';
            ctx.fillStyle = '#FFF';
            ctx.fillText(`タイム: ${timeStr}`, W / 2, H * 0.45);

            // === クリアランク表示 ===
            if (rank) {
                const rankColors = { S: '#FFD700', A: '#4FC3F7', B: '#81C784', C: '#BDBDBD' };
                const rankGlows = { S: '#FF8C00', A: '#0288D1', B: '#388E3C', C: '#757575' };
                const rCol = rankColors[rank] || '#FFF';
                const rGlow = rankGlows[rank] || '#FFF';
                const rankPulse = 0.85 + Math.sin(frame * 0.07) * 0.15;
                ctx.save();
                ctx.globalAlpha = rankPulse;
                // 背景円
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.beginPath(); ctx.arc(W * 0.82, H * 0.35, 52, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = rGlow;
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(W * 0.82, H * 0.35, 52, 0, Math.PI * 2); ctx.stroke();
                // ランク文字
                ctx.shadowColor = rGlow;
                _uiSetShadowBlur(ctx, 20);
                ctx.font = 'bold 72px Arial';
                ctx.fillStyle = rCol;
                ctx.textAlign = 'center';
                ctx.fillText(rank, W * 0.82, H * 0.35 + 26);
                ctx.shadowBlur = 0;
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#CCC';
                ctx.fillText('ランク', W * 0.82, H * 0.35 - 42);
                ctx.restore();
            }

            if (isNewRecord) {
                const blink = Math.floor(frame / 10) % 2 === 0;
                if (blink) {
                    ctx.save();
                    // shadowColor removed for perf
                    ctx.shadowBlur = 0;
                    ctx.font = 'bold 30px Arial';
                    ctx.fillStyle = '#FF55FF';
                    ctx.fillText('新記録！', W / 2, H * 0.52);
                    ctx.restore();
                }
            }

            // New Ammo Unlocked?
            const hasNewAmmo = window.game && window.game.newlyUnlocked && window.game.newlyUnlocked.length > 0;
            const hasNewAlly = window.game && window.game.newlyUnlockedAlly;
            const hasNewPart = window.game && window.game.newlyUnlockedPart;

            // ★バグ修正: 縦に積み上げてコンテンツの重なりを解消
            // 各ブロックの高さ: パーツ=90, 弾=75, 仲間=100
            const PART_H = 90, AMMO_H = 75, ALLY_H = 100;
            const totalRewardH = (hasNewPart ? PART_H : 0) + (hasNewAmmo ? AMMO_H : 0) + (hasNewAlly ? ALLY_H : 0);
            const rewardStartY = H * 0.60 - totalRewardH / 2; // 中央寄せで開始
            let rewardCursorY = rewardStartY;
            // === 新パーツ獲得表示 ===
            if (hasNewPart) {
                const part = window.game.newlyUnlockedPart;
                const partY = rewardCursorY + 30;
                const t = _getFrameNow();
                // 光るパネル
                ctx.save();
                const pulse = 0.7 + Math.sin(t * 0.015) * 0.3;
                ctx.fillStyle = `rgba(255,200,50,${pulse * 0.18})`;
                Renderer._roundRect(ctx, W * 0.1, rewardCursorY, W * 0.8, PART_H - 4, 14);
                ctx.fill();
                ctx.strokeStyle = `rgba(255,210,50,${pulse * 0.8})`;
                ctx.lineWidth = 2;
                Renderer._roundRect(ctx, W * 0.1, rewardCursorY, W * 0.8, PART_H - 4, 14);
                ctx.stroke();
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.fillText('🎉 新パーツ ゲット！', W / 2, partY - 4);
                ctx.font = '32px Arial';
                ctx.fillText(part.icon || '🔧', W / 2 - 70, partY + 38);
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#FFF';
                ctx.fillText(part.name, W / 2 + 20, partY + 30);
                const catNames = { colors: 'カラー', cannons: '砲身', armors: '装甲', effects: 'エフェクト' };
                ctx.font = '12px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.fillText(catNames[part.category] || 'パーツ', W / 2 + 20, partY + 48);
                ctx.restore();
                rewardCursorY += PART_H;
            }

            if (hasNewAmmo) {
                const ammoY = rewardCursorY + 22;
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#88FF88';
                ctx.textAlign = 'center';
                ctx.fillText('新しい弾をゲット！', W / 2, ammoY);

                let iconX = W / 2 - ((window.game.newlyUnlocked.length - 1) * 40) / 2;
                for (const ammo of window.game.newlyUnlocked.filter(a => a !== 'repair_kit')) {
                    const info = CONFIG.AMMO_TYPES[ammo];
                    if (info) {
                        ctx.font = '30px Arial';
                        ctx.fillText(info.icon, iconX, ammoY + 40);
                        ctx.font = '12px Arial';
                        ctx.fillStyle = '#FFF';
                        ctx.fillText(info.name, iconX, ammoY + 65);
                        iconX += 60;
                    }
                }
                rewardCursorY += AMMO_H; // 弾ブロック分進める
            }

            // New Repair Kit
            const hasNewRepairKit = window.game && window.game.newlyUnlocked && window.game.newlyUnlocked.includes('repair_kit');
            if (hasNewRepairKit) {
                const repairY = rewardCursorY + 22;
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.fillText('修理キットをゲット！', W / 2, repairY);
                ctx.font = '40px Arial';
                ctx.fillText('🔧', W / 2, repairY + 50);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#FFF';
                ctx.fillText('バトル中にRキーで使用', W / 2, repairY + 75);
                rewardCursorY += AMMO_H; // 同じ高さで
            }

            // New Ally Unlocked / Level Up?
            if (hasNewAlly) {
                const allyY = rewardCursorY + 22; // カーソル位置から描画
                const ally = window.game.newlyUnlockedAlly;
                const isLevelUp = ally.isLevelUp;
                // ★修正B5: 全配合産タイプを網羅
                const isFusionProduct = [
                    'slime_purple', 'slime_aqua', 'steel_ninja', 'phantom',
                    'shadow_mage', 'sage_slime', 'alchemist', 'arch_angel',
                    'fortress_golem', 'paladin', 'royal_guard', 'angel_golem',
                    'war_machine', 'wyvern_lord', 'legend_metal',
                    'platinum_slime', 'platinum_golem',
                    'titan_golem', 'dragon_lord'
                ].includes(ally.type);

                ctx.save();
                ctx.shadowColor = ally.color;
                ctx.shadowBlur = 0;

                // 配合産なら特別な演出
                if (isFusionProduct && !isLevelUp) {
                    ctx.font = 'bold 26px Arial';
                    const grad = ctx.createLinearGradient(W / 2 - 150, 0, W / 2 + 150, 0);
                    grad.addColorStop(0, '#9C27B0');
                    grad.addColorStop(0.5, '#FFD700');
                    grad.addColorStop(1, '#9C27B0');
                    ctx.fillStyle = grad;
                    ctx.fillText('⚗ 配合成功！新しい仲間が誕生！', W / 2, allyY);
                } else {
                    ctx.font = 'bold 24px Arial';
                    ctx.fillStyle = '#FFF';
                    ctx.fillText(isLevelUp ? `${ally.name} がレベルアップ！ Lv.${ally.level}` : '新しい仲間が加わった！', W / 2, allyY);
                }

                // Draw Ally Visual (Center)
                const ay = allyY + 40;
                ctx.save();
                UI._uiDrawAllyIcon(ctx, W / 2 - 25, ay, 50, 50, ally, 0);
                ctx.restore();

                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = ally.color;
                ctx.fillText(ally.name, W / 2, ay + 70);

                // 配合産なら強さアピール
                if (isFusionProduct && !isLevelUp) {
                    const rarity = CONFIG.ALLY_TYPE_RARITY[ally.type] || 6;
                    ctx.font = 'bold 14px Arial';
                    ctx.fillStyle = rarity >= 7 ? '#E040FB' : '#FF4444';
                    ctx.fillText(`★${rarity} 通常ガチャより強力！`, W / 2, ay + 92);
                }

                ctx.restore();
            }
        } else {
            // GAME OVER STYLE
            ctx.save();
            // shadowColor removed for perf
            ctx.shadowBlur = 0;
            ctx.font = 'bold 64px Arial';
            ctx.fillStyle = '#F44336';
            ctx.textAlign = 'center';
            ctx.fillText('ゲームオーバー', W / 2, H * 0.35);
            ctx.restore();

            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#CCC';
            ctx.textAlign = 'center';
            ctx.fillText('戦車大破…', W / 2, H * 0.45);

            // Sad slime
            const sadY = H * 0.55 + Math.sin(frame * 0.03) * 5;
            Renderer.drawSlime(ctx, W / 2 - 25, sadY, 50, 50, '#5BA3E6', '#3A7CC4', 1, 0);
        }

        // === バトル詳細ログ（勝敗問わず表示）===
        if (window.game && window.game.missionStats) {
            const stats = window.game.missionStats;
            const mc = window.game.maxCombo || 0;
            const logY = H * 0.785;
            const logW = W * 0.82;
            const logX = W / 2 - logW / 2;

            // 背景パネル
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            Renderer._roundRect(ctx, logX, logY - 14, logW, 64, 8);
            ctx.fill(); ctx.stroke();

            // 見出し
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('── バトルログ ──', W / 2, logY + 2);

            // 統計データ
            const items = [
                { icon: '💣', label: '砲撃数', val: stats.shotsFired || 0 },
                { icon: '💥', label: '与ダメージ', val: stats.totalDamage || 0 },
                { icon: '🛡', label: '被ダメージ', val: stats.damageTaken || 0 },
                { icon: '⚡', label: '必殺技', val: stats.specialsUsed || 0 },
                { icon: '🔥', label: 'MAXコンボ', val: `${mc} HIT` },
            ];

            const colW = logW / items.length;
            items.forEach((item, i) => {
                const ix = logX + colW * i + colW / 2;
                const iy = logY + 20;
                ctx.font = '12px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.textAlign = 'center';
                ctx.fillText(item.icon + ' ' + item.label, ix, iy);
                ctx.font = 'bold 15px Arial';
                // 特定の値で色を変える
                if (item.label === 'MAXコンボ' && mc >= 10) ctx.fillStyle = '#FFD700';
                else if (item.label === '与ダメージ') ctx.fillStyle = '#FF9800';
                else if (item.label === '被ダメージ') ctx.fillStyle = '#F44336';
                else ctx.fillStyle = '#FFF';
                ctx.fillText(String(item.val), ix, iy + 20);
            });
            ctx.restore();
        }

        // ★ もう一度 / ステージ選択 / コンティニュー ボタン
        const resultCursor = (window.game && window.game.resultCursor) || 0;
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const g_res = window.game;
        const canContinue = g_res && !won && !g_res.continueUsed &&
            (g_res.saveData && g_res.saveData.gold >= (g_res.continueCost || 300));

        if (canContinue) {
            // 敗北時コンティニューあり: 3ボタン横並び
            const btnW = 160, btnH = 48, gap = 12;
            const totalW = btnW * 3 + gap * 2;
            const startX = W / 2 - totalW / 2;
            const btnY = H * 0.845;
            const cost = g_res.continueCost || 300;
            const gold = g_res.saveData.gold || 0;

            const btns = [
                { idx: 0, label: '🔄 再挑戦', color: '#1a4a1a', border: '#4CAF50' },
                { idx: 1, label: '📋 ステージ選択', color: '#1a1a4a', border: '#5BA3E6' },
                {
                    idx: 2, label: `💰 コンティニュー(${cost}G)`, color: '#3a2a00', border: '#FFD700'
                },
            ]; // ★バグ修正: idx順を視覚位置に合わせる（0→1→2 でカーソルが左→中→右）

            window._menuHitRegions = btns.map((b, i) => ({
                type: 'resultItem', index: b.idx,
                x: startX + i * (btnW + gap), y: btnY, w: btnW, h: btnH
            }));

            btns.forEach((btn, i) => {
                const bx = startX + i * (btnW + gap);
                const sel = resultCursor === btn.idx;
                const pulse = sel ? (0.85 + Math.sin(frame * 0.1) * 0.15) : 1;
                ctx.save();
                ctx.globalAlpha = pulse;
                ctx.fillStyle = sel ? btn.color : 'rgba(0,0,0,0.5)';
                ctx.strokeStyle = sel ? btn.border : '#555';
                ctx.lineWidth = sel ? 3 : 1;
                Renderer._roundRect(ctx, bx, btnY, btnW, btnH, 10);
                ctx.fill(); ctx.stroke();

                if (btn.idx === 2) {
                    // コンティニューボタン: 2行表示
                    ctx.fillStyle = sel ? '#FFD700' : '#AA8800';
                    ctx.font = sel ? 'bold 13px Arial' : '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('💰 コンティニュー', bx + btnW / 2, btnY + 18);
                    ctx.fillStyle = sel ? '#FFF' : '#AAA';
                    ctx.font = sel ? 'bold 13px Arial' : '12px Arial';
                    ctx.fillText(`ゴールド ${cost}G 消費`, bx + btnW / 2, btnY + 36);
                    // 残高表示
                    ctx.font = '10px Arial';
                    ctx.fillStyle = gold >= cost ? 'rgba(100,255,100,0.8)' : 'rgba(255,100,100,0.8)';
                    ctx.fillText(`所持: ${gold}G`, bx + btnW / 2, btnY + 52);
                } else {
                    ctx.fillStyle = sel ? '#FFF' : '#AAA';
                    ctx.font = sel ? 'bold 14px Arial' : '13px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(btn.label, bx + btnW / 2, btnY + 28);
                }
                ctx.restore();
            });
        } else {
            // 通常: 2ボタン横並び
            const btn1X = W / 2 - 140, btn2X = W / 2 + 20;
            const btnY = H * 0.855, btnW = 120, btnH = 44;

            window._menuHitRegions = [
                { type: 'resultItem', index: 0, x: btn1X, y: btnY, w: btnW, h: btnH },
                { type: 'resultItem', index: 1, x: btn2X, y: btnY, w: btnW, h: btnH },
            ];

            [[0, btn1X, won ? '🔄 もう一度' : '🔄 再挑戦'],
            [1, btn2X, '📋 ステージ選択']].forEach(([idx, bx, label]) => {
                const sel = (resultCursor === idx);
                const pulse = sel ? (0.85 + Math.sin(frame * 0.1) * 0.15) : 1;
                ctx.save();
                ctx.globalAlpha = pulse;
                ctx.fillStyle = sel ? (idx === 0 ? '#1a4a1a' : '#1a1a4a') : 'rgba(0,0,0,0.5)';
                ctx.strokeStyle = sel ? (idx === 0 ? '#4CAF50' : '#5BA3E6') : '#555';
                ctx.lineWidth = sel ? 3 : 1;
                Renderer._roundRect(ctx, bx, btnY, btnW, btnH, 10);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = sel ? '#FFF' : '#AAA';
                ctx.font = sel ? 'bold 15px Arial' : '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(label, bx + btnW / 2, btnY + 28);
                ctx.restore();
            });
        }

        // 操作ヒント
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(
            isTouch
                ? 'タップ/▲▼: 選択   ○ボタン: 決定'
                : '◀▶ で選択   Space/Enter: 決定',
            W / 2, H * 0.955);
    },

    // ===== COUNTDOWN =====
    drawCountdown(ctx, W, H, timerFrames, stageData) {
        const seconds = Math.ceil(timerFrames / 60);
        const inSecond = timerFrames % 60; // frames remaining in current second

        // Darken overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);

        // === ラスボス専用演出 ===
        const isBossStage = stageData && stageData.isBoss;
        if (isBossStage) {
            // 背景をさらに暗く
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, W, H);

            // ボス名を上部に大きく表示
            if (timerFrames > 120) { // 最初の2秒間
                const bossAlpha = Math.min(1, (180 - timerFrames) / 60);
                ctx.save();
                ctx.globalAlpha = bossAlpha;

                // 背景グロー
                ctx.shadowColor = stageData.enemyColor || '#9C27B0';
                ctx.shadowBlur = 0;

                ctx.font = 'bold 50px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
                ctx.fillStyle = stageData.enemyColor || '#9C27B0';
                ctx.textAlign = 'center';
                ctx.fillText(stageData.enemyName || 'BOSS', W / 2, H * 0.2);

                // 警告テキスト
                ctx.font = 'bold 30px Arial';
                ctx.fillStyle = '#FF4444';
                // shadowColor removed for perf
                ctx.shadowBlur = 0;
                const warningPulse = 0.8 + Math.sin(timerFrames * 0.2) * 0.2;
                ctx.globalAlpha = bossAlpha * warningPulse;
                ctx.fillText('⚠ WARNING ⚠', W / 2, H * 0.3);

                ctx.restore();
            }

            // 稲妻エフェクトの残像（視覚的表現）
            if (timerFrames % 30 < 5) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 - (timerFrames % 30) * 0.06})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                const lx = Math.random() * W;
                ctx.moveTo(lx, 0);
                ctx.lineTo(lx + (Math.random() - 0.5) * 100, H * 0.4);
                ctx.stroke();
            }
        }

        ctx.save();
        const text = seconds > 0 ? String(seconds) : 'スタート！';

        // Scale animation: big at start of each second, shrinks
        const progress = 1 - (inSecond / 60);
        const scale = seconds > 0 ? (1.3 - progress * 0.3) : (1.5 + Math.sin(_getFrameNow() * 0.01) * 0.1);
        const alpha = seconds > 0 ? Math.min(1, (1 - progress) * 2) : 1;

        ctx.translate(W / 2, H / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // Glow
        ctx.shadowColor = seconds > 0 ? (isBossStage ? '#FF0000' : '#FFD700') : '#FF4444';
        _uiSetShadowBlur(ctx, isBossStage ? 60 : 40);
        ctx.font = seconds > 0 ? 'bold 120px Arial' : 'bold 80px Arial';
        ctx.fillStyle = seconds > 0 ? (isBossStage ? '#FF6666' : '#FFD700') : '#FF6644';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);

        ctx.restore();

        // Stage name at bottom
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = isBossStage ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(isBossStage ? '最後の戦い…' : '準備せよ…', W / 2, H * 0.75);
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    // ===== DECK EDIT =====
    drawDeckEdit(ctx, W, H, unlocked, deck, cursor, maxDeckSize = 5) {
        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('デッキへんせい', W / 2, 50);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#AAA';
        ctx.fillText(`バトルに持っていく弾を選ぼう (最大${maxDeckSize}個)`, W / 2, 80);

        // Layout: Left = Storage, Right = Deck, Center = Detail
        const leftX = W * 0.15;
        const rightX = W * 0.75;
        const startY = 150;
        const gapY = 50;

        // スクロール計算
        const maxVisibleItems = 8;
        const scrollOffset = Math.max(0, cursor - maxVisibleItems + 3);

        // ★タップ判定用ヒット領域
        let _dispIdx = 0;
        window._menuHitRegions = [];
        unlocked.forEach((ammo, i) => {
            if (i < scrollOffset || i >= scrollOffset + maxVisibleItems) return;
            window._menuHitRegions.push({
                type: 'deckItem', index: i,
                x: leftX - 100, y: startY + _dispIdx * gapY - 25,
                w: 220, h: 46
            });
            _dispIdx++;
        });

        // Draw Storage (Unlocked Ammo)
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('しょじ品', leftX, 120);

        // スクロールインジケーター
        if (scrollOffset > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = '14px Arial';
            ctx.fillText('▲ もっと上にあります', leftX, 135);
        }
        if (scrollOffset + maxVisibleItems < unlocked.length) {
            ctx.fillStyle = '#FFD700';
            ctx.font = '14px Arial';
            ctx.fillText('▼ もっと下にあります', leftX, H - 90);
        }

        let displayIndex = 0;
        unlocked.forEach((ammo, i) => {
            const info = CONFIG.AMMO_TYPES[ammo];
            if (!info) return; // Skip invalid ammo

            // スクロール範囲外のアイテムはスキップ
            if (i < scrollOffset || i >= scrollOffset + maxVisibleItems) {
                return;
            }

            const x = leftX; // Use existing leftX
            const y = startY + displayIndex * gapY; // Use displayIndex instead of i
            const isSelected = (i === cursor);
            const inDeck = deck.includes(ammo); // Changed 'type' to 'ammo'

            // Cursor highlight
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                Renderer._roundRect(ctx, x - 100, y - 25, 200, 40, 5); // Use x
                ctx.fill();
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Item drawing
            ctx.fillStyle = inDeck ? '#666' : '#FFF'; // Dim if already in deck
            ctx.font = '24px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.icon + ' ' + info.name, leftX - 80, y);

            // Status tag
            if (inDeck) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#4CAF50';
                ctx.fillText('★装備中', leftX + 50, y);
            }

            displayIndex++; // Increment display counter for next valid item
        });

        // Draw Deck (Current Loadout)
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#FF9800';
        ctx.textAlign = 'center';
        ctx.fillText(`デッキ (${deck.length}/${maxDeckSize})`, rightX, 120);

        deck.forEach((type, i) => {
            const info = CONFIG.AMMO_TYPES[type];
            if (!info) return; // Skip invalid ammo

            const y = startY + i * gapY;

            ctx.fillStyle = '#333';
            Renderer._roundRect(ctx, rightX - 80, y - 25, 160, 40, 5);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.stroke();

            ctx.fillStyle = '#FFF';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.icon + ' ' + info.name, rightX, y, 150);
        });

        // === DETAIL PANEL (Center) ===
        if (cursor < unlocked.length) {
            const selectedAmmo = unlocked[cursor];
            const info = CONFIG.AMMO_TYPES[selectedAmmo];
            if (info) this._drawAmmoDetail(ctx, W * 0.5, 250, info, selectedAmmo);
        }

        // === ナビゲーションボタン（タップ対応） ===
        const btnY = H - 100;
        const btnH = 52;
        const btnR = 10;
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        const drawBtn = (bx, bw, label, subLabel, fillColor, strokeColor) => {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(bx + btnR, btnY);
            ctx.lineTo(bx + bw - btnR, btnY);
            ctx.arcTo(bx + bw, btnY, bx + bw, btnY + btnH, btnR);
            ctx.lineTo(bx + bw, btnY + btnH - btnR);
            ctx.arcTo(bx + bw, btnY + btnH, bx + bw - btnR, btnY + btnH, btnR);
            ctx.lineTo(bx + btnR, btnY + btnH);
            ctx.arcTo(bx, btnY + btnH, bx, btnY + btnH - btnR, btnR);
            ctx.lineTo(bx, btnY + btnR);
            ctx.arcTo(bx, btnY, bx + btnR, btnY, btnR);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, bx + bw / 2, btnY + btnH / 2 - 8);
            ctx.font = '11px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.fillText(subLabel, bx + bw / 2, btnY + btnH / 2 + 12);
            ctx.restore();
        };

        const margin = 10;
        const totalW = W - margin * 2;
        const bw1 = Math.floor(totalW * 0.28);
        const bw2 = Math.floor(totalW * 0.30);
        const bw3 = totalW - bw1 - bw2 - margin * 2;
        const bx1 = margin;
        const bx2 = bx1 + bw1 + margin;
        const bx3 = bx2 + bw2 + margin;

        drawBtn(bx1, bw1, '◀ 戻る', isTouch ? 'Bボタン' : 'Bキー', 'rgba(120,30,30,0.85)', '#e57373');
        drawBtn(bx2, bw2, '⚡ 即バトル', isTouch ? 'Xボタン' : 'Xキー', 'rgba(180,90,0,0.85)', '#FFB74D');
        drawBtn(bx3, bw3, '仲間編成へ ▶', isTouch ? 'Spaceボタン' : 'Space', 'rgba(20,100,40,0.90)', '#66BB6A');

        // タップ判定をヒット領域に追加
        window._menuHitRegions = window._menuHitRegions || [];
        window._menuHitRegions.push(
            { type: 'deckBtn', action: 'back', x: bx1, y: btnY, w: bw1, h: btnH },
            { type: 'deckBtn', action: 'battle', x: bx2, y: btnY, w: bw2, h: btnH },
            { type: 'deckBtn', action: 'next', x: bx3, y: btnY, w: bw3, h: btnH }
        );

        if (!isTouch) {
            ctx.font = '13px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Z: 弾の着脱   H: ヘルプ', W / 2, H - 12);
        }
        ctx.textBaseline = 'alphabetic'; // ★バグ修正: isTouch に関わらず必ずリセット（タッチ時にmiddleが残留していた）

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'deck_edit');
        }
    },

    _drawAmmoDetail(ctx, x, y, info, ammoId) {
        const panelW = 180;
        const panelH = 280;

        // Background panel
        ctx.fillStyle = 'rgba(30, 30, 60, 0.9)';
        Renderer._roundRect(ctx, x - panelW / 2, y, panelW, panelH, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#4FC3F7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(info.name, x, y + 10);

        let yOffset = 40;
        const lineHeight = 22;

        // Draw stats
        ctx.font = '12px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'left';

        // ダメージ
        ctx.fillStyle = '#FFB74D';
        ctx.fillText('⚔️ ダメージ:', x - panelW / 2 + 10, y + yOffset);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        ctx.fillText(info.damage || 0, x + panelW / 2 - 10, y + yOffset);
        yOffset += lineHeight;

        // 重さ
        ctx.fillStyle = '#81C784';
        ctx.textAlign = 'left';
        ctx.fillText('⚖️ 重さ:', x - panelW / 2 + 10, y + yOffset);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        ctx.fillText(info.weight || '軽', x + panelW / 2 - 10, y + yOffset);
        yOffset += lineHeight;

        // 回復
        if (info.heal) {
            ctx.fillStyle = '#4CAF50';
            ctx.textAlign = 'left';
            ctx.fillText('💚 回復:', x - panelW / 2 + 10, y + yOffset);
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'right';
            ctx.fillText(info.heal, x + panelW / 2 - 10, y + yOffset);
            yOffset += lineHeight;
        }

        // 効果
        if (info.effect) {
            ctx.fillStyle = '#CE93D8';
            ctx.textAlign = 'left';
            ctx.fillText('✨ 効果:', x - panelW / 2 + 10, y + yOffset);
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'right';
            const effectName = {
                'burn': '燃焼',
                'freeze': '凍結',
                'shock': '感電',
                'wind': '風',
            }[info.effect] || info.effect;
            ctx.fillText(effectName, x + panelW / 2 - 10, y + yOffset);
            yOffset += lineHeight;
        }

        // 特殊効果
        if (info.block) {
            ctx.fillStyle = '#4FC3F7';
            ctx.textAlign = 'left';
            ctx.fillText('🛡️ ブロック', x - panelW / 2 + 10, y + yOffset);
            yOffset += lineHeight;
        }

        if (info.firefighting) {
            ctx.fillStyle = '#FF7043';
            ctx.textAlign = 'left';
            ctx.fillText('🌊 消火', x - panelW / 2 + 10, y + yOffset);
            yOffset += lineHeight;
        }

        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    // ===== ALLY EDIT =====
    drawAllyEdit(ctx, W, H, unlocked, deck, cursor, frame = 0, saveData = null) {
        // Background
        ctx.fillStyle = '#1a2a40';
        ctx.fillRect(0, 0, W, H);

        // Calculate current cost
        const getCurrentCost = () => {
            return deck.reduce((total, id) => {
                const ally = unlocked.find(a => a.id === id);
                return total + (ally ? (ally.cost || 1) : 0);
            }, 0);
        };
        const currentCost = getCurrentCost();
        const maxCost = 3; // 🔧 最大コスト3固定（アップグレード撤廃）

        // Title
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('なかまへんせい', W / 2, 50);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#AAA';
        ctx.fillText(`一緒に戦う仲間を選ぼう (コスト: 最大${maxCost})`, W / 2, 80);

        // Layout
        const leftX = W * 0.2;
        const rightX = W * 0.75;
        const startY = 150;
        const gapY = 80;
        const listH = H - 250;

        // Draw Standby List
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#4CAF50';
        ctx.textAlign = 'center';
        ctx.fillText('待機中', leftX, 120);

        // Background for list
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        Renderer._roundRect(ctx, leftX - 120, 130, 240, listH, 10);
        ctx.fill();

        // Scroll Logic
        let scrollY = 0;
        if (cursor > 3) {
            scrollY = -(cursor - 3) * gapY;
        }

        // ★タップ判定用ヒット領域
        window._allyScrollY = scrollY;
        window._menuHitRegions = unlocked.map((ally, i) => ({
            type: 'allyItem', index: i,
            x: leftX - 110, y: startY + i * gapY,  // pre-scroll
            w: 220, h: gapY - 8
        }));

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 130, W / 2, listH); // Clip left side
        ctx.clip();

        unlocked.forEach((ally, i) => {
            const x = leftX;
            const y = startY + i * gapY + scrollY; // Apply scroll

            // Optimization: Don't render if out of view
            if (y < 100 || y > H - 100) return;

            const isSelected = (i === cursor);
            const inDeck = deck.includes(ally.id);
            const allyCost = ally.cost || 1;

            // Cursor
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                Renderer._roundRect(ctx, x - 100, y - 30, 200, 60, 5);
                ctx.fill();
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw Ally Icon
            const allyColor = ally.color || '#4CAF50';
            const allyDark = ally.darkColor || '#2E7D32';
            const type = ally.type || 'slime';

            // Scale icon based on size
            const iconScale = (ally.size === 'large') ? 1.2 : 0.8;

            ctx.save();
            ctx.translate(x - 60, y - 20);
            ctx.scale(iconScale, iconScale);
            UI._uiDrawAllyIcon(ctx, 0, 0, 40, 40, ally, frame);
            ctx.restore();

            // Name
            ctx.fillStyle = inDeck ? '#666' : '#FFF';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(ally.name, leftX - 20, y - 10);

            // === マーク表示（名前の右横ではなく、名前の下の行に）===
            const fusionableTypes = new Set((window.FUSION_RECIPES || []).flatMap(r => [r.p1.type, r.p2.type]));
            const isFusionable = fusionableTypes.has(ally.type);

            // Rarity stars（名前の下の行）
            const rarityColors = ['#9E9E9E', '#9E9E9E', '#9E9E9E', '#4CAF50', '#9C27B0', '#FFD700', '#FF4444', '#000000'];
            const allyRarity = ally.rarity || 1;
            ctx.font = '11px Arial';
            ctx.fillStyle = inDeck ? '#555' : (rarityColors[allyRarity] || '#9E9E9E');
            ctx.fillText('★'.repeat(allyRarity) + '☆'.repeat(Math.max(0, 6 - allyRarity)), leftX - 20, y + 10);

            // タグ（★の右横に小さく表示、重ならないよう星幅で位置調整）
            const starW = allyRarity * 11 + (6 - allyRarity) * 10;
            const tagX = leftX - 20 + starW + 6;
            if (inDeck) {
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = '#4CAF50';
                ctx.fillText('✔参加中', tagX, y + 10);
            } else if (ally.isFusion) {
                const depth = ally.chainDepth || 1;
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = depth >= 2 ? '#FFB347' : '#7CFC00';
                ctx.fillText('⚗配合', tagX, y + 10);
            } else if (isFusionable) {
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = '#00BCD4';
                ctx.fillText('🔀', tagX, y + 10);
            }

            // Cost indicator（大型バッジ）
            if (allyCost === 2) {
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = inDeck ? '#666' : '#FFD700';
                ctx.fillText('[大]', leftX - 20 + starW + (ally.isFusion || isFusionable || inDeck ? 40 : 0) + 6, y + 10);
            }
        });
        ctx.restore(); // Restore clip!

        // Draw Active Party with Cost Display
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#FF9800';
        ctx.textAlign = 'center';
        ctx.fillText(`パーティ (コスト: ${currentCost}/${maxCost})`, rightX, 120);

        deck.forEach((id, i) => {
            const ally = unlocked.find(a => a.id === id);
            if (!ally) return;

            const y = startY + i * gapY;
            const allyCost = ally.cost || 1;

            ctx.fillStyle = '#333';
            Renderer._roundRect(ctx, rightX - 80, y - 30, 160, 60, 5);
            ctx.fill();

            // Border color for large allies
            if (allyCost === 2) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
            }
            ctx.stroke();

            // Icon
            const allyColor = ally.color || '#4CAF50';
            const allyDark = ally.darkColor || '#2E7D32';
            const iconScale = (ally.size === 'large') ? 1.3 : 1.0;

            ctx.save();
            ctx.translate(rightX - 60, y - 20);
            ctx.scale(iconScale, iconScale);

            const iconSize = 40;
            // ★バグ修正㉘: 2段階フォールバックで ninja_hanzo→drawNinja 等を正しく描画
            UI._uiDrawAllyIcon(ctx, 0, 0, iconSize, iconSize, ally, frame);
            ctx.restore();

            ctx.fillStyle = '#FFF';
            ctx.font = '15px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            let nameText = ally.name;
            if (ally.level && ally.level > 1) {
                nameText += ` Lv.${ally.level}`;
                ctx.fillStyle = '#FFD700';
            }
            ctx.fillText(nameText, rightX - 20, y - 8, W - rightX - 10);

            // Cost display
            ctx.font = '12px Arial';
            if (allyCost === 2) {
                ctx.fillStyle = '#FFD700';
                ctx.fillText('★★大型 (2)', rightX - 20, y + 8);
            } else {
                ctx.fillStyle = '#888';
                ctx.fillText('通常 (1)', rightX - 20, y + 8);
            }
        });

        // === DETAIL PANEL (Center) ===
        if (cursor < unlocked.length) {
            const selectedAlly = unlocked[cursor];
            this._drawAllyDetail(ctx, W * 0.5, 250, selectedAlly);
        }

        const isTouch2 = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        // ナビゲーションボタン（デッキ編成と同じスタイル）
        const btnY2 = H - 82;
        const btnH2 = 62;
        const drawAllyBtn = (bx, bw, label, subLabel, fillColor, strokeColor) => {
            ctx.save();
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const btnR = 10;
            ctx.moveTo(bx + btnR, btnY2);
            ctx.lineTo(bx + bw - btnR, btnY2);
            ctx.arcTo(bx + bw, btnY2, bx + bw, btnY2 + btnH2, btnR);
            ctx.lineTo(bx + bw, btnY2 + btnH2 - btnR);
            ctx.arcTo(bx + bw, btnY2 + btnH2, bx + bw - btnR, btnY2 + btnH2, btnR);
            ctx.lineTo(bx + btnR, btnY2 + btnH2);
            ctx.arcTo(bx, btnY2 + btnH2, bx, btnY2 + btnH2 - btnR, btnR);
            ctx.lineTo(bx, btnY2 + btnR);
            ctx.arcTo(bx, btnY2, bx + btnR, btnY2, btnR);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, bx + bw / 2, btnY2 + btnH2 / 2 - 8);
            ctx.font = '11px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.fillText(subLabel, bx + bw / 2, btnY2 + btnH2 / 2 + 12);
            ctx.restore();
        };

        const margin2 = 10;
        const totalW2 = W - margin2 * 2;
        const abw1 = Math.floor(totalW2 * 0.30);
        const abw2 = totalW2 - abw1 - margin2;
        const abx1 = margin2;
        const abx2 = abx1 + abw1 + margin2;

        drawAllyBtn(abx1, abw1, '◀ 戻る', isTouch2 ? 'Bボタン' : 'Bキー', 'rgba(120,30,30,0.85)', '#e57373');
        drawAllyBtn(abx2, abw2, '⚔ バトル開始！', isTouch2 ? 'Spaceボタン' : 'Space', 'rgba(20,80,160,0.90)', '#42A5F5');

        // タップ判定
        window._menuHitRegions = window._menuHitRegions || [];
        window._menuHitRegions.push(
            { type: 'allyNavBtn', action: 'back', x: abx1, y: btnY2, w: abw1, h: btnH2 },
            { type: 'allyNavBtn', action: 'battle', x: abx2, y: btnY2, w: abw2, h: btnH2 }
        );

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'ally_edit');
        }
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    _drawAllyDetail(ctx, x, y, ally) {
        const panelW = 160;
        const panelH = 260;

        // Background panel
        ctx.fillStyle = 'rgba(20, 50, 80, 0.9)';
        Renderer._roundRect(ctx, x - panelW / 2, y, panelW, panelH, 8);
        ctx.fill();

        // Border (Color-coded by rarity)
        const borderColor = {
            'master': '#FFD700',
            'boss': '#FF6B6B',
            'wizard': '#9C27B0',
            'angel': '#B2EBF2',
            'defender': '#FF7043',
            'ninja': '#424242',
            'golem': '#8B7355',
            'slime_gold': '#FFD700',
            'slime_metal': '#9E9E9E',
            'slime_red': '#F44336',
            'slime_blue': '#2196F3',
            'ghost': '#E0E0E0',
            'metalking': '#CFD8DC',
            'healer': '#81D4FA',
            'special': '#E91E63',
            'ultimate': '#FFD700',
            'titan_golem': '#212121',
            'dragon_lord': '#C62828',
            'shadow_mage': '#5E35B1',
            'sage_slime': '#448AFF',
            'fortress_golem': '#37474F',
            'paladin': '#C0CA33',
            'war_machine': '#424242',
            'phantom': '#4A148C',
            'alchemist': '#FF8F00',
            'steel_ninja': '#90A4AE',
            'slime_purple': '#9C27B0'
        }[ally.type] || '#4CAF50';

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = borderColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(ally.name, x, y + 8);

        // Rarity stars（名前の下）
        const detailRarity = ally.rarity || 1;
        // rarity 1,2=コモン灰, 3=レア緑, 4=SR紫, 5=UR金, 6=SSR赤
        // rarity 1,2=コモン灰, 3=レア緑, 4=SR紫, 5=UR金, 6=SSR赤, 7=GOD虹/黒
        // rarity 1,2=コモン灰, 3=レア緑, 4=SR紫, 5=UR金, 6=SSR赤, 7=GOD虹(マゼンタ)
        // ★バグ修正: 配列インデックスは0始まりなので rarity=7 のGODには index[7] が必要
        const detailRarityColors = ['#9E9E9E', '#9E9E9E', '#9E9E9E', '#4CAF50', '#9C27B0', '#FFD700', '#FF4444', '#E040FB'];
        ctx.font = '10px Arial';
        ctx.fillStyle = detailRarityColors[detailRarity] || '#9E9E9E';
        ctx.fillText('★'.repeat(detailRarity) + '☆'.repeat(Math.max(0, 6 - detailRarity)), x, y + 26);

        // Type badge
        ctx.font = '10px Arial';
        ctx.fillStyle = borderColor;
        const typeText = {
            'master': '⭐マスター',
            'boss': '👹ボス',
            'wizard': '🧙ウィザード',
            'angel': '👼エンジェル',
            'defender': '⚔️ディフェンダー',
            'ninja': '🥷ニンジャ',
            'golem': '🗿ゴーレム',
            'slime_gold': '✨ゴールド',
            'slime_metal': '⚙️メタル',
            'slime_red': '🔴レッド',
            'slime_blue': '🔵ブルー',
            'ghost': '👻ゴースト',
            'metalking': '👑メタル王',
            'healer': '🌱ヒーラー',
            'special': '👿ダークJr',
            'ultimate': '🌈究極',
            'titan_golem': '🦾超巨人',
            'dragon_lord': '👑龍王',
            'shadow_mage': '🌑影魔導士',
            'sage_slime': '🔮賢者',
            'fortress_golem': '🏰砦ゴーレム',
            'paladin': '🛡パラディン',
            'war_machine': '⚙️ウォーマシン',
            'phantom': '👻ファントム',
            'alchemist': '⚗️錬金術師',
            'steel_ninja': '⚔️鋼鉄忍者',
            'slime_purple': '💜パープル'
        }[ally.type] || '🟢スライム';
        ctx.textAlign = 'center';
        ctx.fillText(typeText, x, y + 38);

        let yOffset = 58;
        const lineHeight = 18;

        // Draw stats (based on type for now - can expand with full stat system)
        ctx.font = '11px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'left';

        // HP
        const hpVal = {
            'master': 80, 'boss': 120, 'wizard': 40, 'angel': 60, 'defender': 100,
            'ninja': 50, 'golem': 90, 'slime_gold': 70, 'slime_metal': 85,
            'slime_red': 65, 'slime_blue': 60, 'ghost': 45,
            'metalking': 150, 'healer': 55, 'fortress_golem': 180, 'titan_golem': 220,
            'dragon_lord': 200, 'sage_slime': 110, 'shadow_mage': 90, 'war_machine': 160
        }[ally.type] || 50;

        ctx.fillStyle = '#FF6B6B';
        ctx.fillText('HP:', x - panelW / 2 + 8, y + yOffset);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        ctx.fillText(hpVal * (ally.level || 1), x + panelW / 2 - 8, y + yOffset);
        yOffset += lineHeight;

        // 攻撃力
        const atkVal = {
            'master': 85, 'boss': 100, 'wizard': 70, 'angel': 60, 'defender': 70,
            'ninja': 90, 'golem': 80, 'slime_gold': 75, 'slime_metal': 80,
            'slime_red': 75, 'slime_blue': 65, 'ghost': 70,
            'metalking': 90, 'healer': 40, 'fortress_golem': 100, 'titan_golem': 160,
            'dragon_lord': 180, 'sage_slime': 140, 'shadow_mage': 160, 'war_machine': 130
        }[ally.type] || 60;

        ctx.fillStyle = '#FFB74D';
        ctx.textAlign = 'left';
        ctx.fillText('攻撃:', x - panelW / 2 + 8, y + yOffset);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        ctx.fillText(atkVal * (ally.level || 1), x + panelW / 2 - 8, y + yOffset);
        yOffset += lineHeight;

        // 防御力
        const defVal = {
            'master': 60, 'boss': 70, 'wizard': 40, 'angel': 70, 'defender': 90,
            'ninja': 50, 'golem': 95, 'slime_gold': 70, 'slime_metal': 85,
            'slime_red': 60, 'slime_blue': 65, 'ghost': 80,
            'metalking': 120, 'healer': 75, 'fortress_golem': 160, 'titan_golem': 200,
            'dragon_lord': 150, 'sage_slime': 110, 'shadow_mage': 80, 'war_machine': 100
        }[ally.type] || 50;

        ctx.fillStyle = '#81C784';
        ctx.textAlign = 'left';
        ctx.fillText('防御:', x - panelW / 2 + 8, y + yOffset);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        ctx.fillText(defVal * (ally.level || 1), x + panelW / 2 - 8, y + yOffset);
        yOffset += lineHeight;

        // 速度
        const spdVal = {
            'master': 70, 'boss': 60, 'wizard': 80, 'angel': 85, 'defender': 50,
            'ninja': 95, 'golem': 40, 'slime_gold': 75, 'slime_metal': 60,
            'slime_red': 80, 'slime_blue': 75, 'ghost': 100,
            'metalking': 95, 'healer': 90, 'dragon_ninja': 120, 'angel_golem': 60,
            'legend_metal': 110, 'sage_slime': 100
        }[ally.type] || 70;

        ctx.fillStyle = '#64B5F6';
        ctx.textAlign = 'left';
        ctx.fillText('速度:', x - panelW / 2 + 8, y + yOffset);
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'right';
        ctx.fillText(spdVal, x + panelW / 2 - 8, y + yOffset);
        yOffset += lineHeight;

        // 特殊能力
        yOffset += 4;
        ctx.fillStyle = '#CE93D8';
        ctx.font = '9px Arial';
        ctx.textAlign = 'left';
        const specialText = {
            'master': '魔法使い',
            'boss': '強化',
            'wizard': '火炎',
            'angel': '回復',
            'defender': '盾',
            'ninja': '分身',
            'golem': '堅固',
            'slime_gold': '高速',
            'slime_metal': 'HP+',
            'slime_red': '火炎',
            'slime_blue': '冷却'
        }[ally.type] || 'なし';
        ctx.fillText('特能: ' + specialText, x - panelW / 2 + 8, y + yOffset);
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    _drawFancyHP(ctx, x, y, w, h, hp, max, isPlayer) {
        // ★バグ修正#18: max=0 のとき hp/max が Infinity になり HPバーが壊れるのを防ぐ
        const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
        const label = isPlayer ? 'じぶん' : 'あいて';
        const frame = _getFrameNow ? _getFrameNow() : 0;

        // HP状態判定
        const isLow = ratio <= 0.3;  // 30%以下: 赤点滅
        const isDanger = ratio <= 0.15; // 15%以下: 超危機
        const isHeal = ratio > 0.6;   // 60%以上: 通常青

        // 低HP時の点滅α
        // 点滅: Math.sinではなく整数除算で軽量化
        const blinkCycle = isDanger ? 8 : 14; // 危機時は速く点滅
        const blinkAlpha = isLow ? (Math.floor(frame / blinkCycle) % 2 === 0 ? 1.0 : 0.6) : 1.0;

        // Label Background
        ctx.fillStyle = isLow ? `rgba(120,0,0,${blinkAlpha * 0.7})` : 'rgba(0,0,0,0.5)';
        Renderer._roundRect(ctx, x - 5, y - 25, 70, 20, 5);
        ctx.fill();

        // Label Text
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = isPlayer ? 'left' : 'right';
        ctx.fillStyle = isLow ? `rgba(255,120,120,${blinkAlpha})` : '#FFF';
        ctx.fillText(label, isPlayer ? x : x + w, y - 11);

        // HP Bar Outer Border（危機時は脈動する枠線）
        ctx.fillStyle = '#111';
        Renderer._roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = isDanger ? `rgba(255,60,60,${blinkAlpha})` : isLow ? `rgba(255,150,50,${blinkAlpha})` : '#FFF';
        ctx.lineWidth = isDanger ? 3 : 2;
        ctx.stroke();

        // Filling: HP残量で色変化（グラデなし・固定色で軽量化）
        if (ratio > 0) {
            // 状態別の固定色（createLinearGradient廃止）
            if (isDanger) {
                ctx.fillStyle = blinkAlpha > 0.85 ? '#FF3333' : '#CC1111';
            } else if (isLow) {
                ctx.fillStyle = '#FF6600';
            } else if (ratio <= 0.6) {
                ctx.fillStyle = '#FFB300';
            } else {
                ctx.fillStyle = '#4A6ABA';
            }
            ctx.save();
            if (isDanger) ctx.globalAlpha = blinkAlpha;
            Renderer._roundRect(ctx, x + 2, y + 2, (w - 4) * ratio, h - 4, 4);
            ctx.fill();
            ctx.restore();
        }

        // HP Numbers - 大きく表示
        ctx.font = `bold 24px monospace`;
        ctx.textAlign = isPlayer ? 'left' : 'right';
        ctx.fillStyle = isDanger ? `rgba(255,100,100,${blinkAlpha})` : isLow ? '#FF8C00' : '#FFF';
        ctx.fillText(`${Math.ceil(hp)}`, isPlayer ? x : x + w, y + h + 24);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#AAA';
        ctx.fillText(`/ ${Math.ceil(max)}`, isPlayer ? x + 56 : x + w - 56, y + h + 24);
    },

    _drawHearts(ctx, x, y, hp, max) {
        // ★バグ修正#19: max=0 のとき hpPerHeart=0 → fullHearts=Infinity になるのを防ぐ
        if (!max || max <= 0) return;
        const heartSize = 18;
        const spacing = 4;
        const totalHearts = 10;
        const hpPerHeart = max / totalHearts;
        const fullHearts = Math.floor(hp / hpPerHeart);
        const partial = (hp % hpPerHeart) / hpPerHeart;

        for (let i = 0; i < totalHearts; i++) {
            const hx = x + i * (heartSize + spacing);
            const hy = y;

            // Empty Heart Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this._drawHeartShape(ctx, hx + 1, hy + 1, heartSize);
            ctx.fill();

            // Heart Outline
            ctx.fillStyle = '#333';
            this._drawHeartShape(ctx, hx, hy, heartSize);
            ctx.fill();

            // Heart Fill
            if (i < fullHearts) {
                ctx.fillStyle = '#FF3366';
                this._drawHeartShape(ctx, hx, hy, heartSize - 2);
                ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(hx - 3, hy - 3, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (i === fullHearts && partial > 0) {
                // Partial heart
                ctx.save();
                ctx.beginPath();
                ctx.rect(hx - heartSize, hy - heartSize, heartSize * 2 * partial, heartSize * 2);
                ctx.clip();
                ctx.fillStyle = '#FF3366';
                this._drawHeartShape(ctx, hx, hy, heartSize - 2);
                ctx.fill();
                ctx.restore();
            }
        }
    },

    _drawHeartShape(ctx, x, y, s) {
        const d = s / 2;
        ctx.beginPath();
        ctx.moveTo(x, y + d * 0.7);
        ctx.bezierCurveTo(x - d, y - d * 0.5, x - d * 1.5, y + d * 0.5, x, y + d * 1.5);
        ctx.bezierCurveTo(x + d * 1.5, y + d * 0.5, x + d, y - d * 0.5, x, y + d * 0.7);
        ctx.closePath();
    },

    _drawMiniMap(ctx, x, y, w, h) {
        if (!window.game || !window.game.tank) return;
        const tank = window.game.tank;
        const player = window.game.player;
        const T = CONFIG.TANK;

        // BG
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        Renderer._roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Scale factors
        const sw = w / T.INTERIOR_W;
        const sh = h / T.INTERIOR_H;

        // Draw Platforms
        ctx.fillStyle = '#666';
        if (tank.platforms) {
            for (const p of tank.platforms) {
                const px = x + (p.x - T.OFFSET_X) * sw;
                const py = y + (p.y - T.OFFSET_Y) * sh;
                const pw = p.w * sw;
                const ph = Math.max(2, p.h * sh);
                ctx.fillRect(px, py, pw, ph);
            }
        }

        // Draw Player
        ctx.fillStyle = '#5BA3E6';
        const plx = x + (player.x - T.OFFSET_X) * sw;
        const ply = y + (player.y - T.OFFSET_Y) * sh;
        ctx.beginPath();
        ctx.arc(plx + 2, ply + 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Blink player
        if (Math.floor(_getFrameNow() / 200) % 2 === 0) {
            ctx.strokeStyle = '#FFF';
            ctx.stroke();
        }
    },

    // ===== DIALOGUE UI =====
    drawDialogue(ctx, W, H, dialogueData, index, frame) {
        if (!dialogueData || !dialogueData[index]) return;
        const line = dialogueData[index];

        // Dialogue Box
        const boxH = 150;
        const boxY = H - boxH - 20;
        ctx.save();

        // Box Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 4;
        Renderer._roundRect(ctx, 40, boxY, W - 80, boxH, 10);
        ctx.fill();
        ctx.stroke();

        // Speaker Name Tag
        ctx.fillStyle = '#1e88e5'; // Blue tag
        Renderer._roundRect(ctx, 60, boxY - 20, 200, 40, 5);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 20px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.speaker, 160, boxY);

        // Message Text（折り返し対応）
        ctx.font = '22px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        {
            const maxWidth = W - 160; // 吹き出し幅 - 余白
            const lineHeight = 30;
            const startX = 80;
            let textY = boxY + 30;
            const words = line.text;
            let currentLine = '';
            for (let ci = 0; ci < words.length; ci++) {
                const testLine = currentLine + words[ci];
                const measured = ctx.measureText(testLine).width;
                if (measured > maxWidth && currentLine.length > 0) {
                    ctx.fillText(currentLine, startX, textY);
                    currentLine = words[ci];
                    textY += lineHeight;
                    // 吹き出しの高さを超えたら打ち切り
                    if (textY > boxY + boxH - 20) break;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) ctx.fillText(currentLine, startX, textY);
        }

        // Next Indicator (Blinking Triangle)
        if (frame % 60 < 30) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(W - 80, boxY + boxH - 20);
            ctx.lineTo(W - 60, boxY + boxH - 20);
            ctx.lineTo(W - 70, boxY + boxH - 10);
            ctx.fill();
        }

        // Helper text
        ctx.font = '14px Arial';
        ctx.fillStyle = '#AAA';
        ctx.textAlign = 'right';
        ctx.fillText('SPACE: 次へ', W - 60, boxY - 10);

        ctx.restore();
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    // ===== COMPLETE CLEAR SCREEN =====
    drawCompleteClear(ctx, W, H, frame) {
        // Rainbow Gradient Background
        const t = frame * 0.01;
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, `hsl(${t * 360}, 70%, 20%)`);
        bg.addColorStop(1, `hsl(${(t * 360 + 180) % 360}, 70%, 30%)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Fireworks
        if (Math.random() < 0.1) {
            // Add fireworks logic later or just simulate with circles
        }
        for (let i = 0; i < 5; i++) {
            const fx = (Math.sin(i * 123 + frame * 0.02) * 0.4 + 0.5) * W;
            const fy = (Math.cos(i * 87 + frame * 0.03) * 0.4 + 0.5) * H;
            const size = 50 + Math.sin(frame * 0.1 + i) * 20;
            ctx.fillStyle = `hsla(${frame * 5 + i * 60}, 100%, 50%, 0.3)`;
            ctx.beginPath(); ctx.arc(fx, fy, size, 0, Math.PI * 2); ctx.fill();
        }

        // Text
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('🏆 CONGRATULATIONS! 🏆', W / 2, H * 0.3);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('ALL STAGES CLEARED!', W / 2, H * 0.45);

        ctx.font = '20px Arial';
        ctx.fillStyle = '#EEE';
        ctx.fillText('Thank you for playing!', W / 2, H * 0.6);
        ctx.restore();

        // Footer prompt
        if (Math.floor(frame / 30) % 2 === 0) {
            ctx.font = '18px Arial';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE to Title', W / 2, H * 0.85);
        }
    },

    // ===== UPGRADE MENU =====
    drawUpgradeMenu(ctx, W, H, saveData, cursor) {
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);

        // Header
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("メカニック・ショップ", W / 2, 44);

        // Gold Display — 右寄せで行を分ける（タイトルと被らないよう）
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        Renderer._roundRect(ctx, W - 185, 8, 175, 30, 6);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`💰 ${saveData.gold || 0} G`, W - 97, 28);
        ctx.restore();

        const shopItems = [
            { id: 'hp', name: '戦車アーマー (HP)', cost: Math.floor((window.CONFIG?.UPGRADES?.HP?.BASE_COST || 200) * Math.pow(window.CONFIG?.UPGRADES?.HP?.COST_MULTIPLIER || 1.2, saveData.upgrades.hp || 0)), max: 30, type: 'upgrade' },
            { id: 'attack', name: '大砲パワー (攻撃力)', cost: Math.floor((window.CONFIG?.UPGRADES?.ATTACK?.BASE_COST || 350) * Math.pow(window.CONFIG?.UPGRADES?.ATTACK?.COST_MULTIPLIER || 1.2, saveData.upgrades.attack || 0)), max: 30, type: 'upgrade' },
            { id: 'goldBoost', name: '稼ぎスキル習得', cost: [1500, 2500, 4000, 6000, 8000][saveData.upgrades.goldBoost] || 0, max: 5, type: 'upgrade' },
            { id: 'capacity', name: 'デッキ容量 (+2スロット)', cost: [2000, 3500, 5500, 8000, 12000][saveData.upgrades.capacity || 0] || 0, max: 5, type: 'upgrade' },
            { id: 'room_expand', name: '🎨 戦車の部屋装飾', cost: (window.CONFIG && window.CONFIG.UPGRADES && window.CONFIG.UPGRADES.ROOM_EXPAND) ? window.CONFIG.UPGRADES.ROOM_EXPAND.COSTS[saveData.upgrades.room_expand || 0] || 0 : [3000, 6000, 10000, 16000][saveData.upgrades.room_expand || 0] || 0, max: 4, type: 'upgrade' },
            // { id: 'maxAllySlot', ... } 🔧 仲間コスト枠アップグレード撤廃（3固定）
            { id: 'ally_train', name: '🎓 仲間特訓 (最低Lv仲間+200EXP)', cost: 2000, type: 'ally_train' },
            { id: 'scout', name: '🎯 仲間スカウト', sub: `天井: あと${50 - Math.min(49, (saveData.gachaPity || 0))}連で★6確定`, cost: 1000, max: 99, type: 'gacha' },
            { id: 'scout_10', name: '🎲 10連スカウト', sub: '★5以上1体確定!', cost: 8000, max: 99, type: 'gacha_10' },
            { id: 'bomb', name: 'ばくだん岩 (弾)', cost: 1500, type: 'ammo' },
            { id: 'ironball', name: 'てっきゅう (弾)', cost: 2000, type: 'ammo' },
            { id: 'missile', name: 'ミサイル (弾)', cost: 3000, type: 'ammo' },
            { id: 'exit', name: '戻る', cost: 0, type: 'system' }
        ];

        // Draw Items
        const startY = 80;
        const gap = 52; // ★バグ修正: 55→52 (最下アイテムが操作ガイドテキストと9px重なっていたのを解消)

        // ★タップ判定用ヒット領域
        window._menuHitRegions = shopItems.map((item, i) => ({
            type: 'shopItem', index: i,
            x: 50, y: startY + i * gap,
            w: W - 100, h: 50
        }));

        shopItems.forEach((item, i) => {
            const y = startY + i * gap;
            const isSel = (i === cursor);

            // ... (Drawing code omitted for brevity if unchanged, but I need to include context for replacement) ...
            // Box
            ctx.fillStyle = isSel ? '#333355' : '#222';
            ctx.strokeStyle = isSel ? '#00FFFF' : '#555';
            ctx.lineWidth = isSel ? 3 : 1;
            Renderer._roundRect(ctx, 50, y, W - 100, 50, 10);
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFF';
            if (item.sub) {
                ctx.font = 'bold 18px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
                ctx.fillText(item.name, 80, y + 20);
                ctx.font = '13px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
                ctx.fillStyle = '#AAE0FF';
                ctx.fillText(item.sub, 80, y + 38);
            } else {
                ctx.font = 'bold 20px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'; // Font update for JP
                ctx.fillText(item.name, 80, y + 32);
            }

            // Level / Cost
            ctx.textAlign = 'right';
            if (item.type === 'system') {
                ctx.fillStyle = '#AAA';
                ctx.fillText("ステージ選択へ", W - 80, y + 32);
            } else if (item.type === 'ally_train') {
                const canBuy = (saveData.gold >= item.cost);
                ctx.fillStyle = canBuy ? '#4FC3F7' : '#FF4444';
                ctx.fillText(`${item.cost} G`, W - 80, y + 32);
            } else if (item.type === 'ammo') {
                const unlocked = saveData.unlockedAmmo.includes(item.id);
                if (unlocked) {
                    ctx.fillStyle = '#4CAF50';
                    ctx.fillText("購入済み", W - 80, y + 32);
                } else {
                    const canBuy = (saveData.gold >= item.cost);
                    ctx.fillStyle = canBuy ? '#FFD700' : '#FF4444';
                    ctx.fillText(`${item.cost} G`, W - 80, y + 32);
                }
            } else if (item.type === 'gacha' || item.type === 'gacha_10') {
                const canBuy = (saveData.gold >= item.cost);
                ctx.fillStyle = canBuy ? '#FFD700' : '#FF4444';
                ctx.fillText(`${item.cost} G`, W - 80, y + 32);
            } else {
                // Upgrade
                const currentLv = saveData.upgrades[item.id] || 0;
                if (currentLv >= item.max) {
                    ctx.fillStyle = '#00FF00';
                    ctx.fillText("最大レベル", W - 80, y + 32);
                } else {
                    const canBuy = (saveData.gold >= item.cost);
                    ctx.fillStyle = '#AAA';
                    ctx.fillText(`Lv.${currentLv} > ${currentLv + 1}`, W - 200, y + 32);
                    ctx.fillStyle = canBuy ? '#FFD700' : '#FF4444';
                    ctx.fillText(`${item.cost} G`, W - 80, y + 32);
                }
            }
        });

        // Controls
        this._drawShopControls(ctx, W, H);

        // Gacha Detail Panel (when gacha is selected)
        const selectedItem = shopItems[cursor];
        if (selectedItem && selectedItem.type === 'gacha') {
            const panelW = 310;
            const panelH = 320;
            const panelX = W / 2 - panelW / 2;
            const panelY = H - panelH - 80;

            // Background
            ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
            Renderer._roundRect(ctx, panelX, panelY, panelW, panelH, 10);
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Title
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('排出確率', W / 2, panelY + 25);

            // Rarity list（_drawGachaResultのrarityInfoと完全一致）
            const rarities = [
                { name: '★★ コモン', rate: '35%', color: '#9E9E9E' },
                { name: '★★★ レア', rate: '25%', color: '#4CAF50' },
                { name: '★★★★ スーパーレア', rate: '22%', color: '#9C27B0' },
                { name: '★★★★★ ウルトラレア', rate: '13%', color: '#FFD700' },
                { name: '★★★★★★ SSR', rate: '5%', color: '#FF4444' },
            ];

            let yOffset = panelY + 55;
            rarities.forEach((r, i) => {
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = r.color;
                ctx.textAlign = 'left';
                ctx.fillText(r.name, panelX + 20, yOffset);

                ctx.textAlign = 'right';
                ctx.fillStyle = '#FFF';
                ctx.fillText(r.rate, panelX + panelW - 20, yOffset);

                yOffset += 42;
            });

            // Note
            ctx.font = '12px Arial';
            ctx.fillStyle = '#AAA';
            ctx.textAlign = 'center';
            ctx.fillText('※重複時はレベルアップ', W / 2, panelY + panelH - 15);
        }

        // Gacha Overlay
        // ★バグ修正⑦⑧: gachaAdventureTimer > 0 の間は drawGachaAdventureAnim が
        // 全画面で上書きするため、ここで _drawGachaResult を描くと
        // (a) アニメ終了フェードアウト中に結果画面が透けて見える二重表示
        // (b) アニメが alpha=0 に近づいた瞬間に結果が一瞬フラッシュする
        // の2つのバグが起きる。アニメ終了後のみ描画する。
        const _adventurePlaying = window.game && (window.game.gachaAdventureTimer > 0);
        if (window.game && window.game.gachaResult && !_adventurePlaying) {
            this._drawGachaResult(ctx, W, H, window.game.gachaResult);
        }

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'upgrade');
        }
    },

    _drawGachaResult(ctx, W, H, ally) {
        // === レアリティ設定 ===
        const rarity = ally.rarity || 1;
        const rarityInfo = {
            1: { stars: 1, label: 'コモン', color: '#9E9E9E', glow: '#BDBDBD', rayColor: 'rgba(180,180,180,0.06)' },
            2: { stars: 2, label: 'コモン', color: '#9E9E9E', glow: '#BDBDBD', rayColor: 'rgba(180,180,180,0.06)' },
            3: { stars: 3, label: 'レア', color: '#4CAF50', glow: '#81C784', rayColor: 'rgba(76,175,80,0.10)' },
            4: { stars: 4, label: 'スーパーレア', color: '#9C27B0', glow: '#CE93D8', rayColor: 'rgba(156,39,176,0.14)' },
            5: { stars: 5, label: 'ウルトラレア', color: '#FFD700', glow: '#FFF176', rayColor: 'rgba(255,215,0,0.18)' },
            6: { stars: 6, label: 'SSR！！', color: '#FF4444', glow: '#FF8888', rayColor: 'rgba(255,80,80,0.22)' },
        }[rarity] || { stars: 1, label: 'コモン', color: '#9E9E9E', glow: '#BDBDBD', rayColor: 'rgba(180,180,180,0.06)' };

        const t = _getFrameNow();
        const pulse = Math.sin(t * 0.008) * 0.5 + 0.5;
        const col = rarityInfo.color;
        const cr = parseInt(col.slice(1, 3), 16), cg = parseInt(col.slice(3, 5), 16), cb = parseInt(col.slice(5, 7), 16);

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.fillRect(0, 0, W, H);
        const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.85);
        bgGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.35 + pulse * 0.15})`);
        bgGrad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.08)`);
        bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 回転光線
        ctx.save();
        ctx.translate(W / 2, H / 2);
        const rayCount = rarity >= 5 ? 18 : 12;
        ctx.rotate(t * (rarity >= 5 ? 0.0018 : 0.0012));
        ctx.fillStyle = rarityInfo.rayColor;
        for (let i = 0; i < rayCount; i++) {
            ctx.rotate(Math.PI * 2 / rayCount);
            const rw = 20 + (rarity >= 5 ? 15 : 5);
            ctx.fillRect(-rw, -W, rw * 2, W * 2);
        }
        ctx.restore();

        // 逆回転リング
        if (rarity >= 4) {
            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.rotate(-t * 0.0022);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.25 + pulse * 0.2})`;
            ctx.lineWidth = rarity >= 5 ? 4 : 2;
            for (let ring = 0; ring < (rarity >= 5 ? 3 : 2); ring++) {
                const rad = 110 + ring * 55 + pulse * 10;
                ctx.beginPath();
                const segs = 8 + ring * 4;
                for (let i = 0; i < segs; i++) {
                    const a = i / segs * Math.PI * 2, a2 = (i + 0.6) / segs * Math.PI * 2;
                    ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
                    ctx.lineTo(Math.cos(a2) * rad, Math.sin(a2) * rad);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // SSR稲妻
        if (rarity >= 6) {
            ctx.save();
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.4 + pulse * 0.4})`;
            ctx.lineWidth = 2;
            for (let bolt = 0; bolt < 4; bolt++) {
                const bx = W / 2 + Math.cos(t * 0.003 + bolt * 1.57) * 180;
                const by = H / 2 + Math.sin(t * 0.003 + bolt * 1.57) * 150;
                ctx.beginPath(); ctx.moveTo(bx, by);
                let lpx = bx, lpy = by;
                for (let s = 0; s < 5; s++) {
                    lpx += (Math.random() - 0.5) * 60; lpy += (Math.random() - 0.5) * 60;
                    ctx.lineTo(lpx, lpy);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // キャラクター
        const size = rarity >= 5 ? 200 : 170;
        const charCX = W / 2, charCY = H / 2 + 15;
        const charX = charCX - size / 2, charY2 = charCY - size / 2;
        const frame = (t / 16) | 0;
        const bounce = 1 + Math.sin(t * 0.012) * 0.04;

        // ★ 登場アニメーション（gachaRevealTimerを参照）
        const revealT = (window.game && window.game.gachaRevealTimer) ? window.game.gachaRevealTimer : 0;
        const revealProgress = Math.max(0, 1 - revealT / 60); // 0→1

        // 登場直後のフラッシュ（0.1秒）
        if (revealT > 50) {
            const flashA = (revealT - 50) / 10;
            ctx.save();
            ctx.globalAlpha = flashA * 0.9;
            ctx.fillStyle = rarity >= 6 ? '#E040FB' : rarity >= 5 ? '#FFD700' : '#FFFFFF';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // キャラが下からスライドイン（最初の0.5秒）
        const slideOffsetY = revealProgress < 1 ? (1 - revealProgress) * (1 - revealProgress) * H * 0.4 : 0;
        // 拡大→等倍（ポップイン）
        const scaleIn = revealProgress < 1 ? 0.5 + revealProgress * 0.5 : 1.0;

        // オーラリング（登場アニメ適用）
        ctx.save();
        ctx.translate(charCX, charCY + slideOffsetY);
        ctx.scale(scaleIn * (1 + pulse * (rarity >= 5 ? 0.12 : 0.06)), scaleIn * (1 + pulse * (rarity >= 5 ? 0.12 : 0.06)));
        ctx.beginPath(); ctx.arc(0, 0, size / 2 + 20, 0, Math.PI * 2);
        const ag = ctx.createRadialGradient(0, 0, size / 2, 0, 0, size / 2 + 30);
        ag.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5 + pulse * 0.3})`);
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag; ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(charCX, charCY + slideOffsetY);
        ctx.scale(scaleIn, scaleIn);
        ctx.beginPath(); ctx.arc(0, 0, size / 2 + 12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`; ctx.fill();
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.7 + pulse * 0.3})`;
        ctx.lineWidth = rarity >= 5 ? 4 : 2; ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(charCX, charCY + slideOffsetY); ctx.scale(bounce * scaleIn, bounce * scaleIn); ctx.translate(-charCX, -charCY);
        // ★バグ修正㉘: 2段階フォールバックで ninja_hanzo→drawNinja 等を正しく描画
        UI._uiDrawAllyIcon(ctx, charX, charY2, size, size, ally, frame);
        ctx.restore();

        // テキスト群
        ctx.textAlign = 'center';
        const lblY = charCY - size / 2 - 52;

        // レアリティラベル
        ctx.save();
        ctx.font = `bold ${rarity >= 5 ? 28 : 22}px Arial`;
        ctx.shadowColor = rarityInfo.glow; _uiSetShadowBlur(ctx, rarity >= 5 ? 25 : 12);
        ctx.fillStyle = rarityInfo.color;
        ctx.fillText(rarityInfo.label, W / 2, lblY);
        ctx.restore();

        // 星
        const starBaseY = lblY + 30;
        const starSize = rarity >= 5 ? 26 : 20;
        ctx.save();
        ctx.font = `${starSize}px Arial`;
        ctx.shadowColor = rarityInfo.glow; ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < 6; i++) ctx.fillText('☆', W / 2 - (6 * (starSize + 4) - 4) / 2 + i * (starSize + 4), starBaseY);
        ctx.fillStyle = rarityInfo.color;
        for (let i = 0; i < rarityInfo.stars; i++) {
            const sx = W / 2 - (6 * (starSize + 4) - 4) / 2 + i * (starSize + 4);
            const sc = 1 + Math.sin(t * 0.01 + i * 0.5) * 0.15;
            ctx.save(); ctx.translate(sx, starBaseY); ctx.scale(sc, sc); ctx.translate(-sx, -starBaseY);
            ctx.fillText('★', sx, starBaseY);
            ctx.restore();
        }
        ctx.restore();

        // テキスト全体にrevealProgressでフェードイン
        const textAlpha = Math.min(1, revealProgress * 2.5);

        // GET!
        const getY = charCY + size / 2 + 44;
        ctx.save();
        ctx.globalAlpha = textAlpha;
        const gs = 1 + Math.sin(t * 0.015) * 0.06;
        ctx.font = `bold ${Math.round((rarity >= 5 ? 62 : 48) * gs)}px Arial`;
        ctx.shadowColor = rarityInfo.glow; _uiSetShadowBlur(ctx, rarity >= 5 ? 40 : 20);
        ctx.fillStyle = rarityInfo.color;
        ctx.fillText(rarity >= 5 ? '✨ GET! ✨' : 'GET!', W / 2, getY);
        ctx.restore();

        // 名前
        const nameText = ally.name + (ally.level && ally.level > 1 ? ` Lv.${ally.level}` : '');
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = 'bold 32px Arial'; ctx.fillStyle = '#FFF';
        ctx.fillText(nameText, W / 2, getY + 46);
        ctx.restore();

        // LB / NEW
        if (ally.isLimitBreak) {
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.font = 'bold 20px Arial'; ctx.fillStyle = '#00E5FF';
            ctx.fillText('⬆ LIMIT BREAK', W / 2, getY + 80);
            ctx.restore();
        } else {
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#00FF88';
            ctx.fillText('✦ NEW! ✦', W / 2, getY + 80);
            ctx.restore();
        }

        // 10連インジケーター
        if (ally._queueTotal) {
            const total = ally._queueTotal, current = ally._queueIndex;
            const dotR = 8, spc = 24;
            const sdx = W / 2 - ((total - 1) * spc) / 2;
            ctx.save();
            for (let i = 0; i < total; i++) {
                const dx = sdx + i * spc, dy = H - 76;
                const isDone = (i < current), isCur = (i === current - 1);
                ctx.beginPath(); ctx.arc(dx, dy, isCur ? dotR + 3 : dotR, 0, Math.PI * 2);
                if (isCur) { ctx.fillStyle = '#FFD700'; ctx.shadowBlur = 0; }
                else if (isDone) { ctx.fillStyle = `rgba(${cr},${cg},${cb},0.8)`; ctx.shadowBlur = 0; }
                else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.shadowBlur = 0; }
                ctx.fill();
            }
            ctx.restore();
            ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
            ctx.fillText(`${current} / ${total}`, W / 2, H - 50);
            ctx.font = '15px Arial'; ctx.fillStyle = '#AAA';
            ctx.fillText('SPACE / Enter で次へ', W / 2, H - 28);
        } else {
            ctx.font = '17px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'center';
            if (Math.floor(t / 30) % 2 === 0) ctx.fillText('SPACE / Enter で閉じる', W / 2, H - 30);
        }
    },

    _drawShopControls(ctx, W, H) {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.fillStyle = 'rgba(180,220,255,0.7)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            isTouch
                ? '▲▼: 選択   ○ボタン: 購入/決定   Bボタン: 戻る'
                : '↑/↓: 選択   Space/Enter: 購入/決定   B: 戻る',
            W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, { showBack: true });

    },

    // === デイリーミッション画面 ===
    drawDailyMissions(ctx, W, H, saveData) {
        // タップで戻れるよう全画面をhit regionに
        window._menuHitRegions = [{ type: 'settingsItem', index: 3, x: 0, y: 0, w: W, h: H }];
        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d1a2a');
        bg.addColorStop(1, '#1a2a3a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // タイトル
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('📅 デイリーミッション', W / 2, 70);
        ctx.restore();

        // 今日の日付
        const today = SaveManager.getTodayDate();
        ctx.font = '18px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        ctx.fillText(today, W / 2, 110);

        // ミッション一覧
        const missions = saveData.dailyMissions?.missions || [];
        const startY = 160;
        const gap = 120;

        missions.forEach((mission, i) => {
            const y = startY + i * gap;

            // ミッション枠
            ctx.fillStyle = mission.completed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(30, 50, 80, 0.7)';
            Renderer._roundRect(ctx, 50, y - 30, W - 100, 100, 10);
            ctx.fill();
            ctx.strokeStyle = mission.completed ? '#4CAF50' : '#5BA3E6';
            ctx.lineWidth = 3;
            ctx.stroke();

            // ミッション名
            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = mission.completed ? '#4CAF50' : '#FFF';
            ctx.textAlign = 'left';
            ctx.fillText(mission.name, 70, y);

            // 進捗バー
            const barX = 70;
            const barY = y + 20;
            const barW = W - 140 - 100; // 報酬分のスペースを確保
            const barH = 20;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            Renderer._roundRect(ctx, barX, barY, barW, barH, 10);
            ctx.fill();

            const progress = Math.min(mission.progress / mission.target, 1);
            ctx.fillStyle = mission.completed ? '#4CAF50' : '#FFD700';
            Renderer._roundRect(ctx, barX + 2, barY + 2, (barW - 4) * progress, barH - 4, 8);
            ctx.fill();

            // 進捗テキスト
            ctx.font = '16px Arial';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'center';
            ctx.fillText(`${mission.progress} / ${mission.target}`, barX + barW / 2, barY + 15);

            // 報酬
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'right';
            ctx.fillText(`報酬: ${mission.reward}G`, W - 70, y + 30);

            // 完了マーク
            if (mission.completed) {
                ctx.font = 'bold 28px Arial';
                ctx.fillStyle = '#4CAF50';
                ctx.textAlign = 'center';
                ctx.fillText('✓', W - 70, y - 5);
            }
        });

        // 戻るボタン
        ctx.font = '20px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        const isTouchD = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const tapLabel = isTouchD ? 'Bボタン/タップ: 戻る   H: ヘルプ' : 'Bキー で戻る   H: ヘルプ';
        ctx.fillText(tapLabel, W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, { showBack: true });

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'daily_missions');
        }
    },

    // === 図鑑画面 ===
    drawCollection(ctx, W, H, saveData, tab) {
        // タップ判定: タブ切替 + 戻るボタン
        window._menuHitRegions = [
            { type: 'settingsItem', index: 0, x: W * 0.05, y: H * 0.88, w: W * 0.4, h: 44 },
            { type: 'settingsItem', index: 1, x: W * 0.55, y: H * 0.88, w: W * 0.4, h: 44 },
        ];
        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d1a2a');
        bg.addColorStop(1, '#1a2a3a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // タイトル
        ctx.save();
        // shadowColor removed for perf
        ctx.shadowBlur = 0;
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#9C27B0';
        ctx.textAlign = 'center';
        ctx.fillText('📖 図鑑', W / 2, 70);
        ctx.restore();

        // タブ
        const tabs = ['敵図鑑', '仲間図鑑'];
        tabs.forEach((tabName, i) => {
            const x = W / 2 - 100 + i * 200;
            const isSelected = (tab === i);

            ctx.fillStyle = isSelected ? 'rgba(156, 39, 176, 0.5)' : 'rgba(30, 50, 80, 0.5)';
            Renderer._roundRect(ctx, x - 80, 100, 160, 40, 10);
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#9C27B0' : '#5BA3E6';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = isSelected ? '#FFF' : '#8EC9F5';
            ctx.textAlign = 'center';
            ctx.fillText(tabName, x, 128);
        });

        const collection = saveData.collection || { enemies: [], allies: [] };

        if (tab === 0) {
            // 敵図鑑
            const enemyTypes = ['NORMAL', 'SCOUT', 'HEAVY', 'MAGICAL', 'DEFENSE', 'BOSS', 'TRUE_BOSS'];
            const enemyNames = {
                'NORMAL': 'ノーマル敵',
                'SCOUT': 'スカウト',
                'HEAVY': 'ヘビー',
                'MAGICAL': 'マジカル',
                'DEFENSE': 'ディフェンス',
                'BOSS': 'ボス',
                'TRUE_BOSS': '真・ボス'
            };

            const startY = 180;
            const gap = 70;
            const enemyScrollY = (window.game && window.game.collectionScroll) || 0;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 160, W, H - 200);
            ctx.clip();

            enemyTypes.forEach((type, i) => {
                const y = startY + i * gap - enemyScrollY;
                if (y < 140 || y > H - 60) return;
                const discovered = collection.enemies.includes(type);

                // 枠
                ctx.fillStyle = discovered ? 'rgba(156, 39, 176, 0.2)' : 'rgba(30, 30, 30, 0.5)';
                Renderer._roundRect(ctx, 80, y - 25, W - 160, 50, 8);
                ctx.fill();
                ctx.strokeStyle = discovered ? '#9C27B0' : '#555';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 名前
                ctx.font = 'bold 22px Arial';
                ctx.fillStyle = discovered ? '#FFF' : '#555';
                ctx.textAlign = 'left';
                ctx.fillText(discovered ? enemyNames[type] : '？？？', 100, y + 5);

                // ステータス
                if (discovered) {
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'right';
                    ctx.fillText('発見済み ✓', W - 100, y + 5);
                }
            });

            ctx.restore();
        } else {
            // 仲間図鑑 (全種族リスト)
            let masterAllyList = [...CONFIG.MASTER_ALLY_LIST];

            // ソート適用
            const sortMode = (window.game && window.game.collectionSortMode) || 0;
            if (sortMode === 1) { // レア度
                masterAllyList.sort((a, b) => {
                    const rA = CONFIG.ALLY_TYPE_RARITY[a.type] || 1;
                    const rB = CONFIG.ALLY_TYPE_RARITY[b.type] || 1;
                    return rB - rA || a.type.localeCompare(b.type);
                });
            } else if (sortMode === 2) { // 名前
                masterAllyList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            }

            const startY = 180;
            const gap = 70;
            const scrollY = (window.game && window.game.collectionScroll) || 0;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 160, W, H - 200);
            ctx.clip();

            masterAllyList.forEach((item, i) => {
                const y = startY + i * gap - scrollY;
                if (y < 140 || y > H - 60) return;

                const discovered = collection.allies.includes(item.type);

                // 枠
                ctx.fillStyle = discovered ? 'rgba(76, 175, 80, 0.2)' : 'rgba(30, 30, 30, 0.5)';
                Renderer._roundRect(ctx, 80, y - 25, W - 160, 50, 8);
                ctx.fill();
                ctx.strokeStyle = discovered ? '#4CAF50' : '#555';
                ctx.lineWidth = 2;
                ctx.stroke();

                // アイコン描画（左端）
                if (discovered) {
                    ctx.save();
                    const iconSize = 38;
                    ctx.translate(100, y);
                    const frame = (_getFrameNow() / 16) | 0;
                    // ★バグ修正㉘: 2段階フォールバックで ninja_hanzo→drawNinja 等を正しく描画
                    UI._uiDrawAllyIcon(ctx, -iconSize / 2, -iconSize / 2, iconSize, iconSize, item, frame);
                    ctx.restore();
                }

                // 名前（上段）
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = discovered ? '#FFF' : '#555';
                ctx.textAlign = 'left';
                ctx.fillText(discovered ? item.name : '？？？', 130, y - 8, W - 290);

                // レア度★（名前の下）
                if (discovered) {
                    const rarity = CONFIG.ALLY_TYPE_RARITY[item.type] || 1;
                    const starColor = rarity >= 7 ? '#E040FB' : rarity >= 6 ? '#FF4444' : rarity >= 5 ? '#FFD700' : '#AAA';
                    ctx.font = '11px Arial';
                    ctx.fillStyle = starColor;
                    ctx.textAlign = 'left';
                    ctx.fillText('★'.repeat(rarity), 130, y + 12);
                }

                // バッジ（右寄せ・重ならないよう）
                const _collFusionableTypes = new Set((window.FUSION_RECIPES || []).flatMap(r => [r.p1.type, r.p2.type]));
                if (discovered) {
                    if (item.isFusion) {
                        ctx.fillStyle = 'rgba(156, 39, 176, 0.85)';
                        Renderer._roundRect(ctx, W - 120, y - 12, 70, 18, 5);
                        ctx.fill();
                        ctx.font = 'bold 11px Arial';
                        ctx.fillStyle = '#FFF';
                        ctx.textAlign = 'center';
                        ctx.fillText('⚗配合産', W - 85, y + 1);
                    } else if (_collFusionableTypes.has(item.type)) {
                        ctx.fillStyle = 'rgba(0,188,212,0.85)';
                        Renderer._roundRect(ctx, W - 120, y - 12, 70, 18, 5);
                        ctx.fill();
                        ctx.font = 'bold 11px Arial';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.fillText('🔀配合可', W - 85, y + 1);
                    }
                    ctx.font = '13px Arial';
                    ctx.fillStyle = '#4CAF50';
                    ctx.textAlign = 'right';
                    ctx.fillText('✓', W - 130, y + 1);
                }
            });

            ctx.restore();

            // スクロールバー
            const contentHeight = CONFIG.MASTER_ALLY_LIST.length * gap;
            const visibleArea = H - 220;
            if (contentHeight > visibleArea) {
                const scrollBarHeight = Math.max(20, (visibleArea / contentHeight) * visibleArea);
                const scrollBarY = 160 + (scrollY / Math.max(1, contentHeight - visibleArea + 10)) * (visibleArea - scrollBarHeight);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                Renderer._roundRect(ctx, W - 20, scrollBarY, 8, scrollBarHeight, 4);
                ctx.fill();
            }
        }

        // 操作説明
        ctx.font = '18px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        if (tab === 1) {
            const isTouchC = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            ctx.fillText(
                isTouchC ? '◀▶: タブ切替   ▲▼: スクロール   S: ソート   B: 戻る   H: ヘルプ'
                    : '← →: タブ切替   ↑↓: スクロール   [S]: ソート   [B]: 戻る   [H]: ヘルプ',
                W / 2, H - 60);
        } else {
            ctx.fillText('← →: タブ切替   [B]: 戻る   [H]: ヘルプ', W / 2, H - 60);
        }

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'collection');
        }

        // ナビゲーションボタン
        UI.drawNavBar(ctx, W, H, { showBack: true });
    },

    // === 配合（Fusion）画面 ===
    drawFusion(ctx, W, H, saveData, cursor, parents, frame, errorMessage, tab = 'merge', recipeCursor = 0) {
        // タブが recipe の場合は図鑑を描画
        if (tab === 'recipe') {
            this._drawFusionRecipes(ctx, W, H, frame, recipeCursor, saveData);
            return;
        }
        // 背景 (Dark gradient)
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0D1B2A');
        bg.addColorStop(1, '#1B263B');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // タイトル
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#E0E1DD';
        ctx.textAlign = 'center';
        ctx.fillText('仲間配合', W / 2, 50);

        // エラーメッセージ表示
        if (errorMessage) {
            ctx.save();
            ctx.font = 'bold 20px Arial';
            // 解放メッセージは緑、エラーは赤
            const isInfo = errorMessage.includes('を解放しました');
            ctx.fillStyle = isInfo ? '#7CFC00' : '#FF5252';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(errorMessage, W / 2, 90);
            ctx.fillText(errorMessage, W / 2, 90);
            ctx.restore();
        }

        // 中央の配合サークル（豪華演出）
        const centerX = W / 2, centerY = H * 0.77;
        const hasBothParents = parents.length >= 2;
        const hasOneParent = parents.length === 1;
        const fusionPulse = Math.sin(frame * 0.07) * 0.5 + 0.5;
        const circleColor = hasBothParents ? `rgba(255,215,0,${0.6 + fusionPulse * 0.4})` : hasOneParent ? 'rgba(100,200,255,0.5)' : 'rgba(255,215,0,0.3)';

        // 外側グロー
        if (hasBothParents) {
            const grd = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, 120);
            grd.addColorStop(0, `rgba(255,215,0,${0.2 + fusionPulse * 0.15})`);
            grd.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(centerX, centerY, 120, 0, Math.PI * 2); ctx.fill();
        }

        // メインサークル
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = hasBothParents ? 4 + fusionPulse * 2 : 3;
        ctx.beginPath(); ctx.arc(centerX, centerY, 80, 0, Math.PI * 2); ctx.stroke();

        // 配合エフェクト（回転オーブ）
        const angle = frame * 0.05;
        const orbCount = hasBothParents ? 6 : 3;
        for (let i = 0; i < orbCount; i++) {
            const a = angle + i * (Math.PI * 2 / orbCount);
            const r2 = 80 + (hasBothParents ? Math.sin(frame * 0.1 + i) * 8 : 0);
            const px = centerX + Math.cos(a) * r2;
            const py = centerY + Math.sin(a) * r2;
            const orbSize = hasBothParents ? 5 + fusionPulse * 3 : 4;
            ctx.save();
            ctx.shadowColor = hasBothParents ? '#FFD700' : '#88CCFF';
            ctx.shadowBlur = 0;
            ctx.fillStyle = hasBothParents ? `rgba(255,${180 + i * 12},0,${0.8 + fusionPulse * 0.2})` : '#4FC3F7';
            ctx.beginPath(); ctx.arc(px, py, orbSize, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // 両親が揃ったら内側にエネルギー渦
        if (hasBothParents) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(-angle * 1.5);
            for (let ring = 0; ring < 3; ring++) {
                const rad = 25 + ring * 18 + fusionPulse * 5;
                ctx.beginPath();
                ctx.arc(0, 0, rad, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,215,0,${0.4 - ring * 0.1})`;
                ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.restore();
            // 中央の合体マーク
            ctx.save();
            // shadowColor removed for perf ctx.shadowBlur = 0;
            const mSize = 28 + fusionPulse * 5;
            ctx.font = `bold ${mSize}px Arial`;
            ctx.fillStyle = `rgba(255,215,0,${0.8 + fusionPulse * 0.2})`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⚗', centerX, centerY);
            ctx.textBaseline = 'alphabetic';
            ctx.restore();
        }

        // 親スロット
        const drawSlot = (x, y, label, ally) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            Renderer._roundRect(ctx, x - 50, y - 50, 100, 100, 10);
            ctx.fill();
            ctx.strokeStyle = ally ? '#FFD700' : '#415A77';
            ctx.stroke();

            ctx.font = '14px Arial';
            ctx.fillStyle = '#AAA';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, y - 60);

            if (ally) {
                // ★バグ修正㉘: 2段階フォールバックで ninja_hanzo→drawNinja 等を正しく描画
                UI._uiDrawAllyIcon(ctx, x - 25, y - 25, 50, 50, ally, frame);
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(ally.name, x, y + 65);
                ctx.fillStyle = '#FFD700';
                ctx.fillText('Lv.' + (ally.level || 1), x, y + 80);
            } else {
                ctx.fillStyle = '#415A77';
                ctx.font = 'bold 30px Arial';
                ctx.fillText('?', x, y + 10);
            }
        };

        drawSlot(centerX - 130, centerY, '親 1', parents[0]);
        drawSlot(centerX + 130, centerY, '親 2', parents[1]);

        // 仲間リスト
        const listY = 105;
        const listH = H * 0.45;
        const gap = 56; // ★バグ修正: gap が未定義でReferenceError が発生していた
        let allies = saveData.unlockedAllies || [];

        // フィルタ適用
        const filterMode = (window.game && window.game.fusionFilterMode) || 0;
        const recipes = window.FUSION_RECIPES || [];
        const fusionableTypes = new Set(recipes.flatMap(r => [r.p1.type, r.p2.type]));

        if (filterMode === 1) {
            allies = allies.filter(a => fusionableTypes.has(a.type));
        }

        const maxScrollY = Math.max(0, allies.length * gap - listH);
        const scrollY = Math.min(maxScrollY, Math.max(0, cursor * gap - listH / 2));

        // 1体選択中の場合：相方候補タイプを特定
        const partnerTypes = new Set();
        if (parents.length === 1) {
            const selectedType = parents[0].type;
            recipes.forEach(r => {
                if (r.p1.type === selectedType) partnerTypes.add(r.p2.type);
                if (r.p2.type === selectedType) partnerTypes.add(r.p1.type);
            });
        }

        // タップ判定用ヒット領域 (fusion ally list)
        window._menuHitRegions = allies.map((ally, i) => ({
            type: 'allyItem', index: i,
            x: 50, y: listY + i * gap - scrollY,
            w: W - 100, h: gap
        }));
        window._fusionScrollY = scrollY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(50, listY, W - 100, listH);
        ctx.clip();

        allies.forEach((ally, i) => {
            const y = listY + i * gap - scrollY + gap / 2;
            if (y < listY - gap || y > listY + listH + gap) return;

            const isSelected = parents.includes(ally);
            const isCursor = cursor === i;
            const isPartner = partnerTypes.has(ally.type) && !isSelected;
            const isFusable = fusionableTypes.has(ally.type);

            // 背景枠（配合可否を強調）
            // 配合可否の判定: 0体 or 1体選択中どちらでも適用
            const notFusable = (parents.length === 1 && !isSelected && !isPartner)
                || (parents.length === 0 && !isFusable);
            const dimAlpha = notFusable ? 0.28 : 1.0;

            // 行全体にdimAlphaを適用（背景・アイコン・テキスト全て）
            ctx.save();
            ctx.globalAlpha = dimAlpha;

            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
            } else if (isPartner) {
                // 配合相方: 明るい緑グロー
                ctx.fillStyle = 'rgba(0, 230, 118, 0.30)';
            } else if (isCursor) {
                ctx.fillStyle = 'rgba(142, 201, 245, 0.25)';
            } else if (!isFusable && parents.length === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; // 配合不可は暗め
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            }
            Renderer._roundRect(ctx, 60, y - 25, W - 120, 50, 8);
            ctx.fill();

            // 枠線
            if (isSelected) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (isPartner) {
                // 相方は太いグロー枠
                ctx.strokeStyle = '#00E676';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (isCursor) {
                ctx.strokeStyle = '#8EC9F5';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (isFusable && parents.length === 0) {
                // 配合可能なキャラは薄い枠
                ctx.strokeStyle = 'rgba(0,188,212,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }


            // ミニチュア
            // ★バグ修正㉘: 2段階フォールバックで ninja_hanzo→drawNinja 等を正しく描画
            ctx.save();
            ctx.translate(85, y);
            ctx.scale(0.6, 0.6);
            UI._uiDrawAllyIcon(ctx, -25, -25, 50, 50, ally, frame);
            ctx.restore();

            // 名前
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = isSelected ? '#FFD700' : isPartner ? '#00FF80' : '#FFF';
            ctx.textAlign = 'left';
            ctx.fillText(ally.name, 120, y + 6);

            // レベル
            ctx.font = '13px Arial';
            ctx.fillStyle = '#AAA';
            ctx.textAlign = 'right';
            ctx.fillText('Lv.' + (ally.level || 1), W - 80, y + 6);

            // マーク表示（名前の右横に小さく）
            ctx.textAlign = 'left';
            let markX = 122 + ctx.measureText(ally.name).width + 6;

            if (isSelected) {
                ctx.font = 'bold 13px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.fillText('✔ 選択中', W - 165, y + 6);
            } else if (isPartner) {
                ctx.font = 'bold 13px Arial';
                ctx.fillStyle = '#00E676';
                ctx.fillText('⚗ 配合可', W - 165, y + 6);
            }

            // デッキバッジ（右端固定）
            const inDeck = (saveData.allyDeck || []).includes(ally.id);
            if (inDeck) {
                ctx.fillStyle = 'rgba(220,60,60,0.9)';
                Renderer._roundRect(ctx, W - 100, y - 10, 50, 20, 5);
                ctx.fill();
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.fillText('編成中', W - 75, y + 4);
            }

            // 配合マーク（名前横・デッキバッジと被らない位置）
            if (ally.isFusion) {
                ctx.font = '11px Arial';
                ctx.fillStyle = ally.rarity >= 6 ? '#FF6F00' : '#7CFC00';
                ctx.textAlign = 'left';
                ctx.fillText('⚗', markX, y + 6);
            } else if (isFusable) {
                ctx.font = '11px Arial';
                ctx.fillStyle = '#00BCD4';
                ctx.textAlign = 'left';
                ctx.fillText('🔀', markX, y + 6);
            }
            ctx.restore(); // dimAlpha を全描画後にリセット
        });

        ctx.restore();

        // 操作ガイド
        ctx.font = '15px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        const isTouchF = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.fillText(
            isTouchF
                ? '▲▼: 選択   ○: 決定   Q: レシピ   F: フィルタ   B: 戻る   H: ヘルプ'
                : '↑↓: 選択   Space/Enter: 決定   [Del]: 解放   [Q]: レシピ   [F]: フィルタ   [B]: 戻る   [H]: ヘルプ',
            W / 2, H - 30);

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'fusion');
        }
    },

    // === 配合レシピ図鑑 ===
    _drawFusionRecipes(ctx, W, H, frame, cursor, saveData) {
        const recipes = window.FUSION_RECIPES || [];
        const collection = (saveData && saveData.collection && saveData.collection.allies) || [];
        const unlockedTypes = new Set(collection);
        // 発見済み数
        const discoveredCount = recipes.filter(r => unlockedTypes.has(r.child.type)).length;

        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0D1B2A');
        bg.addColorStop(1, '#1B263B');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // タイトルバー
        ctx.fillStyle = 'rgba(255,215,0,0.12)';
        ctx.fillRect(0, 0, W, 72);
        ctx.font = 'bold 26px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('📖  配合レシピ図鑑', W / 2, 34);

        // 完成率バッジ
        const progressText = discoveredCount + ' / ' + recipes.length + ' 発見済み';
        ctx.font = 'bold 13px Arial';
        const pW = ctx.measureText(progressText).width + 20;
        ctx.fillStyle = discoveredCount === recipes.length ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.1)';
        Renderer._roundRect(ctx, W / 2 - pW / 2, 42, pW, 22, 11);
        ctx.fill();
        ctx.fillStyle = discoveredCount === recipes.length ? '#FFD700' : '#8EC9F5';
        ctx.fillText(progressText, W / 2, 57);

        // タブ表示
        const tabs = ['配合', 'レシピ図鑑'];
        tabs.forEach((label, i) => {
            const tx = W / 2 - 80 + i * 160;
            ctx.fillStyle = i === 1 ? '#FFD700' : 'rgba(255,255,255,0.15)';
            Renderer._roundRect(ctx, tx - 60, 66, 120, 24, 6);
            ctx.fill();
            ctx.font = 'bold 13px Arial';
            ctx.fillStyle = i === 1 ? '#000' : '#AAA';
            ctx.fillText(label, tx, 82);
        });

        if (recipes.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '20px Arial';
            ctx.fillText('レシピデータなし', W / 2, H / 2);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#8EC9F5';
            const isTouchR = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            ctx.fillText(isTouchR ? 'Bボタン: 戻る  Qキー: 配合へ' : 'B: 戻る  Q: 配合へ', W / 2, H - 30);
            return;
        }

        // モンスターミニ描画（通常）
        // ★バグ修正㉘: 2段階フォールバックで ninja_hanzo→drawNinja 等を正しく描画
        const drawMini = (ally, cx, cy) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(0.55, 0.55);
            UI._uiDrawAllyIcon(ctx, -25, -25, 50, 50, ally, frame);
            ctx.restore();
        };

        // 未発見モンスターのシルエット描画
        const drawSilhouette = (ally, cx, cy, shimmer) => {
            const t = ally.type || 'slime';
            const fn = 'draw' + t.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            const f = Renderer[fn];
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(0.55, 0.55);
            // 一度オフスクリーン的に描いてシルエット化: globalCompositeOperationで黒塗り
            // まず通常描画してからsource-atopで黒にする
            ctx.save();
            // 黒いベース（スライム型の楕円）
            ctx.fillStyle = '#0D1B2A';
            ctx.strokeStyle = 'rgba(100,150,255,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 4, 22, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // シルエット本体 (各キャラの形に近い楕円)
            ctx.fillStyle = '#0A1220';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 「？」文字（点滅）
            const alpha = 0.7 + Math.sin(shimmer * 0.08 + cx * 0.1) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#4A6FA5';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('？', 0, 2);
            ctx.globalAlpha = 1;
            ctx.textBaseline = 'alphabetic';
            ctx.restore();
        };

        // レシピリスト
        const listTop = 96;
        const listBottom = H - 46;
        const itemH = 88; // 72→88に拡張（入手先情報を表示するため）
        const gap = 6;
        const itemStep = itemH + gap;
        const scrollY = Math.max(0, cursor * itemStep - (listBottom - listTop) / 2);

        // 入手先を取得するヘルパー
        const getSource = (type) => {
            const map = window.ALLY_SOURCE_MAP || {};
            return map[type] || null;
        };

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, listTop, W, listBottom - listTop);
        ctx.clip();

        recipes.forEach((recipe, i) => {
            const iy = listTop + i * itemStep - scrollY;
            if (iy + itemH < listTop - itemH || iy > listBottom + itemH) return;

            const isCursor = i === cursor;
            const isLarge = !!recipe.large;
            const isUnlocked = unlockedTypes.has(recipe.child.type);

            // カード背景
            if (isUnlocked) {
                ctx.fillStyle = isCursor
                    ? (isLarge ? 'rgba(255,200,0,0.22)' : 'rgba(100,180,255,0.18)')
                    : 'rgba(255,255,255,0.05)';
            } else {
                // 未発見カードは暗め
                ctx.fillStyle = isCursor ? 'rgba(74,111,165,0.18)' : 'rgba(0,0,0,0.25)';
            }
            Renderer._roundRect(ctx, 20, iy, W - 40, itemH, 10);
            ctx.fill();

            // カーソル枠線
            if (isCursor) {
                ctx.strokeStyle = isUnlocked ? (isLarge ? '#FFD700' : '#8EC9F5') : '#4A6FA5';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // カテゴリタグ
            const catColors = {
                'カラー配合': '#7B1FA2', 'メタル配合': '#546E7A',
                '防御配合': '#1565C0', '攻撃配合': '#B71C1C',
                '特殊配合': '#4A148C', '最終配合★6': '#E65100'
            };
            ctx.fillStyle = catColors[recipe.cat] || (isLarge ? '#FF6F00' : '#37474F');
            Renderer._roundRect(ctx, 28, iy + 6, 76, 18, 4);
            ctx.fill();
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'center';
            ctx.fillText(recipe.cat, 64, iy + 18);

            const p1x = 110, p2x = 188, childX = 278, py = iy + itemH / 2 - 6;

            // 素材は常に表示
            drawMini(recipe.p1, p1x, py);
            drawMini(recipe.p2, p2x, py);

            // 素材の入手先を小さく表示
            const src1 = getSource(recipe.p1.type);
            const src2 = getSource(recipe.p2.type);
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            if (src1) {
                const label = src1.stage === '配合のみ' ? '配合' : src1.how === 'クリア報酬' ? '🏆' + src1.stage.replace(/^St\.\d+\s|^イベ\.\d+\s|^EX\d+\s/, '') : '🎲ガチャ';
                ctx.fillStyle = src1.stage === '配合のみ' ? '#888' : src1.how.includes('ガチャ') ? '#FFD700' : '#81C784';
                ctx.fillText(label, p1x, py + 30);
            }
            if (src2) {
                const label = src2.stage === '配合のみ' ? '配合' : src2.how === 'クリア報酬' ? '🏆' + src2.stage.replace(/^St\.\d+\s|^イベ\.\d+\s|^EX\d+\s/, '') : '🎲ガチャ';
                ctx.fillStyle = src2.stage === '配合のみ' ? '#888' : src2.how.includes('ガチャ') ? '#FFD700' : '#81C784';
                ctx.fillText(label, p2x, py + 30);
            }

            // ＋ 記号
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('+', (p1x + p2x) / 2, py + 6);

            // → 記号（未発見は薄く）
            ctx.fillStyle = isUnlocked ? '#4FC3F7' : '#2A4060';
            ctx.font = 'bold 22px Arial';
            ctx.fillText('→', (p2x + childX) / 2, py + 7);

            // 配合先：発見済みはカラー表示、未発見はシルエット
            if (isUnlocked) {
                drawMini(recipe.child, childX, py);
            } else {
                drawSilhouette(recipe.child, childX, py, frame);
            }

            // 名前テキスト
            ctx.textAlign = 'left';
            const nameX = childX + 28;

            if (isUnlocked) {
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = isLarge ? '#FFD700' : '#FFFFFF';
                ctx.fillText(recipe.child.name, nameX, iy + itemH / 2 - 10);

                ctx.font = '11px Arial';
                ctx.fillStyle = '#AAA';
                ctx.fillText(recipe.p1.name + '  ＋  ' + recipe.p2.name, nameX, iy + itemH / 2 + 6);

                // レア度バッジ
                const childRarity = CONFIG.ALLY_TYPE_RARITY[recipe.child.type] || 5;
                const rarityColor = childRarity >= 7 ? '#E040FB' : childRarity >= 6 ? '#FF4444' : '#FFD700';
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = rarityColor;
                ctx.fillText('⚗ 配合産 ' + '★'.repeat(childRarity), nameX, iy + itemH / 2 + 22);

                if (isLarge) {
                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = '#FF6F00';
                    ctx.fillText('  大型 (2枠)', nameX + 80, iy + itemH / 2 + 22);
                }

                // 発見済みバッジ
                ctx.fillStyle = 'rgba(76,175,80,0.2)';
                Renderer._roundRect(ctx, nameX, iy + itemH / 2 - 25, 44, 14, 4);
                ctx.fill();
                ctx.font = 'bold 9px Arial';
                ctx.fillStyle = '#81C784';
                ctx.fillText('✓ 発見済', nameX + 22, iy + itemH / 2 - 14);
            } else {
                // 未発見：名前は「？？？」
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#4A6FA5';
                ctx.fillText('？？？', nameX, iy + itemH / 2 - 5);

                ctx.font = '11px Arial';
                ctx.fillStyle = '#2A4060';
                ctx.fillText('配合して発見しよう！', nameX, iy + itemH / 2 + 11);
            }
        });

        ctx.restore();

        // スクロールバー
        const totalH = listBottom - listTop;
        const totalContent = recipes.length * itemStep;
        if (totalContent > totalH) {
            const barH = Math.max(30, (totalH / totalContent) * totalH);
            const maxScroll = totalContent - totalH;
            const barY = listTop + (maxScroll > 0 ? (scrollY / maxScroll) * (totalH - barH) : 0);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(W - 12, listTop, 6, totalH);
            ctx.fillStyle = '#8EC9F5';
            Renderer._roundRect(ctx, W - 12, barY, 6, barH, 3);
            ctx.fill();
        }

        // 操作ガイド
        ctx.font = '14px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        const isTouchR2 = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.fillText(
            isTouchR2 ? '▲▼: スクロール  Bボタン: 戻る' : '↑↓: スクロール  Q: 配合へ  B: 戻る',
            W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, { showBack: true });

    },

    // === エンディング画面 ===
    drawEnding(ctx, W, H, frame) {
        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1a0a2a');
        bg.addColorStop(0.5, '#2a1a3a');
        bg.addColorStop(1, '#1a0a2a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // 星
        for (let i = 0; i < 50; i++) {
            const sx = (Math.sin(i * 127.3 + frame * 0.001) * 0.5 + 0.5) * W;
            const sy = (Math.cos(i * 89.7 + frame * 0.001 * 0.7) * 0.5 + 0.5) * H;
            const ss = 1 + Math.sin(i * 3.7 + frame * 0.02) * 0.5;
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(sx, sy, ss, 0, Math.PI * 2);
            ctx.fill();
        }

        // メッセージ
        const messages = [
            '真・魔王タンクを倒した！',
            '',
            'スライムたちの世界に',
            '平和が戻った！',
            '',
            '',
            '遊んでくれて',
            'ありがとう！',
            '',
            '',
            'GAME COMPLETE!'
        ];

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';

        const startY = H * 0.25;
        const lineHeight = 40;

        messages.forEach((msg, i) => {
            const alpha = Math.min(1, Math.max(0, (frame - i * 30) / 60));
            ctx.save();
            ctx.globalAlpha = alpha;

            if (msg === 'GAME COMPLETE!') {
                ctx.font = 'bold 36px Arial';
                ctx.fillStyle = '#FFD700';
                // shadowColor removed for perf
                ctx.shadowBlur = 0;
            }

            ctx.fillText(msg, W / 2, startY + i * lineHeight);
            ctx.restore();
        });

        // 戻る
        if (frame > 400) {
            const alpha = 0.5 + Math.sin(frame * 0.08) * 0.5;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = '20px Arial';
            ctx.fillStyle = '#8EC9F5';
            ctx.fillText('Press SPACE to continue', W / 2, H - 60);
            ctx.restore();
        }
    },
    // ===== 配合誕生演出 =====
    drawFusionBirthAnim(ctx, W, H, child, timer, frame) {
        // timer: 50→0  軽量版 (光線6本のみ、全画面描画なし)
        if (!child || timer <= 0) return;
        const alpha = timer < 15 ? timer / 15 : 1;
        const cx = W / 2, cy = H / 2;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 半透明暗転（全画面fillRectは1回だけ）
        ctx.fillStyle = 'rgba(0,0,0,0.80)';
        ctx.fillRect(0, 0, W, H);

        // 光線エフェクト（6本に削減 + ループ内strokeStyle変更をやめて1色に統一）
        const rarity = child.rarity || 1;
        const rayColor = rarity >= 6 ? '#FFD700' : rarity >= 5 ? '#E040FB' : rarity >= 4 ? '#42A5F5' : '#4CAF50';
        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        ctx.translate(cx, cy);
        ctx.rotate(frame * 0.02);
        ctx.strokeStyle = rayColor;
        ctx.lineWidth = 14;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 350, Math.sin(angle) * 350);
        }
        ctx.stroke(); // 6本まとめて1回stroke()
        ctx.restore();

        // キャラクター表示（スケール固定で軽量化）
        const scale = 1.8 + Math.sin(frame * 0.15) * 0.08;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy - 30);
        ctx.scale(scale, scale);
        if (window.Renderer) {
            // ★バグ修正㉘: 2段階フォールバック＋darkColorをdir位置に渡すバグを修正
            UI._uiDrawAllyIcon(ctx, -40, -40, 80, 80, child, frame);
        }
        ctx.restore();

        // テキスト
        ctx.globalAlpha = alpha;
        const titleColor = rayColor;
        const isLB = child.isLimitBreak;
        const titleText = isLB ? `Lv.${child.level || 2} にアップ！` : '新しい仲間が誕生！';
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = titleColor;
        ctx.textAlign = 'center';
        ctx.fillText(titleText, cx, cy + 80);

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFF';
        ctx.fillText(child.name || '???', cx, cy + 112);

        const stars = '★'.repeat(Math.min(7, rarity)) + '☆'.repeat(Math.max(0, 7 - rarity));
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = titleColor;
        ctx.fillText(stars, cx, cy + 140);

        ctx.font = '13px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('○ボタン / タップで続ける', cx, H - 36);

        ctx.restore();
    },

    // ===== 10連スカウト 結果一覧 =====
    drawGacha10Summary(ctx, W, H, results, frame) {
        const t = _getFrameNow();
        const showCount = (window.game && window.game.gacha10ShowCount !== undefined)
            ? window.game.gacha10ShowCount : results.length;

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.fillRect(0, 0, W, H);
        const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H);
        bgGrad.addColorStop(0, 'rgba(40,10,80,0.8)');
        bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // タイトル
        ctx.save();
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('🎲 10連スカウト 結果', W / 2, 44);
        ctx.restore();

        // 最高レアリティを取得してボーダーカラー決定
        const maxRarity = Math.max(...results.map(r => r.rarity || 1));
        const borderColors = ['#9E9E9E', '#9E9E9E', '#4CAF50', '#9C27B0', '#FFD700', '#FF4444'];
        const borderCol = borderColors[Math.min(maxRarity - 1, 5)];

        // 外枠
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 3;
        Renderer._roundRect(ctx, 15, 55, W - 30, H - 110, 12);
        ctx.stroke();

        // 5×2 グリッド表示
        const cols = 5, rows = 2;
        const gridPadX = 18, gridPadY = 68;
        const gridW = W - gridPadX * 2;
        const gridH = H - gridPadY - 55; // 下部フッター分を残す
        const cellW = Math.floor(gridW / cols);
        const cellH = Math.floor(gridH / rows);
        const startX = gridPadX, startY = gridPadY;

        results.slice(0, 10).forEach((ally, i) => {
            if (i >= showCount) return; // 未表示はスキップ

            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * cellW;
            const cy = startY + row * cellH;
            const rarity = ally.rarity || 1;
            const rarityColors = ['#9E9E9E', '#9E9E9E', '#4CAF50', '#9C27B0', '#FFD700', '#FF4444'];
            const rCol = rarityColors[Math.min(rarity - 1, 5)];
            const isLimitBreak = ally.isLimitBreak;

            // 登場アニメ（最後に追加されたカードだけポップイン）
            const isNewest = (i === showCount - 1) && showCount <= results.length;
            const revealTimer = window.game?.gacha10ShowTimer ?? 8;
            // ★バグ修正: Math.min → Math.max
            // 意図: 1.3倍から1.0倍へ縮むバウンス演出
            // Math.min だと timer増加で 1.0→0→マイナスに縮んでカードが消えるバグ
            const popScale = isNewest ? Math.max(1, 1.3 - revealTimer * 0.03) : 1;
            const cardAlpha = isNewest ? Math.min(1, revealTimer / 4) : 1;

            ctx.save();
            ctx.globalAlpha = cardAlpha;
            ctx.translate(cx + cellW / 2, cy + cellH / 2);
            ctx.scale(popScale, popScale);
            ctx.translate(-(cx + cellW / 2), -(cy + cellH / 2));

            // セル背景
            if (rarity >= 5) {
                const pulse = 0.15 + Math.sin(t * 0.01 + i * 0.7) * 0.08;
                ctx.fillStyle = `rgba(${rarity >= 6 ? '80,0,0' : '60,50,0'},${0.8 + pulse})`;
            } else {
                ctx.fillStyle = 'rgba(20,25,40,0.9)';
            }
            Renderer._roundRect(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, 8);
            ctx.fill();
            ctx.strokeStyle = rarity >= 5 ? rCol : 'rgba(100,100,160,0.5)';
            ctx.lineWidth = rarity >= 5 ? 2.5 : 1;
            ctx.stroke();

            // ★5以上は輝きエフェクト
            if (rarity >= 5) {
                const glowAlpha = 0.12 + Math.sin(t * 0.015 + i) * 0.06;
                // ★バグ修正: 同様の NaN バグがあったため _hexToRgba パターンに統一
                const _h = rCol.replace('#', '');
                const _rr = parseInt(_h.substring(0, 2), 16), _gg = parseInt(_h.substring(2, 4), 16), _bb = parseInt(_h.substring(4, 6), 16);
                ctx.fillStyle = `rgba(${_rr},${_gg},${_bb},${glowAlpha})`;
                Renderer._roundRect(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, 8);
                ctx.fill();
            }

            // 仲間描画
            const iconSize = Math.min(cellW, cellH) * 0.55;
            const iconX = cx + cellW / 2 - iconSize / 2;
            const iconY = cy + 8;
            // ★バグ修正㉘: 2段階フォールバック＋darkColorをdir位置に渡すバグを修正
            UI._uiDrawAllyIcon(ctx, iconX, iconY, iconSize, iconSize, ally, 0);

            if (isLimitBreak) {
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = '#FF9800';
                ctx.textAlign = 'center';
                ctx.fillText('Lv UP!', cx + cellW / 2, iconY - 2);
            }

            // 名前
            ctx.font = `bold ${Math.min(13, 11 + Math.floor(cellW / 50))}px Arial`;
            ctx.fillStyle = rarity >= 5 ? rCol : '#FFF';
            ctx.textAlign = 'center';
            ctx.fillText(ally.name, cx + cellW / 2, cy + cellH - 22);

            // 星表示
            ctx.font = `${Math.min(11, cellW / 7)}px Arial`;
            ctx.fillStyle = rCol;
            ctx.fillText('★'.repeat(Math.min(rarity, 6)), cx + cellW / 2, cy + cellH - 8);

            ctx.restore();
        });

        // まだ表示中なら「...」表示
        if (showCount < results.length) {
            ctx.save();
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.6 + Math.sin(t * 0.05) * 0.4;
            ctx.fillText('▼ スカウト中...', W / 2, H - 22);
            ctx.restore();
        } else {
            // フッター
            ctx.save();
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#CCC';
            ctx.textAlign = 'center';
            const pulse = 0.6 + Math.sin(t * 0.01) * 0.4;
            ctx.globalAlpha = pulse;
            ctx.fillText('○ボタン / タップ で閉じる', W / 2, H - 18);
            ctx.restore();
        }
    },

    // ===== ガチャ冒険演出 =====
    drawGachaAdventureAnim(ctx, W, H, rarity, timer, frame) {
        // タイマー最大値をレア度で変える（buyGacha側で設定済み）
        const maxTimer = (rarity >= 5) ? 200 : (rarity >= 4) ? 150 : 110;
        const progress = 1 - timer / maxTimer; // 0→1
        const alpha = timer < 15 ? timer / 15 : Math.min(1, timer > (maxTimer - 10) ? (maxTimer - timer) / 10 : 1);

        // レア度ごとのテーマ定義
        const themes = {
            1: { bg: ['#1B5E20', '#2E7D32'], accent: '#81C784', label: '冒険へ旅立て！', stars: 1, trail: '#A5D6A7' },
            2: { bg: ['#1A237E', '#283593'], accent: '#90CAF9', label: '蒼い風が吹く！', stars: 2, trail: '#BBDEFB' },
            3: { bg: ['#4A148C', '#6A1B9A'], accent: '#CE93D8', label: '神秘の力が宿る！', stars: 3, trail: '#E1BEE7' },
            4: { bg: ['#0D47A1', '#1976D2'], accent: '#42A5F5', label: '運命が輝く！！', stars: 4, trail: '#90CAF9' },
            5: { bg: ['#E65100', '#F57F17'], accent: '#FFD700', label: '黄金の奇跡！！！', stars: 5, trail: '#FFF176' },
            6: { bg: ['#0A0020', '#2D0050'], accent: '#E040FB', label: '超越の存在が降臨！！！', stars: 6, trail: '#F48FB1' },
        };
        const theme = themes[Math.min(6, Math.max(1, rarity))] || themes[1];

        ctx.save();
        ctx.globalAlpha = alpha;

        // ── ★5以上: 前半は暗転「何かが来る...」演出 ──
        if (rarity >= 5 && progress < 0.45) {
            // ★バグ修正: 早期returnのctx.restore()が関数全体のsaveを消費してしまい
            // 後半処理（progress>=0.45）でrestore()時にスタックアンダーフローが発生していた。
            // 早期returnブロック専用のsave/restoreを追加して修正。
            ctx.save();
            // 暗い背景で光が走る演出
            const darkProg = progress / 0.45; // 0→1
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);

            // 中心から放射する光の柱
            ctx.save();
            ctx.translate(W / 2, H / 2);
            const beams = rarity >= 6 ? 8 : 6;
            for (let i = 0; i < beams; i++) {
                const a = (i / beams) * Math.PI * 2 + frame * 0.02;
                const beamAlpha = darkProg * 0.3 * (0.5 + Math.sin(frame * 0.05 + i) * 0.5);
                ctx.globalAlpha = alpha * beamAlpha;
                ctx.strokeStyle = theme.accent;
                ctx.lineWidth = 2 + darkProg * 4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * W, Math.sin(a) * W);
                ctx.stroke();
            }
            ctx.restore();
            ctx.globalAlpha = alpha;

            // 揺れるテキスト「？？？」
            const shake = rarity >= 6 ? Math.sin(frame * 0.3) * 5 * darkProg : 0;
            ctx.save();
            ctx.translate(W / 2 + shake, H * 0.35);
            ctx.font = `bold ${Math.round(44 + darkProg * 10)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = theme.accent;
            _uiSetShadowBlur(ctx, 20 + darkProg * 20);
            ctx.globalAlpha = alpha * Math.min(1, darkProg * 2);
            ctx.fillStyle = rarity >= 6 ? '#E040FB' : '#FFD700';
            ctx.fillText(rarity >= 6 ? '⚠ 超レア ⚠' : '✦ HIGH RARE ✦', 0, 0);
            ctx.shadowBlur = 0;
            ctx.restore();
            ctx.globalAlpha = alpha;

            // ★が降ってくる
            const starCount = rarity >= 6 ? 15 : 10;
            for (let i = 0; i < starCount; i++) {
                const seed = i * 137.5;
                const sx = (seed * 80 + frame * (1 + i % 3)) % W;
                const sy = ((frame * (2 + i % 4) + seed * 60) % H);
                ctx.globalAlpha = alpha * darkProg * (0.4 + Math.sin(frame * 0.1 + i) * 0.3);
                ctx.font = `${14 + (i % 4) * 6}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillStyle = theme.accent;
                ctx.fillText('★', sx, sy);
            }
            ctx.globalAlpha = alpha;

            // 画面が徐々に明るくなる（progress=0.4付近でフラッシュ）
            if (darkProg > 0.8) {
                const flashAlpha = (darkProg - 0.8) / 0.2 * 0.7;
                ctx.globalAlpha = alpha * flashAlpha;
                ctx.fillStyle = rarity >= 6 ? '#FF00FF' : '#FFD700';
                ctx.fillRect(0, 0, W, H);
                ctx.globalAlpha = alpha;
            }

            ctx.restore(); // 早期returnブロック専用のrestore
            ctx.restore(); // 関数全体のrestore（早期return時も忘れずに閉じる）
            return; // 前半はここで終了
        }

        // ── ★5以上: タイミング補正（暗転後にprogress=0.45からスタートするよう調整）──
        const runProgress = rarity >= 5
            ? Math.min(1, (progress - 0.45) / 0.55)
            : progress;

        // ── 背景グラデーション ──
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, theme.bg[0]);
        bg.addColorStop(1, theme.bg[1]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // ── ★5以上: 全体フラッシュ（登場の瞬間） ──
        if (rarity >= 5 && runProgress < 0.1) {
            const flashAlpha = (0.1 - runProgress) / 0.1 * 0.95;
            ctx.globalAlpha = Math.min(alpha, flashAlpha);
            ctx.fillStyle = rarity >= 6 ? '#FF00FF' : '#FFD700';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = alpha;
        }

        // ── 放射状ビーム（★4以上） ──
        if (rarity >= 4) {
            const beamCount = 10 + rarity * 4;
            const beamAlpha = 0.12 + (rarity - 4) * 0.08;
            const rotSpeed = rarity >= 6 ? 0.025 : 0.012;
            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.rotate(frame * rotSpeed);
            for (let i = 0; i < beamCount; i++) {
                const angle = (i / beamCount) * Math.PI * 2;
                ctx.globalAlpha = alpha * beamAlpha;
                ctx.fillStyle = theme.accent;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * W, Math.sin(angle) * W);
                ctx.lineTo(Math.cos(angle + Math.PI / beamCount) * W, Math.sin(angle + Math.PI / beamCount) * W);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            ctx.globalAlpha = alpha;
        }

        // ── パーティクル（レア度で数・大きさが増加） ──
        const ptCount = 6 + rarity * 5;
        for (let i = 0; i < ptCount; i++) {
            const seed = i * 137.508 + rarity * 17;
            const speed = (2 + (seed % 4)) * (0.5 + rarity * 0.15);
            const px = ((frame * speed + seed * 80) % (W + 60)) - 30;
            const py = ((seed * 60 + Math.sin(frame * 0.07 + i) * 60) % H + H) % H;
            const psize = 8 + rarity * 3 + Math.sin(frame * 0.1 + i) * 4;

            ctx.globalAlpha = alpha * (0.5 + Math.sin(frame * 0.05 + i) * 0.3);
            ctx.fillStyle = theme.accent;
            ctx.font = `${Math.max(10, psize)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('★', px, py);
        }
        ctx.globalAlpha = alpha;

        // ── ★6: 稲妻エフェクト ──
        if (rarity >= 6 && frame % 6 < 3) {
            ctx.strokeStyle = '#FF00FF';
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.7;
            for (let l = 0; l < 3; l++) {
                ctx.beginPath();
                let lx = (frame * 37 + l * 200) % W;
                ctx.moveTo(lx, 0);
                for (let s = 0; s < 8; s++) {
                    lx += (Math.random() - 0.5) * 80;
                    ctx.lineTo(lx, s * (H / 8));
                }
                ctx.stroke();
            }
            ctx.globalAlpha = alpha;
        }

        // ── スライムキャラが走るアニメーション ──
        const slimeX = runProgress < 0.85 ? -60 + runProgress * (W + 120) / 0.85 : W + 120;
        const slimeY = H * 0.58;
        const bounce = Math.abs(Math.sin(frame * 0.35)) * 18;
        const slimeSize = 55 + rarity * 5;

        if (slimeX > -80 && slimeX < W + 80) {
            ctx.save();
            ctx.translate(slimeX, slimeY - bounce);
            ctx.rotate(runProgress < 0.85 ? 0.18 : 0);

            // 光のオーラ（★4以上）
            if (rarity >= 4) {
                const auraAlpha = 0.25 + Math.sin(frame * 0.1) * 0.1;
                const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, slimeSize);
                aura.addColorStop(0, theme.accent);
                aura.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalAlpha = alpha * auraAlpha;
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(0, 0, slimeSize * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha;
            }

            // スライム本体
            if (window.Renderer) {
                window.Renderer.drawSlime(ctx, -slimeSize / 2, -slimeSize / 2, slimeSize, slimeSize,
                    theme.accent, theme.bg[0], 1, frame, bounce > 5 ? 3 : 0, 'slime');
            }

            // トレイル（残像）
            for (let t = 1; t <= 4; t++) {
                const trailProg = Math.max(0, runProgress - t * 0.04);
                const trailX = -60 + trailProg * (W + 120) / 0.85 - slimeX;
                ctx.globalAlpha = alpha * (0.25 - t * 0.05);
                ctx.fillStyle = theme.trail;
                ctx.beginPath();
                ctx.arc(trailX, 0, slimeSize * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            ctx.globalAlpha = alpha;
        }

        // ── 地面ライン ──
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, H * 0.63, W, 3);

        // ── メインタイトルテキスト ──
        const textBounce = Math.sin(frame * 0.12) * 4;
        ctx.save();
        ctx.translate(W / 2, H * 0.22 + textBounce);
        const textScale = rarity >= 6 ? 1 + Math.sin(frame * 0.08) * 0.05 : 1;
        ctx.scale(textScale, textScale);

        const fontSize = 28 + rarity * 2;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (rarity >= 5) {
            ctx.shadowColor = theme.accent;
            _uiSetShadowBlur(ctx, 18 + Math.sin(frame * 0.1) * 8);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = 6;
        ctx.strokeText(theme.label, 0, 0);
        const tg2 = ctx.createLinearGradient(-150, -20, 150, 20);
        tg2.addColorStop(0, theme.accent);
        tg2.addColorStop(0.5, '#FFF');
        tg2.addColorStop(1, theme.accent);
        ctx.fillStyle = tg2;
        ctx.fillText(theme.label, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── 星表示 ──
        ctx.font = `bold ${18 + rarity}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.accent;
        if (rarity >= 5) {
            ctx.shadowColor = theme.accent;
            _uiSetShadowBlur(ctx, 12);
        }
        const starStr = '★'.repeat(rarity) + '☆'.repeat(Math.max(0, 6 - rarity));
        ctx.fillText(starStr, W / 2, H * 0.22 + 44);
        ctx.shadowBlur = 0;

        // ── フッターテキスト ──
        if (timer > 30) {
            const ftAlpha = Math.min(1, (timer - 30) / 20);
            ctx.globalAlpha = alpha * ftAlpha;
            ctx.font = '18px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.textAlign = 'center';
            ctx.fillText('スライムが旅に出た！', W / 2, H * 0.8);
        }

        ctx.restore();
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    // ===== 必殺技インパクト演出（軽量版） =====
    drawSpecialImpact(ctx, W, H, timer, frame, damage = 50) {
        // timer: 55→0  フェーズ1(55-30):テキスト表示  フェーズ2(30-0):衝撃波
        if (timer <= 0) return;
        ctx.save();

        if (timer > 30) {
            // テキスト＋ダメージ数字のみ (全画面暗転なし)
            const phase = (timer - 30) / 25; // 1→0
            ctx.globalAlpha = Math.min(1, phase * 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 「必殺技！」テキスト（アウトライン付きで視認性UP）
            ctx.font = 'bold 44px Arial';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 6;
            ctx.strokeText('必 殺 技 ！', W / 2, H * 0.22);
            ctx.fillStyle = '#FF1744';
            ctx.fillText('必 殺 技 ！', W / 2, H * 0.22);

            // ダメージ数字
            ctx.font = 'bold 32px Arial';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 5;
            ctx.strokeText(`－${damage}`, W * 0.72, H * 0.25);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`－${damage}`, W * 0.72, H * 0.25);
        } else {
            // 衝撃波リング
            const phase = timer / 30; // 1→0
            const radius = (1 - phase) * Math.max(W, H) * 0.7;
            ctx.globalAlpha = phase * 0.55;
            ctx.strokeStyle = '#FF1744';
            ctx.lineWidth = 5 * phase;
            ctx.beginPath();
            ctx.arc(W * 0.72, H * 0.28, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = phase * 0.3;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(W * 0.72, H * 0.28, radius * 0.55, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
        ctx.textBaseline = 'alphabetic'; // ★ textBaseline リセット
    },

    // =====================================================
    // ★新規: 設定画面
    // =====================================================
    drawSettings(ctx, W, H, saveData, settingsCursor, frame) {
        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d1525');
        bg.addColorStop(1, '#1a2535');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // タイトルや各種ボタン類は React（SettingsMenu）で描画するためコメントアウト
        /*
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('⚙ 設定', W / 2, 52);

        // ... (以下CanvasUIの描画処理をスキップ)
        */

        // フッター
        ctx.font = '12px Arial';
        ctx.fillStyle = '#444';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ セーブデータはブラウザに保存されます。定期的に書き出しを推奨。', W / 2, H - 36);

        // 操作ガイド
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(160,200,255,0.65)';
        ctx.fillText(
            isTouch
                ? '▲▼: 選択   ○ボタン: 決定   ◀▶: 音量   Bボタン: 戻る   H: ヘルプ'
                : '↑↓: 選択   Space/Enter: 決定   ←→: 音量   B: 戻る   H: ヘルプ',
            W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, { showBack: true });

        // ヘルプオーバーレイ
        if (window.game && window.game.showHelp) {
            this._drawHelpOverlay(ctx, W, H, 'settings');
        }

    },

    // ================================================================
    // 初回インベージョン説明オーバーレイ（初回のみ4秒間表示）
    // ================================================================
    drawInvasionTutorial(ctx, W, H, timer) {
        // timer: 240→0
        const alpha = timer > 220 ? (240 - timer) / 20 :  // フェードイン
            timer < 30 ? timer / 30 :            // フェードアウト
                1.0;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 20, 0.82)';
        const panelW = W * 0.88, panelH = H * 0.48;
        const panelX = W / 2 - panelW / 2;
        const panelY = H * 0.22;
        Renderer._roundRect(ctx, panelX, panelY, panelW, panelH, 14);
        ctx.fill();

        // 枠線（オレンジ）
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 2.5;
        Renderer._roundRect(ctx, panelX, panelY, panelW, panelH, 14);
        ctx.stroke();

        // タイトル
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 敵タンクに突入！', W / 2, panelY + 38);

        // 説明文
        const lines = [
            '敵タンクの内部に乗り込んで',
            'スイッチを全部ONにしよう！',
        ];
        ctx.font = '17px Arial';
        ctx.fillStyle = '#FFF';
        lines.forEach((l, i) => ctx.fillText(l, W / 2, panelY + 74 + i * 26));

        // 操作説明ボックス
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const ops = isTouch ? [
            { key: 'スティック', desc: '移動' },
            { key: 'Zボタン', desc: 'スイッチ操作' },
            { key: 'Bボタン', desc: '味方タンクに戻る' },
        ] : [
            { key: '← → ↑ ↓', desc: '移動' },
            { key: 'Z', desc: 'スイッチを操作' },
            { key: 'B', desc: '味方タンクに戻る' },
        ];

        const opY = panelY + 138;
        ctx.font = 'bold 13px Arial';
        ops.forEach((op, i) => {
            const oy = opY + i * 32;
            // キーバッジ
            ctx.fillStyle = '#FF8C00';
            Renderer._roundRect(ctx, panelX + 18, oy - 14, 120, 24, 6);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'left';
            ctx.fillText(op.key, panelX + 78, oy + 4);
            // 説明
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText('→ ' + op.desc, panelX + 152, oy + 4);
        });

        // フッター
        const tapLabel = isTouch ? 'タップして閉じる' : 'スペース / Z で閉じる';
        ctx.font = '13px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.textAlign = 'center';
        ctx.fillText(tapLabel, W / 2, panelY + panelH - 14);

        ctx.restore();
    },


};

// ======================================
// TANK CUSTOMIZE SCREEN
// ======================================
UI.drawCustomize = function (ctx, W, H, saveData, cursor, frame) {
    if (!window.TANK_PARTS) return;
    const parts = window.TANK_PARTS;
    const custom = saveData.tankCustom || { skin: 'skin_default' };
    const currentSkin = custom.skin || 'skin_default';
    const unlockedParts = saveData.unlockedParts || [];
    const skins = parts.skins || [];

    // ── 背景 ──
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(100,160,255,0.06)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

    // ── タイトル ──
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD740';
    ctx.fillText('🎨 タンクスキン選択', W / 2, 38);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('スキンを選んで戦車の見た目を変えよう！', W / 2, 56);

    // ── プレビューエリア ──
    const preW = 200, preH = 130;
    const preX = W / 2 - preW / 2, preY = 64;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    Renderer._roundRect(ctx, preX, preY, preW, preH, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,64,0.4)'; ctx.lineWidth = 1.5;
    Renderer._roundRect(ctx, preX, preY, preW, preH, 14); ctx.stroke();

    // ミニタンクプレビュー（選択中のスキン）
    ctx.save();
    // プレビューエリアをクリップしてはみ出しを防止
    ctx.beginPath();
    ctx.rect(preX + 2, preY + 2, preW - 4, preH - 4);
    ctx.clip();
    const sc = 0.46; // スケール微調整（大きすぎてはみ出ていたため縮小）
    ctx.scale(sc, sc);
    // 選択中のスキンをsaveDataに一時反映してプレビュー
    if (!saveData.tankCustom) saveData.tankCustom = {};
    const prevSkin = saveData.tankCustom.skin || 'skin_default'; // undefinedを防ぐ
    const selSkin = skins[cursor.item] ? skins[cursor.item].id : 'skin_default';
    saveData.tankCustom.skin = selSkin;
    // プレビュー位置を中央に寄せる（スケール後座標で計算）
    const prevTankW = 240, prevTankH = 180;
    const prevCenterX = (preX + preW / 2) / sc - prevTankW / 2;
    const prevCenterY = (preY + preH / 2) / sc - prevTankH / 2 + 10;
    try {
        Renderer.drawTankExterior(ctx, prevCenterX, prevCenterY, prevTankW, prevTankH, false, 0, false);
    } catch (e) {
        console.warn('スキンプレビュー描画エラー:', e);
    } finally {
        saveData.tankCustom.skin = prevSkin; // エラー時も必ず復元
    }
    ctx.restore();

    // ── スキンリスト ──
    const listY = preY + preH + 10;
    const itemH = 52;
    const visibleCount = Math.floor((H - listY - 50) / itemH);
    const startIdx = Math.max(0, Math.min(cursor.item - Math.floor(visibleCount/2), skins.length - visibleCount));

    skins.forEach((skin, si) => {
        if (si < startIdx || si >= startIdx + visibleCount) return;
        const iy = listY + (si - startIdx) * itemH;
        const isSelected = (si === cursor.item);
        const isEquipped = (currentSkin === skin.id);
        const isUnlocked = skin.isDefault || unlockedParts.includes(skin.id);
        const isSecret = skin.isSecret;

        // カード背景
        ctx.fillStyle = isSelected
            ? 'rgba(255,215,64,0.18)'
            : isEquipped
            ? 'rgba(41,182,246,0.12)'
            : 'rgba(255,255,255,0.05)';
        Renderer._roundRect(ctx, 16, iy + 2, W - 32, itemH - 4, 10); ctx.fill();

        if (isSelected) {
            ctx.strokeStyle = '#FFD740'; ctx.lineWidth = 2;
            Renderer._roundRect(ctx, 16, iy + 2, W - 32, itemH - 4, 10); ctx.stroke();
        } else if (isEquipped) {
            ctx.strokeStyle = '#29B6F6'; ctx.lineWidth = 1.5;
            Renderer._roundRect(ctx, 16, iy + 2, W - 32, itemH - 4, 10); ctx.stroke();
        }

        // アイコン＆名前
        const iconX = 44, nameX = 72, nameY = iy + 22;
        ctx.font = '22px serif'; ctx.textAlign = 'left';
        if (!isUnlocked && !isSecret) {
            ctx.fillStyle = '#666';
            ctx.fillText('🔒', iconX - 8, nameY + 6);
        } else {
            ctx.fillText(skin.name.split(' ')[0], iconX - 10, nameY + 6);
        }

        ctx.font = isSelected ? 'bold 14px Arial' : '13px Arial';
        ctx.fillStyle = isUnlocked ? (isSelected ? '#FFD740' : '#FFF') : '#555';
        ctx.fillText(isUnlocked ? skin.name : '???', nameX, nameY);

        ctx.font = '11px Arial';
        ctx.fillStyle = isUnlocked ? 'rgba(255,255,255,0.5)' : '#444';
        ctx.fillText(isUnlocked ? skin.desc : 'クリア報酬で解放', nameX, nameY + 16);

        // 装備中バッジ
        if (isEquipped) {
            ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
            ctx.fillStyle = '#29B6F6';
            ctx.fillText('✓ 装備中', W - 24, nameY);
        }
    });

    // ── フッター ──
    ctx.font = '13px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('▲▼: 選択   Z: 装備   B: 戻る', W / 2, H - 22);

    UI.drawNavBar(ctx, W, H, { showBack: true, showConfirm: true, confirmLabel: '装備 (Z)' });

    if (window.game && window.game.showHelp) {
        UI._drawHelpOverlay(ctx, W, H, 'customize');
    }
};

// =====================================================
// ★バグ修正: _drawHelpOverlay が定義されていなかった
// showHelp=true 時に全画面でヘルプオーバーレイを表示する
// =====================================================
UI._drawHelpOverlay = function(ctx, W, H, screenName) {
        const helps = {
            deck_edit: [
                '↑↓ / スワイプ : 弾を選択',
                'Z / タップ    : デッキに追加/外す',
                'X            : そのままバトル開始',
                'Space        : 仲間編成へ進む',
                'B            : 前の画面に戻る',
            ],
            ally_edit: [
                '↑↓ / スワイプ : 仲間を選択',
                'Z / タップ    : パーティに追加/外す',
                'Space        : バトル開始！',
                'B            : 前の画面に戻る',
                'コスト上限: 3（大型は2枠）',
            ],
            upgrade: [
                '↑↓          : 項目を選択',
                'Space/Enter  : 購入・決定',
                '←→          : 音量調整',
                'B            : 前の画面に戻る',
                '💰 ゴールドは敵を倒して獲得',
            ],
            fusion: [
                '↑↓          : 仲間を選択',
                'Space/Enter  : 配合素材に選ぶ（2体選ぶと配合）',
                'Del          : 仲間を解放（消去）',
                'Q / Tab      : レシピ図鑑タブへ',
                'F            : 配合可能フィルタ切替',
                'B            : 前の画面に戻る',
            ],
            collection: [
                '← →         : タブ切替（敵/仲間）',
                '↑↓ / スワイプ : スクロール',
                'S            : 仲間図鑑のソート切替',
                'B            : 前の画面に戻る',
            ],
            daily_missions: [
                'ミッションをクリアしてゴールドを獲得！',
                'ミッションは毎日リセットされます。',
                'B / タップ    : 前の画面に戻る',
            ],
            settings: [
                '↑↓          : 設定項目を選択',
                '←→          : 音量を調整',
                'Space/Enter  : 決定',
                'B            : 前の画面に戻る',
            ],
            customize: [
                '↑↓ / スワイプ : スキンを選択',
                'Z            : 選択中のスキンを装備',
                'B            : 前の画面に戻る',
                'スキンはバトルクリアで解放されます',
            ],
        };

        const lines = helps[screenName] || ['H キー : ヘルプ表示/非表示'];

        // 半透明暗転
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.fillRect(0, 0, W, H);

        // パネル
        const panelW = W * 0.84;
        const lineH = 34;
        const padV = 20;
        const panelH = lines.length * lineH + padV * 2 + 50;
        const panelX = (W - panelW) / 2;
        const panelY = (H - panelH) / 2;

        ctx.fillStyle = 'rgba(10,20,50,0.96)';
        Renderer._roundRect(ctx, panelX, panelY, panelW, panelH, 14);
        ctx.fill();
        ctx.strokeStyle = '#5BA3E6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // タイトル
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📖  ヘルプ', W / 2, panelY + padV + 12);

        // 区切り線
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 16, panelY + padV + 28);
        ctx.lineTo(panelX + panelW - 16, panelY + padV + 28);
        ctx.stroke();

        // 各行
        ctx.font = '14px Arial';
        ctx.fillStyle = '#DDD';
        ctx.textAlign = 'left';
        lines.forEach((line, i) => {
            ctx.fillText(line, panelX + 24, panelY + padV + 50 + i * lineH);
        });

        // 閉じる案内
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('H キー / タップで閉じる', W / 2, panelY + panelH - 12);

        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    },

window.UI = UI;
