-- Add exercise activities table to store detailed exercise records
-- Each health log can have multiple exercise activities

CREATE TABLE IF NOT EXISTS exercise_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_log_id INTEGER NOT NULL,
  
  -- 運動種目の詳細
  exercise_type TEXT NOT NULL, -- 'walking', 'jogging', 'cycling', 'swimming', 'strength', 'yoga', 'other'
  exercise_name TEXT, -- 運動名（例: 「ランニング」「腕立て伏せ」）
  duration_minutes INTEGER DEFAULT 0, -- 運動時間（分）
  intensity TEXT, -- 'low', 'medium', 'high'
  
  -- 詳細データ
  distance REAL, -- 距離（km）
  calories_burned INTEGER, -- 消費カロリー
  sets INTEGER, -- セット数（筋トレの場合）
  reps INTEGER, -- 回数（筋トレの場合）
  notes TEXT, -- メモ
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (health_log_id) REFERENCES health_logs(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_exercise_activities_health_log_id 
ON exercise_activities(health_log_id);
