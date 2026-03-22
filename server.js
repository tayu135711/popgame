// ======================================
// スライム砲車バトル - 対戦サーバー
// ======================================
const WebSocket = require('ws');
const http = require('http');

const PORT = 3000;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// 待機中のプレイヤー
let waitingPlayer = null;

// 部屋管理
const rooms = new Map();
let roomIdCounter = 0;

wss.on('connection', (ws) => {
    console.log('プレイヤーが接続しました');
    ws.playerId = null;
    ws.roomId = null;

    ws.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            return;
        }

        switch (msg.type) {

            // マッチング要求
            case 'match_request': {
                if (waitingPlayer && waitingPlayer.readyState === WebSocket.OPEN) {
                    // 2人揃った → 部屋を作る
                    const roomId = ++roomIdCounter;
                    const room = {
                        id: roomId,
                        players: [waitingPlayer, ws],
                        state: {}
                    };
                    rooms.set(roomId, room);

                    waitingPlayer.playerId = 1;
                    waitingPlayer.roomId = roomId;
                    ws.playerId = 2;
                    ws.roomId = roomId;

                    // お互いにマッチング完了を通知
                    send(waitingPlayer, { type: 'matched', playerId: 1, roomId });
                    send(ws,            { type: 'matched', playerId: 2, roomId });

                    console.log(`部屋${roomId}を作成！1vs1スタート`);
                    waitingPlayer = null;
                } else {
                    // 待機列に入る
                    waitingPlayer = ws;
                    send(ws, { type: 'waiting' });
                    console.log('プレイヤー1が待機中...');
                }
                break;
            }

            // ゲーム状態の同期（自分の状態を相手に転送）
            case 'game_state': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, {
                        type: 'opponent_state',
                        state: msg.state
                    });
                }
                break;
            }

            // 弾発射の通知
            case 'fire': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, {
                        type: 'opponent_fire',
                        ammoType: msg.ammoType,
                        damage: msg.damage
                    });
                }
                break;
            }

            // ダメージ通知
            case 'damage': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, {
                        type: 'take_damage',
                        damage: msg.damage,
                        ammoType: msg.ammoType
                    });
                }
                break;
            }

            // 勝敗通知
            case 'game_over': {
                const room = rooms.get(ws.roomId);
                if (!room) return;
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    send(opponent, { type: 'opponent_lost' });
                }
                rooms.delete(ws.roomId);
                console.log(`部屋${ws.roomId}終了`);
                break;
            }
        }
    });

    ws.on('close', () => {
        console.log('プレイヤーが切断しました');

        // 待機中だった場合
        if (waitingPlayer === ws) {
            waitingPlayer = null;
        }

        // 部屋にいた場合は相手に通知
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
    console.log(`🎮 スライム砲車バトル 対戦サーバー起動！`);
    console.log(`📡 ポート: ${PORT}`);
    console.log(`👾 待機中...`);
});
