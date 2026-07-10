# 🎮 スライム砲車バトル ～スライム戦車の大冒険～

スライムたちと一緒に戦車に乗り込み、弾を拾って大砲に込めて敵を撃破するオリジナルの2Dアクションゲームです。Canvas API を使ったフロントエンドと、Node.js 製の静的配信サーバーで構成されています。

🔗 **Play**: https://tayu135711.github.io/popgame/
🏆 **ランキング**: `ranking.html`
📊 **管理ダッシュボード**: `dashboard.html`

---

## 📖 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [ディレクトリ構成](#ディレクトリ構成)
- [セットアップ](#セットアップ)
- [開発コマンド](#開発コマンド)
- [デプロイ](#デプロイ)
- [CI/CD](#cicd)

---

## 概要

プレイヤーはスライムの戦車に乗り込み、内部で弾薬を拾って大砲に装填しながら侵入してくる敵を迎撃します。ステージクリアで手に入るゴールドで仲間スライムやアップグレードを強化し、メインストーリー・イベントステージ・EXステージなど多彩なコンテンツに挑戦できます。

スコアはバックエンド API（Render + PostgreSQL）に送信され、`ranking.html` でグローバルランキングを確認できます。

## 主な機能

- **戦車内バトルシステム**: 弾を拾って大砲に装填し、迫りくる敵（NORMAL / HEAVY / SCOUT / MAGICAL / DEFENSE / BOSS / TRUE_BOSS / SLIME_KING など）を撃破
- **仲間（アライ）システム**: 仲間スライムを編成し、アイテム収集や戦闘をサポート。レアリティ・レベルによるステータス変化あり
- **ステージ構成**: メインストーリー、通常ステージ、EXステージ、イベントステージ、チャプター2〜5までのマルチチャプター構成
- **育成・収集要素**: アップグレード（HP・攻撃力・ゴールド獲得量など）、図鑑（敵・仲間コレクション）、デイリーミッション
- **ストーリー演出**: `story.js` / `gm_narrator.js` によるナレーション・ストーリーテキスト表示
- **セーブ機能**: LocalStorage を用いたセーブ/ロード（`SaveManager`）
- **サウンド**: BGM（タイトル・バトル・ボス戦など多数）と効果音の管理
- **タッチ操作対応**: モバイル向けタッチコントローラーを搭載（PWA として動作、`manifest.json` あり）
- **ランキング & 管理ダッシュボード**: スコアの送信・閲覧、管理者用のスコア管理（削除・確認）画面

## 技術スタック

| 分類 | 内容 |
|---|---|
| フロントエンド | Vanilla JavaScript（ES Modules）, HTML5 Canvas API, CSS |
| バックエンド（配信用） | Node.js（`http` モジュールのみ、依存なしの静的配信サーバー） |
| スコアAPI | 別リポジトリの Express + PostgreSQL（Neon）バックエンド（[popgame-backend](https://popgame-backend-43dj.onrender.com)） |
| Lint | ESLint 10（Flat Config） |
| PWA | Service Worker（`js/sw.js`）, Web App Manifest |
| CI | GitHub Actions（Lint / HTML構文チェック） |
| デプロイ | GitHub Pages（フロントエンド）, Render（バックエンドAPI） |

## ディレクトリ構成

```
popgame/
├── index.html          # ゲーム本体のエントリーポイント
├── ranking.html         # グローバルランキング表示ページ
├── dashboard.html        # スコア管理ダッシュボード（管理者用）
├── server.js            # 静的ファイル配信用サーバー（Node.js標準モジュールのみ）
├── css/
│   └── style.css
├── js/
│   ├── config.js        # ゲーム全体の定数・バランス調整値
│   ├── game.js          # メインゲームループ・状態管理
│   ├── tank.js           # 戦車内部（コックピット・大砲）の処理
│   ├── battle.js         # 戦闘ロジック
│   ├── ally.js           # 仲間スライムAI
│   ├── invader.js        # 敵AI
│   ├── defender.js        # 防衛ユニット
│   ├── player.js          # プレイヤー操作・状態
│   ├── ammo.js            # 弾薬アイテム
│   ├── projectile.js       # 砲弾の挙動
│   ├── powerup.js          # パワーアップアイテム
│   ├── particles.js         # パーティクルエフェクト
│   ├── physics.js           # 当たり判定・物理演算
│   ├── renderer.js          # 描画処理（最大のファイル）
│   ├── ui.js               # UI（メニュー・ショップ・図鑑など）
│   ├── stages.js            # ステージ定義（メイン/通常/EX/イベント/チャプター2〜5）
│   ├── story.js             # ストーリーテキスト・演出
│   ├── gm_narrator.js        # ゲームマスター風ナレーション
│   ├── save.js              # セーブ/ロード（LocalStorage）
│   ├── sound.js             # BGM/SE管理
│   ├── input.js             # キーボード入力
│   ├── touch.js             # タッチ操作（モバイル向け）
│   ├── sw.js                # Service Worker（PWA）
│   └── manifest.json        # Web App Manifest
├── audio/                # BGM・効果音ファイル
├── icons/                # PWAアイコン
├── .github/workflows/     # GitHub Actions CI定義
└── eslint.config.js       # ESLint設定
```

## セットアップ

```bash
# 依存パッケージのインストール（ESLintのみ）
npm install

# ローカルサーバー起動（デフォルト: http://localhost:3000）
npm start
```

`PORT` 環境変数でポート番号を変更できます。

```bash
PORT=8080 npm start
```

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm start` | `server.js` を起動し、静的ファイルを配信 |
| `npm run lint` | ESLint によるコード品質チェック（`js/**/*.js`） |

## デプロイ

- **フロントエンド**: GitHub Pages（`main` ブランチから自動公開）
  - 公開URL: https://tayu135711.github.io/popgame/
- **スコアAPI**: Render にデプロイされた別リポジトリのバックエンド（PostgreSQL / Neon 接続）
  - `https://popgame-backend-43dj.onrender.com/api/scores`
  - ローカル開発時は `localhost:8080` を参照するよう自動切り替え

## CI/CD

`.github/workflows/ci.yml` にて、`main` ブランチへの push / PR 時に以下を自動実行します。

- **コード品質チェック**: `npm run lint`（ESLint）
- **HTML構文チェック**: `htmlhint` による全 HTML ファイルの検証

---

## ライセンス

現時点で未設定です。個人開発ポートフォリオプロジェクトとして公開しています。
