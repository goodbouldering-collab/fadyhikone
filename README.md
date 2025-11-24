# ファディ健康ログ - AIパーソナルジム管理システム

## プロジェクト概要

**名称**: ファディ健康ログ (fadyhikone)
**目的**: 体調・体重・食事を記録し、AIとスタッフによるアドバイスを提供する健康管理プラットフォーム  
**技術スタック**: Hono + Cloudflare Pages + D1 Database + R2 Storage + TypeScript

## 公開URL

- **GitHub**: https://github.com/goodbouldering-collab/fadyhikone
- **本番環境**: https://fadyhikone.pages.dev (GitHub連携デプロイ済み)
- **開発環境**: https://3000-i48axlepfz387nht5ffrx-5c13a017.sandbox.novita.ai

## 完成した機能

### ✅ 認証システム
- Google OAuth認証 (モック実装)
- LINE OAuth認証 (モック実装)
- メール+パスワード新規登録
- 管理者専用ログイン
- JWT トークン管理
- セッション管理

### ✅ トップページ
1. **Heroセクション**: 
   - ファディー彦根ジム公式画像スライドショー（4枚自動切替）
   - 控えめな名前表示
   - **30日単位の健康データグラフ**（体重、体脂肪率、睡眠、カロリー）
   - 小さな矢印ボタンで過去期間を閲覧可能
   - お知らせ表示（最新2件）
2. **今日のアドバイス**: 選択した日付のAI・スタッフアドバイスを2列表示
3. **健康ログ入力**: 
   - 日付選択機能（過去の日付も入力可能）
   - 体重、体脂肪率、睡眠、運動時間の記録
   - **朝食・昼食・夕食**の分類別記録
   - **複数枚の食事写真**アップロード対応
   - **PFCバランス**（タンパク質・脂質・炭水化物）自動計算
   - 1日の合計カロリー・栄養素表示
   - **AI包括的アドバイス自動生成**: 保存時に全データを分析し、過去トレンド・今後の課題を含むアドバイスを自動作成
   - **総カロリー自動計算**: 朝食+昼食+夕食の合計カロリーを自動計算・記録
4. **特徴セクション**: AIパーソナルジムの3つの特徴を紹介
5. **FAQセクション**: よくある質問をアコーディオン形式で表示
6. **お問い合わせフォーム**: 未登録ユーザーからの問い合わせを受付

### ✅ マイページ
1. **ユーザープロフィール**: 名前、メール、最新データのサマリー表示
2. **コンパクト統計カード**: 4列グリッドでスペース効率化（体重、体脂肪率、記録日数、未読アドバイス数）
3. **日付別アドバイス表示**: 最新7日分のアドバイスを日付ごとにグループ化
4. **健康ログテーブル**: 横スクロール対応の履歴テーブル
5. **ログ編集・削除機能**: モーダルからデータを編集可能
6. **推移グラフ**: 体重、体脂肪率、睡眠時間、カロリーのChart.js可視化（最新30日）
7. **個人データ設定**: 誕生日フィールド削除、パディング統一

### ✅ 管理画面
1. **統計ダッシュボード**: 総顧客数、総ログ数、未対応問い合わせ、今日のログ数
2. **顧客一覧**: 検索機能付き顧客リスト
3. **顧客詳細**: アコーディオン形式で健康ログを表示・編集
4. **アドバイス送信**: 顧客へのアドバイス作成・送信
5. **問い合わせ管理**: ステータス別フィルター、返信機能
6. **ログ編集**: 管理者が顧客のログを直接編集可能

## データアーキテクチャ

### D1 Database (SQLite)
```
- users: ユーザー情報（認証、ロール）
- health_logs: 健康ログ（体重、体脂肪率、睡眠、食事カロリー・栄養素、運動）
- meals: 食事詳細（朝昼夕別、カロリー、PFCバランス、AI解析データ）
- meal_photos: 食事写真（複数枚対応）
- advices: アドバイス（AI自動生成・スタッフ作成、種類、タイトル、内容、信頼度スコア）
- inquiries: 問い合わせ（名前、メール、件名、メッセージ、ステータス）
- settings: システム設定（OpenAI APIキーなど）
```

### AI アドバイス生成システム
**OpenAI GPT-4o-mini 使用**

#### 自動生成タイミング
- 健康ログを保存（POST）・更新（PUT）する度に自動実行
- 非同期処理で実行されるため、ログ保存は即座に完了

#### 包括的分析内容
1. **現在の状態分析**: 今日入力した全データ（体重、体脂肪、食事、PFC、運動、睡眠）を総合評価
2. **過去トレンド分析**: 過去7日間の詳細データ + 過去30日間の統計データを比較
3. **今後の課題**: 短期目標（今週〜来週）と中期目標（今月〜来月）を提示
4. **具体的アクション**: 数値を含む実行可能な推奨事項（カロリー調整、運動時間など）
5. **クライミング的視点**: ファディー彦根の30年のクライミング経験を活かしたアドバイス

#### 生成されるアドバイス形式
- **カテゴリー**: meal / exercise / mental / sleep / weight のいずれか
- **タイトル**: 20文字以内の具体的なタイトル
- **内容**: 250-400文字の包括的アドバイス
- **信頼度スコア**: データの充実度に基づく 0.0-1.0
- **AI分析データ**: 現状評価、トレンド、課題、良い点、推奨事項を含むJSON

### R2 Storage
- 食事写真の保存
- パス形式: `meals/{user_id}/{timestamp}-{filename}`

### JWT認証
- 有効期限: 7日間
- Payload: userId, email, role

## API エンドポイント

### 認証
- `POST /api/auth/google` - Google OAuth認証
- `POST /api/auth/line` - LINE OAuth認証
- `GET /api/auth/verify` - トークン検証

### 健康ログ
- `GET /api/health-logs` - ログ一覧取得
- `POST /api/health-logs` - ログ作成（自動的にAI包括アドバイス生成）
- `PUT /api/health-logs/:id` - ログ更新（自動的にAI包括アドバイス生成）
- `DELETE /api/health-logs/:id` - ログ削除
- `POST /api/health-logs/upload-meal` - 食事写真アップロード&AI解析

### アドバイス
- `GET /api/advices` - アドバイス一覧取得（AI生成・スタッフ作成の両方）
- `PUT /api/advices/:id/read` - 既読にする

### 問い合わせ
- `POST /api/inquiries` - 問い合わせ作成

### 管理者API
- `GET /api/admin/users` - 全顧客一覧
- `GET /api/admin/users/:userId/logs` - 特定顧客のログ取得
- `PUT /api/admin/logs/:logId` - ログ更新（管理者用）
- `POST /api/admin/advices` - アドバイス作成
- `PUT /api/admin/advices/:adviceId` - アドバイス更新
- `DELETE /api/admin/advices/:adviceId` - アドバイス削除
- `GET /api/admin/inquiries` - 問い合わせ一覧
- `PUT /api/admin/inquiries/:inquiryId` - 問い合わせ返信
- `GET /api/admin/stats` - 統計情報取得

## ユーザーガイド

### 一般ユーザー
1. **ログイン**: GoogleまたはLINEでログイン
2. **健康ログ記録**: トップページまたはマイページで日々の健康データを入力
3. **食事写真アップロード**: 写真を撮ってAI解析で自動カロリー計算
4. **アドバイス確認**: スタッフからの個別アドバイスを確認
5. **推移確認**: マイページでグラフを使って変化を可視化

### 管理者
1. **管理画面アクセス**: 管理者アカウントでログイン後、管理画面ボタンをクリック
2. **顧客管理**: 顧客一覧から詳細を確認、ログを編集
3. **アドバイス送信**: 顧客の状況に応じたアドバイスを作成・送信
4. **問い合わせ対応**: 未対応の問い合わせに返信
5. **統計確認**: ダッシュボードで全体の利用状況を把握

## 未実装の機能

- 本番環境の外部OAuth認証（Google/LINE）
- 食事写真の実際のAI画像解析（現在は手動入力のみ）
- メール通知機能
- データエクスポート機能
- 多言語対応
- PWA対応

## 推奨される次のステップ

1. **外部OAuth統合**: Google Cloud ConsoleとLINE Developersでアプリケーション登録
2. **AI画像解析統合**: OpenAI Vision APIで食事写真から自動的にカロリー・栄養素を抽出
3. **本番環境でのAI設定**: Cloudflare DashboardでOpenAI API keyを環境変数として設定
4. **メール通知**: SendGridやMailgun統合でAIアドバイス通知
5. **モニタリング**: エラーログ、アクセスログの収集と分析
6. **AIアドバイスの改善**: ユーザーフィードバックに基づいたプロンプト最適化

## 開発環境

### 必要な環境
- Node.js 20 (`.node-version`で固定)
- npm
- Wrangler CLI v4.4+
- PM2 (サンドボックス環境にプリインストール)

### 技術スタック詳細
- **フレームワーク**: Hono v4.10+
- **ビルドツール**: Vite v6.3+
- **デプロイ**: Cloudflare Pages + Workers
- **データベース**: Cloudflare D1 (SQLite)
- **認証**: JWT
- **フロントエンド**: TailwindCSS (CDN), Chart.js, Day.js, Axios

### ローカル開発
```bash
# 依存関係インストール
npm install

# データベースセットアップ
npm run db:reset

# ビルド（初回必須）
npm run build

# 開発サーバー起動（PM2）
pm2 start ecosystem.config.cjs

# ログ確認
pm2 logs fadyhikone --nostream

# サービス再起動
pm2 restart fadyhikone

# ポートクリーンアップ（必要時）
npm run clean-port
```

### テストユーザー
```
管理者:
- Email: admin@furdi.jp
- ログイン: Google認証（モック）

一般ユーザー:
- Email: test.user@example.com
- ログイン: Google/LINE認証（モック）
```

## デプロイ

### 📦 Cloudflare Pages デプロイ状態

✅ **本番環境**: https://fadyhikone.pages.dev
- GitHub連携による自動デプロイ設定済み
- D1データベース: `fadyhikone-production` (3c41910c-1b96-47ad-99e7-604df7428bdb)
- すべてのマイグレーション適用済み（0001〜0010）
- Node.js version: 20 (`.node-version`で固定)

### 🚀 デプロイ方法

#### A. 自動デプロイ（推奨）- GitHubプッシュ
```bash
# コード変更をプッシュするだけで自動デプロイ
git add .
git commit -m "Update: 新機能追加"
git push origin main

# Cloudflare Pagesが自動的にビルド＆デプロイ
# デプロイ状況: https://dash.cloudflare.com > Pages > fadyhikone
```

#### B. 手動デプロイ - Wrangler CLI
```bash
# ビルド＆デプロイ
npm run deploy

# または詳細コマンド
npm run build
npx wrangler pages deploy dist --project-name fadyhikone --branch main
```

### ⚙️ Cloudflare Dashboard設定

**必須設定 (Settings > Functions):**
- **D1 database bindings**: 
  - Variable name: `DB`
  - D1 database: `fadyhikone-production`

**ビルド設定 (Settings > Builds and deployments):**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js version: `20` (または Environment Variables で `NODE_VERSION=20`)

**オプション設定 (Settings > Environment Variables):**
- `JWT_SECRET` - セキュリティ強化用
- `OPENAI_API_KEY` - AI包括アドバイス生成用（**重要**: 本番環境では必須）
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth用
- `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` - LINE OAuth用

**📝 OpenAI API キーの設定方法:**

ローカル開発環境とCloudflare本番環境では異なる設定方法を使用します。

**ローカル開発（サンドボックス）:**
1. データベースの `settings` テーブルに直接設定:
   ```bash
   npx wrangler d1 execute fadyhikone-production --local --command="INSERT OR REPLACE INTO settings (setting_key, setting_value, description) VALUES ('openai_api_key', 'sk-proj-YOUR_API_KEY', 'OpenAI API キー（食事解析・アドバイス生成用）')"
   ```
2. または管理画面の「詳細設定」から設定可能

**Cloudflare本番環境:**
1. Cloudflare Dashboard > Pages > fadyhikone > Settings > Environment Variables
2. `OPENAI_API_KEY` = `sk-proj-YOUR_API_KEY` を追加
3. 本番データベースの `settings` テーブルにも同様に設定（管理画面から設定可能）

### 📚 詳細なデプロイガイド

詳しい手順は [`CLOUDFLARE_DEPLOYMENT.md`](./CLOUDFLARE_DEPLOYMENT.md) を参照してください。

## ライセンス

© 2025 ファディー彦根 All rights reserved.

## 開発者

由井辰美 (Yui Tatsumi) - Product Manager & Developer
