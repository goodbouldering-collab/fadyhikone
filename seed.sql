-- Test users
-- 管理者アカウント（メール: admin@furdi.jp, パスワード: admin123）
-- auth_provider_id は SHA-256('admin123')
-- Google Quick Login用の管理者アカウントも追加（ID: 1）
INSERT OR IGNORE INTO users (id, email, name, auth_provider, auth_provider_id, avatar_url, role) VALUES 
  (1, 'admin@furdi.jp', '管理者', 'google', 'admin-quick-login', 'https://ui-avatars.com/api/?name=Admin&background=FF6B9D&color=fff', 'admin');

-- その他のテストユーザー
INSERT OR IGNORE INTO users (email, name, auth_provider, auth_provider_id, role) VALUES 
  ('test.user@example.com', 'テストユーザー', 'google', 'google_user_456', 'user'),
  ('line.user@example.com', 'LINEユーザー', 'line', 'line_user_789', 'user');

-- Test health logs
-- 管理者（ID: 1）の健康記録サンプル（health_log IDは1,2,3となる想定）
INSERT OR IGNORE INTO health_logs (id, user_id, log_date, weight, body_fat_percentage, body_temperature, sleep_hours, exercise_minutes, condition_rating, condition_note) VALUES 
  (1, 1, '2025-01-01', 70.0, 18.5, 36.5, 7.0, 60, 4, '年始スタート'),
  (2, 1, '2025-01-02', 69.8, 18.4, 36.6, 7.5, 45, 4, '順調'),
  (3, 1, '2025-01-03', 69.5, 18.3, 36.5, 8.0, 75, 5, '気分爽快');

-- テストユーザーの健康記録（health_log IDは4,5,6,7,8となる想定）
INSERT OR IGNORE INTO health_logs (id, user_id, log_date, weight, body_fat_percentage, body_temperature, sleep_hours, exercise_minutes, condition_rating, condition_note) VALUES 
  (4, 2, '2025-01-05', 65.5, 22.3, 36.5, 7.5, 45, 4, '体調良好'),
  (5, 2, '2025-01-06', 65.3, 22.1, 36.6, 7.0, 60, 3, '少し疲れ気味'),
  (6, 2, '2025-01-07', 65.1, 22.0, 36.5, 8.0, 30, 4, '快調'),
  (7, 3, '2025-01-05', 58.2, 25.5, 36.4, 6.5, 30, 3, '普通'),
  (8, 3, '2025-01-06', 58.0, 25.3, 36.5, 7.0, 45, 4, '良好');

-- Test meals (health_log_idを使用)
INSERT OR IGNORE INTO meals (health_log_id, meal_type, calories, protein, carbs, fat) VALUES 
  (1, 'breakfast', 600, 30, 70, 18),
  (1, 'lunch', 800, 40, 90, 24),
  (1, 'dinner', 600, 30, 60, 18),
  (2, 'breakfast', 580, 28, 68, 17),
  (2, 'lunch', 770, 38, 85, 22),
  (2, 'dinner', 600, 29, 57, 19),
  (4, 'breakfast', 550, 25, 65, 15),
  (4, 'lunch', 750, 35, 80, 20),
  (4, 'dinner', 500, 20, 55, 15),
  (5, 'breakfast', 530, 24, 62, 14),
  (5, 'lunch', 720, 33, 78, 19),
  (5, 'dinner', 500, 18, 50, 15),
  (7, 'breakfast', 500, 20, 60, 12),
  (7, 'lunch', 650, 28, 70, 18),
  (7, 'dinner', 450, 17, 50, 15),
  (8, 'breakfast', 520, 22, 62, 13),
  (8, 'lunch', 680, 30, 72, 19),
  (8, 'dinner', 450, 18, 51, 15);

-- Test staff advices
INSERT OR IGNORE INTO advices (user_id, staff_name, advice_type, title, content) VALUES 
  (2, '山田トレーナー', 'exercise', '運動強度を上げましょう', 'ここ3日間、順調に体重が減少していますね！次は運動強度を少し上げて、筋力トレーニングを増やすことをお勧めします。'),
  (2, '佐藤栄養士', 'diet', 'タンパク質摂取を増やしましょう', '体脂肪率も順調に下がっていますが、タンパク質の摂取量が目標より少し低めです。1日あたり90g以上を目指しましょう。'),
  (3, '鈴木トレーナー', 'general', '睡眠時間を確保しましょう', '睡眠時間が少し短めです。回復のために7〜8時間の睡眠を心がけてください。');

-- Test inquiries
INSERT OR IGNORE INTO inquiries (name, email, phone, subject, message, status) VALUES 
  ('田中太郎', 'tanaka@example.com', '090-1234-5678', '体験レッスンについて', '体験レッスンの予約をしたいのですが、空き状況を教えていただけますか？', 'pending'),
  ('佐藤花子', 'sato@example.com', '080-9876-5432', '料金プランについて', '月額プランと年間プランの違いについて詳しく教えてください。', 'replied');
