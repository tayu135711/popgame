// ======================================
// スライム砲車バトル - 協力対戦サーバー
// ======================================
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let waitingPlayer = null;
const rooms = new Map();
let roomIdCounter = 0;

wss.on('connection', (ws) => {
    console.log('プレイヤーが接続しました');
    ws.playerId = null;
    ws.roomId = null;

    ws.on('message', (data) => {
        let msg;
        try { msg = JSON.parse(data); } catch (e) { return; }

        switch (msg.type) {
            case 'match_request': {
                if (waitingPlayer && waitingPlayer.readyState === WebSocket.OPEN) {
                    const roomId = ++roomIdCounter;
                    // ★協力プレイ用: 共有の敵HPを部屋で管理
                    const room = {
                        id: roomId,
                        players: [waitingPlayer, ws],
                        enemyHp: 4500,   // 終焉の戦場のHP
                        enemyMaxHp: 4500,
                        phase: 1
                    };
                    rooms.set(roomId, room);

                    waitingPlayer.playerId = 1;
                    waitingPlayer.roomId = roomId;
                    ws.playerId = 2;
                    ws.roomId = roomId;

                    send(waitingPlayer, { type: 'matched', playerId: 1, roomId, enemyHp: room.enemyHp, enemyMaxHp: room.enemyMaxHp });
                    send(ws,            { type: 'matched', playerId: 2, roomId, enemyHp: room.enemyHp, enemyMaxHp: room.enemyMaxHp });

                    console.log(`部屋${roomId}を作成！協力バトルスタート`);
                    waitingPlayer = null;
                } else {
                    waitingPlayer = ws;
                    send(ws, { type: 'waiting' });
                    console.log('プレイヤー1が待機中...');
                }
                break;
            }

            // 自分の状態を相手に転送
            case 'game_state': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, { type: 'opponent_state', state: msg.state });
                }
                break;
            }

            // ★協力: 敵へのダメージをサーバーで集計して両者に通知
            case 'deal_damage_to_enemy': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                room.enemyHp = Math.max(0, room.enemyHp - msg.damage);
                // 両プレイヤーに敵HPを通知
                for (const p of room.players) {
                    if (p.readyState === WebSocket.OPEN) {
                        send(p, {
                            type: 'enemy_hp_update',
                            hp: room.enemyHp,
                            maxHp: room.enemyMaxHp,
                            damage: msg.damage,
                            attackerId: ws.playerId
                        });
                    }
                }
                // 敵HP0で勝利
                if (room.enemyHp <= 0) {
                    for (const p of room.players) {
                        if (p.readyState === WebSocket.OPEN) {
                            send(p, { type: 'coop_victory' });
                        }
                    }
                    rooms.delete(ws.roomId);
                    console.log(`部屋${ws.roomId}: 協力勝利！`);
                }
                break;
            }

            // 自分がやられた → 相手に通知
            case 'player_died': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, { type: 'partner_died' });
                }
                // 両者に敗北通知
                for (const p of room.players) {
                    if (p.readyState === WebSocket.OPEN) {
                        send(p, { type: 'coop_defeat' });
                    }
                }
                rooms.delete(ws.roomId);
                break;
            }

            // 弾発射エフェクト通知
            case 'fire': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, { type: 'opponent_fire', ammoType: msg.ammoType });
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        console.log('プレイヤーが切断しました');
        if (waitingPlayer === ws) waitingPlayer = null;
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, { type: 'opponent_disconnected' });
                }
                rooms.delete(ws.roomId);
            }
        }
    });
});

function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

server.listen(PORT, () => {
    console.log(`🎮 スライム砲車バトル 協力対戦サーバー起動！`);
    console.log(`📡 ポート: ${PORT}`);
    console.log(`👾 待機中...`);
});
