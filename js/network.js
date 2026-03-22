// ======================================
// NETWORK - WebSocket対戦通信
// ======================================
class NetworkManager {
    constructor() {
        this.ws = null;
        this.playerId = null;   // 1 or 2
        this.roomId = null;
        this.connected = false;
        this.matched = false;

        // コールバック（ゲーム側から設定する）
        this.onMatched = null;          // マッチング完了時
        this.onWaiting = null;          // 待機中
        this.onOpponentState = null;    // 相手の状態受信
        this.onOpponentFire = null;     // 相手が弾を撃った
        this.onTakeDamage = null;       // ダメージを受けた
        this.onOpponentDisconnected = null; // 相手が切断
        this.onOpponentLost = null;     // 相手が負けた
    }

    // サーバーに接続してマッチング開始
    connect(serverUrl = 'ws://localhost:3000') {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
            console.log('サーバーに接続！');
            this.connected = true;
            // マッチング要求を送る
            this.send({ type: 'match_request' });
        };

        this.ws.onmessage = (event) => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) { return; }
            this._handleMessage(msg);
        };

        this.ws.onclose = () => {
            console.log('サーバーから切断');
            this.connected = false;
            this.matched = false;
        };

        this.ws.onerror = (e) => {
            console.error('WebSocketエラー:', e);
        };
    }

    // メッセージ処理
    _handleMessage(msg) {
        switch (msg.type) {
            case 'waiting':
                console.log('対戦相手を待っています...');
                if (this.onWaiting) this.onWaiting();
                break;

            case 'matched':
                this.playerId = msg.playerId;
                this.roomId = msg.roomId;
                this.matched = true;
                console.log(`マッチング完了！プレイヤー${this.playerId}`);
                if (this.onMatched) this.onMatched(this.playerId);
                break;

            case 'opponent_state':
                if (this.onOpponentState) this.onOpponentState(msg.state);
                break;

            case 'opponent_fire':
                if (this.onOpponentFire) this.onOpponentFire(msg.ammoType, msg.damage);
                break;

            case 'take_damage':
                if (this.onTakeDamage) this.onTakeDamage(msg.damage, msg.ammoType);
                break;

            case 'opponent_disconnected':
                console.log('相手が切断しました');
                if (this.onOpponentDisconnected) this.onOpponentDisconnected();
                break;

            case 'opponent_lost':
                if (this.onOpponentLost) this.onOpponentLost();
                break;
        }
    }

    // 自分の状態を送信（毎フレーム呼ぶ）
    sendState(state) {
        if (!this.matched) return;
        this.send({ type: 'game_state', state });
    }

    // 弾発射を通知
    sendFire(ammoType, damage) {
        if (!this.matched) return;
        this.send({ type: 'fire', ammoType, damage });
    }

    // ダメージを通知
    sendDamage(damage, ammoType) {
        if (!this.matched) return;
        this.send({ type: 'damage', damage, ammoType });
    }

    // ゲームオーバーを通知
    sendGameOver() {
        if (!this.matched) return;
        this.send({ type: 'game_over' });
    }

    // 送信ヘルパー
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // 切断
    disconnect() {
        if (this.ws) this.ws.close();
    }

    // プレイヤー番号によって左右を決める
    // プレイヤー1 = 左側、プレイヤー2 = 右側
    isHost() {
        return this.playerId === 1;
    }
}

// グローバルインスタンス
const network = new NetworkManager();
