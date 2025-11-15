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
1. **クイックアクセス**: マイページへの目立つボタン（最上部）
2. **Heroセクション**: サービスの魅力を伝えるメインビジュアル
3. **スタッフアドバイス表示**: ユーザーへの最新アドバイス3件を表示
4. **健康ログ入力**: 
   - 体重、体脂肪率、睡眠、運動時間の記録
   - **朝食・昼食・夕食**の分類別記録
   - **複数枚の食事写真**アップロード対応
   - **PFCバランス**（タンパク質・脂質・炭水化物）自動計算
   - 1日の合計カロリー・栄養素表示
   - AI食事解析（モック）
5. **特徴セクション**: AIパーソナルジムの3つの特徴を紹介
6. **FAQセクション**: よくある質問をアコーディオン形式で表示
7. **お問い合わせフォーム**: 未登録ユーザーからの問い合わせを受付

### ✅ マイページ
1. **ユーザープロフィール**: 名前、メール、最新データのサマリー表示
2. **統計カード**: 最新体重、体脂肪率、記録日数、未読アドバイス数
3. **アドバイス一覧**: スタッフからのアドバイスを種類別に表示
4. **健康ログテーブル**: 横スクロール対応の履歴テーブル
5. **ログ編集・削除機能**: モーダルからデータを編集可能
6. **推移グラフ**: 体重、体脂肪率、睡眠時間、カロリーのChart.js可視化

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
- health_logs: 健康ログ（体重、体脂肪率、体温、睡眠、食事、運動）
- advices: スタッフアドバイス（種類、タイトル、内容）
- inquiries: 問い合わせ（名前、メール、件名、メッセージ、ステータス）
```

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
- `POST /api/health-logs` - ログ作成
- `PUT /api/health-logs/:id` - ログ更新
- `DELETE /api/health-logs/:id` - ログ削除
- `POST /api/health-logs/upload-meal` - 食事写真アップロード&AI解析

### アドバイス
- `GET /api/advices` - アドバイス一覧取得
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
- 実際のAI画像解析API統合（現在はモック）
- メール通知機能
- データエクスポート機能
- 多言語対応
- PWA対応

## 推奨される次のステップ

1. **外部OAuth統合**: Google Cloud ConsoleとLINE Developersでアプリケーション登録
2. **AI解析API統合**: OpenAI Vision APIまたはGoogle Gemini統合
3. **メール通知**: SendGridやMailgun統合でアドバイス通知
4. **本番デプロイ**: Cloudflare Pagesへの本番デプロイ
5. **モニタリング**: エラーログ、アクセスログの収集と分析

## 開発環境

### 必要な環境
- Node.js 18+
- npm または pnpm
- Wrangler CLI

### ローカル開発
```bash
# 依存関係インストール
npm install

# データベースセットアップ
npm run db:reset

# ビルド
npm run build

# 開発サーバー起動
pm2 start ecosystem.config.cjs

# ログ確認
pm2 logs fadyhikone --nostream
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

### Cloudflare Pages デプロイ状態

✅ **本番環境**: https://fadyhikone.pages.dev
- GitHub連携による自動デプロイ設定済み
- D1データベース: `fadyhikone-production` (3c41910c-1b96-47ad-99e7-604df7428bdb)
- すべてのマイグレーション適用済み（0001〜0010）

### GitHub連携デプロイ
```bash
# コード変更をプッシュするだけで自動デプロイ
git add .
git commit -m "Update feature"
git push origin main
```

### 環境変数設定 (Cloudflare Dashboard)
```
必須設定:
- D1データベースバインディング: DB → fadyhikone-production
- R2バケットバインディング: BUCKET → fadyhikone-images

オプション設定:
- JWT_SECRET (セキュリティ強化用)
- GEMINI_API_KEY (AI機能用)
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (OAuth用)
- LINE_CHANNEL_ID / LINE_CHANNEL_SECRET (LINE OAuth用)
```

## ライセンス

© 2025 ファディー彦根 All rights reserved.

## 開発者

由井辰美 (Yui Tatsumi) - Product Manager & Developer
