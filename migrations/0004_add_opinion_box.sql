-- Opinion Box table for Q&A between users and admins
CREATE TABLE IF NOT EXISTS opinion_box (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'answered')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered_at DATETIME,
  answered_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_opinion_box_user_id ON opinion_box(user_id);
CREATE INDEX IF NOT EXISTS idx_opinion_box_status ON opinion_box(status);
CREATE INDEX IF NOT EXISTS idx_opinion_box_created_at ON opinion_box(created_at DESC);
