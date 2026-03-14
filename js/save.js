// ======================================
// SAVE - LocalStorage Save/Load
// ======================================
const SaveManager = {
    KEY: 'slime_tank_v2',
    defaultData() {
        return {
            clearedStages: [],
            highScores: {},
            unlockedAmmo: ['rock', 'herb'], // Initial ammo
            unlockedAllies: [
                { id: 'ally1', name: 'スラッチ', type: 'slime', color: '#4CAF50', darkColor: '#2E7D32', rarity: 1, cost: 1, level: 1 }
            ], // Initial allies
            allyDeck: ['ally1'], // Active allies (Max 2)
            deck: ['rock', 'herb'], // Initial deck
            wins: 0,
            losses: 0,
            gold: 0, // Currency
            upgrades: { hp: 0, attack: 0, goldBoost: 0, capacity: 0, maxAllySlot: 0 }, // Upgrade levels
            repairKits: 0, // 修理キット残数
            settings: { sound: true, vol: 0.3 },

            // 図鑑機能
            collection: {
                enemies: [], // 倒した敵のタイプ ['NORMAL', 'SCOUT', 'HEAVY', etc.]
                allies: [], // 獲得した仲間のID ['ally1', 'ally2', etc.]
            },

            // デイリーミッション
            dailyMissions: {
                lastDate: null, // 最後にリセットした日付 'YYYY-MM-DD'
                missions: [], // 現在のミッション [{type, target, progress, reward, completed}]
                completedToday: 0, // 今日完了したミッション数
            },

            // 既読ストーリーの記録
            seenStories: [], // 見たことのあるストーリーIDのリスト

            // 天井システム（プレミアムスカウト）
            gachaPity: 0, // 天井カウンター（★6が出たらリセット、50でガチャ★6保証）

            // タンクカスタマイズ
            unlockedParts: [],
            tankCustom: {
                color:  'color_blue',
                cannon: 'cannon_normal',
                armor:  'armor_normal',
                effect: 'effect_normal',
            },
        };
    },
    save(d) { try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) { } },
    load() {
        const dataStr = localStorage.getItem(this.KEY);
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                // Validate deck
                if (data.deck && Array.isArray(data.deck)) {
                    data.deck = data.deck.filter(id => CONFIG.AMMO_TYPES[id] !== undefined);
                }
                // Validate unlockedAmmo
                if (data.unlockedAmmo && Array.isArray(data.unlockedAmmo)) {
                    data.unlockedAmmo = data.unlockedAmmo.filter(id => CONFIG.AMMO_TYPES[id] !== undefined);
                }
                // Validate unlockedAllies (Ensure it's an array of objects)
                if (!data.unlockedAllies || !Array.isArray(data.unlockedAllies) || data.unlockedAllies.length === 0) {
                    data.unlockedAllies = this.defaultData().unlockedAllies;
                }

                // Validate allyDeck
                if (!data.allyDeck || !Array.isArray(data.allyDeck)) {
                    data.allyDeck = [data.unlockedAllies[0].id];
                }
                // コストシステムに基づいた検証（合計コスト = 基本3 + アップグレード分）
                // ★バグ修正⑤: maxCost を 2 固定にしていたため、maxAllySlot アップグレード後も
                //   ロード時にデッキが強制的に切り詰められていた
                const maxCost = 3 + ((data.upgrades && data.upgrades.maxAllySlot) || 0);
                let totalCost = 0;
                data.allyDeck = data.allyDeck.filter(id => {
                    const ally = data.unlockedAllies.find(a => a.id === id);
                    const cost = ally ? (ally.cost || 1) : 1;
                    if (totalCost + cost <= maxCost) {
                        totalCost += cost;
                        return true;
                    }
                    return false;
                });

                // フィルター後に空になった場合は最初の仲間を復元
                if (data.allyDeck.length === 0 && data.unlockedAllies.length > 0) {
                    data.allyDeck = [data.unlockedAllies[0].id];
                }

                // Merge with default to ensure new fields exist
                const merged = { ...this.defaultData(), ...data };
                // Deep merge: upgrades, collection, dailyMissions を個別にマージして新フィールド欠落を防ぐ
                merged.upgrades = { ...this.defaultData().upgrades, ...(data.upgrades || {}) };
                // settings を個別ディープマージ（古いセーブに vol がない場合のデフォルト補完）
                merged.settings = { ...this.defaultData().settings, ...(data.settings || {}) };
                if (typeof merged.settings.vol !== 'number' || isNaN(merged.settings.vol)) {
                    merged.settings.vol = 0.3;
                }
                merged.repairKits = (typeof data.repairKits === 'number') ? data.repairKits : 0;
                merged.collection = {
                    ...this.defaultData().collection,
                    ...(data.collection || {}),
                    enemies: Array.isArray(data.collection?.enemies) ? data.collection.enemies : [],
                    allies: Array.isArray(data.collection?.allies) ? data.collection.allies : [],
                };
                merged.dailyMissions = {
                    ...this.defaultData().dailyMissions,
                    ...(data.dailyMissions || {}),
                };
                merged.seenStories = Array.isArray(data.seenStories) ? data.seenStories : [];
                // タンクカスタマイズの移行
                merged.unlockedParts = Array.isArray(data.unlockedParts) ? data.unlockedParts : [];
                merged.tankCustom = { ...this.defaultData().tankCustom, ...(data.tankCustom || {}) };
                return merged;
            } catch (e) {
                console.error("Save data corrupted", e);
                return this.defaultData();
            }
        }
        return this.defaultData();
    },
    clearStage(d, id) { if (!d.clearedStages.includes(id)) { d.clearedStages.push(id); this.save(d); } },

    saveHighScore(d, stageId, frames) {
        if (!d.highScores) d.highScores = {};
        // Save if no score exists OR if new score is lower (faster)
        if (!d.highScores[stageId] || frames < d.highScores[stageId]) {
            d.highScores[stageId] = frames;
            this.save(d);
            return true; // New Record!
        }
        return false;
    },

    reset() { localStorage.removeItem(this.KEY); },

    // === 図鑑機能 ===
    addEnemyToCollection(saveData, enemyType) {
        if (!saveData.collection) saveData.collection = { enemies: [], allies: [] };
        if (!saveData.collection.enemies.includes(enemyType)) {
            saveData.collection.enemies.push(enemyType);
            this.save(saveData);
            return true; // 新規登録
        }
        return false;
    },

    addAllyToCollection(saveData, allyType) {
        if (!saveData.collection) saveData.collection = { enemies: [], allies: [] };
        if (!saveData.collection.allies.includes(allyType)) {
            saveData.collection.allies.push(allyType);
            this.save(saveData);
            return true; // 新規登録
        }
        return false;
    },

    // 既存のセーブデータから図鑑を同期する
    syncCollection(saveData) {
        if (!saveData.collection) saveData.collection = { enemies: [], allies: [] };
        let changed = false;

        // 1. 仲間の同期 (unlockedAlliesにあるものはすべて登録)
        if (saveData.unlockedAllies) {
            saveData.unlockedAllies.forEach(ally => {
                const type = ally.type || ally.id || 'slime'; // typeがない場合はidをフォールバック（全員'slime'になるバグを防ぐ）
                if (!saveData.collection.allies.includes(type)) {
                    saveData.collection.allies.push(type);
                    changed = true;
                }
            });
        }

        // 2. 敵の同期 (clearedStagesにあるステージの敵を登録)
        if (saveData.clearedStages && typeof STAGES !== 'undefined') {
            saveData.clearedStages.forEach(stageId => {
                const stage = STAGES.find(s => s.id === stageId);
                if (stage && stage.tankType) {
                    if (!saveData.collection.enemies.includes(stage.tankType)) {
                        saveData.collection.enemies.push(stage.tankType);
                        changed = true;
                    }
                }
            });
        }

        if (changed) {
            this.save(saveData);
        }
    },

    // === デイリーミッション ===
    getTodayDate() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    generateDailyMissions() {
        const missionTypes = [
            { type: 'defeat_enemies', name: '敵を{target}体倒す', targets: [5, 10, 15, 20], rewards: [300, 500, 800, 1200] },
            { type: 'win_battles', name: 'ステージを{target}回クリア', targets: [1, 2, 3], rewards: [500, 800, 1200] },
            { type: 'use_special', name: '必殺技を{target}回使う', targets: [2, 3, 5], rewards: [400, 600, 900] },
            { type: 'collect_items', name: 'アイテムを{target}個拾う', targets: [10, 20, 30], rewards: [300, 500, 700] },
            { type: 'deal_damage', name: '敵に{target}ダメージ与える', targets: [500, 1000, 2000], rewards: [400, 700, 1000] },
        ];

        const missions = [];
        const usedTypes = new Set();

        // 3つのミッションを生成
        while (missions.length < 3) {
            const missionTemplate = missionTypes[Math.floor(Math.random() * missionTypes.length)];
            if (usedTypes.has(missionTemplate.type)) continue;
            usedTypes.add(missionTemplate.type);

            const difficultyIndex = Math.floor(Math.random() * missionTemplate.targets.length);
            missions.push({
                type: missionTemplate.type,
                name: missionTemplate.name.replace('{target}', missionTemplate.targets[difficultyIndex]),
                target: missionTemplate.targets[difficultyIndex],
                progress: 0,
                reward: missionTemplate.rewards[difficultyIndex],
                completed: false
            });
        }

        return missions;
    },

    checkAndResetDailyMissions(saveData) {
        if (!saveData.dailyMissions) {
            saveData.dailyMissions = { lastDate: null, missions: [], completedToday: 0 };
        }

        const today = this.getTodayDate();
        if (saveData.dailyMissions.lastDate !== today) {
            // 新しい日なのでミッションをリセット
            saveData.dailyMissions.lastDate = today;
            saveData.dailyMissions.missions = this.generateDailyMissions();
            saveData.dailyMissions.completedToday = 0;
            this.save(saveData);
        }
    },

    updateMissionProgress(saveData, missionType, amount = 1) {
        if (!saveData.dailyMissions || !saveData.dailyMissions.missions) return;

        const mission = saveData.dailyMissions.missions.find(m => m.type === missionType && !m.completed);
        if (mission) {
            mission.progress += amount;
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                mission.progress = mission.target;
                saveData.dailyMissions.completedToday++;
                saveData.gold += mission.reward;
                this.save(saveData);
                return mission;
            }
            // 完了でなければバッチ保存を呼び出し元に任せる（毎回saveは重い）
            // this.save(saveData); ← 削除（呼び出し元で一括save）
        }
        return null;
    }
};

// =====================================================
// セーブデータ エクスポート / インポート (メソッドを外から追加)
// =====================================================
SaveManager.exportData = function(saveData) {
    try {
        const json = JSON.stringify(saveData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'slimebattle_save_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.error('Export failed:', e);
        return false;
    }
};

SaveManager.importData = function(onSuccess, onError) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.unlockedAllies || !data.deck) throw new Error('セーブファイルの形式が無効です');
                localStorage.setItem(SaveManager.KEY, JSON.stringify(data));
                if (onSuccess) onSuccess();
            } catch (err) {
                if (onError) onError(err.message);
            }
        };
        reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
};
