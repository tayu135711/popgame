// ======================================
// UI - HUD & Menus (Polished)
// ======================================

// HUDグラデーションキャッシュ（毎フレーム生成を回避）
let _hudGradCache = null;
let _hudGradCtx = null;

const UI = {

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
            ctx.shadowBlur = 5;
            ctx.fillText(label, bx + bw / 2, y + btnH / 2);
            ctx.shadowBlur = 0;
        }

        if (showConfirm) {
            const label = isTouch ? '決定（Zボタン）▶' : confirmLabel;
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
            ctx.shadowBlur = 5;
            ctx.fillText(label, bx + bw / 2, y + btnH / 2);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    },

    drawHUD(ctx, battle, stageData) {
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
        const splitY = H * 0.5;

        // === ROCKET SLIME STYLE HUD PANEL (Curved Dual Bars) ===
        ctx.save();

        // 1. Center Background Curve (The Blue Shell)
        const panelH = 70;
        const panelY = splitY - panelH / 2 - 5;

        ctx.beginPath();
        ctx.moveTo(0, panelY + 15);
        // Main curve up for HP clusters
        ctx.quadraticCurveTo(W * 0.15, panelY - 15, W * 0.35, panelY);
        // Center dip for VS
        ctx.quadraticCurveTo(W * 0.5, panelY + 10, W * 0.65, panelY);
        // Main curve up for enemy HP cluster
        ctx.quadraticCurveTo(W * 0.85, panelY - 15, W, panelY + 15);
        ctx.lineTo(W, splitY + 45);
        ctx.lineTo(0, splitY + 45);
        ctx.closePath();

        // Shiny Gradient
        // HUDグラデーションをキャッシュ（毎フレーム createLinearGradient するのを回避）
        if (_hudGradCtx !== ctx) {
            _hudGradCtx = ctx;
            _hudGradCache = null;
        }
        if (!_hudGradCache) {
            _hudGradCache = ctx.createLinearGradient(0, panelY - 10, 0, splitY + 30);
            _hudGradCache.addColorStop(0, '#3A5ABA');
            _hudGradCache.addColorStop(0.3, '#2A4A9A');
            _hudGradCache.addColorStop(1, '#1A2A6A');
        }
        ctx.fillStyle = _hudGradCache;
        ctx.fill();

        // Thick White Boarder
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Golden Inner Border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 5]); // Dashed effect for flair? Let's keep it solid for now
        ctx.stroke();
        ctx.setLineDash([]);

        // === VS & STAGE INFO ===
        // Glow behind center
        // shadowColor removed for perf ctx.shadowBlur = 0;
        ctx.fillStyle = '#1A2A6A';
        ctx.beginPath(); ctx.arc(W / 2, splitY + 2, 28, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3; ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', W / 2, splitY + 3);

        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(stageData?.name || '', W / 2, splitY - 18);

        // --- TIMER & BOSS RUSH HUD ---
        const totalSeconds = Math.floor(battle.battleTimer / 60);
        let timeText = "";

        if (stageData?.timeLimit) {
            const remaining = Math.max(0, stageData.timeLimit - totalSeconds);
            timeText = `LIMIT: ${remaining}s`;
            if (remaining <= 10) ctx.fillStyle = (_getFrameNow() % 500 < 250) ? '#F00' : '#FFF'; // Blinking red
            else ctx.fillStyle = '#FFF';
        } else {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            timeText = `${mins}:${secs.toString().padStart(2, '0')}`;
            ctx.fillStyle = '#AAA';
        }

        ctx.font = 'bold 10px monospace';
        ctx.fillText(timeText, W / 2, splitY - 30);

        // Boss Rush Indicator
        if (stageData?.isBossRush && stageData.bosses) {
            const current = (battle.currentBossIndex || 0) + 1;
            const total = stageData.bosses.length;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`RUSH: ${current}/${total}`, W / 2, splitY + 22);
        }

        // Floor Indicator
        // Floor Indicator
        // Floor Indicator Removed (Single Screen)

        // === NEW HP BARS ===
        const barW = 160;
        const barH = 24;

        // Player Side (Left)
        this._drawFancyHP(ctx, 30, splitY - 8, barW, barH, battle.playerTankHP, battle.playerTankMaxHP, true);

        // Enemy Side (Right)
        this._drawFancyHP(ctx, W - 30 - barW, splitY - 8, barW, barH, battle.enemyTankHP, battle.enemyTankMaxHP, false);

        // 敵HP数字表示
        ctx.save();
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = battle.enemyTankHP <= battle.enemyTankMaxHP * 0.3 ? '#FF5252' : '#FFF';
        ctx.fillText(`${battle.enemyTankHP} / ${battle.enemyTankMaxHP}`, W - 30 - barW / 2, splitY + 18);
        ctx.restore();

        // === SPECIAL GAUGE (Slimmer at bottom) ===
        const spW = 240;
        const spH = 8;
        const spX = W / 2 - spW / 2;
        const spY = splitY + 32;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        Renderer._roundRect(ctx, spX, spY, spW, spH, 4);
        ctx.fill();

        const spRatio = Math.min(1, battle.specialGauge / battle.maxSpecialGauge);
        if (spRatio > 0) {
            let spColor = spRatio >= 1 ? `hsl(${(_getFrameNow() / 5) % 360}, 100%, 50%)` : '#FFD700';
            ctx.fillStyle = spColor;
            Renderer._roundRect(ctx, spX + 1, spY + 1, (spW - 2) * spRatio, spH - 2, 3);
            ctx.fill();
            if (spRatio >= 1) {
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = spColor;
                ctx.fillText('★ Ｘボタンで必殺技 ★', W / 2, spY + 22);
            }
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
        this._drawHearts(ctx, 20, H - 30, battle.playerTankHP, battle.playerTankMaxHP);

        // === 連携技クールダウンゲージ（Bottom Center） ===
        if (window.game && window.game.allyComboTimer !== undefined) {
            const maxCooldown = 900; // 15秒
            const cooldownRatio = window.game.allyComboTimer / maxCooldown;
            const isReady = window.game.allyComboTimer <= 0;

            const gaugeW = 200;
            const gaugeH = 16;
            const gaugeX = W / 2 - gaugeW / 2;
            const gaugeY = H - 60;

            // 背景
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            Renderer._roundRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 8);
            ctx.fill();

            // クールダウン部分（逆算：減っていく）
            if (!isReady) {
                ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
                Renderer._roundRect(ctx, gaugeX + 2, gaugeY + 2, (gaugeW - 4) * cooldownRatio, gaugeH - 4, 6);
                ctx.fill();
            } else {
                // 準備完了（点滅）
                const pulse = 0.6 + Math.sin(_getFrameNow() * 0.01) * 0.4;
                ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                Renderer._roundRect(ctx, gaugeX + 2, gaugeY + 2, gaugeW - 4, gaugeH - 4, 6);
                ctx.fill();
            }

            // テキスト
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isReady ? '#FFD700' : '#FFF';
            const text = isReady ? '[C] 連携技 準備完了！' : `連携技 ${Math.ceil(window.game.allyComboTimer / 60)}秒`;
            ctx.fillText(text, gaugeX + gaugeW / 2, gaugeY - 5);
        }

        // === タイタン＆ドラゴン 連携技ゲージ（Cボタン） ===
        if (window.game && window.game.allies) {
            const g = window.game;
            const MAX_G = g.MAX_ALLY_SPECIAL_GAUGE || 3600;
            const t = _getFrameNow();
            let gaugeY = H - 82;

            // ゲージ描画ヘルパー（タイタン・ドラゴン共通）
            const drawAllyGauge = (gauge, icon, labelReady, labelCharging, colorReady, colorFill) => {
                const ratio = Math.min(1, (gauge || 0) / MAX_G);
                const isReady = ratio >= 1;
                // 残り秒数
                const secsLeft = Math.ceil((MAX_G - (gauge || 0)) / 60);
                const gaugeW = 200;
                const gaugeH = 12;
                const gaugeX = W / 2 - gaugeW / 2;

                ctx.save();
                // 背景
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                Renderer._roundRect(ctx, gaugeX - 22, gaugeY - 2, gaugeW + 26, gaugeH + 4, 7);
                ctx.fill();

                // ゲージ本体
                if (ratio > 0) {
                    if (isReady) {
                        // 準備完了：点滅
                        const pulse = 0.65 + Math.sin(t * 0.008) * 0.35;
                        ctx.fillStyle = `rgba(${colorReady},${pulse})`;
                    } else {
                        // チャージ中：solid color（毎フレームグラデーション生成を回避）
                        ctx.fillStyle = colorFill[1];
                    }
                    Renderer._roundRect(ctx, gaugeX + 1, gaugeY + 1, (gaugeW - 2) * ratio, gaugeH - 2, 5);
                    ctx.fill();
                }

                // 10秒ごとの目盛り線（6本 = 10,20,30,40,50秒）
                ctx.strokeStyle = 'rgba(255,255,255,0.18)';
                ctx.lineWidth = 1;
                for (let seg = 1; seg <= 5; seg++) {
                    const lx = gaugeX + (gaugeW / 6) * seg;
                    ctx.beginPath();
                    ctx.moveTo(lx, gaugeY);
                    ctx.lineTo(lx, gaugeY + gaugeH);
                    ctx.stroke();
                }

                // アイコン
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = isReady ? '#FFD700' : '#AAA';
                ctx.fillText(icon, gaugeX - 20, gaugeY + gaugeH - 1);

                // テキスト
                ctx.font = isReady ? 'bold 11px Arial' : '11px Arial';
                ctx.textAlign = 'center';
                if (isReady) {
                    const pulse = 0.75 + Math.sin(t * 0.012) * 0.25;
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText(`[C] ${labelReady}`, gaugeX + gaugeW / 2, gaugeY - 3);
                    ctx.globalAlpha = 1;
                } else {
                    ctx.fillStyle = 'rgba(200,200,200,0.8)';
                    ctx.fillText(`${labelCharging}  ${secsLeft}秒`, gaugeX + gaugeW / 2, gaugeY - 3);
                }
                ctx.restore();
                return gaugeH + 22; // 次のゲージまでのオフセット
            };

            const hasTitan = g.allies.some(a => a.type === 'titan_golem' && !a.isDead);
            if (hasTitan) {
                const offset = drawAllyGauge(
                    g.titanSpecialGauge, '🦾',
                    '天崩地裂 発動！', '天崩地裂チャージ',
                    '255,180,0', ['#555', '#C0A000']
                );
                gaugeY -= offset;
            }

            const hasDragon = g.allies.some(a => a.type === 'dragon_lord' && !a.isDead);
            if (hasDragon) {
                const offset2 = drawAllyGauge(
                    g.dragonSpecialGauge, '👑',
                    '覇竜炎 発動！', '覇竜炎チャージ',
                    '255,80,0', ['#6B0000', '#CC3000']
                );
                gaugeY -= offset2;
            }

            const hasPlatinum = g.allies.some(a => a.type === 'platinum_golem' && !a.isDead);
            if (hasPlatinum) {
                drawAllyGauge(
                    g.platinumSpecialGauge, '✨',
                    '聖光天罰 発動！', '聖光天罰チャージ',
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
                statuses.push({ icon: '⚙', label: `ターボ ${Math.ceil(battle.turboBoostTimer/60)}秒`, color: '#29B6F6' });
            if (battle.windEffect > 0)
                statuses.push({ icon: '💨', label: `かぜ（敵スロー） ${Math.ceil(battle.windEffect/60)}秒`, color: '#66BB6A' });
            if (battle.burnEffect > 0)
                statuses.push({ icon: '☀', label: `やけど ${Math.ceil(battle.burnEffect/60)}秒`, color: '#FFA726' });
            if (battle.playerIceEffect > 0)
                statuses.push({ icon: '❄', label: `こおり ${Math.ceil(battle.playerIceEffect/60)}秒`, color: '#4FC3F7' });

            if (statuses.length > 0) {
                const panelW = 190;
                const rowH = 20;
                const padV = 6;
                const panelH = statuses.length * rowH + padV * 2;
                const px = W / 2 - panelW / 2;
                const py = H - 95 - panelH;

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
            ctx.fillText('⚡ 敵がひるんでいる！ 砲台から敵艦へ乗り込め！ ⚡', W / 2, msgY + 23);
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
                ctx.fillText('⚠ 必殺技チャージ中！ ⚠', W - gaugeW / 2 - 30, gaugeY - 8);
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
            // shadowColor removed for perf
            ctx.shadowBlur = 0;
            ctx.fillText('⚠⚠⚠ 必殺技！避けろ！ ⚠⚠⚠', W / 2, msgY + 27);
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
            const comboColors = ['#FFF','#FFD700','#FF9800','#FF6B00','#FF4444','#E040FB'];
            const col = comboColors[Math.min(combo-2, 5)];

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
                panelGrd.addColorStop(0, 'rgba(0,0,0,0.8)');
                panelGrd.addColorStop(0.5, panelCol.replace('#', 'rgba(').replace(/(..)(..)(..)/, (_, r, g2, b) =>
                    `${parseInt(r,16)},${parseInt(g2,16)},${parseInt(b,16)},0.85`).replace('rgba(', 'rgba(') + ')');
                panelGrd.addColorStop(1, 'rgba(0,0,0,0.8)');
                ctx.fillStyle = panelGrd;
                ctx.beginPath();
                ctx.roundRect(panelX - 8, panelY - 8, panelW + 16, panelH + 16, 12);
                ctx.fill();

                // 枠線（脈動）
                ctx.strokeStyle = col;
                ctx.lineWidth = 2 + Math.sin(g.frame * 0.25) * 1;
                ctx.beginPath();
                ctx.roundRect(panelX - 8, panelY - 8, panelW + 16, panelH + 16, 12);
                ctx.stroke();

                // コンボ数字（巨大）
                ctx.shadowColor = col;
                ctx.shadowBlur = 20;
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
                ctx.shadowColor = col; ctx.shadowBlur = combo >= 5 ? 25 : 12;
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
                    fire:'#FF5722',freeze:'#2196F3',thunder:'#FFD700',
                    bomb:'#FF5252',missile:'#E91E63',water_bucket:'#4FC3F7',
                    herb:'#4CAF50',bomb_big:'#FF7043',
                };
                const panelAccent = typeColors[itemType] || info.color || '#5BA3E6';
                const isSpecial = ['fire','freeze','thunder','missile','bomb_big'].includes(itemType);
                const t = _getFrameNow();

                if (isSpecial) {
                    ctx.save();
                    ctx.shadowColor = panelAccent;
                    ctx.shadowBlur = 10 + Math.sin(t * 0.01) * 5;
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
                    fire:'🔥 燃焼効果',freeze:'❄ 凍結効果',thunder:'⚡ 感電効果',
                    bomb:'💥 範囲爆発',missile:'🎯 追尾弾',herb:'💚 HP回復',
                    water_bucket:'💧 消火可能',bomb_big:'💣 超大爆発',
                    rock:'🪨 通常弾',ironball:'⚙ 重量弾',arrow:'🏹 高速弾',shield:'🛡 守護弾',
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
                const icons = [...new Set(floorItems.slice(0,4).map(fi => {
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
        const ratio = Math.max(0, hp / max);
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
            ? '✚移動  [Z]拾う/装填  [X]必殺技  [C]連携技/侵攻  [B]投げる'
            : '矢印: 移動   Z: 拾う/装填   X: 必殺技   C: 連携/突入   B: 投げる   Space: 決定';
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
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('\u2694 \u30B9\u30E9\u30A4\u30E0\u52C7\u8ECA\u30D0\u30C8\u30EB \u2694', W / 2, H * 0.22);
        ctx.restore();

        // Subtitle with gradient
        ctx.font = '18px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        ctx.fillText('\uFF5E \u30B9\u30E9\u30A4\u30E0\u6226\u8ECA\u968A\u306E\u5927\u5192\u967A \uFF5E', W / 2, H * 0.22 + 38);

        // メニュー項目 (index 6 = 設定)
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

        // Controls Guide (タッチデバイスはタップ案内)
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.font = '13px Arial';
        ctx.fillStyle = '#8EC9F5';
        ctx.textAlign = 'center';
        ctx.fillText(
        isTouch
            ? 'タップ/スワイプ: 選択   Zボタン/タップ: 決定   各画面でBボタン: 戻る'
            : '↑↓ で選択 / Space・Z: 決定 / B: 戻る',
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
        const cols = Math.min(normalStages.length, 3);

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

        const startX = W / 2 - (cols * (boxW + gap) - gap) / 2;

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
                const sec = Math.floor(hs / 60);
                const sub = Math.floor((hs % 60) * (100 / 60));
                const timeStr = `⏱ ${String(sec).padStart(2,'0')}:${String(sub).padStart(2,'0')}`;
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
                ? '▶ Zボタン/タップ: バトル開始   Bボタン: 戻る'
                : '▶ Space/Z: バトル開始   B: 戻る',
            W / 2, py + 138);
            ctx.globalAlpha = 1;

            // Shop Button Visual (Top Center)
            const shopY = 60;
            Renderer._roundRect(ctx, W / 2 - 80, shopY, 160, 40, 20);
            ctx.fillStyle = '#333';
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('↑ ショップ', W / 2, shopY + 27);

            // Pulse effect for shop
            if (frame % 60 < 30) {
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
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
            isTouchEV ? '▶ Zボタン/タップ: 挑戦する   Bボタン: 戻る'
                      : '▶ Space/Z: 挑戦する   B: 戻る',
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
            const seconds = Math.floor(timeFrames / 60);
            const sub = Math.floor((timeFrames % 60) * (100 / 60)); // hundreths
            const timeStr = `${String(seconds).padStart(2, '0')}:${String(sub).padStart(2, '0')}`;

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
                ctx.shadowBlur = 20;
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

            // タイム: H*0.45, ランク: H*0.35, 新記録: H*0.52 → 報酬表示はH*0.60以降に
            let ammoY = hasNewAmmo && hasNewAlly ? H * 0.62 : H * 0.65;
            let allyY = hasNewAmmo && hasNewAlly ? H * 0.78 : H * 0.65;

            // === 新パーツ獲得表示 ===
            if (hasNewPart) {
                const part = window.game.newlyUnlockedPart;
                const partY = H * 0.63;
                const t = _getFrameNow();
                // 光るパネル
                ctx.save();
                const pulse = 0.7 + Math.sin(t * 0.015) * 0.3;
                ctx.fillStyle = `rgba(255,200,50,${pulse * 0.18})`;
                Renderer._roundRect(ctx, W * 0.1, partY - 30, W * 0.8, 100, 14);
                ctx.fill();
                ctx.strokeStyle = `rgba(255,210,50,${pulse * 0.8})`;
                ctx.lineWidth = 2;
                Renderer._roundRect(ctx, W * 0.1, partY - 30, W * 0.8, 100, 14);
                ctx.stroke();
                // キラキラ演出
                ctx.font = 'bold 22px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.fillText('🎉 新パーツ ゲット！', W / 2, partY - 6);
                // アイコン
                ctx.font = '36px Arial';
                ctx.fillText(part.icon || '🔧', W / 2 - 70, partY + 44);
                // パーツ名
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = '#FFF';
                ctx.fillText(part.name, W / 2 + 20, partY + 36);
                // カテゴリ
                const catNames = { colors:'カラー', cannons:'砲身', armors:'装甲', effects:'エフェクト' };
                ctx.font = '13px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.fillText(catNames[part.category] || 'パーツ', W / 2 + 20, partY + 54);
                ctx.restore();
            }

            if (hasNewAmmo) {
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = '#88FF88';
                ctx.fillText('新しい弾をゲット！', W / 2, ammoY);

                let iconX = W / 2 - ((window.game.newlyUnlocked.length - 1) * 40) / 2;
                for (const ammo of window.game.newlyUnlocked) {
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
            }

            // New Ally Unlocked / Level Up?
            if (hasNewAlly) {
                const ally = window.game.newlyUnlockedAlly;
                const isLevelUp = ally.isLevelUp;
                // ★修正B5: 全配合産タイプを網羅
                const isFusionProduct = [
                    'slime_purple','slime_aqua','steel_ninja','phantom',
                    'shadow_mage','sage_slime','alchemist','arch_angel',
                    'fortress_golem','paladin','royal_guard','angel_golem',
                    'war_machine','wyvern_lord','legend_metal',
                    'platinum_slime','platinum_golem',
                    'titan_golem','dragon_lord'
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
                const rendererType = ally.type || 'slime';
                const drawFuncName = 'draw' + rendererType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                const drawFunc = Renderer[drawFuncName] || Renderer.drawSlime;

                ctx.save();
                if (drawFunc === Renderer.drawSlime) {
                    drawFunc.call(Renderer, ctx, W / 2 - 25, ay, 50, 50, ally.color, CONFIG.COLORS.PLAYER_DARK, 1, 0);
                } else if (drawFunc === Renderer.drawBoss) {
                    drawFunc.call(Renderer, ctx, W / 2 - 30, ay, 60, 60, ally.color);
                } else {
                    drawFunc.call(Renderer, ctx, W / 2 - 25, ay, 50, 50, ally.color, ally.darkColor || '#333', 1, 0);
                }
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
            ctx.beginPath();
            ctx.roundRect(logX, logY - 14, logW, 64, 8);
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
                { idx: 2, label: `💰 コンティニュー
(${cost}G)`, color: '#3a2a00', border: '#FFD700' },
                { idx: 1, label: '📋 ステージ選択', color: '#1a1a4a', border: '#5BA3E6' },
            ];

            window._menuHitRegions = btns.map((b, i) => ({
                type: 'resultBtn', index: b.idx,
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
                { type: 'resultBtn', index: 0, x: btn1X, y: btnY, w: btnW, h: btnH },
                { type: 'resultBtn', index: 1, x: btn2X, y: btnY, w: btnW, h: btnH },
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
                ? 'タップ/▲▼: 選択   Zボタン: 決定'
                : '◀▶ で選択   Space/Z: 決定',
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
        ctx.shadowBlur = isBossStage ? 60 : 40;
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
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.icon + ' ' + info.name, rightX, y);
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

        drawBtn(bx1, bw1, '◀ 戻る',      isTouch ? 'Bボタン' : 'Bキー',      'rgba(120,30,30,0.85)',  '#e57373');
        drawBtn(bx2, bw2, '⚡ 即バトル',  isTouch ? 'Xボタン' : 'Xキー',      'rgba(180,90,0,0.85)',   '#FFB74D');
        drawBtn(bx3, bw3, '仲間編成へ ▶', isTouch ? 'Spaceボタン' : 'Space', 'rgba(20,100,40,0.90)',  '#66BB6A');

        // タップ判定をヒット領域に追加
        window._menuHitRegions = window._menuHitRegions || [];
        window._menuHitRegions.push(
            { type: 'deckBtn', action: 'back',   x: bx1, y: btnY, w: bw1, h: btnH },
            { type: 'deckBtn', action: 'battle', x: bx2, y: btnY, w: bw2, h: btnH },
            { type: 'deckBtn', action: 'next',   x: bx3, y: btnY, w: bw3, h: btnH }
        );

        if (!isTouch) {
            ctx.font = '13px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('Z: 弾の着脱', W / 2, H - 12);
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
        const maxCost = 3 + ((saveData && saveData.upgrades && saveData.upgrades.maxAllySlot) || 0);

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

            // Hacky mini-draw
            ctx.save();
            ctx.translate(x - 60, y - 20);
            ctx.scale(iconScale, iconScale);

            let rendererType = type || 'slime';
            let drawFuncName = 'draw' + rendererType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            let drawFunc = Renderer[drawFuncName] || Renderer.drawSlime;

            if (drawFunc === Renderer.drawSlime) {
                drawFunc.call(Renderer, ctx, 0, 0, 40, 40, allyColor, allyDark, 1, frame, 0, rendererType);
            } else if (drawFunc === Renderer.drawBoss) {
                drawFunc.call(Renderer, ctx, 0, 0, 40, 40, allyColor);
            } else {
                // Alias function handling（titan_golemはdrawTitanGolemを使う - 戦闘画面と同じ見た目）
                if (rendererType === 'special' || rendererType === 'metalking' || rendererType === 'healer' || rendererType === 'ghost' || rendererType === 'ultimate') {
                    Renderer.drawSlime(ctx, 0, 0, 40, 40, allyColor, allyDark, 1, frame, 0, rendererType);
                } else if (rendererType === 'titan_golem' || rendererType === 'dragon_lord') {
                    // これらは (ctx, x, y, w, h, color, dir, frame) - darkColorなし
                    drawFunc.call(Renderer, ctx, 0, 0, 40, 40, allyColor, 1, frame);
                } else {
                    drawFunc.call(Renderer, ctx, 0, 0, 40, 40, allyColor, allyDark, 1, frame);
                }
            }

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
            let rendererType = ally.type || 'slime';
            let drawFuncName = 'draw' + rendererType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            let drawFunc = Renderer[drawFuncName] || Renderer.drawSlime;

            if (drawFunc === Renderer.drawSlime) {
                drawFunc.call(Renderer, ctx, 0, 0, iconSize, iconSize, allyColor, allyDark, 1, frame, 0, rendererType);
            } else if (drawFunc === Renderer.drawBoss) {
                drawFunc.call(Renderer, ctx, 0, 0, iconSize, iconSize, allyColor);
            } else {
                // Alias function handling（titan_golemはdrawTitanGolemを使う）
                if (rendererType === 'special' || rendererType === 'metalking' || rendererType === 'healer' || rendererType === 'ghost' || rendererType === 'ultimate') {
                    Renderer.drawSlime(ctx, 0, 0, iconSize, iconSize, allyColor, allyDark, 1, frame, 0, rendererType);
                } else if (rendererType === 'titan_golem' || rendererType === 'dragon_lord') {
                    drawFunc.call(Renderer, ctx, 0, 0, iconSize, iconSize, allyColor, 1, frame);
                } else {
                    drawFunc.call(Renderer, ctx, 0, 0, iconSize, iconSize, allyColor, allyDark, 1, frame);
                }
            }
            ctx.restore();

            ctx.fillStyle = '#FFF';
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            let nameText = ally.name;
            if (ally.level && ally.level > 1) {
                nameText += ` Lv.${ally.level}`;
                ctx.fillStyle = '#FFD700';
            }
            ctx.fillText(nameText, rightX - 20, y - 8);

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
        const allyFooterHint = isTouch2
            ? '▲▼: せんたく   Zボタン: 着脱   Cボタン/Space: バトル開始！   Bボタン: 戻る'
            : '▲▼: せんたく   Z: 着脱   Space / C: バトル開始！   B: 戻る';
        const footerY = H - 60;
        ctx.font = '16px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText(allyFooterHint, W / 2, footerY);
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
        const detailRarityColors = ['#9E9E9E', '#9E9E9E', '#9E9E9E', '#4CAF50', '#9C27B0', '#FFD700', '#FF4444'];
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
    },

    _drawFancyHP(ctx, x, y, w, h, hp, max, isPlayer) {
        const ratio = Math.max(0, hp / max);
        const label = isPlayer ? 'じぶん' : 'あいて';
        const frame = _getFrameNow ? _getFrameNow() : 0;

        // HP状態判定
        const isLow    = ratio <= 0.3;  // 30%以下: 赤点滅
        const isDanger = ratio <= 0.15; // 15%以下: 超危機
        const isHeal   = ratio > 0.6;   // 60%以上: 通常青

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

        // HP Numbers
        ctx.font = `bold 14px monospace`;
        ctx.textAlign = isPlayer ? 'left' : 'right';
        ctx.fillStyle = isDanger ? `rgba(255,100,100,${blinkAlpha})` : isLow ? '#FF8C00' : '#FFF';
        ctx.fillText(`${Math.ceil(hp)}`, isPlayer ? x : x + w, y + h + 15);
        ctx.font = '10px Arial';
        ctx.fillStyle = '#AAA';
        ctx.fillText(`${Math.ceil(max)}`, isPlayer ? x + 40 : x + w - 40, y + h + 14);
    },

    _drawHearts(ctx, x, y, hp, max) {
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
            { id: 'hp',           name: '戦車アーマー (HP)',          cost: (saveData.upgrades.hp + 1) * 500,                            max: 30,  type: 'upgrade' },
            { id: 'attack',       name: '大砲パワー (攻撃力)',         cost: (saveData.upgrades.attack + 1) * 800,                        max: 30,  type: 'upgrade' },
            { id: 'goldBoost',    name: '稼ぎスキル習得',              cost: [1500,2500,4000,6000,8000][saveData.upgrades.goldBoost] || 0, max: 5,   type: 'upgrade' },
            { id: 'capacity',     name: 'デッキ容量 (+2スロット)',     cost: [2000,3500,5500,8000,12000][saveData.upgrades.capacity||0] || 0, max: 5, type: 'upgrade' },
            { id: 'maxAllySlot',  name: '🐾 仲間コスト枠+1',          cost: [5000,10000,0][saveData.upgrades.maxAllySlot||0] || 0,        max: 2,   type: 'upgrade' },
            { id: 'ally_train',   name: '🎓 仲間特訓 (最低Lv仲間+200EXP)', cost: 2000, type: 'ally_train' },
            { id: 'scout',        name: '🎯 仲間スカウト', sub: `天井: あと${50 - Math.min(49, (saveData.gachaPity||0))}連で★6確定`, cost: 1000, max: 99, type: 'gacha' },
            { id: 'scout_10',     name: '🎲 10連スカウト',  sub: '★5以上1体確定!', cost: 8000, max: 99, type: 'gacha_10' },
            { id: 'bomb',         name: 'ばくだん岩 (弾)',              cost: 1500, type: 'ammo' },
            { id: 'ironball',     name: 'てっきゅう (弾)',              cost: 2000, type: 'ammo' },
            { id: 'missile',      name: 'ミサイル (弾)',                cost: 3000, type: 'ammo' },
            { id: 'exit',         name: '戻る',                         cost: 0,    type: 'system' }
        ];

        // Draw Items
        const startY = 80;
        const gap = 55;

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
        if (window.game && window.game.gachaResult) {
            this._drawGachaResult(ctx, W, H, window.game.gachaResult);
        }
    },

    _drawGachaResult(ctx, W, H, ally) {
        // === レアリティ設定 ===
        const rarity = ally.rarity || 1;
        const rarityInfo = {
            1: { stars: 1, label: 'コモン',        color: '#9E9E9E', glow: '#BDBDBD', rayColor: 'rgba(180,180,180,0.06)' },
            2: { stars: 2, label: 'コモン',        color: '#9E9E9E', glow: '#BDBDBD', rayColor: 'rgba(180,180,180,0.06)' },
            3: { stars: 3, label: 'レア',          color: '#4CAF50', glow: '#81C784', rayColor: 'rgba(76,175,80,0.10)' },
            4: { stars: 4, label: 'スーパーレア',  color: '#9C27B0', glow: '#CE93D8', rayColor: 'rgba(156,39,176,0.14)' },
            5: { stars: 5, label: 'ウルトラレア',  color: '#FFD700', glow: '#FFF176', rayColor: 'rgba(255,215,0,0.18)' },
            6: { stars: 6, label: 'SSR！！',       color: '#FF4444', glow: '#FF8888', rayColor: 'rgba(255,80,80,0.22)' },
        }[rarity] || { stars: 1, label: 'コモン', color: '#9E9E9E', glow: '#BDBDBD', rayColor: 'rgba(180,180,180,0.06)' };

        const t = _getFrameNow();
        const pulse = Math.sin(t * 0.008) * 0.5 + 0.5;
        const col = rarityInfo.color;
        const cr = parseInt(col.slice(1,3),16), cg = parseInt(col.slice(3,5),16), cb = parseInt(col.slice(5,7),16);

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.fillRect(0, 0, W, H);
        const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, H*0.85);
        bgGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.35+pulse*0.15})`);
        bgGrad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.08)`);
        bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 回転光線
        ctx.save();
        ctx.translate(W/2, H/2);
        const rayCount = rarity >= 5 ? 18 : 12;
        ctx.rotate(t * (rarity >= 5 ? 0.0018 : 0.0012));
        ctx.fillStyle = rarityInfo.rayColor;
        for (let i = 0; i < rayCount; i++) {
            ctx.rotate(Math.PI*2/rayCount);
            const rw = 20 + (rarity >= 5 ? 15 : 5);
            ctx.fillRect(-rw, -W, rw*2, W*2);
        }
        ctx.restore();

        // 逆回転リング
        if (rarity >= 4) {
            ctx.save();
            ctx.translate(W/2, H/2);
            ctx.rotate(-t * 0.0022);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.25+pulse*0.2})`;
            ctx.lineWidth = rarity >= 5 ? 4 : 2;
            for (let ring = 0; ring < (rarity >= 5 ? 3 : 2); ring++) {
                const rad = 110 + ring*55 + pulse*10;
                ctx.beginPath();
                const segs = 8 + ring*4;
                for (let i = 0; i < segs; i++) {
                    const a = i/segs*Math.PI*2, a2 = (i+0.6)/segs*Math.PI*2;
                    ctx.moveTo(Math.cos(a)*rad, Math.sin(a)*rad);
                    ctx.lineTo(Math.cos(a2)*rad, Math.sin(a2)*rad);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // SSR稲妻
        if (rarity >= 6) {
            ctx.save();
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.4+pulse*0.4})`;
            ctx.lineWidth = 2;
            for (let bolt = 0; bolt < 4; bolt++) {
                const bx = W/2 + Math.cos(t*0.003+bolt*1.57)*180;
                const by = H/2 + Math.sin(t*0.003+bolt*1.57)*150;
                ctx.beginPath(); ctx.moveTo(bx, by);
                let lpx = bx, lpy = by;
                for (let s = 0; s < 5; s++) {
                    lpx += (Math.random()-0.5)*60; lpy += (Math.random()-0.5)*60;
                    ctx.lineTo(lpx, lpy);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // キャラクター
        const size = rarity >= 5 ? 200 : 170;
        const charCX = W/2, charCY = H/2 + 15;
        const charX = charCX - size/2, charY2 = charCY - size/2;
        const frame = (t / 16) | 0;
        const bounce = 1 + Math.sin(t*0.012)*0.04;

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
        ctx.scale(scaleIn * (1 + pulse*(rarity>=5?0.12:0.06)), scaleIn * (1 + pulse*(rarity>=5?0.12:0.06)));
        ctx.beginPath(); ctx.arc(0,0,size/2+20,0,Math.PI*2);
        const ag = ctx.createRadialGradient(0,0,size/2,0,0,size/2+30);
        ag.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5+pulse*0.3})`);
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag; ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(charCX, charCY + slideOffsetY);
        ctx.scale(scaleIn, scaleIn);
        ctx.beginPath(); ctx.arc(0,0,size/2+12,0,Math.PI*2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`; ctx.fill();
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.7+pulse*0.3})`;
        ctx.lineWidth = rarity>=5?4:2; ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(charCX, charCY + slideOffsetY); ctx.scale(bounce * scaleIn, bounce * scaleIn); ctx.translate(-charCX,-charCY);
        let rType = ally.type||'slime';
        let dfName = 'draw'+rType.split('_').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join('');
        let df = Renderer[dfName]||Renderer.drawSlime;
        if (df===Renderer.drawSlime||['special','metalking','healer','ghost','ultimate'].includes(rType)) {
            Renderer.drawSlime(ctx, charX, charY2, size, size, ally.color||'#FFF', ally.darkColor||'#333', 1, frame, 0, rType);
        } else if (df===Renderer.drawBoss) {
            df.call(Renderer, ctx, charX, charY2, size, size, ally.color||'#FFF');
        } else {
            df.call(Renderer, ctx, charX, charY2, size, size, ally.color||'#FFF', 1, frame);
        }
        ctx.restore();

        // テキスト群
        ctx.textAlign = 'center';
        const lblY = charCY - size/2 - 52;

        // レアリティラベル
        ctx.save();
        ctx.font = `bold ${rarity>=5?28:22}px Arial`;
        ctx.shadowColor = rarityInfo.glow; ctx.shadowBlur = rarity>=5?25:12;
        ctx.fillStyle = rarityInfo.color;
        ctx.fillText(rarityInfo.label, W/2, lblY);
        ctx.restore();

        // 星
        const starBaseY = lblY + 30;
        const starSize = rarity>=5?26:20;
        ctx.save();
        ctx.font = `${starSize}px Arial`;
        ctx.shadowColor = rarityInfo.glow; ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i=0;i<6;i++) ctx.fillText('☆', W/2-(6*(starSize+4)-4)/2+i*(starSize+4), starBaseY);
        ctx.fillStyle = rarityInfo.color;
        for (let i=0;i<rarityInfo.stars;i++) {
            const sx = W/2-(6*(starSize+4)-4)/2+i*(starSize+4);
            const sc = 1+Math.sin(t*0.01+i*0.5)*0.15;
            ctx.save(); ctx.translate(sx,starBaseY); ctx.scale(sc,sc); ctx.translate(-sx,-starBaseY);
            ctx.fillText('★', sx, starBaseY);
            ctx.restore();
        }
        ctx.restore();

        // テキスト全体にrevealProgressでフェードイン
        const textAlpha = Math.min(1, revealProgress * 2.5);

        // GET!
        const getY = charCY + size/2 + 44;
        ctx.save();
        ctx.globalAlpha = textAlpha;
        const gs = 1+Math.sin(t*0.015)*0.06;
        ctx.font = `bold ${Math.round((rarity>=5?62:48)*gs)}px Arial`;
        ctx.shadowColor = rarityInfo.glow; ctx.shadowBlur = rarity>=5?40:20;
        ctx.fillStyle = rarityInfo.color;
        ctx.fillText(rarity>=5?'✨ GET! ✨':'GET!', W/2, getY);
        ctx.restore();

        // 名前
        const nameText = ally.name+(ally.level&&ally.level>1?` Lv.${ally.level}`:'');
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = 'bold 32px Arial'; ctx.fillStyle = '#FFF';
        ctx.fillText(nameText, W/2, getY+46);
        ctx.restore();

        // LB / NEW
        if (ally.isLimitBreak) {
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.font='bold 20px Arial'; ctx.fillStyle='#00E5FF';
            ctx.fillText('⬆ LIMIT BREAK', W/2, getY+80);
            ctx.restore();
        } else {
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.font='bold 22px Arial'; ctx.fillStyle='#00FF88';
            ctx.fillText('✦ NEW! ✦', W/2, getY+80);
            ctx.restore();
        }

        // 10連インジケーター
        if (ally._queueTotal) {
            const total = ally._queueTotal, current = ally._queueIndex;
            const dotR=8, spc=24;
            const sdx = W/2-((total-1)*spc)/2;
            ctx.save();
            for (let i=0;i<total;i++) {
                const dx=sdx+i*spc, dy=H-76;
                const isDone=(i<current), isCur=(i===current-1);
                ctx.beginPath(); ctx.arc(dx,dy,isCur?dotR+3:dotR,0,Math.PI*2);
                if (isCur){ctx.fillStyle='#FFD700';ctx.shadowBlur=0;}
                else if(isDone){ctx.fillStyle=`rgba(${cr},${cg},${cb},0.8)`;ctx.shadowBlur=0;}
                else{ctx.fillStyle='rgba(255,255,255,0.18)';ctx.shadowBlur=0;}
                ctx.fill();
            }
            ctx.restore();
            ctx.font='bold 16px Arial'; ctx.fillStyle='#FFD700'; ctx.textAlign='center';
            ctx.fillText(`${current} / ${total}`, W/2, H-50);
            ctx.font='15px Arial'; ctx.fillStyle='#AAA';
            ctx.fillText('SPACE / Enter で次へ', W/2, H-28);
        } else {
            ctx.font='17px Arial'; ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.textAlign='center';
            if (Math.floor(t/30)%2===0) ctx.fillText('SPACE / Enter で閉じる', W/2, H-30);
        }
    },

    _drawShopControls(ctx, W, H) {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        ctx.fillStyle = 'rgba(180,220,255,0.7)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            isTouch
                ? '▲▼: 選択   Zボタン: 購入/決定   Bボタン: 戻る'
                : '↑/↓: 選択   Space/Z: 購入/決定   B: 戻る',
            W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, { showBack: true });

    },

    // === デイリーミッション画面 ===
    drawDailyMissions(ctx, W, H, saveData) {
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
        ctx.fillText(isTouchD ? 'Bボタン/タップ: 戻る' : 'B で戻る', W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, { showBack: true });
    },

    // === 図鑑画面 ===
    drawCollection(ctx, W, H, saveData, tab) {
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
            const masterAllyList = CONFIG.MASTER_ALLY_LIST;

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
                    let rType = item.type || 'slime';
                    let dfName = 'draw' + rType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                    let df = Renderer[dfName] || Renderer.drawSlime;
                    const frame = (_getFrameNow() / 16) | 0;
                    if (df === Renderer.drawSlime || rType === 'special' || rType === 'metalking' || rType === 'healer' || rType === 'ghost' || rType === 'ultimate') {
                        Renderer.drawSlime(ctx, -iconSize / 2, -iconSize / 2, iconSize, iconSize, item.color || '#4CAF50', item.darkColor || '#2E7D32', 1, frame, 0, rType);
                    } else if (rType === 'titan_golem' || rType === 'dragon_lord') {
                        df.call(Renderer, ctx, -iconSize / 2, -iconSize / 2, iconSize, iconSize, item.color || '#4CAF50', 1, frame);
                    } else {
                        df.call(Renderer, ctx, -iconSize / 2, -iconSize / 2, iconSize, iconSize, item.color || '#4CAF50', 1, frame);
                    }
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
                isTouchC ? '◀▶: タブ切替   ▲▼: スクロール   Bボタン: 戻る'
                         : '← → でタブ切り替え   ↑↓ でスクロール   B で戻る',
                W / 2, H - 60);
        } else {
            ctx.fillText('← → でタブ切り替え   B で戻る', W / 2, H - 60);
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
        const circleColor = hasBothParents ? `rgba(255,215,0,${0.6+fusionPulse*0.4})` : hasOneParent ? 'rgba(100,200,255,0.5)' : 'rgba(255,215,0,0.3)';

        // 外側グロー
        if (hasBothParents) {
            const grd = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, 120);
            grd.addColorStop(0, `rgba(255,215,0,${0.2+fusionPulse*0.15})`);
            grd.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(centerX, centerY, 120, 0, Math.PI*2); ctx.fill();
        }

        // メインサークル
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = hasBothParents ? 4+fusionPulse*2 : 3;
        ctx.beginPath(); ctx.arc(centerX, centerY, 80, 0, Math.PI*2); ctx.stroke();

        // 配合エフェクト（回転オーブ）
        const angle = frame * 0.05;
        const orbCount = hasBothParents ? 6 : 3;
        for (let i = 0; i < orbCount; i++) {
            const a = angle + i * (Math.PI*2/orbCount);
            const r2 = 80 + (hasBothParents ? Math.sin(frame*0.1+i)*8 : 0);
            const px = centerX + Math.cos(a) * r2;
            const py = centerY + Math.sin(a) * r2;
            const orbSize = hasBothParents ? 5+fusionPulse*3 : 4;
            ctx.save();
            ctx.shadowColor = hasBothParents ? '#FFD700' : '#88CCFF';
            ctx.shadowBlur = 0;
            ctx.fillStyle = hasBothParents ? `rgba(255,${180+i*12},0,${0.8+fusionPulse*0.2})` : '#4FC3F7';
            ctx.beginPath(); ctx.arc(px, py, orbSize, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // 両親が揃ったら内側にエネルギー渦
        if (hasBothParents) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(-angle * 1.5);
            for (let ring = 0; ring < 3; ring++) {
                const rad = 25 + ring*18 + fusionPulse*5;
                ctx.beginPath();
                ctx.arc(0, 0, rad, 0, Math.PI*2);
                ctx.strokeStyle = `rgba(255,215,0,${0.4-ring*0.1})`;
                ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.restore();
            // 中央の合体マーク
            ctx.save();
            // shadowColor removed for perf ctx.shadowBlur = 0;
            const mSize = 28 + fusionPulse * 5;
            ctx.font = `bold ${mSize}px Arial`;
            ctx.fillStyle = `rgba(255,215,0,${0.8+fusionPulse*0.2})`;
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
                const rendererType = ally.type || 'slime';
                const drawFuncName = 'draw' + rendererType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                const drawFunc = Renderer[drawFuncName] || Renderer.drawSlime;

                if (drawFunc === Renderer.drawSlime) {
                    drawFunc.call(Renderer, ctx, x - 25, y - 25, 50, 50, ally.color, ally.darkColor || '#333', 1, frame, 0);
                } else if (drawFunc === Renderer.drawBoss) {
                    drawFunc.call(Renderer, ctx, x - 30, y - 30, 60, 60, ally.color);
                } else {
                    drawFunc.call(Renderer, ctx, x - 25, y - 25, 50, 50, ally.color, ally.darkColor || '#333', 1, frame);
                }
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

        // 仲間リスト（上半分に配置してスペースを広く）
        const listY = 105;
        const listH = H * 0.45;
        const allies = saveData.unlockedAllies || [];
        const gap = 56;
        const scrollY = Math.max(0, cursor * gap - listH / 2);

        // 配合可能タイプ一覧（FUSION_RECIPESから事前計算）
        const recipes = window.FUSION_RECIPES || [];
        const fusionableTypes = new Set(recipes.flatMap(r => [r.p1.type, r.p2.type]));

        // 1体選択中の場合：相方候補タイプを特定
        const partnerTypes = new Set();
        if (parents.length === 1) {
            const selectedType = parents[0].type;
            recipes.forEach(r => {
                if (r.p1.type === selectedType) partnerTypes.add(r.p2.type);
                if (r.p2.type === selectedType) partnerTypes.add(r.p1.type);
            });
        }

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
            const rendererType = ally.type || 'slime';
            const drawFuncName = 'draw' + rendererType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            const drawFunc = Renderer[drawFuncName] || Renderer.drawSlime;
            ctx.save();
            ctx.translate(85, y);
            ctx.scale(0.6, 0.6);
            if (drawFunc === Renderer.drawSlime) drawFunc.call(Renderer, ctx, -25, -25, 50, 50, ally.color, ally.darkColor || '#333', 1, frame, 0);
            else if (drawFunc === Renderer.drawBoss) drawFunc.call(Renderer, ctx, -30, -30, 60, 60, ally.color);
            else drawFunc.call(Renderer, ctx, -25, -25, 50, 50, ally.color, ally.darkColor || '#333', 1, frame);
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
                ctx.fillText('⚗ 配合できる！', W - 165, y + 6);
            } else if (!isFusable && parents.length > 0) {
                // 配合不可
                ctx.font = '11px Arial';
                ctx.fillStyle = 'rgba(150,150,150,0.7)';
                ctx.fillText('配合不可', W - 145, y + 6);
            }

            // 配合マーク
            if (ally.isFusion) {
                ctx.font = '11px Arial';
                ctx.fillStyle = ally.rarity >= 6 ? '#FF6F00' : '#7CFC00';
                ctx.fillText('⚗', markX, y + 6);
            } else if (isFusable) {
                ctx.font = '11px Arial';
                ctx.fillStyle = '#00BCD4';
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
                ? '▲▼: 選択   Zボタン: 選択(2体で配合)   Bボタン: 戻る'
                : '↑↓: 選択   Z/Enter: 選択(2体で配合)   Del: 仲間解放   B: 戻る   Q: レシピ',
            W / 2, H - 30);
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
        const drawMini = (ally, cx, cy) => {
            const t = ally.type || 'slime';
            const fn = 'draw' + t.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            const f = Renderer[fn];
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(0.55, 0.55);
            if (f && f !== Renderer.drawSlime) {
                f.call(Renderer, ctx, -25, -25, 50, 50, ally.color, ally.darkColor || '#333', 1, frame);
            } else {
                Renderer.drawSlime(ctx, -25, -25, 50, 50, ally.color, ally.darkColor || '#333', 1, frame, 0, t);
            }
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
            const rType = child.type || 'slime';
            // 専用描画関数があれば優先使用（dragon_lord等の配合産に対応）
            const drawFuncName = 'draw' + rType.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            const drawFunc = window.Renderer[drawFuncName];
            if (drawFunc && drawFunc !== window.Renderer.drawSlime) {
                if (drawFunc === window.Renderer.drawBoss) {
                    drawFunc.call(window.Renderer, ctx, -40, -40, 80, 80, child.color || '#4CAF50');
                } else {
                    drawFunc.call(window.Renderer, ctx, -40, -40, 80, 80, child.color || '#4CAF50', child.darkColor || '#2E7D32', 1, frame);
                }
            } else {
                window.Renderer.drawSlime(ctx, -40, -40, 80, 80,
                    child.color || '#4CAF50', child.darkColor || '#2E7D32',
                    1, frame, 0, rType);
            }
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
        ctx.fillText('Zキー / タップで続ける', cx, H - 36);

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
        const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, H);
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
        const borderColors = ['#9E9E9E','#9E9E9E','#4CAF50','#9C27B0','#FFD700','#FF4444'];
        const borderCol = borderColors[Math.min(maxRarity - 1, 5)];

        // 外枠
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 3;
        Renderer._roundRect(ctx, 15, 55, W - 30, H - 110, 12);
        ctx.stroke();

        // 5×2 グリッド表示
        const cols = 5, rows = 2;
        const cellW = (W - 50) / cols;
        const cellH = (H - 130) / rows;
        const startX = 25, startY = 68;

        results.slice(0, 10).forEach((ally, i) => {
            if (i >= showCount) return; // 未表示はスキップ

            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * cellW;
            const cy = startY + row * cellH;
            const rarity = ally.rarity || 1;
            const rarityColors = ['#9E9E9E','#9E9E9E','#4CAF50','#9C27B0','#FFD700','#FF4444'];
            const rCol = rarityColors[Math.min(rarity - 1, 5)];
            const isLimitBreak = ally.isLimitBreak;

            // 登場アニメ（最後に追加されたカードだけポップイン）
            const isNewest = (i === showCount - 1) && showCount < results.length;
            const popScale = isNewest ? Math.min(1, 1.3 - (window.game?.gacha10ShowTimer || 8) * 0.03) : 1;
            const cardAlpha = isNewest ? Math.min(1, (window.game?.gacha10ShowTimer || 8) / 4) : 1;

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
                ctx.fillStyle = rCol.replace('#', 'rgba(').replace(/(..)(..)(..)/, (_, r, g, b) =>
                    `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`)+`,${glowAlpha})`;
                ctx.fillStyle = `rgba(255,215,0,${glowAlpha})`;
                Renderer._roundRect(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, 8);
                ctx.fill();
            }

            // 仲間描画
            const iconSize = Math.min(cellW, cellH) * 0.55;
            const iconX = cx + cellW / 2 - iconSize / 2;
            const iconY = cy + 8;
            const drawFnName = 'draw' + (ally.type||'slime').split('_').map(s=>s[0].toUpperCase()+s.slice(1)).join('');
            const drawFn = Renderer[drawFnName] || Renderer.drawSlime;
            drawFn.call(Renderer, ctx, iconX, iconY, iconSize, iconSize, ally.color, ally.darkColor||'#333', 1, 0);

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
            ctx.fillText('Zキー / タップ で閉じる', W / 2, H - 18);
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
            1: { bg: ['#1B5E20','#2E7D32'], accent: '#81C784', label: '冒険へ旅立て！', stars: 1, trail: '#A5D6A7' },
            2: { bg: ['#1A237E','#283593'], accent: '#90CAF9', label: '蒼い風が吹く！', stars: 2, trail: '#BBDEFB' },
            3: { bg: ['#4A148C','#6A1B9A'], accent: '#CE93D8', label: '神秘の力が宿る！', stars: 3, trail: '#E1BEE7' },
            4: { bg: ['#0D47A1','#1976D2'], accent: '#42A5F5', label: '運命が輝く！！', stars: 4, trail: '#90CAF9' },
            5: { bg: ['#E65100','#F57F17'], accent: '#FFD700', label: '黄金の奇跡！！！', stars: 5, trail: '#FFF176' },
            6: { bg: ['#0A0020','#2D0050'], accent: '#E040FB', label: '超越の存在が降臨！！！', stars: 6, trail: '#F48FB1' },
        };
        const theme = themes[Math.min(6, Math.max(1, rarity))] || themes[1];

        ctx.save();
        ctx.globalAlpha = alpha;

        // ── ★5以上: 前半は暗転「何かが来る...」演出 ──
        if (rarity >= 5 && progress < 0.45) {
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
            ctx.shadowBlur = 20 + darkProg * 20;
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

            ctx.restore();
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
            ctx.shadowBlur = 18 + Math.sin(frame * 0.1) * 8;
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
            ctx.shadowBlur = 12;
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
    },

    // ===== 必殺技インパクト演出（軽量版） =====
    drawSpecialImpact(ctx, W, H, timer, frame) {
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
            ctx.strokeText('－50', W * 0.72, H * 0.25);
            ctx.fillStyle = '#FFD700';
            ctx.fillText('－50', W * 0.72, H * 0.25);
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

        // タイトル
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('⚙ 設定', W / 2, 52);

        const vol = (saveData.settings && saveData.settings.vol != null) ? saveData.settings.vol : 0.3;
        const volPct = Math.round(vol * 100);

        const items = [
            { label: '🔊 音量', type: 'slider', value: vol },
            { label: '💾 セーブデータ書き出し', type: 'button', sub: 'JSONファイルをダウンロード' },
            { label: '📂 セーブデータ読み込み', type: 'button', sub: 'バックアップから復元' },
            { label: '← 戻る', type: 'back' },
        ];

        const startY = 130;
        const gap = 110;

        // ★タップ判定用ヒット領域
        window._menuHitRegions = items.map((item, i) => ({
            type: 'settingsItem', index: i,
            x: 40, y: startY + i * gap - 10,
            w: W - 80, h: 95
        }));

        items.forEach((item, i) => {
            const y = startY + i * gap;
            const isSel = (i === settingsCursor);

            // パネル背景
            ctx.fillStyle = isSel ? 'rgba(91,163,230,0.18)' : 'rgba(255,255,255,0.05)';
            ctx.strokeStyle = isSel ? '#5BA3E6' : 'rgba(255,255,255,0.12)';
            ctx.lineWidth = isSel ? 2 : 1;
            Renderer._roundRect(ctx, 40, y - 12, W - 80, 92, 12);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'left';
            ctx.fillStyle = isSel ? '#FFD700' : '#FFF';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(item.label, 66, y + 18);

            if (item.type === 'slider') {
                // 音量スライダー
                const sliderX = 66;
                const sliderY = y + 45;
                const sliderW = W - 132;
                const sliderH = 16;
                const knobX = sliderX + sliderW * vol;

                // トラック背景
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                Renderer._roundRect(ctx, sliderX, sliderY, sliderW, sliderH, 8);
                ctx.fill();

                // 塗り済み部分
                const fillGrad = ctx.createLinearGradient(sliderX, 0, sliderX + sliderW, 0);
                fillGrad.addColorStop(0, '#4CAF50');
                fillGrad.addColorStop(1, '#8BC34A');
                ctx.fillStyle = fillGrad;
                Renderer._roundRect(ctx, sliderX, sliderY, sliderW * vol, sliderH, 8);
                ctx.fill();

                // ノブ
                ctx.fillStyle = isSel ? '#FFD700' : '#FFF';
                ctx.beginPath();
                ctx.arc(knobX, sliderY + sliderH / 2, 11, 0, Math.PI * 2);
                ctx.fill();

                // 数値表示
                ctx.textAlign = 'right';
                ctx.fillStyle = isSel ? '#FFD700' : '#AAA';
                ctx.font = 'bold 18px Arial';
                ctx.fillText(`${volPct}%`, W - 50, y + 56);

                // スライダー操作ヒント
                ctx.textAlign = 'left';
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                ctx.fillText(isTouch ? '← → スワイプで調整' : '◀ ▶ キーで調整', 66, y + 74);

                // スライダーのタップ領域を別途保存
                window._volSliderRect = { x: sliderX, y: sliderY - 10, w: sliderW, h: sliderH + 20 };

            } else if (item.type === 'button') {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#888';
                ctx.font = '13px Arial';
                ctx.fillText(item.sub, 66, y + 44);

                // ボタン表示
                ctx.fillStyle = isSel ? 'rgba(91,163,230,0.4)' : 'rgba(255,255,255,0.1)';
                ctx.strokeStyle = isSel ? '#5BA3E6' : '#555';
                ctx.lineWidth = 1;
                Renderer._roundRect(ctx, W - 140, y + 22, 100, 32, 8);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = isSel ? '#FFF' : '#AAA';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('実行 ▶', W - 90, y + 43);

            } else if (item.type === 'back') {
                ctx.fillStyle = isSel ? '#FFD700' : '#888';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('タイトルに戻る', W / 2, y + 44);
            }
        });

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
                ? '▲▼: 選択   Zボタン: 決定   ◀▶: 音量   Bボタン: 戻る'
                : '↑↓: 選択   Space/Z: 決定   ←→: 音量   B: 戻る',
            W / 2, H - 60);
        UI.drawNavBar(ctx, W, H, {showBack: true});

    },

    // ================================================================
    // 初回インベージョン説明オーバーレイ（初回のみ4秒間表示）
    // ================================================================
    drawInvasionTutorial(ctx, W, H, timer) {
        // timer: 240→0
        const alpha = timer > 220 ? (240 - timer) / 20 :  // フェードイン
                      timer < 30  ? timer / 30 :            // フェードアウト
                      1.0;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 20, 0.82)';
        const panelW = W * 0.88, panelH = H * 0.48;
        const panelX = W / 2 - panelW / 2;
        const panelY = H * 0.22;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 14);
        ctx.fill();

        // 枠線（オレンジ）
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 14);
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
            ctx.beginPath();
            ctx.roundRect(panelX + 18, oy - 14, 120, 24, 6);
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
UI.drawCustomize = function(ctx, W, H, saveData, cursor, frame) {
    if (!window.TANK_PARTS) return;
    const parts = window.TANK_PARTS;
    const custom = saveData.tankCustom || { color:'color_blue', cannon:'cannon_normal', armor:'armor_normal', effect:'effect_normal' };
    const unlocked = saveData.unlockedParts || [];

    // 背景
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, W, H);
    // グリッド装飾
    ctx.strokeStyle = 'rgba(100,160,255,0.07)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

    // タイトル
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#29B6F6';
    ctx.fillText('🔧 タンクカスタマイズ', W / 2, 44);
    ctx.font = '13px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('ステージクリアでパーツ解放！', W / 2, 64);

    // タンクプレビュー
    const previewY = 85;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    Renderer._roundRect(ctx, W/2 - 90, previewY, 180, 110, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,180,255,0.3)';
    ctx.lineWidth = 1.5;
    Renderer._roundRect(ctx, W/2 - 90, previewY, 180, 110, 12);
    ctx.stroke();
    // ミニタンク描画
    ctx.save();
    ctx.scale(0.55, 0.55);
    const preX = (W/2 - 80) / 0.55;
    const preY2 = (previewY + 5) / 0.55;
    Renderer.drawTankExterior(ctx, preX, preY2, 240, 180, false, 0, false);
    ctx.restore();

    // カテゴリタブ
    const categories = [
        { key: 'colors',  label: '🎨 カラー', data: parts.colors,  field: 'color'  },
        { key: 'cannons', label: '🔫 砲身',   data: parts.cannons, field: 'cannon' },
        { key: 'armors',  label: '🛡 装甲',   data: parts.armors,  field: 'armor'  },
        { key: 'effects', label: '✨ 効果',   data: parts.effects, field: 'effect' },
    ];
    const tabY = previewY + 118;
    const tabW = (W - 40) / categories.length;
    categories.forEach((cat, ci) => {
        const tx2 = 20 + ci * tabW;
        const isActive = (cursor.tab === ci);
        ctx.fillStyle = isActive ? 'rgba(41,182,246,0.35)' : 'rgba(255,255,255,0.07)';
        Renderer._roundRect(ctx, tx2 + 2, tabY, tabW - 4, 32, 6);
        ctx.fill();
        if (isActive) {
            ctx.strokeStyle = '#29B6F6'; ctx.lineWidth = 1.5;
            Renderer._roundRect(ctx, tx2 + 2, tabY, tabW - 4, 32, 6);
            ctx.stroke();
        }
        ctx.font = isActive ? 'bold 12px Arial' : '12px Arial';
        ctx.fillStyle = isActive ? '#29B6F6' : '#AAA';
        ctx.textAlign = 'center';
        ctx.fillText(cat.label, tx2 + tabW / 2, tabY + 21);
    });

    // パーツ一覧
    const cat = categories[cursor.tab];
    const itemY = tabY + 42;
    const itemH = 54;
    const itemsPerPage = 6;
    const startIdx = Math.floor(cursor.item / itemsPerPage) * itemsPerPage;

    cat.data.forEach((part, pi) => {
        if (pi < startIdx || pi >= startIdx + itemsPerPage) return;
        const row = pi - startIdx;
        const iy = itemY + row * itemH;
        const isOwned = part.isDefault || unlocked.includes(part.id);
        const isEquipped = custom[cat.field] === part.id;
        const isSelected = cursor.item === pi;

        // 背景
        if (isEquipped) {
            ctx.fillStyle = 'rgba(41,182,246,0.22)';
        } else if (isSelected) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
        }
        Renderer._roundRect(ctx, 20, iy, W - 40, itemH - 4, 8);
        ctx.fill();
        if (isSelected) {
            ctx.strokeStyle = isEquipped ? '#29B6F6' : '#888';
            ctx.lineWidth = 1.5;
            Renderer._roundRect(ctx, 20, iy, W - 40, itemH - 4, 8);
            ctx.stroke();
        }

        // カラースウォッチ / アイコン
        if (cat.key === 'colors' && part.isRainbow) {
            const t = frame * 0.5;
            for (let ri = 0; ri < 6; ri++) {
                ctx.fillStyle = `hsl(${ri * 60 + t},80%,55%)`;
                ctx.fillRect(30 + ri * 8, iy + 12, 8, 28);
            }
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.strokeRect(30, iy + 12, 48, 28);
        } else if (cat.key === 'colors' && part.base) {
            ctx.fillStyle = part.base;
            ctx.fillRect(30, iy + 12, 48, 28);
            ctx.fillStyle = part.high;
            ctx.fillRect(30, iy + 12, 48, 14);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.strokeRect(30, iy + 12, 48, 28);
        } else {
            // アイコン文字
            const icons = { cannons:'🔫', armors:'🛡', effects:'✨' };
            ctx.font = '26px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(icons[cat.key] || '?', 54, iy + 33);
        }

        // パーツ名
        ctx.font = isOwned ? 'bold 15px Arial' : '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = isOwned ? '#FFF' : '#666';
        ctx.fillText(part.name, 92, iy + 22);

        // 状態バッジ
        ctx.textAlign = 'right';
        if (!isOwned) {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('🔒 未解放', W - 30, iy + 22);
        } else if (isEquipped) {
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#29B6F6';
            ctx.fillText('✔ 装備中', W - 30, iy + 22);
        } else {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#4CAF50';
            ctx.fillText('装備する →', W - 30, iy + 22);
        }

        // デフォルトバッジ
        if (part.isDefault) {
            ctx.font = '11px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText('（初期装備）', W - 30, iy + 38);
        }
    });

    // タッチ用ヒット領域登録
    window._menuHitRegions = cat.data.slice(startIdx, startIdx + itemsPerPage).map((part, pi) => ({
        type: 'settingsItem', index: startIdx + pi,
        x: 20, y: itemY + pi * itemH,
        w: W - 40, h: itemH - 4
    }));

    // スクロールインジケーター
    if (cat.data.length > itemsPerPage) {
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(`▲▼ で選択  ${cursor.item + 1} / ${cat.data.length}`, W / 2, itemY + itemsPerPage * itemH + 10);
    }

    // フッター
    ctx.font = '13px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Z / Enter: 装備  ←→: タブ  B: 戻る', W / 2, H - 18);
};
