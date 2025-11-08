-- Announcements table (お知らせ)
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

-- Staff comments table (スタッフコメント)
CREATE TABLE IF NOT EXISTS staff_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  staff_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table (管理設定)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_staff_comments_user_id ON staff_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);

-- Insert default settings
INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES 
  ('site_name', 'ファディー彦根', 'サイト名'),
  ('contact_email', 'info@furdi-hikone.jp', '問い合わせ先メールアドレス'),
  ('google_oauth_client_id', '', 'Google OAuth クライアントID'),
  ('line_channel_id', '', 'LINE ログイン チャネルID'),
  ('openai_api_key', '', 'OpenAI API キー（食事解析用）');
