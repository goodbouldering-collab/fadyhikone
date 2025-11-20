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

-- Test health logs - 最近のデータ（2025年11月）
-- 管理者（ID: 1）の健康記録サンプル
INSERT OR IGNORE INTO health_logs (id, user_id, log_date, weight, body_fat_percentage, body_temperature, sleep_hours, exercise_minutes, condition_rating, condition_note) VALUES 
  (1, 1, '2025-11-10', 70.5, 18.8, 36.5, 6.5, 40, 3, '少し疲れ気味'),
  (2, 1, '2025-11-11', 70.3, 18.7, 36.6, 7.0, 50, 4, '回復傾向'),
  (3, 1, '2025-11-12', 70.0, 18.6, 36.5, 7.5, 60, 4, '順調'),
  (4, 1, '2025-11-13', 69.8, 18.5, 36.6, 7.0, 55, 4, '良好'),
  (5, 1, '2025-11-14', 69.6, 18.4, 36.5, 8.0, 65, 5, '気分爽快'),
  (6, 1, '2025-11-15', 69.4, 18.3, 36.5, 7.5, 60, 4, '快調'),
  (7, 1, '2025-11-16', 69.2, 18.2, 36.6, 7.0, 50, 4, '安定'),
  (8, 1, '2025-11-17', 69.0, 18.1, 36.5, 7.5, 55, 5, '最高'),
  (9, 1, '2025-11-18', 68.8, 18.0, 36.6, 7.0, 60, 4, '良好'),
  (10, 1, '2025-11-19', 68.7, 17.9, 36.5, 8.0, 65, 5, '絶好調'),
  (11, 1, '2025-11-20', 68.5, 17.8, 36.6, 7.5, 55, 5, '最高の調子');

-- テストユーザーの健康記録
INSERT OR IGNORE INTO health_logs (id, user_id, log_date, weight, body_fat_percentage, body_temperature, sleep_hours, exercise_minutes, condition_rating, condition_note) VALUES 
  (12, 2, '2025-11-15', 65.5, 22.3, 36.5, 7.5, 45, 4, '体調良好'),
  (13, 2, '2025-11-16', 65.3, 22.1, 36.6, 7.0, 60, 3, '少し疲れ気味'),
  (14, 2, '2025-11-17', 65.1, 22.0, 36.5, 8.0, 30, 4, '快調'),
  (15, 3, '2025-11-15', 58.2, 25.5, 36.4, 6.5, 30, 3, '普通'),
  (16, 3, '2025-11-16', 58.0, 25.3, 36.5, 7.0, 45, 4, '良好');

-- Test meals (health_log_idを使用)
INSERT OR IGNORE INTO meals (health_log_id, meal_type, calories, protein, carbs, fat) VALUES 
  -- 管理者の食事記録（11月10日〜20日）
  (1, 'breakfast', 450, 25, 50, 15),
  (1, 'lunch', 650, 35, 70, 20),
  (1, 'dinner', 550, 30, 60, 18),
  (2, 'breakfast', 470, 26, 52, 16),
  (2, 'lunch', 670, 37, 72, 22),
  (2, 'dinner', 530, 29, 59, 17),
  (3, 'breakfast', 460, 24, 50, 15),
  (3, 'lunch', 660, 36, 70, 21),
  (3, 'dinner', 540, 29, 60, 17),
  (4, 'breakfast', 480, 26, 52, 16),
  (4, 'lunch', 620, 34, 68, 18),
  (4, 'dinner', 520, 28, 58, 16),
  (5, 'breakfast', 440, 23, 49, 14),
  (5, 'lunch', 640, 35, 69, 19),
  (5, 'dinner', 560, 31, 61, 19),
  (6, 'breakfast', 450, 25, 50, 15),
  (6, 'lunch', 650, 35, 70, 20),
  (6, 'dinner', 550, 30, 60, 18),
  (7, 'breakfast', 470, 26, 51, 15),
  (7, 'lunch', 670, 37, 71, 22),
  (7, 'dinner', 530, 29, 59, 17),
  (8, 'breakfast', 480, 26, 52, 16),
  (8, 'lunch', 620, 34, 68, 18),
  (8, 'dinner', 520, 28, 58, 16),
  (9, 'breakfast', 460, 24, 50, 15),
  (9, 'lunch', 660, 36, 70, 21),
  (9, 'dinner', 540, 29, 60, 17),
  (10, 'breakfast', 440, 23, 49, 14),
  (10, 'lunch', 640, 35, 69, 19),
  (10, 'dinner', 560, 31, 61, 19),
  (11, 'breakfast', 470, 25, 51, 15),
  (11, 'lunch', 670, 37, 71, 22),
  (11, 'dinner', 530, 29, 59, 17),
  -- テストユーザーの食事記録
  (12, 'breakfast', 550, 25, 65, 15),
  (12, 'lunch', 750, 35, 80, 20),
  (12, 'dinner', 500, 20, 55, 15),
  (13, 'breakfast', 530, 24, 62, 14),
  (13, 'lunch', 720, 33, 78, 19),
  (13, 'dinner', 500, 18, 50, 15),
  (15, 'breakfast', 500, 20, 60, 12),
  (15, 'lunch', 650, 28, 70, 18),
  (15, 'dinner', 450, 17, 50, 15),
  (16, 'breakfast', 520, 22, 62, 13),
  (16, 'lunch', 680, 30, 72, 19),
  (16, 'dinner', 450, 18, 51, 15);

-- Test staff advices
INSERT OR IGNORE INTO advices (user_id, staff_name, advice_type, title, content, log_date) VALUES 
  (1, '山田トレーナー', 'exercise', '素晴らしい進捗です！', '11月は体重が順調に減少していますね！この調子で継続しましょう。', '2025-11-20'),
  (2, '山田トレーナー', 'exercise', '運動強度を上げましょう', 'ここ3日間、順調に体重が減少していますね！次は運動強度を少し上げて、筋力トレーニングを増やすことをお勧めします。', '2025-11-16'),
  (2, '佐藤栄養士', 'diet', 'タンパク質摂取を増やしましょう', '体脂肪率も順調に下がっていますが、タンパク質の摂取量が目標より少し低めです。1日あたり90g以上を目指しましょう。', '2025-11-15'),
  (3, '鈴木トレーナー', 'general', '睡眠時間を確保しましょう', '睡眠時間が少し短めです。回復のために7〜8時間の睡眠を心がけてください。', '2025-11-15');

-- Test inquiries
INSERT OR IGNORE INTO inquiries (name, email, phone, subject, message, status) VALUES 
  ('田中太郎', 'tanaka@example.com', '090-1234-5678', '体験レッスンについて', '体験レッスンの予約をしたいのですが、空き状況を教えていただけますか？', 'pending'),
  ('佐藤花子', 'sato@example.com', '080-9876-5432', '料金プランについて', '月額プランと年間プランの違いについて詳しく教えてください。', 'replied');

-- Test announcements
INSERT OR IGNORE INTO announcements (title, content) VALUES 
  ('年末キャンペーン開催中！', '12月末まで入会金無料キャンペーンを実施しています。この機会にぜひご入会ください。'),
  ('冬季営業時間のお知らせ', '12月〜2月は営業時間が変更となります。詳細はスタッフまでお問い合わせください。');
