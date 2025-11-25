-- Add 'snack' to meal_type check constraint
-- SQLiteではCHECK制約を直接変更できないため、テーブルを再作成する

-- 1. 一時テーブルを作成
CREATE TABLE meals_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_log_id INTEGER NOT NULL,
  meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  
  -- 栄養素情報
  calories INTEGER DEFAULT 0,
  protein REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  
  -- AI分析結果
  ai_analysis_text TEXT, 
  ai_confidence REAL,    
  
  -- 入力方法
  input_method TEXT DEFAULT 'manual' CHECK(input_method IN ('manual', 'ai', 'hybrid')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (health_log_id) REFERENCES health_logs(id) ON DELETE CASCADE
);

-- 2. データをコピー
INSERT INTO meals_new SELECT * FROM meals;

-- 3. 古いテーブルを削除
DROP TABLE meals;

-- 4. 新しいテーブルをリネーム
ALTER TABLE meals_new RENAME TO meals;

-- 5. meal_photosの外部キー制約を再確認（自動的に維持される）
-- SQLiteは外部キーを自動的に再接続します
