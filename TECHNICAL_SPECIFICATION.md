# 技術仕様書 - ファディー彦根

このファイルには、システムの詳細な技術仕様、アーキテクチャ、全ファイル構成が記載されています。

---

## 📋 目次

1. [システムアーキテクチャ](#システムアーキテクチャ)
2. [ディレクトリ構造](#ディレクトリ構造)
3. [フロントエンド仕様](#フロントエンド仕様)
4. [バックエンド仕様](#バックエンド仕様)
5. [AI統合仕様](#ai統合仕様)
6. [認証・セキュリティ](#認証セキュリティ)
7. [パフォーマンス最適化](#パフォーマンス最適化)

---

## システムアーキテクチャ

### 全体構成図

```
┌─────────────────────────────────────────────────┐
│              ユーザー（ブラウザ）                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ index.  │  │ mypage. │  │ admin.  │         │
│  │ html    │  │ html    │  │ html    │         │
│  └────┬────┘  └────┬────┘  └────┬────┘         │
└───────┼────────────┼─────────────┼──────────────┘
        │            │             │
        └────────────┴─────────────┘
                     │
        ┌────────────▼────────────┐
        │   Cloudflare Pages      │
        │  ┌──────────────────┐   │
        │  │  Hono Framework  │   │
        │  │  (TypeScript)    │   │
        │  └────┬─────────────┘   │
        │       │ API Routes      │
        │  ┌────▼────┐ ┌────────┐ │
        │  │   D1    │ │   R2   │ │
        │  │Database │ │Storage │ │
        │  └─────────┘ └────────┘ │
        └─────────┬─────────────────┘
                  │
        ┌─────────▼─────────┐
        │  External APIs    │
        │ ┌───────────────┐ │
        │ │ Google OAuth  │ │
        │ │ Gemini AI     │ │
        │ └───────────────┘ │
        └───────────────────┘
```

### レイヤー構成

```
┌──────────────────────────────────┐
│  Presentation Layer              │  ← HTML/CSS/JS
│  - index.html (トップページ)      │
│  - mypage.html (マイページ)       │
│  - admin.html (管理画面)          │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  API Layer                        │  ← Hono Routes
│  - /api/auth                      │
│  - /api/health-logs               │
│  - /api/advices                   │
│  - /api/announcements             │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  Business Logic Layer            │  ← TypeScript
│  - Authentication                 │
│  - Data Validation                │
│  - AI Integration                 │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  Data Layer                       │  ← D1 + R2
│  - Database (D1)                  │
│  - File Storage (R2)              │
└───────────────────────────────────┘
```

---

## ディレクトリ構造

```
furdi-hikone/
│
├── .git/                          # Gitリポジトリ
├── .github/                       # GitHub Actions
│   └── workflows/
│       └── deploy.yml             # 自動デプロイ
│
├── node_modules/                  # 依存パッケージ
│
├── src/                           # バックエンドソースコード
│   ├── index.tsx                  # メインエントリポイント
│   ├── renderer.tsx               # HTMLレンダラー
│   │
│   ├── routes/                    # APIルート
│   │   ├── auth.ts                # 認証API
│   │   ├── health-logs.ts         # 健康ログAPI
│   │   ├── advices.ts             # アドバイスAPI
│   │   ├── comments.ts            # スタッフコメントAPI
│   │   ├── announcements.ts       # お知らせAPI
│   │   ├── opinions.ts            # 質問・相談API
│   │   ├── inquiries.ts           # お問い合わせAPI
│   │   ├── admin.ts               # 管理者API
│   │   └── settings.ts            # システム設定API
│   │
│   ├── lib/                       # ライブラリ
│   │   ├── auth.ts                # 認証ユーティリティ
│   │   ├── jwt.ts                 # JWT処理
│   │   └── db.ts                  # DB接続
│   │
│   ├── utils/                     # ユーティリティ
│   │   └── jwt.ts                 # JWT関連
│   │
│   ├── types/                     # 型定義
│   │   └── index.ts               # 共通型定義
│   │
│   └── types.ts                   # 追加型定義
│
├── public/                        # 静的ファイル
│   ├── index.html                 # トップページ
│   ├── mypage.html                # マイページ
│   ├── admin.html                 # 管理画面
│   ├── favicon.ico                # ファビコン
│   │
│   └── static/                    # 静的アセット
│       ├── app.js                 # トップページJS (144KB)
│       ├── mypage.js              # マイページJS
│       ├── admin.js               # 管理画面JS
│       └── utils.js               # 共通ユーティリティJS
│
├── migrations/                    # データベースマイグレーション
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_advices.sql
│   ├── 0003_add_staff_comments.sql
│   ├── 0004_add_announcements.sql
│   ├── 0005_add_opinion_box.sql
│   ├── 0006_add_inquiries.sql
│   ├── 0007_add_settings.sql
│   ├── 0008_add_meal_photos.sql
│   ├── 0009_add_ai_fields.sql
│   ├── 0010_optimize_user_profile.sql
│   └── meta/                      # マイグレーションメタデータ
│
├── dist/                          # ビルド出力
│   ├── _worker.js                 # コンパイル済みWorker (73KB)
│   ├── _routes.json               # ルーティング設定
│   ├── favicon.ico
│   └── static/                    # 静的ファイル（コピー）
│
├── .wrangler/                     # Wrangler作業ディレクトリ
│   └── state/v3/d1/               # ローカルD1データベース
│
├── .dev.vars                      # ローカル環境変数（Git除外）
├── .gitignore                     # Git除外設定
├── package.json                   # NPM設定
├── package-lock.json              # 依存関係ロック
├── tsconfig.json                  # TypeScript設定
├── vite.config.ts                 # Vite設定
├── wrangler.jsonc                 # Cloudflare設定
├── ecosystem.config.cjs           # PM2設定
│
├── README.md                      # プロジェクト概要
├── COMPLETE_DOCUMENTATION.md      # 完全使用書（本ファイル）
├── DATABASE_SETUP_GUIDE.md        # データベースセットアップ
└── TECHNICAL_SPECIFICATION.md     # 技術仕様書（本ファイル）
```

---

## フロントエンド仕様

### HTMLファイル

#### 1. public/index.html（トップページ）
- **目的**: ログイン前後のランディングページ、健康ログ入力
- **主要セクション**:
  - Hero（ログイン前: キャッチコピー、ログイン後: パーソナライズ）
  - 健康ログ入力フォーム
  - スタッフコメント表示
  - Q&A表示（回答済み質問）
  - お知らせ表示
- **依存スクリプト**:
  - `/static/app.js` (144KB)
  - `/static/utils.js`
- **外部CDN**:
  - Tailwind CSS
  - Font Awesome
  - Axios
  - Day.js
  - SweetAlert2

#### 2. public/mypage.html（マイページ）
- **目的**: ユーザープロフィール、データ可視化、アドバイス確認
- **主要セクション**:
  - プロフィール編集
  - アドバイス一覧（AI/スタッフフィルター）
  - 健康データグラフ（Chart.js）
  - 質問・相談投稿
- **依存スクリプト**:
  - `/static/mypage.js`
  - `/static/utils.js`
- **外部CDN**:
  - Chart.js（グラフ描画）
  - その他はindex.htmlと同様

#### 3. public/admin.html（管理画面）
- **目的**: 会員管理、アドバイス作成、お知らせ管理
- **主要セクション**:
  - ダッシュボード（統計情報）
  - 会員管理（一覧、詳細、検索）
  - アドバイス管理
  - お知らせ管理
  - 質問・相談管理
  - お問い合わせ管理
  - システム設定
- **依存スクリプト**:
  - `/static/admin.js`
  - `/static/utils.js`

### JavaScriptファイル

#### 1. public/static/app.js（トップページロジック）

**主要関数**:
```javascript
// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadAnnouncements();
  renderPage();
  if (currentUser) {
    await loadAdvices();
    await loadTodayAdvices();
    await loadUnreadCount();
    await loadLogForDate(selectedDate);
    await loadLatestStaffComment();
    await loadOpinions();
  }
});

// 認証
async function checkAuth()
async function loginWithGoogle(credential)
function getToken()
function setToken(token)
function removeToken()

// データ取得
async function loadAnnouncements()
async function loadAdvices()
async function loadTodayAdvices()
async function loadUnreadCount()
async function loadLogForDate(date)
async function loadLatestStaffComment()
async function loadOpinions()

// UI描画
function renderPage()
function renderHero()
function renderHealthLogForm()
function renderStaffCommentSection()
function renderQASection()

// 健康ログ操作
async function saveHealthLog()
function updateBMIDisplay()
async function captureMealPhoto(mealType)
async function analyzeMealPhoto(mealType)
function selectExercisePreset(type, minutes)

// お知らせ操作
function showAnnouncementDetail(id)
function showAllAnnouncements()

// ユーティリティ
function scrollToSection(sectionId)
async function apiCall(url, options = {})
```

**状態管理**:
```javascript
let currentUser = null;              // ログインユーザー
let advices = [];                    // 全アドバイス
let unreadAdviceCount = 0;           // 未読アドバイス数
let todayLog = null;                 // 今日の健康ログ
let announcements = [];              // お知らせ一覧
let latestStaffComment = null;       // 最新スタッフコメント
let selectedDate = null;             // 選択日付
let opinions = [];                   // 質問・相談データ
let mealData = {                     // 食事データ
  breakfast: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
  lunch: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
  dinner: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 }
};
```

#### 2. public/static/mypage.js（マイページロジック）

**主要関数**:
```javascript
// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  if (!currentUser) {
    window.location.href = '/';
    return;
  }
  await loadAdvices();
  await loadUserLogs();
  await loadMyOpinions();
  renderPage();
  renderCharts();
});

// プロフィール
async function loadProfile()
async function saveProfile()

// アドバイス
async function loadAdvices(filter = 'all')
async function markAdviceAsRead(id)
function filterAdvices(source)

// グラフ
function renderCharts()
function renderWeightChart(data)
function renderCaloriesChart(data)
function renderExerciseChart(data)
function renderConditionChart(data)

// 質問・相談
async function loadMyOpinions()
async function submitOpinion(question)
```

#### 3. public/static/admin.js（管理画面ロジック）

**主要関数**:
```javascript
// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
    window.location.href = '/';
    return;
  }
  await loadDashboard();
  renderAdminPage();
});

// ダッシュボード
async function loadDashboard()
function renderStats(stats)

// 会員管理
async function loadUsers(search = '', role = '')
async function loadUserDetail(userId)
async function updateUserRole(userId, newRole)

// アドバイス作成
async function createAdvice(userId, type, title, content, logDate)

// お知らせ管理
async function createAnnouncement(title, content, imageUrl, isPublished)
async function updateAnnouncement(id, data)
async function deleteAnnouncement(id)

// 質問・相談管理
async function loadPendingOpinions()
async function answerOpinion(id, answer, answeredBy)

// お問い合わせ管理
async function loadInquiries(status = 'all')
async function replyToInquiry(id, reply)
async function updateInquiryStatus(id, status)

// システム設定
async function loadSettings()
async function updateSetting(key, value)
```

#### 4. public/static/utils.js（共通ユーティリティ）

```javascript
// API呼び出しヘルパー
async function apiCall(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers,
      data: options.body,
      ...options
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// トークン管理
function getToken() {
  return localStorage.getItem('authToken');
}

function setToken(token) {
  localStorage.setItem('authToken', token);
}

function removeToken() {
  localStorage.removeItem('authToken');
}

// 日付フォーマット
function formatDate(date, format = 'YYYY-MM-DD') {
  return dayjs(date).format(format);
}

// 通知表示
function showNotification(message, type = 'success') {
  Swal.fire({
    icon: type,
    title: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });
}

// エラーハンドリング
function handleError(error) {
  const message = error.response?.data?.error || error.message || 'エラーが発生しました';
  showNotification(message, 'error');
}
```

---

## バックエンド仕様

### メインエントリポイント

#### src/index.tsx
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings } from './types';

// APIルートインポート
import auth from './routes/auth';
import healthLogs from './routes/health-logs';
import advices from './routes/advices';
import inquiries from './routes/inquiries';
import admin from './routes/admin';
import announcements from './routes/announcements';
import comments from './routes/comments';
import settings from './routes/settings';
import opinions from './routes/opinions';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('/api/*', cors());

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }));

// APIルート登録
app.route('/api/auth', auth);
app.route('/api/health-logs', healthLogs);
app.route('/api/advices', advices);
app.route('/api/inquiries', inquiries);
app.route('/api/admin', admin);
app.route('/api/announcements', announcements);
app.route('/api/comments', comments);
app.route('/api/settings', settings);
app.route('/api/opinions', opinions);

// R2画像取得
app.get('/api/images/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const object = await c.env.BUCKET.get(path);
  if (!object) return c.notFound();
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// HTMLページ配信
app.get('/', async (c) => {
  return c.html(await Bun.file('./public/index.html').text());
});

app.get('/mypage', async (c) => {
  return c.html(await Bun.file('./public/mypage.html').text());
});

app.get('/admin', async (c) => {
  return c.html(await Bun.file('./public/admin.html').text());
});

export default app;
```

### APIルート詳細

#### 1. src/routes/auth.ts（認証API）

**エンドポイント**:
- `POST /api/auth/login` - Googleログイン
- `GET /api/auth/verify` - トークン検証
- `PUT /api/auth/profile` - プロフィール更新

**主要処理**:
```typescript
import { Hono } from 'hono';
import { sign, verify } from '../lib/jwt';
import type { CloudflareBindings } from '../types';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Googleログイン
app.post('/login', async (c) => {
  const { credential } = await c.req.json();
  
  // Google ID Token検証（OAuth2.0ライブラリ使用）
  const googleUser = await verifyGoogleToken(credential);
  
  // ユーザー取得または作成
  let user = await c.env.DB.prepare(`
    SELECT * FROM users WHERE email = ?
  `).bind(googleUser.email).first();
  
  if (!user) {
    // 新規ユーザー作成
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, name, auth_provider, auth_provider_id, avatar_url)
      VALUES (?, ?, 'google', ?, ?)
    `).bind(
      googleUser.email,
      googleUser.name,
      googleUser.sub,
      googleUser.picture
    ).run();
    
    user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(result.meta.last_row_id).first();
  }
  
  // JWTトークン生成
  const token = await sign({
    userId: user.id,
    email: user.email,
    role: user.role
  }, c.env.JWT_SECRET);
  
  return c.json({
    success: true,
    token,
    user
  });
});

// トークン検証
app.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'No token' }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = await verify(token, c.env.JWT_SECRET);
  
  const user = await c.env.DB.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(payload.userId).first();
  
  return c.json({ success: true, user });
});

export default app;
```

#### 2. src/routes/health-logs.ts（健康ログAPI）

**エンドポイント**:
- `POST /api/health-logs` - 健康ログ作成・更新
- `GET /api/health-logs/:date` - 特定日のログ取得
- `GET /api/health-logs/range` - 期間指定でログ取得
- `POST /api/health-logs/analyze-meal-photo` - 食事写真AI分析

**AI分析処理**:
```typescript
// Gemini APIで食事写真を分析
async function analyzeMealPhoto(photoBase64: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "この食事の写真を分析して、カロリー、タンパク質、炭水化物、脂質を推定してください。JSON形式で回答してください。" },
            { inline_data: { mime_type: "image/jpeg", data: photoBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024
        }
      })
    }
  );
  
  const data = await response.json();
  // レスポンスをパースして栄養素データを抽出
  return parseNutritionData(data);
}
```

**非同期AI分析**:
```typescript
// executionContext.waitUntil()でバックグラウンド処理
app.post('/', async (c) => {
  // ... 健康ログ保存 ...
  
  // AI分析を非同期実行（レスポンスをブロックしない）
  c.executionCtx.waitUntil(
    generateAIAdvice(c.env.DB, c.env.GEMINI_API_KEY, userId, logDate, healthData)
  );
  
  return c.json({ success: true, log_id: logId });
});

async function generateAIAdvice(db, apiKey, userId, logDate, healthData) {
  // Gemini APIでアドバイス生成
  const prompt = `
    以下の健康データを分析して、具体的なアドバイスを3つ提供してください：
    - 体重: ${healthData.weight}kg
    - カロリー: ${healthData.calories}kcal
    - 運動時間: ${healthData.exercise_minutes}分
    ...
  `;
  
  const advice = await callGeminiAPI(apiKey, prompt);
  
  // advicesテーブルに保存
  await db.prepare(`
    INSERT INTO advices (user_id, staff_name, advice_type, title, content, log_date, advice_source, confidence_score)
    VALUES (?, 'AI Assistant', ?, ?, ?, ?, 'ai', ?)
  `).bind(userId, advice.type, advice.title, advice.content, logDate, advice.confidence).run();
}
```

#### 3. src/routes/advices.ts（アドバイスAPI）

**エンドポイント**:
- `GET /api/advices` - 自分へのアドバイス一覧
- `PUT /api/advices/:id/read` - アドバイス既読化
- `GET /api/advices/unread-count` - 未読アドバイス数

#### 4. src/routes/announcements.ts（お知らせAPI）

**エンドポイント**:
- `GET /api/announcements` - 公開中のお知らせ一覧
- `POST /api/announcements/admin` - お知らせ作成（管理者）
- `PUT /api/announcements/admin/:id` - お知らせ更新（管理者）
- `DELETE /api/announcements/admin/:id` - お知らせ削除（管理者）

---

## AI統合仕様

### Gemini API統合

#### 1. 食事写真分析（Gemini 1.5 Pro Vision）

**モデル**: `gemini-1.5-pro-vision`

**プロンプト例**:
```
この食事の写真を分析して、以下の情報をJSON形式で提供してください：
{
  "calories": カロリー（kcal）,
  "protein": タンパク質（g）,
  "carbs": 炭水化物（g）,
  "fat": 脂質（g）,
  "description": "食事の説明",
  "confidence": 信頼度（0-1）
}

注意:
- 見える食材から最も正確な推定を行ってください
- 不確実な場合は低めの信頼度を返してください
- 日本食の栄養素データベースを参照してください
```

**レスポンス処理**:
```typescript
function parseNutritionData(geminiResponse: any) {
  try {
    const text = geminiResponse.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
  }
  
  // デフォルト値を返す
  return {
    calories: 500,
    protein: 20,
    carbs: 60,
    fat: 15,
    description: "分析できませんでした",
    confidence: 0.3
  };
}
```

#### 2. 健康アドバイス生成（Gemini 1.5 Flash）

**モデル**: `gemini-1.5-flash`

**プロンプト例**:
```
あなたは専門の健康トレーナーです。以下の健康データを分析して、具体的で実践的なアドバイスを提供してください。

【健康データ】
日付: ${logDate}
体重: ${weight}kg (BMI: ${bmi})
体脂肪率: ${bodyFat}%
カロリー摂取: ${calories}kcal
タンパク質: ${protein}g
炭水化物: ${carbs}g
脂質: ${fat}g
運動時間: ${exerciseMinutes}分
睡眠時間: ${sleepHours}時間
体調評価: ${conditionRating}/5

【過去7日間のトレンド】
体重変化: ${weightTrend}
平均カロリー: ${avgCalories}kcal
平均運動時間: ${avgExercise}分

【出力形式】
以下のJSON形式で3つのアドバイスを返してください：
[
  {
    "type": "nutrition" | "exercise" | "sleep" | "general",
    "title": "アドバイスタイトル（20文字以内）",
    "content": "具体的なアドバイス内容（150文字以内）",
    "confidence": 0-1の信頼度スコア
  }
]

要件:
- 具体的で実践可能なアドバイス
- ポジティブなトーン
- 数値を含める
- 専門用語は避ける
```

**信頼度スコアリング**:
```typescript
function calculateConfidenceScore(healthData: HealthData): number {
  let score = 0.5; // ベーススコア
  
  // データの完全性をチェック
  if (healthData.weight) score += 0.1;
  if (healthData.calories > 0) score += 0.1;
  if (healthData.exerciseMinutes > 0) score += 0.1;
  if (healthData.sleepHours) score += 0.1;
  
  // 過去データの有無
  if (healthData.historicalData?.length > 7) score += 0.1;
  
  return Math.min(score, 1.0);
}
```

#### 3. APIレート制限

**クォータ管理**:
```typescript
// 1ユーザーあたりのAI分析上限
const AI_ANALYSIS_LIMITS = {
  MEAL_PHOTO_PER_DAY: 15,     // 食事写真分析: 1日15回
  ADVICE_GENERATION_PER_DAY: 3 // アドバイス生成: 1日3回
};

async function checkAIQuota(db: D1Database, userId: number, type: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  const count = await db.prepare(`
    SELECT COUNT(*) as count FROM ai_usage_logs
    WHERE user_id = ? AND usage_type = ? AND DATE(created_at) = ?
  `).bind(userId, type, today).first();
  
  const limit = type === 'meal_photo' 
    ? AI_ANALYSIS_LIMITS.MEAL_PHOTO_PER_DAY 
    : AI_ANALYSIS_LIMITS.ADVICE_GENERATION_PER_DAY;
  
  return count.count < limit;
}
```

---

## 認証・セキュリティ

### JWT認証

**トークン生成**:
```typescript
// src/lib/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

export async function sign(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7日間有効
    .sign(secretKey);
}

export async function verify(token: string, secret: string): Promise<any> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);
  
  const { payload } = await jwtVerify(token, secretKey);
  return payload;
}
```

**ミドルウェア**:
```typescript
// 認証必須のルートで使用
async function requireAuth(c: Context) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('user', payload);
    return;
  } catch (error) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }
}

// 管理者権限チェック
async function requireAdmin(c: Context) {
  const user = c.get('user');
  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }
}
```

### CORS設定

```typescript
app.use('/api/*', cors({
  origin: [
    'http://localhost:3000',
    'https://furdi-hikone.pages.dev',
    'https://your-custom-domain.com'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true
}));
```

### XSS対策

**入力サニタイズ**:
```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// フォーム送信時に適用
app.post('/api/health-logs', async (c) => {
  const body = await c.req.json();
  body.condition_note = sanitizeInput(body.condition_note);
  // ...
});
```

### SQLインジェクション対策

**Prepared Statements使用**:
```typescript
// ✅ 正しい（Prepared Statements）
await db.prepare(`
  SELECT * FROM users WHERE email = ?
`).bind(email).first();

// ❌ 危険（直接文字列結合）
await db.prepare(`
  SELECT * FROM users WHERE email = '${email}'
`).first();
```

---

## パフォーマンス最適化

### データベースインデックス

**重要なインデックス**:
```sql
-- ユーザー検索
CREATE INDEX idx_users_email ON users(email);

-- 健康ログ取得
CREATE INDEX idx_health_logs_user_date ON health_logs(user_id, log_date);

-- アドバイス取得
CREATE INDEX idx_advices_user ON advices(user_id, created_at DESC);

-- 未読フィルター
CREATE INDEX idx_advices_read ON advices(user_id, is_read);
```

### N+1クエリ回避

**JOINを使用**:
```typescript
// ✅ 効率的（1クエリ）
const logs = await db.prepare(`
  SELECT 
    hl.*,
    SUM(m.calories) as total_calories,
    SUM(m.protein) as total_protein,
    SUM(m.carbs) as total_carbs,
    SUM(m.fat) as total_fat
  FROM health_logs hl
  LEFT JOIN meals m ON hl.id = m.health_log_id
  WHERE hl.user_id = ?
  GROUP BY hl.id
  ORDER BY hl.log_date DESC
`).bind(userId).all();

// ❌ 非効率（N+1クエリ）
const logs = await db.prepare(`SELECT * FROM health_logs WHERE user_id = ?`).bind(userId).all();
for (const log of logs) {
  const meals = await db.prepare(`SELECT * FROM meals WHERE health_log_id = ?`).bind(log.id).all();
  // ...
}
```

### キャッシュ戦略

**R2オブジェクトキャッシュ**:
```typescript
app.get('/api/images/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const object = await c.env.BUCKET.get(path);
  
  if (!object) return c.notFound();
  
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000', // 1年間キャッシュ
      'ETag': object.etag
    },
  });
});
```

**APIレスポンスキャッシュ**:
```typescript
// Cloudflare Workersの自動キャッシュを活用
app.get('/api/announcements', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM announcements 
    WHERE is_published = 1 
    ORDER BY published_at DESC 
    LIMIT 10
  `).all();
  
  return c.json({ success: true, data: results }, {
    headers: {
      'Cache-Control': 'public, max-age=300' // 5分間キャッシュ
    }
  });
});
```

### 画像最適化

**アップロード時のリサイズ**:
```typescript
async function uploadMealPhoto(photoBlob: Blob, mealId: number): Promise<string> {
  // 画像を800x800にリサイズ
  const resizedBlob = await resizeImage(photoBlob, 800, 800);
  
  // WebP形式に変換（70%品質）
  const webpBlob = await convertToWebP(resizedBlob, 0.7);
  
  // R2にアップロード
  const key = `meals/${mealId}/${Date.now()}.webp`;
  await bucket.put(key, webpBlob);
  
  return key;
}
```

---

## 環境変数

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GOOGLE_CLIENT_ID` | Google OAuthクライアントID | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuthクライアントシークレット | `GOCSPX-xxx` |
| `JWT_SECRET` | JWT署名用シークレット（32文字以上） | `your_super_secret_key_min_32_chars` |
| `GEMINI_API_KEY` | Gemini APIキー | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX` |

### Cloudflareバインディング

**wrangler.jsonc**:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "furdi-hikone-production",
      "database_id": "your-database-id"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "furdi-hikone-photos"
    }
  ]
}
```

**TypeScript型定義**:
```typescript
// src/types/index.ts
export interface CloudflareBindings {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GEMINI_API_KEY: string;
}
```

---

## ビルド・デプロイ

### ビルドプロセス

```bash
# 1. TypeScriptコンパイル + Viteバンドル
npm run build

# 出力:
# dist/
#   _worker.js      # コンパイル済みHono Worker
#   _routes.json    # ルーティング設定
#   static/         # 静的ファイル（コピー）
```

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import pages from '@hono/vite-cloudflare-pages';

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    target: 'esnext'
  }
});
```

### デプロイコマンド

```bash
# ローカル開発
npm run build
pm2 start ecosystem.config.cjs

# 本番デプロイ
npm run build
npx wrangler pages deploy dist --project-name furdi-hikone
```

---

## モニタリング・ログ

### Cloudflare Workersログ

```bash
# リアルタイムログ
npx wrangler tail furdi-hikone

# フィルタリング
npx wrangler tail furdi-hikone --status error
npx wrangler tail furdi-hikone --method POST
```

### エラー処理

```typescript
// グローバルエラーハンドラー
app.onError((err, c) => {
  console.error('Error:', err);
  
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error'
  }, 500);
});

// 404ハンドラー
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found'
  }, 404);
});
```

---

**作成日**: 2025年11月13日  
**最終更新**: 2025年11月13日  
**バージョン**: 1.0.0
