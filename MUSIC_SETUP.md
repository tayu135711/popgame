# 🎵 フリーBGM設置ガイド

## ファイル配置場所

`audio/` フォルダを作成し、以下のファイル名で配置してください。

```
audio/
├── battle_bgm.mp3        # バトルBGM
├── boss_bgm.mp3          # ボスBGM（St.5以降）
├── final_boss_bgm.mp3    # ラスボスBGM
├── ex_stage_bgm.mp3      # EXステージBGM
├── title_bgm.mp3         # タイトル・メニューBGM ★NEW
└── shop_bgm.mp3          # ショップ・スカウトBGM ★NEW
```

※ `.webm` や `.ogg` 形式も対応（先に試みる）

---

## 🔓 おすすめフリーBGMサイト

### 1. **Pixabay** (CC0 - 商用無料)
- URL: https://pixabay.com/music/
- キーワード: "8bit battle", "fantasy RPG", "adventure pixel"
- ダウンロード後そのまま使用可能

### 2. **魔王魂** (ゲーム向け日本サイト)
- URL: https://maou.audio/
- 種別: ゲーム向けBGM多数・無料
- 利用規約: クレジット不要（商用OK）

### 3. **甘茶の音楽工房**
- URL: https://amachamusic.chagasi.com/
- 和風・ファンタジー系が豊富
- 利用: 無料・クレジット不要

### 4. **Free Music Archive (FMA)**
- URL: https://freemusicarchive.org/
- CC ライセンス楽曲多数
- ライセンスを確認して使用

---

## 🎮 曲のイメージ参考

| ファイル名 | 雰囲気 | キーワード例 |
|-----------|--------|------------|
| title_bgm | 明るく冒険感 | "adventure", "hero", "fantasy" |
| battle_bgm | 中テンポ・緊張感 | "battle", "action", "fight" |
| boss_bgm | 重厚・緊迫 | "boss fight", "epic", "dark" |
| final_boss_bgm | 超緊迫・壮大 | "final boss", "dramatic" |
| ex_stage_bgm | 超高速・激しい | "intense", "extreme" |
| shop_bgm | 楽しい・ほのぼの | "shop", "town", "peaceful" |

---

## 📝 ゲーム内クレジット設置（推奨）

`settings` 画面や `README.md` に以下のように記載：

```
BGM: 魔王魂 (https://maou.audio/)
     甘茶の音楽工房 (https://amachamusic.chagasi.com/)
```

---

## ⚙️ 自動フォールバック

音楽ファイルが見つからない場合は、自動的に**シンセサイザーBGM**にフォールバックします。
ゲームはファイルがなくても動作します。
