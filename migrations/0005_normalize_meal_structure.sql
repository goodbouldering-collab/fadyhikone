-- ===================================================================
-- Migration 0005: 食事データの正規化
-- 目的: 朝昼晩の食事を独立したテーブルで管理し、複数写真・PFC内訳を保存
-- ===================================================================

-- 1. 食事記録テーブル (meals)
-- health_logsから食事関連データを分離し、meal_type(breakfast/lunch/dinner)で管理
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_log_id INTEGER NOT NULL,
  meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
  
  -- 栄養素データ (手動入力 or AI解析)
  calories INTEGER DEFAULT 0,
  protein REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  
  -- AI解析結果 (オプショナル)
  ai_analysis_text TEXT, -- AI解析の説明文
  ai_confidence REAL,    -- 信頼度 (0.0-1.0)
  
  -- メタデータ
  input_method TEXT DEFAULT 'manual' CHECK(input_method IN ('manual', 'ai', 'hybrid')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (health_log_id) REFERENCES health_logs(id) ON DELETE CASCADE
);

-- 2. 食事写真テーブル (meal_photos)
-- 1つの食事に対して複数の写真を保存可能
CREATE TABLE IF NOT EXISTS meal_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  photo_order INTEGER DEFAULT 1, -- 表示順序 (1, 2, 3...)
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_meals_health_log_id ON meals(health_log_id);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_photos_meal_id ON meal_photos(meal_id);

-- 4. health_logsテーブルから古い列を削除
-- 注意: SQLiteはALTER TABLE DROP COLUMNをサポートしないため、
--       新しいテーブルを作成してデータを移行する必要がある

-- 4.1 新しいhealth_logsテーブルを作成
CREATE TABLE IF NOT EXISTS health_logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  log_date DATE NOT NULL,
  
  -- 体組成データ
  weight REAL,
  body_fat_percentage REAL,
  
  -- 体調データ
  body_temperature REAL,
  sleep_hours REAL,
  exercise_minutes INTEGER,
  condition_rating INTEGER DEFAULT 3 CHECK(condition_rating >= 1 AND condition_rating <= 5),
  condition_note TEXT,
  
  -- タイムスタンプ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4.2 既存データを新テーブルに移行
INSERT INTO health_logs_new (
  id, user_id, log_date, weight, body_fat_percentage, 
  body_temperature, sleep_hours, exercise_minutes, 
  condition_rating, condition_note, created_at, updated_at
)
SELECT 
  id, user_id, log_date, weight, body_fat_percentage,
  body_temperature, sleep_hours, exercise_minutes,
  condition_rating, condition_note, created_at, updated_at
FROM health_logs;

-- 4.3 既存の食事データをmealsテーブルに移行 (合計値を3食に均等配分)
-- 注意: 既存データは合計値しかないため、暫定的に3分割して保存
INSERT INTO meals (health_log_id, meal_type, calories, protein, carbs, fat, input_method)
SELECT 
  id as health_log_id,
  'breakfast' as meal_type,
  COALESCE(meal_calories / 3, 0) as calories,
  COALESCE(meal_protein / 3, 0) as protein,
  COALESCE(meal_carbs / 3, 0) as carbs,
  COALESCE(meal_fat / 3, 0) as fat,
  'manual' as input_method
FROM health_logs
WHERE meal_calories IS NOT NULL OR meal_protein IS NOT NULL;

INSERT INTO meals (health_log_id, meal_type, calories, protein, carbs, fat, input_method)
SELECT 
  id as health_log_id,
  'lunch' as meal_type,
  COALESCE(meal_calories / 3, 0) as calories,
  COALESCE(meal_protein / 3, 0) as protein,
  COALESCE(meal_carbs / 3, 0) as carbs,
  COALESCE(meal_fat / 3, 0) as fat,
  'manual' as input_method
FROM health_logs
WHERE meal_calories IS NOT NULL OR meal_protein IS NOT NULL;

INSERT INTO meals (health_log_id, meal_type, calories, protein, carbs, fat, input_method)
SELECT 
  id as health_log_id,
  'dinner' as meal_type,
  COALESCE(meal_calories / 3, 0) as calories,
  COALESCE(meal_protein / 3, 0) as protein,
  COALESCE(meal_carbs / 3, 0) as carbs,
  COALESCE(meal_fat / 3, 0) as fat,
  'manual' as input_method
FROM health_logs
WHERE meal_calories IS NOT NULL OR meal_protein IS NOT NULL;

-- 4.4 既存の食事写真URLをmeal_photosテーブルに移行
-- 注意: 既存データは1枚のみなので、朝食に割り当て
INSERT INTO meal_photos (meal_id, photo_url, photo_order)
SELECT 
  m.id as meal_id,
  h.meal_photo_url as photo_url,
  1 as photo_order
FROM health_logs h
JOIN meals m ON m.health_log_id = h.id AND m.meal_type = 'breakfast'
WHERE h.meal_photo_url IS NOT NULL AND h.meal_photo_url != '';

-- 4.5 古いhealth_logsテーブルを削除し、新テーブルをリネーム
DROP TABLE health_logs;
ALTER TABLE health_logs_new RENAME TO health_logs;

-- 4.6 インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_log_date ON health_logs(log_date);

-- ===================================================================
-- マイグレーション完了
-- 新構造:
--   health_logs (体重・体脂肪・体調データ)
--   ├─ meals (朝昼晩の食事記録: カロリー・PFC)
--   │   └─ meal_photos (各食事の複数写真)
-- ===================================================================
