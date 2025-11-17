# GitHub ↔ Cloudflare Pages 連携設定ガイド

## ✅ 完了済みの設定

### 1. GitHubリポジトリ
- **リポジトリ**: `goodbouldering-collab/fadyhikone`
- **URL**: https://github.com/goodbouldering-collab/fadyhikone
- **ブランチ**: `main`

### 2. ローカル設定
- ✅ `.node-version` (Node.js 20)
- ✅ `wrangler.jsonc` (最新設定)
- ✅ `package.json` (プロジェクト名統一)
- ✅ R2バケット（オプショナル化）
- ✅ 型定義（オプショナル化）

## 🚀 Cloudflare Dashboard での設定手順

### ステップ1: Cloudflare Pagesプロジェクト確認

1. **Cloudflare Dashboard** にアクセス
   - https://dash.cloudflare.com

2. **Pages** セクションに移動

3. **fadyhikone** プロジェクトを選択

### ステップ2: GitHub連携確認

**Settings > Builds and deployments**

#### Production branch
- ✅ **Production branch**: `main`

#### Build configuration
- ✅ **Build command**: `npm run build`
- ✅ **Build output directory**: `dist`
- ✅ **Root directory**: `/` (空白またはルート)

#### Environment variables (Build)
以下を設定（必要に応じて）:
```
NODE_VERSION=20
```

### ステップ3: D1 Database バインディング設定（重要！）

**Settings > Functions > D1 database bindings**

以下のバインディングを追加:

| Variable name | D1 database |
|--------------|-------------|
| `DB` | `fadyhikone-production` |

**⚠️ 注意**: このバインディングが設定されていないと、デプロイ後にアプリケーションが動作しません。

#### 設定方法:
1. **"Add binding"** をクリック
2. **Variable name**: `DB` と入力
3. **D1 database**: ドロップダウンから `fadyhikone-production` を選択
4. **Save** をクリック

### ステップ4: Environment Variables（オプション）

**Settings > Environment Variables**

以下は必要に応じて設定:

#### Production環境:
```bash
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key (AI機能用)
GOOGLE_CLIENT_ID=your-google-client-id (OAuth用)
GOOGLE_CLIENT_SECRET=your-google-client-secret (OAuth用)
LINE_CHANNEL_ID=your-line-channel-id (LINE OAuth用)
LINE_CHANNEL_SECRET=your-line-channel-secret (LINE OAuth用)
```

**🔐 セキュリティ**: これらの値はCloudflare Dashboardから設定してください。コードには含めないでください。

## 📊 デプロイ確認

### 1. 自動デプロイの確認

GitHubにプッシュ後、以下を確認:

1. **Cloudflare Dashboard** > **Pages** > **fadyhikone** > **Deployments**
2. 最新のデプロイステータスを確認
3. **View build log** でビルドログを確認

### 2. デプロイログで確認すべき項目

✅ **成功のサイン**:
```
✓ Uploading...
✓ Deployment complete!
✓ Success! Deployed to https://fadyhikone.pages.dev
```

❌ **エラーのサイン**:
```
Error: D1 database not found
Error: Build failed
Error: Missing binding
```

### 3. エラー解決

#### "D1 database not found" エラー
→ **Settings > Functions > D1 database bindings** で `DB` バインディングを設定

#### "Build failed" エラー
→ **View build log** でエラーの詳細を確認
→ Node.jsバージョンを確認（Environment Variables に `NODE_VERSION=20`）

#### "Missing binding" エラー
→ D1バインディングが正しく設定されているか確認

## 🧪 デプロイ後のテスト

### 1. 本番URLにアクセス
```
https://fadyhikone.pages.dev
```

### 2. 動作確認項目
- [ ] トップページが表示される
- [ ] ログインできる（Google OAuth / LINE OAuth）
- [ ] 健康ログを記録できる
- [ ] マイページが表示される
- [ ] グラフが表示される
- [ ] 管理画面にアクセスできる（管理者のみ）

### 3. データベース確認

本番D1データベースにデータが保存されているか確認:

```bash
# ローカルから本番データベースを確認（Wrangler CLIで）
npx wrangler d1 execute fadyhikone-production --command="SELECT * FROM users LIMIT 5"
npx wrangler d1 execute fadyhikone-production --command="SELECT * FROM health_logs ORDER BY created_at DESC LIMIT 10"
```

## 🔄 継続的デプロイフロー

```
コード変更
    ↓
Git Commit
    ↓
Git Push to GitHub (main branch)
    ↓
Cloudflare Pages自動検知
    ↓
自動ビルド (npm run build)
    ↓
自動デプロイ
    ↓
本番環境更新 (https://fadyhikone.pages.dev)
```

## 📝 トラブルシューティングチェックリスト

### デプロイが失敗する場合:

- [ ] GitHub連携が有効か？
- [ ] Production branchが `main` に設定されているか？
- [ ] Build commandが `npm run build` になっているか？
- [ ] Build output directoryが `dist` になっているか？
- [ ] Node.jsバージョンが20に設定されているか？
- [ ] D1 database bindingが設定されているか？
- [ ] wrangler.jsonc の設定が正しいか？
- [ ] package.json のプロジェクト名が `fadyhikone` か？

### アプリケーションが動作しない場合:

- [ ] D1バインディング（`DB`）が設定されているか？
- [ ] データベースマイグレーションが適用されているか？
- [ ] 環境変数が正しく設定されているか？
- [ ] ブラウザの開発者ツールでエラーを確認
- [ ] Cloudflare Dashboard > Functions > Real-time Logs でエラー確認

## 🎯 次のステップ

1. ✅ GitHubにプッシュ完了
2. ⏳ Cloudflare Pagesでビルド中...
3. ⏳ D1バインディング設定確認
4. ⏳ 本番URLで動作確認
5. ⏳ カスタムドメイン設定（オプション）

## 📚 参考リンク

- **Cloudflare Pages**: https://pages.cloudflare.com
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **GitHub Repository**: https://github.com/goodbouldering-collab/fadyhikone
- **D1 Documentation**: https://developers.cloudflare.com/d1/
- **Pages Functions**: https://developers.cloudflare.com/pages/functions/

## ✨ 完了！

これで、GitHubにプッシュするだけで自動的にCloudflare Pagesにデプロイされるようになりました。

**重要**: D1バインディング（`DB` → `fadyhikone-production`）を必ず設定してください。これが設定されていないとアプリケーションが動作しません。
