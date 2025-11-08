-- Users table (顧客情報)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  auth_provider TEXT NOT NULL, -- 'google' or 'line'
  auth_provider_id TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Health logs table (健康ログ)
CREATE TABLE IF NOT EXISTS health_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  log_date DATE NOT NULL,
  weight REAL, -- 体重 (kg)
  body_fat_percentage REAL, -- 体脂肪率 (%)
  body_temperature REAL, -- 体温 (℃)
  sleep_hours REAL, -- 睡眠時間 (時間)
  meal_photo_url TEXT, -- 食事写真URL
  meal_analysis TEXT, -- AI解析結果 (JSON)
  meal_calories INTEGER, -- カロリー
  meal_protein REAL, -- タンパク質 (g)
  meal_carbs REAL, -- 炭水化物 (g)
  meal_fat REAL, -- 脂質 (g)
  exercise_minutes INTEGER, -- 運動時間 (分)
  condition_note TEXT, -- 体調メモ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Staff advices table (スタッフアドバイス)
CREATE TABLE IF NOT EXISTS advices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  staff_name TEXT NOT NULL,
  advice_type TEXT NOT NULL, -- 'diet', 'exercise', 'general'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Inquiries table (問い合わせ)
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'replied', 'closed'
  admin_reply TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_log_date ON health_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_advices_user_id ON advices(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
