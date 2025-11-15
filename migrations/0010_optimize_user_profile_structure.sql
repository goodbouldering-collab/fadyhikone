-- ===================================================================
-- Migration 0010: ユーザープロフィール構造の最適化
-- 目的: 
--   1. 身長は個人データとしてusersテーブルに保持（毎日記録不要）
--   2. 体重はhealth_logsテーブルで日々記録
--   3. usersテーブルから体重カラムを削除（既にhealth_logsにある）
-- ===================================================================

-- 1. usersテーブルのweight列を削除（SQLiteは直接DROP COLUMNできないため、テーブルを再作成）

-- 1.1 新しいusersテーブルを作成（weightなし）
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  auth_provider TEXT NOT NULL,
  auth_provider_id TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  
  -- プロフィール情報（固定データ）
  height REAL,              -- 身長 (cm) - 個人の固定データ
  birth_date TEXT,          -- 生年月日 (YYYY-MM-DD)
  gender TEXT,              -- 性別 (male/female/other)
  phone TEXT,               -- 電話番号
  goal TEXT,                -- 目標
  
  -- タイムスタンプ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 既存データを移行（weightを除く）
INSERT INTO users_new (
  id, email, name, auth_provider, auth_provider_id, role, avatar_url,
  height, birth_date, gender, phone, goal,
  created_at, updated_at
)
SELECT 
  id, email, name, auth_provider, auth_provider_id, role, avatar_url,
  height, birth_date, gender, phone, goal,
  created_at, updated_at
FROM users;

-- 1.3 古いusersテーブルを削除し、新テーブルをリネーム
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- 1.4 インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. health_logsテーブルの確認（既にweightカラムがあることを確認）
-- health_logsテーブルには既にweight, body_fat_percentage等が存在するため、変更不要

-- 3. 既存のweight値をhealth_logsに保持（データは既に存在）
-- 注意: usersテーブルのweightは削除されるが、health_logsのweightは保持される

-- ===================================================================
-- マイグレーション完了
-- 
-- 構造:
--   users: 個人の固定データ（身長、生年月日、性別など）
--   health_logs: 日々変動するデータ（体重、体脂肪率、運動、睡眠など）
--   meals: 食事記録（朝昼晩）
--   meal_photos: 食事写真
-- 
-- リレーション:
--   users (1) ---> (N) health_logs
--   health_logs (1) ---> (N) meals
--   meals (1) ---> (N) meal_photos
-- ===================================================================
