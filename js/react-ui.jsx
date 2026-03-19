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
            pointerEvents: 'auto',
            paddingTop: '35vh'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '6px', 
                width: '75%',
                maxWidth: '350px'
            }}>
                {menuItems.map((item, index) => (
                    <button 
                        key={index}
                        onClick={() => onSelect(index)}
                        style={{
                            padding: '8px 12px',
                            background: cursorIndex === index ? 'linear-gradient(to right, #FF9800, #FF5722)' : 'rgba(0, 0, 0, 0.45)',
                            color: '#FFF',
                            border: cursorIndex === index ? '2px solid #FFF' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                            boxShadow: cursorIndex === index ? '0 0 10px rgba(255, 152, 0, 0.8)' : '0 2px 4px rgba(0,0,0,0.3)',
                            transform: cursorIndex === index ? 'scale(1.05)' : 'scale(1.0)',
                            textAlign: 'center',
                            outline: 'none',
                            WebkitTapHighlightColor: 'transparent'
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

// --- 設定メニュー コンポーネント ---
function SettingsMenu({ onSelect, onVolumeChange, volume, onExport, onImport }) {
    const volPct = Math.round(volume * 100);

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            pointerEvents: 'auto',
            background: 'rgba(10, 20, 35, 0.4)',
            paddingTop: '5vh'
        }}>
            <h2 style={{color: '#FFD700', fontSize: '32px', marginBottom: '40px', marginTop: 0}}>⚙ 設定</h2>

            <div style={{ width: '80%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 🔊 音量スライダー */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ color: '#FFF', fontSize: '20px', fontWeight: 'bold' }}>🔊 音量</span>
                        <span style={{ color: '#FFD700', fontSize: '18px', fontWeight: 'bold' }}>{volPct}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        value={volume} 
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                            height: '8px',
                            accentColor: '#4CAF50'
                        }}
                    />
                </div>

                {/* 💾 セーブデータ書き出し */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#FFF', fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>💾 セーブ書き出し</div>
                        <div style={{ color: '#888', fontSize: '13px' }}>バックアップ用データを保存</div>
                    </div>
                    <button onClick={onExport} style={{ padding: '10px 15px', background: '#3C64A0', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        保存 ▶
                    </button>
                </div>

                {/* 📂 セーブデータ読み込み */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#FFF', fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>📂 セーブ読み込み</div>
                        <div style={{ color: '#888', fontSize: '13px' }}>バックアップから復元</div>
                    </div>
                    <button onClick={onImport} style={{ padding: '10px 15px', background: '#3C64A0', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        読込 ▶
                    </button>
                </div>

            </div>

            <button 
                onClick={() => onSelect(3)} 
                style={{
                    marginTop: '40px', padding: '12px 40px',
                    background: 'transparent', border: '2px solid #888', borderRadius: '25px',
                    color: '#FFF', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                }}
            >
                ← タイトルに戻る
            </button>
        </div>
    );
}

// --- ステージ選択メニュー コンポーネント ---
function StageSelectMenu({ onSelectStage, onBack, onToggleDifficulty, difficulty, stages, clearedStages, highScores, selectedStageIndex }) {
    return (
        <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'auto',
            background: 'rgba(10, 20, 35, 0.4)',
            paddingTop: '3vh',
            paddingBottom: '20px'
        }}>
            <h2 style={{color: '#FFF', fontSize: '34px', marginBottom: '10px', marginTop: 0, textShadow: '2px 2px 4px #000'}}>
                ⚔ ステージ選択
            </h2>

            <div 
                onClick={onToggleDifficulty}
                style={{
                    background: difficulty === 'HARD' ? 'rgba(255, 100, 100, 0.3)' : difficulty === 'EASY' ? 'rgba(100, 255, 100, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    border: `2px solid ${difficulty === 'HARD' ? '#FF5252' : difficulty === 'EASY' ? '#4CAF50' : '#FFF'}`,
                    borderRadius: '20px', padding: '8px 24px', marginBottom: '15px',
                    cursor: 'pointer', color: '#FFF', fontWeight: 'bold', fontSize: '16px'
                }}
            >
                難易度: {difficulty} (タップで変更)
            </div>

            <div style={{
                width: '90%', maxWidth: '600px',
                flex: 1,
                overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '15px',
                padding: '10px',
                scrollbarWidth: 'thin', scrollbarColor: '#5BA3E6 rgba(255,255,255,0.1)'
            }}>
                {stages.map((stage, i) => {
                    const isSelected = i === selectedStageIndex;
                    const isCleared = clearedStages.includes(stage.id);
                    const hs = highScores[stage.id];
                    // ★バグ修正: battleTimer はフレーム数。正しくMM:SSに変換する。
                    // 旧コード: Math.floor(hs/60) を分として表示 → 実際は秒数なので誤り。
                    // 例: 3661フレーム(約1分1秒) → 旧:61:01表示、新:01:01表示。
                    let timeStr = null;
                    if (hs) {
                        const totalSec = Math.floor(hs / 60);
                        const mins = Math.floor(totalSec / 60);
                        const secs = totalSec % 60;
                        timeStr = `⏱ ${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
                    }
                    const isExtra = stage.isExtra;

                    let bgGrad = isSelected ? 'linear-gradient(to right, rgba(91,163,230,0.5), rgba(60,100,160,0.4))' : 'linear-gradient(to right, rgba(40,50,70,0.8), rgba(25,35,50,0.8))';
                    let borderColor = isSelected ? '#5BA3E6' : (isCleared ? '#4CAF50' : 'rgba(100,120,160,0.3)');
                    if (isExtra) {
                        bgGrad = isSelected ? 'linear-gradient(to right, rgba(255,215,0,0.4), rgba(255,140,0,0.3))' : 'linear-gradient(to right, rgba(80,60,20,0.9), rgba(60,40,10,0.9))';
                        borderColor = isSelected ? '#FFD700' : (isCleared ? '#4CAF50' : 'rgba(255,215,0,0.3)');
                    }

                    return (
                        <div 
                            key={stage.id}
                            onClick={() => onSelectStage(i)}
                            style={{
                                background: bgGrad,
                                border: `2px solid ${borderColor}`,
                                borderRadius: '12px',
                                padding: '15px',
                                cursor: 'pointer',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                boxShadow: isSelected ? '0 0 15px rgba(91,163,230,0.5)' : 'none',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.1s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: isCleared ? '#4CAF50' : (isSelected ? (isExtra ? '#FFD700' : '#5BA3E6') : '#555'),
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    color: '#FFF', fontWeight: 'bold', fontSize: isExtra ? '13px' : '18px'
                                }}>
                                    {isExtra ? 'EX' : (i + 1)}
                                </div>
                                
                                <div>
                                    <div style={{ color: isExtra ? (isSelected ? '#FFD700' : '#FFA500') : (isSelected ? '#FFF' : '#CCC'), fontSize: isSelected ? '20px' : '18px', fontWeight: 'bold'}}>
                                        {stage.name}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
                                        {stage.desc}
                                    </div>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                {timeStr && <div style={{ color: isCleared ? '#FFD700' : '#888', fontSize: '14px', fontWeight: 'bold' }}>{timeStr}</div>}
                                {isCleared && <div style={{ color: '#4CAF50', fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>✅ クリア</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={onBack}
                style={{
                    marginTop: '20px', padding: '12px 40px',
                    background: 'transparent', border: '2px solid #888', borderRadius: '25px',
                    color: '#FFF', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                }}
            >
                ← タイトルに戻る
            </button>
        </div>
    );
}

// ★バグ修正共通ヘルパー: InputManager の getter（menuConfirm / back）は
// 直接プロパティに代入しても無視される（read-only getter のため）。
// keys[] に注入し、prev[] を false にリセットすることで
// pressed() が正しく「今フレームだけ true」と認識できるようにする。
function _injectKey(keyCode) {
    if (!window.game || !window.game.input) return;
    window.game.input.keys[keyCode] = true;
    window.game.input.prev[keyCode] = false; // pressed() = keys && !prev を保証
    setTimeout(() => {
        if (window.game && window.game.input) {
            window.game.input.keys[keyCode] = false;
        }
    }, 80);
}

function App() {
    const [gameState, setGameState] = useState('title');
    const [titleCursor, setTitleCursor] = useState(0);
    const [stageSelectIndex, setStageSelectIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (window.game) {
                if (window.game.state !== gameState) {
                    setGameState(window.game.state);
                }
                if (window.game.titleCursor !== titleCursor) {
                    setTitleCursor(window.game.titleCursor);
                }
                if (window.game.selectedStage !== stageSelectIndex) {
                    setStageSelectIndex(window.game.selectedStage);
                }
            }
        }, 1000 / 60);
        return () => clearInterval(interval);
    }, [gameState, titleCursor, stageSelectIndex]);

    // ★バグ修正⑮: menuConfirm / back は InputManager の read-only getter のため
    // 直接 `= true` で代入しても無効。_injectKey() で keys[] に注入する。
    const handleMenuSelect = (index) => {
        if (!window.game) return;
        window.game.titleCursor = index;
        _injectKey('Space'); // menuConfirm = pressed('Space') || pressed('Enter') || pressed('KeyZ')
        if (window.game.sound) window.game.sound.play('confirm');
    };

    const handleStageSelect = (index) => {
        if (!window.game) return;
        window.game.selectedStage = index;
        _injectKey('Space');
    };

    const handleStageBack = () => {
        if (!window.game) return;
        // ★バグ修正⑮: back = pressed('KeyB') || pressed('Escape') — getter のため直接代入不可
        _injectKey('KeyB');
    };

    const handleToggleDifficulty = () => {
        if (!window.game) return;
        window.game.difficultySelectMode = true;
        window.game.input.keys['ArrowLeft'] = true;
        setTimeout(() => { if (window.game) window.game.input.keys['ArrowLeft'] = false; }, 50);
    };

    const handleSettingsSelect = (index) => {
        if (!window.game) return;
        window.game.settingsCursor = index;
        _injectKey('Space');
        if (window.game.sound) window.game.sound.play('confirm');
    };

    const handleVolumeChange = (vol) => {
        if (window.game && window.game.sound) {
            window.game.saveData.settings.vol = vol;
            window.game.sound.vol = vol;
            if (window.SaveManager) window.SaveManager.save(window.game.saveData);
            window.game.sound.play('cursor');
        }
    };

    const handleExport = () => {
        if (window.game && window.SaveManager) {
            if (window.SaveManager.exportData(window.game.saveData)) {
                window.game.particles.damageNum(window.CONFIG.CANVAS_WIDTH / 2, 200, '書き出し完了！', '#4CAF50');
                if (window.game.sound) window.game.sound.play('confirm');
            }
        }
    };

    const handleImport = () => {
        if (window.game && window.SaveManager) {
            window.SaveManager.importData(
                () => {
                    if (window.game.sound) window.game.sound.play('powerup');
                    if (window.confirm('セーブデータを読み込みました。ページをリロードします。')) {
                        location.reload();
                    }
                },
                (msg) => {
                    if (window.game.sound) window.game.sound.play('damage');
                    window.game.particles.damageNum(window.CONFIG.CANVAS_WIDTH / 2, 200, '読み込み失敗: ' + msg, '#FF5252');
                }
            );
        }
    };

    const currentVolume = (window.game && window.game.saveData && window.game.saveData.settings) 
                            ? window.game.saveData.settings.vol 
                            : 0.3;

    let stageList = [];
    let difficulty = 'NORMAL';
    let clearedStages = [];
    let highScores = {};
    // ★バグ修正: STAGES_MAIN も undefined チェックを追加（STAGES_NORMAL だけ確認していた）
    if (window.game && window.STAGES_NORMAL && window.STAGES_MAIN) {
        const allMainCleared = window.STAGES_MAIN.every(s => window.game.saveData.clearedStages.includes(s.id));
        stageList = allMainCleared ? [...window.STAGES_NORMAL, ...(window.STAGES_EX || [])] : window.STAGES_NORMAL;
        difficulty = window.game.selectedDifficulty || 'NORMAL';
        clearedStages = window.game.saveData.clearedStages || [];
        highScores = window.game.saveData.highScores || {};
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            {gameState === 'title' && (
                <TitleMenu 
                    onSelect={handleMenuSelect} 
                    cursorIndex={titleCursor} 
                />
            )}
            {gameState === 'stage_select' && (
                <StageSelectMenu
                    onSelectStage={handleStageSelect}
                    onBack={handleStageBack}
                    onToggleDifficulty={handleToggleDifficulty}
                    difficulty={difficulty}
                    stages={stageList}
                    clearedStages={clearedStages}
                    highScores={highScores}
                    selectedStageIndex={stageSelectIndex}
                />
            )}
            {gameState === 'settings' && (
                <SettingsMenu 
                    onSelect={handleSettingsSelect} 
                    onVolumeChange={handleVolumeChange}
                    volume={currentVolume}
                    onExport={handleExport}
                    onImport={handleImport}
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
