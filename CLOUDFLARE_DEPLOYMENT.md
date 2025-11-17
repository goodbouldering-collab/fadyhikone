# Cloudflare Pages デプロイメントガイド

## 🚀 初回セットアップ

### 1. GitHub認証設定
```bash
# GitHubの認証設定（サンドボックス内で実行）
# このツールを呼び出すと自動的にGitHub認証が設定されます
```

### 2. Cloudflare API認証設定
```bash
# Cloudflare API認証設定（サンドボックス内で実行）
# このツールを呼び出すと自動的にCloudflare認証が設定されます
```

### 3. プロジェクト作成（初回のみ）
```bash
cd /home/user/webapp

# Cloudflare Pagesプロジェクト作成
npx wrangler pages project create fadyhikone \
  --production-branch main \
  --compatibility-date 2025-01-01

# D1データベース作成（まだ作成していない場合）
npx wrangler d1 create fadyhikone-production

# データベースIDをwrangler.jsonc の database_id に設定
```

### 4. D1マイグレーション（本番環境）
```bash
# 本番データベースにマイグレーション適用
npm run db:migrate:prod
```

## 📦 デプロイ方法

### A. 手動デプロイ（Wrangler CLIから）
```bash
cd /home/user/webapp

# ビルド＆デプロイ
npm run deploy

# または
npm run build
npx wrangler pages deploy dist --project-name fadyhikone --branch main
```

### B. 自動デプロイ（GitHubプッシュから）
```bash
cd /home/user/webapp

# コミット＆プッシュ
git add .
git commit -m "Update: 機能追加"
git push origin main

# GitHubにプッシュすると自動的にCloudflare Pagesがビルド＆デプロイ
```

## ⚙️ Cloudflare Dashboard設定（GitHubオートデプロイ用）

### Settings > Builds and deployments

**Build configuration:**
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`

**Environment variables:**
- **NODE_VERSION**: `20`

### Settings > Functions

**D1 database bindings:**
- **Variable name**: `DB`
- **D1 database**: `fadyhikone-production`

**Environment Variables（必要に応じて）:**
- `GEMINI_API_KEY`: あなたのGemini APIキー
- その他のシークレット

## 🔍 トラブルシューティング

### エラー: "D1 database not found"
→ Cloudflare Dashboard > Settings > Functions > D1 database bindings で `DB` バインディングを設定

### エラー: "Build failed"
→ Cloudflare Dashboard > Deployments > 最新のデプロイログを確認
→ Node.jsバージョンを確認（`.node-version`ファイル = `20`）

### エラー: "Environment variable not set"
→ Cloudflare Dashboard > Settings > Environment variables で設定

### ローカル開発でエラー
```bash
# ローカルD1データベースをリセット
npm run db:reset

# ポートクリーンアップ
npm run clean-port
```

## 📚 参考URL

- **Cloudflare Pages**: https://pages.cloudflare.com
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **GitHub Repository**: https://github.com/goodbouldering-collab/fadyhikone
- **Production URL**: https://fadyhikone.pages.dev

## 🔄 デプロイフロー

```
GitHub Push
    ↓
Cloudflare Pages Auto-Build
    ↓
npm run build (Vite)
    ↓
dist/ ディレクトリ生成
    ↓
Cloudflare Workers デプロイ
    ↓
Production URL公開
```

## 📝 ビルド設定詳細

### package.json
- Node.js v20
- Hono v4.10+
- Vite v6.3+
- Wrangler v4.4+

### wrangler.jsonc
- D1 Database: fadyhikone-production
- Compatibility date: 2025-01-01
- Node.js compatibility: enabled

### vite.config.ts
- @hono/vite-build/cloudflare-pages
- @hono/vite-dev-server with Cloudflare adapter

## ✅ デプロイチェックリスト

- [ ] wrangler.jsonc の設定確認
- [ ] package.json のプロジェクト名確認
- [ ] .node-version ファイル作成（Node 20）
- [ ] D1データベース作成済み
- [ ] D1マイグレーション実行済み
- [ ] Cloudflare Dashboard で D1 binding 設定
- [ ] GitHub認証設定済み
- [ ] Cloudflare API認証設定済み
- [ ] 手動デプロイで動作確認
- [ ] GitHubプッシュで自動デプロイ確認
