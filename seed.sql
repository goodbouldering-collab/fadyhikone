-- Test users
INSERT OR IGNORE INTO users (email, name, auth_provider, auth_provider_id, role) VALUES 
  ('admin@furdi.jp', '管理者', 'google', 'google_admin_123', 'admin'),
  ('test.user@example.com', 'テストユーザー', 'google', 'google_user_456', 'user'),
  ('line.user@example.com', 'LINEユーザー', 'line', 'line_user_789', 'user');

-- Test health logs
INSERT OR IGNORE INTO health_logs (user_id, log_date, weight, body_fat_percentage, body_temperature, sleep_hours, meal_calories, meal_protein, meal_carbs, meal_fat, exercise_minutes, condition_note) VALUES 
  (2, '2025-01-05', 65.5, 22.3, 36.5, 7.5, 1800, 80, 200, 50, 45, '体調良好'),
  (2, '2025-01-06', 65.3, 22.1, 36.6, 7.0, 1750, 75, 190, 48, 60, '少し疲れ気味'),
  (2, '2025-01-07', 65.1, 22.0, 36.5, 8.0, 1820, 85, 195, 52, 30, '快調'),
  (3, '2025-01-05', 58.2, 25.5, 36.4, 6.5, 1600, 65, 180, 45, 30, '普通'),
  (3, '2025-01-06', 58.0, 25.3, 36.5, 7.0, 1650, 70, 185, 47, 45, '良好');

-- Test staff advices
INSERT OR IGNORE INTO advices (user_id, staff_name, advice_type, title, content) VALUES 
  (2, '山田トレーナー', 'exercise', '運動強度を上げましょう', 'ここ3日間、順調に体重が減少していますね！次は運動強度を少し上げて、筋力トレーニングを増やすことをお勧めします。'),
  (2, '佐藤栄養士', 'diet', 'タンパク質摂取を増やしましょう', '体脂肪率も順調に下がっていますが、タンパク質の摂取量が目標より少し低めです。1日あたり90g以上を目指しましょう。'),
  (3, '鈴木トレーナー', 'general', '睡眠時間を確保しましょう', '睡眠時間が少し短めです。回復のために7〜8時間の睡眠を心がけてください。');

-- Test inquiries
INSERT OR IGNORE INTO inquiries (name, email, phone, subject, message, status) VALUES 
  ('田中太郎', 'tanaka@example.com', '090-1234-5678', '体験レッスンについて', '体験レッスンの予約をしたいのですが、空き状況を教えていただけますか？', 'pending'),
  ('佐藤花子', 'sato@example.com', '080-9876-5432', '料金プランについて', '月額プランと年間プランの違いについて詳しく教えてください。', 'replied');
