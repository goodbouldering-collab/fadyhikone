# データベースセットアップガイド - ファディー彦根

このファイルには、アプリを再構築するために必要な全てのデータベース定義とサンプルデータが含まれています。

---

## 📋 目次

1. [データベース概要](#データベース概要)
2. [テーブル作成SQL](#テーブル作成sql)
3. [サンプルデータSQL](#サンプルデータsql)
4. [マイグレーション手順](#マイグレーション手順)
5. [データベース管理コマンド](#データベース管理コマンド)

---

## データベース概要

### 使用技術
- **Cloudflare D1**: SQLite互換の分散データベース
- **総テーブル数**: 10個
- **リレーション**: 外部キー制約あり

### テーブル依存関係
```
users (親)
  ├── health_logs (子)
  │   ├── meals (孫)
  │   │   └── meal_photos (ひ孫)
  ├── advices (子)
  ├── staff_comments (子)
  └── opinion_box (子)

announcements (独立)
inquiries (独立)
settings (独立)
```

---

## テーブル作成SQL

### 1. users（ユーザー）

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  auth_provider TEXT NOT NULL,  -- 'google', 'local'
  auth_provider_id TEXT NOT NULL,
  role TEXT DEFAULT 'user',  -- 'user', 'admin', 'superadmin'
  avatar_url TEXT,
  height REAL,  -- 身長（cm）
  birth_date TEXT,  -- YYYY-MM-DD
  gender TEXT,  -- 'male', 'female', 'other'
  phone TEXT,
  goal TEXT,  -- 健康目標
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_provider, auth_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

### 2. health_logs（健康ログ）

```sql
CREATE TABLE IF NOT EXISTS health_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  log_date DATE NOT NULL,  -- YYYY-MM-DD
  weight REAL,  -- 体重（kg）
  body_fat_percentage REAL,  -- 体脂肪率（%）
  body_temperature REAL,  -- 体温（℃）
  sleep_hours REAL,  -- 睡眠時間（時間）
  exercise_minutes INTEGER,  -- 運動時間（分）
  condition_rating INTEGER DEFAULT 3,  -- 1-5
  condition_note TEXT,  -- 体調メモ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_health_logs_user_date ON health_logs(user_id, log_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_logs_unique ON health_logs(user_id, log_date);
```

### 3. meals（食事記録）

```sql
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_log_id INTEGER NOT NULL,
  meal_type TEXT NOT NULL,  -- 'breakfast', 'lunch', 'dinner'
  calories INTEGER DEFAULT 0,  -- カロリー（kcal）
  protein REAL DEFAULT 0,  -- タンパク質（g）
  carbs REAL DEFAULT 0,  -- 炭水化物（g）
  fat REAL DEFAULT 0,  -- 脂質（g）
  ai_analysis_text TEXT,  -- AI分析テキスト
  ai_confidence REAL,  -- AI信頼度（0-1）
  input_method TEXT DEFAULT 'manual',  -- 'manual', 'photo', 'ai'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (health_log_id) REFERENCES health_logs(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_meals_health_log ON meals(health_log_id);
CREATE INDEX IF NOT EXISTS idx_meals_type ON meals(health_log_id, meal_type);
```

### 4. meal_photos（食事写真）

```sql
CREATE TABLE IF NOT EXISTS meal_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,  -- R2バケットのURL
  photo_order INTEGER DEFAULT 1,  -- 写真の順序
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_meal_photos_meal ON meal_photos(meal_id);
```

### 5. advices（アドバイス）

```sql
CREATE TABLE IF NOT EXISTS advices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  staff_name TEXT NOT NULL,  -- AIの場合は'AI Assistant'
  advice_type TEXT NOT NULL,  -- 'nutrition', 'exercise', 'sleep', 'general'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  log_date TEXT,  -- 対象日付（YYYY-MM-DD）
  advice_source TEXT DEFAULT 'staff',  -- 'staff', 'ai'
  ai_analysis_data TEXT,  -- AI分析データ（JSON）
  confidence_score REAL,  -- 信頼度スコア（0-1）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_advices_user ON advices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advices_read ON advices(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_advices_date ON advices(log_date);
CREATE INDEX IF NOT EXISTS idx_advices_source ON advices(advice_source);
```

### 6. staff_comments（スタッフコメント）

```sql
CREATE TABLE IF NOT EXISTS staff_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  staff_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_staff_comments_user ON staff_comments(user_id, created_at DESC);
```

### 7. announcements（お知らせ）

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN DEFAULT 1,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at DESC);
```

### 8. opinion_box（質問・相談）

```sql
CREATE TABLE IF NOT EXISTS opinion_box (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'answered'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered_at DATETIME,
  answered_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_opinion_box_user ON opinion_box(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opinion_box_status ON opinion_box(status);
```

### 9. inquiries（お問い合わせ）

```sql
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'resolved'
  admin_reply TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
```

### 10. settings（システム設定）

```sql
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
```

---

## サンプルデータSQL

### 管理者ユーザー

```sql
-- 管理者アカウント（開発用）
INSERT INTO users (email, name, auth_provider, auth_provider_id, role, height, birth_date, gender, goal)
VALUES 
  ('admin@furdi-hikone.com', '管理者', 'local', 'admin001', 'superadmin', 170.0, '1985-01-01', 'male', 'ジム運営管理'),
  ('trainer1@furdi-hikone.com', '田中トレーナー', 'local', 'trainer001', 'admin', 165.0, '1990-05-15', 'female', '会員サポート'),
  ('trainer2@furdi-hikone.com', '佐藤トレーナー', 'local', 'trainer002', 'admin', 175.0, '1988-08-20', 'male', '栄養指導専門');
```

### テストユーザー

```sql
-- テストユーザー（開発用）
INSERT INTO users (email, name, auth_provider, auth_provider_id, role, height, birth_date, gender, goal)
VALUES 
  ('test1@example.com', '山田太郎', 'local', 'test001', 'user', 170.5, '1990-01-15', 'male', '5kg減量'),
  ('test2@example.com', '佐藤花子', 'local', 'test002', 'user', 158.0, '1992-06-20', 'female', '健康維持'),
  ('test3@example.com', '鈴木一郎', 'local', 'test003', 'user', 180.0, '1985-12-10', 'male', '筋力アップ');
```

### 健康ログサンプル

```sql
-- 山田太郎の健康ログ（過去7日分）
INSERT INTO health_logs (user_id, log_date, weight, body_fat_percentage, body_temperature, sleep_hours, exercise_minutes, condition_rating, condition_note)
VALUES 
  (4, DATE('now', '-6 days'), 72.5, 22.5, 36.5, 7.0, 30, 4, '調子良好'),
  (4, DATE('now', '-5 days'), 72.3, 22.4, 36.6, 7.5, 45, 5, 'とても良い'),
  (4, DATE('now', '-4 days'), 72.1, 22.3, 36.4, 6.5, 0, 3, '少し疲れ'),
  (4, DATE('now', '-3 days'), 72.0, 22.2, 36.5, 8.0, 60, 4, '回復した'),
  (4, DATE('now', '-2 days'), 71.8, 22.1, 36.5, 7.0, 30, 4, '順調'),
  (4, DATE('now', '-1 days'), 71.6, 22.0, 36.6, 7.5, 45, 5, '最高の調子'),
  (4, DATE('now'), 71.5, 21.9, 36.5, 7.0, 30, 4, '目標に近づいている');
```

### 食事記録サンプル

```sql
-- 山田太郎の最新の食事記録
INSERT INTO meals (health_log_id, meal_type, calories, protein, carbs, fat, input_method)
SELECT 
  id,
  'breakfast',
  450,
  20,
  60,
  12,
  'manual'
FROM health_logs 
WHERE user_id = 4 AND log_date = DATE('now');

INSERT INTO meals (health_log_id, meal_type, calories, protein, carbs, fat, input_method)
SELECT 
  id,
  'lunch',
  680,
  35,
  75,
  20,
  'manual'
FROM health_logs 
WHERE user_id = 4 AND log_date = DATE('now');

INSERT INTO meals (health_log_id, meal_type, calories, protein, carbs, fat, input_method)
SELECT 
  id,
  'dinner',
  620,
  30,
  70,
  18,
  'manual'
FROM health_logs 
WHERE user_id = 4 AND log_date = DATE('now');
```

### アドバイスサンプル

```sql
-- AIアドバイス
INSERT INTO advices (user_id, staff_name, advice_type, title, content, log_date, advice_source, confidence_score)
VALUES 
  (4, 'AI Assistant', 'nutrition', 'タンパク質摂取のアドバイス', '本日のタンパク質摂取量は85gで、目標の80gを達成しています。筋肉の維持・増強に最適な量です。引き続きこのペースを維持しましょう。', DATE('now'), 'ai', 0.92),
  (4, 'AI Assistant', 'exercise', '運動習慣の継続', '過去7日間で週5回の運動を実施されています。素晴らしい習慣です！休息日も適切に設けられており、バランスの取れた運動プログラムとなっています。', DATE('now', '-1 days'), 'ai', 0.88);

-- スタッフアドバイス
INSERT INTO advices (user_id, staff_name, advice_type, title, content, log_date, advice_source)
VALUES 
  (4, '田中トレーナー', 'general', '素晴らしい進捗です！', '1週間で1kg近く体重が減少していますね。健康的なペースです。このまま食事管理と運動を継続すれば、目標達成も近いでしょう。', DATE('now'), 'staff'),
  (4, '佐藤トレーナー', 'nutrition', '炭水化物のバランス', '炭水化物の摂取量が適切です。運動前後にしっかり摂取できているので、エネルギー効率も良好です。', DATE('now', '-2 days'), 'staff');
```

### スタッフコメントサンプル

```sql
-- スタッフからのコメント
INSERT INTO staff_comments (user_id, staff_name, comment)
VALUES 
  (4, '田中トレーナー', '最近の体重管理が素晴らしいですね！この調子で頑張りましょう。'),
  (5, '佐藤トレーナー', '運動習慣が定着してきましたね。次のステップとして強度を上げてみましょう。'),
  (6, '田中トレーナー', '筋力アップの目標に向けて、プロテイン摂取のタイミングを工夫してみましょう。');
```

### お知らせサンプル

```sql
-- お知らせ
INSERT INTO announcements (title, content, is_published)
VALUES 
  ('新しいプログラムのご案内', 'パーソナルトレーニングの新プログラムを開始しました。AIを活用した食事分析と、専門トレーナーによる個別指導を組み合わせた革新的なプログラムです。詳細はスタッフまでお問い合わせください。', 1),
  ('営業時間変更のお知らせ', '12月1日より営業時間を変更いたします。\n平日: 10:00-22:00\n土日祝: 9:00-20:00\nより多くの皆様にご利用いただけるよう、朝の営業時間を拡大しました。', 1),
  ('年末年始の営業について', '12月29日から1月3日まで年末年始休業とさせていただきます。\n新年は1月4日（土）9:00より通常営業いたします。\n本年も大変お世話になりました。来年もよろしくお願いいたします。', 1),
  ('新機能リリースのお知らせ', 'アプリに新機能を追加しました！\n・食事写真のAI自動分析\n・体重推移グラフ\n・AIによる健康アドバイス\nぜひご活用ください。', 1),
  ('メンテナンスのお知らせ', '11月15日（金）深夜2:00-4:00の間、システムメンテナンスを実施いたします。この間、アプリがご利用いただけません。ご不便をおかけしますが、ご理解のほどよろしくお願いいたします。', 1);
```

### 質問・相談サンプル

```sql
-- 質問と回答
INSERT INTO opinion_box (user_id, question, answer, status, answered_at, answered_by)
VALUES 
  (4, 'プロテインはいつ飲むのが効果的ですか？', '運動後30分以内が最も効果的です。この時間帯は「ゴールデンタイム」と呼ばれ、筋肉へのタンパク質吸収率が高まります。また、朝食時や就寝前の摂取も効果的です。', 'answered', DATETIME('now', '-2 days'), '佐藤トレーナー'),
  (5, '有酸素運動と筋トレ、どちらを先にすべきですか？', '目的によって異なりますが、一般的には筋トレを先に行うことをお勧めします。筋トレで成長ホルモンの分泌が高まり、その後の有酸素運動での脂肪燃焼効果が向上します。', 'answered', DATETIME('now', '-1 days'), '田中トレーナー'),
  (6, '体脂肪率を効率的に下げる方法を教えてください。', '①食事管理（カロリー収支を意識）、②筋トレ（基礎代謝アップ）、③有酸素運動（脂肪燃焼）、④十分な睡眠（ホルモンバランス）の4つが重要です。特に食事管理が最も効果的です。', 'answered', DATETIME('now', '-3 days'), '佐藤トレーナー');

-- 未回答の質問
INSERT INTO opinion_box (user_id, question, status)
VALUES 
  (4, 'ダイエット中のアルコール摂取について教えてください。', 'pending'),
  (5, '膝が痛いのですが、どんな運動がおすすめですか？', 'pending');
```

### お問い合わせサンプル

```sql
-- お問い合わせ
INSERT INTO inquiries (name, email, phone, subject, message, status)
VALUES 
  ('鈴木次郎', 'suzuki@example.com', '090-1234-5678', '入会について', '入会を検討しています。見学は可能でしょうか？また、料金プランについて詳しく教えていただけますか。', 'pending'),
  ('高橋美咲', 'takahashi@example.com', '080-9876-5432', '体験トレーニング', '体験トレーニングを受けたいのですが、予約方法を教えてください。', 'processing'),
  ('伊藤健太', 'ito@example.com', '070-5555-1234', 'パーソナルトレーニング', 'パーソナルトレーニングの料金と空き状況について教えてください。', 'resolved');
```

### システム設定サンプル

```sql
-- システム設定
INSERT INTO settings (setting_key, setting_value, description)
VALUES 
  ('maintenance_mode', 'off', 'メンテナンスモード（on/off）'),
  ('max_photo_per_meal', '5', '1食あたりの最大写真枚数'),
  ('ai_analysis_timeout', '30', 'AI分析タイムアウト（秒）'),
  ('default_exercise_presets', '["ウォーキング","ジョギング","筋トレ","ヨガ","サイクリング","水泳","ストレッチ","その他"]', '運動プリセット（JSON配列）'),
  ('gemini_model', 'gemini-1.5-flash', '使用するGeminiモデル'),
  ('ai_advice_enabled', 'true', 'AIアドバイス機能の有効/無効'),
  ('notification_enabled', 'true', '通知機能の有効/無効');
```

---

## マイグレーション手順

### ローカル開発環境

#### 1. データベース作成
```bash
# 自動的にローカルSQLiteが作成される
npx wrangler d1 migrations apply furdi-hikone-production --local
```

#### 2. スキーマ作成（全マイグレーション実行）
```bash
cd /home/user/webapp

# 全マイグレーションを実行
npx wrangler d1 migrations apply furdi-hikone-production --local
```

#### 3. サンプルデータ投入
```bash
# SQLファイルを作成
cat > sample_data.sql << 'EOF'
-- [上記のサンプルデータSQLをコピー]
EOF

# データ投入
npx wrangler d1 execute furdi-hikone-production --local --file=./sample_data.sql
```

### 本番環境

#### 1. データベース作成
```bash
# Cloudflare D1データベースを作成
npx wrangler d1 create furdi-hikone-production

# 出力されたdatabase_idをwrangler.jsonc に設定
```

#### 2. マイグレーション実行
```bash
# 本番データベースにマイグレーション
npx wrangler d1 migrations apply furdi-hikone-production

# 確認
npx wrangler d1 execute furdi-hikone-production \
  --command="SELECT name FROM sqlite_master WHERE type='table'"
```

#### 3. 初期データ投入（任意）
```bash
# 管理者ユーザーとお知らせのみ投入
cat > initial_data.sql << 'EOF'
-- 管理者ユーザー
INSERT INTO users (email, name, auth_provider, auth_provider_id, role, height, birth_date, gender, goal)
VALUES ('admin@furdi-hikone.com', '管理者', 'local', 'admin001', 'superadmin', 170.0, '1985-01-01', 'male', 'ジム運営管理');

-- お知らせサンプル
INSERT INTO announcements (title, content, is_published)
VALUES 
  ('ようこそファディー彦根へ', 'AIとプロの指導で、あなたの健康をサポートします。', 1);

-- システム設定
INSERT INTO settings (setting_key, setting_value, description)
VALUES 
  ('maintenance_mode', 'off', 'メンテナンスモード'),
  ('ai_advice_enabled', 'true', 'AIアドバイス機能');
EOF

npx wrangler d1 execute furdi-hikone-production --file=./initial_data.sql
```

---

## データベース管理コマンド

### データ確認

```bash
# ユーザー一覧
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT id, name, email, role FROM users"

# 健康ログ件数
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT COUNT(*) as total FROM health_logs"

# 最新のアドバイス
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT * FROM advices ORDER BY created_at DESC LIMIT 5"

# お知らせ一覧
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT id, title, is_published FROM announcements ORDER BY published_at DESC"
```

### データ更新

```bash
# ユーザーを管理者に昇格
npx wrangler d1 execute furdi-hikone-production --local \
  --command="UPDATE users SET role='admin' WHERE email='user@example.com'"

# お知らせを非公開に
npx wrangler d1 execute furdi-hikone-production --local \
  --command="UPDATE announcements SET is_published=0 WHERE id=1"
```

### データ削除

```bash
# 特定ユーザーの健康ログを削除
npx wrangler d1 execute furdi-hikone-production --local \
  --command="DELETE FROM health_logs WHERE user_id=4 AND log_date < DATE('now', '-30 days')"

# 古いお知らせを削除
npx wrangler d1 execute furdi-hikone-production --local \
  --command="DELETE FROM announcements WHERE created_at < DATE('now', '-90 days') AND is_published=0"
```

### バックアップ

```bash
# ローカルデータベースのバックアップ
cp .wrangler/state/v3/d1/miniflare-D1DatabaseObject/YOUR_DATABASE_ID.sqlite \
   backup_$(date +%Y%m%d_%H%M%S).sqlite

# 本番データベースのエクスポート（SQLダンプ）
npx wrangler d1 export furdi-hikone-production > backup.sql
```

### データベースリセット

```bash
# ⚠️ 警告: 全データが削除されます

# ローカル環境
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply furdi-hikone-production --local

# 本番環境（マイグレーションを--forceで再実行）
npx wrangler d1 migrations apply furdi-hikone-production --force
```

---

## データベース最適化

### インデックス確認

```bash
# 各テーブルのインデックス一覧
for table in users health_logs meals meal_photos advices staff_comments announcements opinion_box inquiries settings; do
  echo "=== $table ==="
  npx wrangler d1 execute furdi-hikone-production --local \
    --command="SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='$table'"
done
```

### テーブルサイズ確認

```bash
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT 
    name,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as count
  FROM sqlite_master m
  WHERE type='table'
  ORDER BY name"
```

### VACUUM（データベース最適化）

```bash
# データベースファイルの断片化を解消
npx wrangler d1 execute furdi-hikone-production --local \
  --command="VACUUM"
```

---

## トラブルシューティング

### よくあるエラー

#### 1. マイグレーションエラー

```
Error: Migration failed: UNIQUE constraint failed
```

**解決方法**:
```bash
# マイグレーション履歴を確認
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT * FROM d1_migrations"

# 問題のマイグレーションをリセット
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply furdi-hikone-production --local
```

#### 2. 外部キー制約エラー

```
Error: FOREIGN KEY constraint failed
```

**解決方法**:
```bash
# 外部キー制約を一時的に無効化してデータ投入
npx wrangler d1 execute furdi-hikone-production --local \
  --command="PRAGMA foreign_keys=OFF; [Your SQL]; PRAGMA foreign_keys=ON;"
```

#### 3. データ型エラー

```
Error: datatype mismatch
```

**解決方法**:
- SQLiteは柔軟な型システムですが、制約違反がある場合はデータを確認
- 日付は'YYYY-MM-DD'形式の文字列
- 数値はREAL型（浮動小数点）またはINTEGER型

---

## 定期メンテナンス

### 週次タスク

```bash
# 1. データベースサイズ確認
npx wrangler d1 execute furdi-hikone-production --local \
  --command="SELECT SUM(pgsize) FROM dbstat"

# 2. 古いデータのアーカイブ（90日以上前の健康ログ）
# ※実装例（実際のアーカイブロジックは要件により異なる）

# 3. バックアップ作成
cp .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
   backup_weekly_$(date +%Y%m%d).sqlite
```

### 月次タスク

```bash
# 1. インデックスの最適化
npx wrangler d1 execute furdi-hikone-production --local \
  --command="ANALYZE"

# 2. VACUUM実行
npx wrangler d1 execute furdi-hikone-production --local \
  --command="VACUUM"

# 3. データ整合性チェック
npx wrangler d1 execute furdi-hikone-production --local \
  --command="PRAGMA integrity_check"
```

---

## 参考情報

### Cloudflare D1ドキュメント
- 公式ドキュメント: https://developers.cloudflare.com/d1/
- マイグレーションガイド: https://developers.cloudflare.com/d1/learning/migrations/
- SQLiteリファレンス: https://www.sqlite.org/lang.html

### ベストプラクティス
1. **マイグレーション**: 常にマイグレーションファイルで管理（手動SQLは避ける）
2. **インデックス**: 頻繁に検索するカラムにはINDEXを作成
3. **バックアップ**: 本番データベースは定期的にエクスポート
4. **外部キー**: ON DELETE CASCADEで関連データを自動削除
5. **型安全性**: TypeScriptで型定義を作成（src/types/index.ts）

---

**作成日**: 2025年11月13日  
**最終更新**: 2025年11月13日  
**バージョン**: 1.0.0
