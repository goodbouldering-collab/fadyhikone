# FURDI 彦根 - AIパーソナルジムシステム

## プロジェクト概要

**プロジェクト名**: FURDI 彦根  
**プロジェクト目標**: AIとスタッフが寄り添う、新しいパーソナルジム体験を提供するWebアプリケーション  
**技術スタック**: Hono + TypeScript + Cloudflare Pages + D1 Database

## 主要機能

### ✅ 完成済み機能

1. **トップページ (/)** 
   - HEROセクション（グラデーション背景、ブランディング）
   - スタッフからのアドバイス表示（最新3件、未読管理）
   - 健康ログ入力フォーム（体重、体脂肪率、体調、食事、運動、睡眠、水分）
   - 食事写真アップロード機能（AI解析準備完了）
   - AIパーソナルジムの特長セクション（3つの主要機能紹介）
   - FAQアコーディオン（5つの質問）
   - 問い合わせフォーム（名前、メール、電話、件名、メッセージ）

2. **認証機能 (/api/auth)**
   - ユーザー登録（メール、パスワード、名前、電話番号）
   - ログイン（セッションCookie管理）
   - ログアウト
   - 認証状態確認

3. **マイページ (/mypage)**
   - ユーザーダッシュボード
   - 最新のスタッフアドバイス表示
   - 7日間の統計サマリー（体重変化、平均運動時間、睡眠時間、水分摂取）
   - 健康ログ履歴（横スライド表形式）
     - 日付、体重、体重変化、体脂肪率、体脂肪変化、体調レベル、運動、睡眠、水分、食事記録
     - 行クリックで詳細モーダル表示
   - AI進捗分析ボタン（7-14日間のデータ分析）

4. **管理画面 (/admin)** - 管理者専用
   - ダッシュボード統計（総会員数、今日のアクティブ、総ログ数、未対応問合せ）
   - 会員管理テーブル
     - 検索機能（名前、メール、電話番号）
     - ステータス表示（アクティブ/休止中）
     - 最終ログ日付表示
   - ユーザー詳細モーダル
     - アドバイス送信フォーム（タイプ、トレーナー名、内容）
     - 健康ログアコーディオン（日付ごとに展開可能）
     - ログ編集機能（全フィールド編集可能）
     - アドバイス履歴（既読/未読表示）

5. **API エンドポイント**
   - `/api/auth/*` - 認証（ログイン、登録、ログアウト、現在のユーザー取得）
   - `/api/logs/*` - 健康ログ（CRUD操作）
   - `/api/advice/*` - スタッフアドバイス（取得、既読管理、作成、更新、削除）
   - `/api/admin/*` - 管理機能（統計、ユーザー一覧、ログ編集、問合せ管理）
   - `/api/inquiry` - 問い合わせ送信
   - `/api/ai/*` - AI分析（食事分析、進捗分析）

6. **データベース設計 (Cloudflare D1)**
   - **users** テーブル: ユーザー情報、管理者フラグ
   - **health_logs** テーブル: 健康ログ（体重、体脂肪、食事、運動、睡眠など）
   - **staff_advice** テーブル: スタッフアドバイス（タイプ、既読状態）
   - **ai_analysis** テーブル: AI分析結果
   - **inquiries** テーブル: 問い合わせ（ステータス管理）

7. **統一UIテーマシステム**
   - CSS変数ベースのテーマ（全ページで一括変更可能）
   - プライマリカラー: #FF6B9D（ピンク）
   - セカンダリカラー: #4A90E2（ブルー）
   - レスポンシブデザイン対応
   - アニメーション、スピナー、アラートコンポーネント

## データモデル

### ユーザー (users)
```
- id (主キー)
- email (ユニーク)
- password_hash
- name
- phone
- is_admin (0/1)
- created_at
- updated_at
```

### 健康ログ (health_logs)
```
- id (主キー)
- user_id (外部キー)
- log_date (日付)
- weight (体重)
- body_fat_percentage (体脂肪率)
- condition_level (体調レベル 1-5)
- condition_notes (体調メモ)
- meal_breakfast, meal_lunch, meal_dinner, meal_snacks
- meal_photo_url (食事写真URL)
- exercise_minutes (運動時間)
- sleep_hours (睡眠時間)
- water_intake_ml (水分摂取量)
- created_at
- updated_at
```

### スタッフアドバイス (staff_advice)
```
- id (主キー)
- user_id (外部キー)
- advice_date (日付)
- advice_text (アドバイス内容)
- staff_name (トレーナー名)
- advice_type (general/nutrition/exercise/motivation)
- is_read (既読フラグ)
- created_at
```

## デプロイ手順

### 前提条件
1. Cloudflare アカウント
2. Cloudflare API トークン

### ローカル開発

```bash
# 依存関係のインストール
npm install

# データベースマイグレーション（ローカル）
npm run db:migrate:local

# テストデータの投入
npm run db:seed

# ビルド
npm run build

# 開発サーバー起動（ローカルD1使用）
npm run dev:sandbox
# または
npx wrangler pages dev dist --d1=furdi-hikone-production --local --ip 0.0.0.0 --port 3000
```

### 本番デプロイ

#### 1. D1データベース作成
```bash
# 本番用D1データベース作成
npx wrangler d1 create furdi-hikone-production

# 出力されたdatabase_idをwrangler.jsoncに設定
# "database_id": "your-database-id-here"
```

#### 2. マイグレーション適用
```bash
# 本番DBにマイグレーション適用
npm run db:migrate:prod
```

#### 3. Cloudflare Pagesプロジェクト作成
```bash
# Pagesプロジェクト作成（mainブランチを本番として設定）
npx wrangler pages project create furdi-hikone \
  --production-branch main \
  --compatibility-date 2024-01-01
```

#### 4. デプロイ
```bash
# ビルドしてデプロイ
npm run deploy

# または手動で
npm run build
npx wrangler pages deploy dist --project-name furdi-hikone
```

#### 5. 本番URL
- **本番**: `https://random-id.furdi-hikone.pages.dev`
- **ブランチ**: `https://main.furdi-hikone.pages.dev`

### 環境変数設定

本番環境でのシークレット設定:
```bash
# 必要に応じて環境変数を設定
npx wrangler pages secret put API_KEY --project-name furdi-hikone
```

## ユーザーガイド

### 一般ユーザー

1. **新規登録**
   - トップページから「新規登録」ボタンをクリック
   - 名前、メール、電話番号、パスワードを入力
   - 自動的にログイン状態になります

2. **ログイン**
   - トップページから「ログイン」ボタンをクリック
   - メールアドレスとパスワードを入力

3. **健康ログ記録**
   - トップページまたはマイページから入力フォームにアクセス
   - 日付、体重、体脂肪率、体調レベルなどを入力
   - 食事内容や写真もアップロード可能
   - 「ログを保存」ボタンでデータを保存

4. **マイページの確認**
   - ログイン後、「マイページ」にアクセス
   - 最新のスタッフアドバイスを確認
   - 7日間の統計サマリーを確認
   - 過去のログを横スクロール表で閲覧
   - ログをクリックして詳細を確認

5. **AI進捗分析**
   - マイページの「AI進捗分析」ボタンをクリック
   - 最大14日間のデータを基に自動分析
   - 体重変化、運動量、睡眠、水分摂取の傾向を確認
   - 改善アドバイスを受け取る

### 管理者（スタッフ）

**テスト管理者アカウント**:
- メール: `admin@furdi-hikone.jp`
- パスワード: `admin123`

1. **管理画面アクセス**
   - ログイン後、ヘッダーの「管理画面」ボタンをクリック
   - ダッシュボード統計を確認

2. **会員管理**
   - 検索ボックスで会員を検索
   - 会員の行をクリックして詳細を表示

3. **アドバイス送信**
   - ユーザー詳細モーダルを開く
   - アドバイスフォームに入力
     - アドバイスタイプ（一般/栄養/運動/モチベーション）
     - トレーナー名
     - アドバイス内容
   - 「送信」ボタンでアドバイスを送信

4. **ログ編集**
   - ユーザー詳細モーダルのログアコーディオンを展開
   - 「編集」ボタンをクリック
   - すべてのフィールドを編集可能
   - 「保存」ボタンで更新

## プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx                 # メインアプリケーション
│   ├── types.ts                  # TypeScript型定義
│   ├── utils/
│   │   └── auth.ts               # 認証ユーティリティ
│   └── routes/
│       ├── auth.ts               # 認証API
│       ├── logs.ts               # 健康ログAPI
│       ├── advice.ts             # アドバイスAPI
│       ├── admin.ts              # 管理API
│       ├── inquiry.ts            # 問い合わせAPI
│       └── ai.ts                 # AI分析API
├── public/
│   └── static/
│       ├── theme.css             # 統一UIテーマ
│       ├── app.js                # トップページJS
│       ├── mypage.js             # マイページJS
│       └── admin.js              # 管理画面JS
├── migrations/
│   └── 0001_initial_schema.sql  # D1マイグレーション
├── seed.sql                      # テストデータ
├── ecosystem.config.cjs          # PM2設定
├── wrangler.jsonc                # Cloudflare設定
├── package.json                  # 依存関係とスクリプト
├── tsconfig.json                 # TypeScript設定
├── vite.config.ts                # Vite設定
└── README.md                     # このファイル
```

## 技術仕様

### フロントエンド
- **フレームワーク**: Vanilla JavaScript（CDN経由）
- **スタイリング**: CSS変数ベースの統一テーマ
- **HTTPクライアント**: Axios (CDN)
- **アイコン**: Font Awesome 6.4.0

### バックエンド
- **フレームワーク**: Hono 4.x
- **ランタイム**: Cloudflare Workers
- **言語**: TypeScript
- **データベース**: Cloudflare D1 (SQLite)
- **AI**: Cloudflare AI (Workers AI)

### デプロイ
- **プラットフォーム**: Cloudflare Pages
- **ビルドツール**: Vite
- **CDN**: Cloudflare Global Network

## 開発中の機能

### 今後の実装予定

1. **画像AI解析**
   - 食事写真の自動栄養分析
   - カロリー推定
   - 栄養素バランス評価

2. **データ可視化**
   - グラフ表示（体重推移、体脂肪率推移）
   - Chart.js統合
   - 週次・月次レポート

3. **通知機能**
   - 新しいアドバイス通知
   - ログ記録リマインダー
   - 目標達成通知

4. **目標設定機能**
   - 目標体重設定
   - 目標達成までの予測
   - マイルストーン管理

5. **エクスポート機能**
   - ログデータのCSVエクスポート
   - PDF レポート生成

## トラブルシューティング

### ローカル開発でエラーが発生する場合

1. **D1マイグレーションエラー**
   ```bash
   # D1ローカルストレージをリセット
   npm run db:reset
   ```

2. **ポート3000が使用中**
   ```bash
   # ポートをクリーンアップ
   npm run clean-port
   ```

3. **ビルドエラー**
   ```bash
   # node_modulesを再インストール
   rm -rf node_modules package-lock.json
   npm install
   ```

### 本番環境のエラー

1. **データベース接続エラー**
   - wrangler.jsoncのdatabase_idを確認
   - マイグレーションが適用されているか確認

2. **認証エラー**
   - Cloudflare API トークンの権限を確認
   - D1とPages両方の権限が必要

## テストアカウント

開発・テスト用のアカウント（seed.sqlで作成）:

- **管理者**:
  - メール: `admin@furdi-hikone.jp`
  - パスワード: `admin123`

- **一般ユーザー1**:
  - メール: `yamada@example.com`
  - パスワード: `user123`

- **一般ユーザー2**:
  - メール: `tanaka@example.com`
  - パスワード: `user123`

- **一般ユーザー3**:
  - メール: `suzuki@example.com`
  - パスワード: `user123`

## デプロイ状況

**現在のステータス**: ⏳ ローカル開発完了、本番デプロイ準備完了

**次のステップ**:
1. Cloudflare API トークンを設定
2. D1データベースを作成してdatabase_idを取得
3. wrangler.jsoncを更新
4. マイグレーションを適用
5. Cloudflare Pagesにデプロイ

## ライセンス

© 2024 FURDI Hikone. All rights reserved.

## お問い合わせ

- 電話: 0749-00-0000
- メール: info@furdi-hikone.jp
