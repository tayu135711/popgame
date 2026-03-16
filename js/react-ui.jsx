// js/react-ui.jsx
// Reactを使ったUIコンポーネントのエントリーポイント

const { useState, useEffect } = React;

function TitleMenu({ onSelect, cursorIndex }) {
    const menuItems = [
        'ゲーム開始', 
        'イベントステージ', 
        'デイリーミッション', 
        '図鑑', 
        'アップグレード', 
        '配合', 
        '🎨 カスタマイズ', 
        '⚙ 設定'
    ];

    return (
        <div className="react-title-container" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto', // React UI部分のタップを有効化
            paddingTop: '20vh' // タイトルロゴの下に配置するための余白
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '12px',
                width: '80%',
                maxWidth: '400px'
            }}>
                {menuItems.map((item, index) => (
                    <button 
                        key={index}
                        onClick={() => onSelect(index)}
                        style={{
                            padding: '16px 20px',
                            background: cursorIndex === index ? 'linear-gradient(to right, #FF9800, #FF5722)' : 'rgba(0, 0, 0, 0.7)',
                            color: '#FFF',
                            border: cursorIndex === index ? '2px solid #FFF' : '2px solid #555',
                            borderRadius: '12px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: cursorIndex === index ? '0 0 15px rgba(255, 152, 0, 0.8)' : '0 4px 6px rgba(0,0,0,0.5)',
                            transform: cursorIndex === index ? 'scale(1.05)' : 'scale(1.0)',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                            if (window.game) window.game.titleCursor = index;
                        }}
                    >
                        {item}
                    </button>
                ))}
            </div>
            <div style={{
                marginTop: '40px',
                fontSize: '14px',
                color: '#AAA',
                textAlign: 'center',
                textShadow: '1px 1px 2px #000'
            }}>
                バージョン情報: {window.CONFIG ? window.CONFIG.VERSION : 'v1.4'}<br/>
                Tap SPACE / Z to Select
            </div>
        </div>
    );
}

function App() {
    const [gameState, setGameState] = useState('title');
    const [titleCursor, setTitleCursor] = useState(0);

    useEffect(() => {
        // game.jsの状態変更を監視するポーリング（簡易的な連携）
        const interval = setInterval(() => {
            if (window.game) {
                if (window.game.state !== gameState) {
                    setGameState(window.game.state);
                }
                if (window.game.titleCursor !== titleCursor) {
                    setTitleCursor(window.game.titleCursor);
                }
            }
        }, 1000 / 60); // 60fpsで状態監視

        return () => clearInterval(interval);
    }, [gameState, titleCursor]);

    const handleMenuSelect = (index) => {
        if (window.game) {
            window.game.titleCursor = index;
            window.game.input.menuConfirm = true; // 決定キーを押したことにする
            if (window.game.sound) window.game.sound.play('confirm');
        }
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>
            {gameState === 'title' && (
                <TitleMenu 
                    onSelect={handleMenuSelect} 
                    cursorIndex={titleCursor} 
                />
            )}
        </div>
    );
}

// Reactアプリのマウント
window.addEventListener('load', () => {
    const rootElement = document.getElementById('ui-root');
    if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<App />);
    }
});
