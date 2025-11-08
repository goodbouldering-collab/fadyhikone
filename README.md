# ファディー彦根 - AIパーソナルジムシステム

## プロジェクト概要

**ファディー彦根**は、AIとスタッフが連携してユーザーの健康管理をサポートする次世代型パーソナルジムシステムです。

### 主な特徴

- 🤖 **AI自動解析** - 食事写真から栄養バランスとカロリーを推定
- 👥 **専門スタッフアドバイス** - トレーナーや栄養士が個別にサポート
- 📊 **データ可視化** - 体重・体脂肪率の変化をグラフで管理
- 🔐 **外部認証対応** - Google・LINE連携ログイン
- ⚡ **エッジコンピューティング** - Cloudflare Pages/Workersで高速配信

## 公開URL

### 開発環境（サンドボックス）
- **トップページ**: https://3000-i48axlepfz387nht5ffrx-5c13a017.sandbox.novita.ai
- **マイページ**: https://3000-i48axlepfz387nht5ffrx-5c13a017.sandbox.novita.ai/mypage
- **管理画面**: https://3000-i48axlepfz387nht5ffrx-5c13a017.sandbox.novita.ai/admin

### テストアカウント

**一般ユーザー:**
- Email: user1@example.com (山田花子)
- Email: user2@example.com (佐藤太郎)

**管理者:**
- Email: admin@furdi-hikone.jp

※ 認証はGoogle/LINE OAuthで行いますが、開発環境ではシードデータのユーザーが登録済みです。

## 技術スタック

### バックエンド
- **Hono** - 軽量高速Webフレームワーク
- **Cloudflare Workers** - エッジランタイム
- **D1 Database** - SQLiteベースの分散データベース
- **Web Crypto API** - JWT認証（Node.js非依存）

### フロントエンド
- **Vanilla JavaScript** - フレームワークレス
- **TailwindCSS** - ユーティリティファーストCSS
- **Chart.js** - グラフ描画
- **Axios** - HTTPクライアント
- **Day.js** - 日付処理

### インフラ
- **Cloudflare Pages** - 静的サイトホスティング
- **Cloudflare R2** - オブジェクトストレージ（画像保存）
- **PM2** - プロセスマネージャー（開発環境）

## データ構造

### データベーステーブル

#### 1. users（ユーザー）
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT UNIQUE
- name: TEXT
- provider: TEXT (google/line)
- provider_id: TEXT
- role: TEXT (user/admin)
- avatar_url: TEXT
- created_at: DATETIME
- updated_at: DATETIME
```

#### 2. health_logs（健康ログ）
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FK
- log_date: DATE
- weight: REAL
- body_fat_percentage: REAL
- muscle_mass: REAL
- meal_type: TEXT
- meal_description: TEXT
- meal_image_url: TEXT
- exercise_type: TEXT
- exercise_duration: INTEGER
- sleep_hours: REAL
- mood: TEXT
- notes: TEXT
- ai_analysis: TEXT
- created_at: DATETIME
```

#### 3. staff_advices（スタッフアドバイス）
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FK
- staff_name: TEXT
- advice_text: TEXT
- advice_type: TEXT (diet/exercise/lifestyle/general)
- is_read: BOOLEAN
- created_at: DATETIME
```

#### 4. inquiries（問い合わせ）
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FK (nullable)
- name: TEXT
- email: TEXT
- phone: TEXT
- subject: TEXT
- message: TEXT
- status: TEXT (pending/in_progress/resolved)
- created_at: DATETIME
```

## 機能一覧

### ✅ 実装済み機能

#### トップページ
- ✅ Heroセクション（サービス紹介）
- ✅ スタッフアドバイス表示（ログインユーザーのみ）
- ✅ 健康ログ入力フォーム
  - 体重・体脂肪率・筋肉量
  - 食事情報（種類・内容・写真アップロード）
  - 運動情報（種類・時間）
  - 睡眠時間・気分・メモ
- ✅ 写真アップロード & AI解析（モック）
- ✅ AIパーソナルジムの良さ紹介
- ✅ FAQ（アコーディオン）
- ✅ 問い合わせフォーム

#### 認証機能
- ✅ Google OAuth ログイン
- ✅ LINE OAuth ログイン
- ✅ JWT トークン認証
- ✅ 自動ログイン（ローカルストレージ）

#### マイページ
- ✅ ユーザー情報表示
- ✅ 最新のスタッフアドバイス表示
- ✅ 体重・体脂肪率推移グラフ（Chart.js）
- ✅ 健康ログ履歴（横スクロールテーブル）

#### 管理画面（管理者のみ）
- ✅ 統計ダッシュボード
  - 総ユーザー数
  - 未対応の問い合わせ数
  - 対応中の問い合わせ数
- ✅ ユーザー管理
  - 全ユーザー一覧表示
  - ユーザー検索機能
  - ユーザー別健康ログ表示（アコーディオン）
  - スタッフアドバイス送信
- ✅ 問い合わせ管理
  - 全問い合わせ一覧
  - ステータス変更（未対応/対応中/解決済み）
  - 問い合わせ詳細表示（モーダル）

#### UI/UX
- ✅ 統一テーマシステム（CSS変数）
- ✅ ローディングスピナー（全API呼び出し）
- ✅ レスポンシブデザイン
- ✅ アコーディオン・モーダル
- ✅ タブ切り替え（管理画面）

### ⚠️ 未実装機能（本番環境で必要）

1. **Google OAuth設定**
   - Google Cloud ConsoleでOAuth 2.0クライアントID発行
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` を環境変数に設定

2. **LINE OAuth設定**
   - LINE DevelopersでLINE Loginチャネル作成
   - `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET` を環境変数に設定

3. **R2バケット設定**
   - Cloudflare R2バケット作成
   - `wrangler.json`にバケット名設定
   - 画像アップロード機能の有効化

4. **実際のAI解析API統合**
   - OpenAI Vision API、Google Gemini等と統合
   - `src/routes/health-logs.ts`の`generateMockAnalysis`を置き換え

5. **メール通知機能**
   - SendGrid, Mailgun等と統合
   - 問い合わせ受付通知、アドバイス通知

6. **プッシュ通知**
   - LINE Messaging API統合
   - 新着アドバイス通知

## 開発環境セットアップ

### 前提条件
- Node.js 18+
- npm または pnpm
- Wrangler CLI

### インストール

```bash
# リポジトリクローン
git clone <repository-url>
cd webapp

# 依存関係インストール
npm install

# ローカルD1データベース初期化
npm run db:migrate:local

# テストデータ投入
npm run db:seed
```

### 開発サーバー起動

```bash
# ビルド
npm run build

# PM2で開発サーバー起動（推奨）
pm2 start ecosystem.config.cjs

# または直接起動
npm run dev:sandbox
```

### データベース操作

```bash
# ローカルマイグレーション適用
npm run db:migrate:local

# 本番マイグレーション適用
npm run db:migrate:prod

# シードデータ投入
npm run db:seed

# データベースリセット
npm run db:reset

# ローカルD1コンソール
npm run db:console:local
```

## 本番デプロイ

### 1. Cloudflare API設定

```bash
# Cloudflare APIトークンを環境変数に設定
export CLOUDFLARE_API_TOKEN="your-api-token"

# または .dev.vars ファイルに記載
echo "CLOUDFLARE_API_TOKEN=your-api-token" > .dev.vars
```

### 2. D1データベース作成

```bash
# 本番D1データベース作成
npx wrangler d1 create furdi-hikone-production

# wrangler.json に database_id を追加
# 出力されたdatabase_idをコピーして設定
```

### 3. 環境変数設定

```bash
# JWT秘密鍵
npx wrangler pages secret put JWT_SECRET

# Google OAuth
npx wrangler pages secret put GOOGLE_CLIENT_ID
npx wrangler pages secret put GOOGLE_CLIENT_SECRET

# LINE OAuth
npx wrangler pages secret put LINE_CHANNEL_ID
npx wrangler pages secret put LINE_CHANNEL_SECRET
```

### 4. デプロイ

```bash
# ビルド & デプロイ
npm run deploy

# または手動
npm run build
npx wrangler pages deploy dist --project-name furdi-hikone
```

## プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx              # メインアプリケーション
│   ├── renderer.tsx           # JSXレンダラー
│   ├── types/
│   │   └── index.ts           # TypeScript型定義
│   ├── lib/
│   │   ├── jwt.ts             # JWT認証ライブラリ
│   │   ├── auth.ts            # OAuth認証ヘルパー
│   │   └── db.ts              # データベースヘルパー
│   └── routes/
│       ├── auth.ts            # 認証APIルート
│       ├── health-logs.ts     # 健康ログAPIルート
│       ├── advices.ts         # アドバイスAPIルート
│       ├── inquiries.ts       # 問い合わせAPIルート
│       └── admin.ts           # 管理者APIルート
├── public/static/
│   ├── styles.css             # 共通スタイルシート
│   ├── app.js                 # トップページJS
│   ├── mypage.js              # マイページJS
│   └── admin.js               # 管理画面JS
├── migrations/
│   └── 0001_initial_schema.sql # D1マイグレーション
├── seed.sql                   # テストデータ
├── wrangler.json              # Cloudflare設定
├── ecosystem.config.cjs       # PM2設定
├── vite.config.ts             # Viteビルド設定
├── package.json               # 依存関係・スクリプト
└── README.md                  # このファイル
```

## API エンドポイント

### 認証 (`/api/auth`)
- `GET /api/auth/google` - Google OAuth開始
- `GET /api/auth/google/callback` - Googleコールバック
- `GET /api/auth/line` - LINE OAuth開始
- `GET /api/auth/line/callback` - LINEコールバック
- `GET /api/auth/me` - 現在のユーザー情報取得

### 健康ログ (`/api/health-logs`) ※要認証
- `GET /api/health-logs` - ログ一覧取得
- `POST /api/health-logs` - ログ作成
- `PUT /api/health-logs/:id` - ログ更新
- `POST /api/health-logs/upload-image` - 写真アップロード&AI解析

### アドバイス (`/api/advices`) ※要認証
- `GET /api/advices` - アドバイス一覧取得
- `POST /api/advices/:id/read` - アドバイス既読マーク

### 問い合わせ (`/api/inquiries`)
- `POST /api/inquiries` - 問い合わせ作成

### 管理者 (`/api/admin`) ※要管理者権限
- `GET /api/admin/users` - 全ユーザー取得
- `GET /api/admin/users/:userId/logs` - ユーザー別ログ取得
- `POST /api/admin/advices` - アドバイス作成
- `GET /api/admin/inquiries` - 全問い合わせ取得
- `PUT /api/admin/inquiries/:id/status` - 問い合わせステータス更新

## 推奨される次のステップ

1. **Google/LINE OAuth設定** - 実際のOAuth認証を有効化
2. **R2バケット統合** - 画像アップロード機能の完全実装
3. **実際のAI API統合** - OpenAI VisionやGeminiで食事解析
4. **メール通知機能** - SendGrid/Mailgun統合
5. **LINE通知機能** - Messaging API統合
6. **カスタムドメイン設定** - `furdi-hikone.jp`等
7. **分析機能強化** - 栄養素トラッキング、目標設定
8. **エクスポート機能** - CSV/PDFレポート生成

## ライセンス

Copyright © 2024 ファディー彦根. All rights reserved.

## 開発者

- **Backend**: Hono + Cloudflare Workers
- **Frontend**: Vanilla JS + TailwindCSS
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Google & LINE OAuth
- **Deployment**: Cloudflare Pages

---

**最終更新日**: 2024-11-08
