-- テストユーザー挿入
INSERT OR IGNORE INTO users (id, email, name, provider, provider_id, role, avatar_url) VALUES 
  (1, 'admin@furdi-hikone.jp', '管理者', 'google', 'google_admin_001', 'admin', 'https://via.placeholder.com/150'),
  (2, 'user1@example.com', '山田花子', 'google', 'google_user_001', 'user', 'https://via.placeholder.com/150'),
  (3, 'user2@example.com', '佐藤太郎', 'line', 'line_user_001', 'user', 'https://via.placeholder.com/150'),
  (4, 'user3@example.com', '鈴木美咲', 'google', 'google_user_002', 'user', 'https://via.placeholder.com/150');

-- テスト健康ログ挿入
INSERT OR IGNORE INTO health_logs (user_id, log_date, weight, body_fat_percentage, muscle_mass, meal_type, meal_description, exercise_type, exercise_duration, sleep_hours, mood, notes, ai_analysis) VALUES 
  (2, date('now'), 58.5, 22.3, 42.1, 'breakfast', '納豆ご飯、味噌汁、焼き魚', 'ジョギング', 30, 7.5, 'good', '朝から調子良い', 'バランスの取れた朝食です。タンパク質が豊富で運動との相性も良好です。'),
  (2, date('now', '-1 day'), 58.7, 22.5, 42.0, 'lunch', 'グリルチキンサラダ', 'ウォーキング', 20, 7.0, 'normal', '仕事忙しかった', '低カロリーで健康的な選択です。もう少し炭水化物を摂取しても良いでしょう。'),
  (2, date('now', '-2 days'), 59.0, 22.8, 41.8, 'dinner', 'パスタカルボナーラ', NULL, NULL, 6.5, 'normal', '夜遅くまで起きていた', 'カロリーが高めです。夕食は軽めにして睡眠時間を確保しましょう。'),
  (3, date('now'), 72.3, 18.5, 58.2, 'breakfast', 'プロテインシェイク、バナナ', '筋トレ', 45, 8.0, 'excellent', 'ジムで良いトレーニングできた', 'トレーニング前の栄養補給として最適です。筋肉の成長に効果的です。'),
  (3, date('now', '-1 day'), 72.5, 18.7, 58.0, 'lunch', '牛丼大盛り', 'ウォーキング', 15, 7.5, 'good', '昼食後眠くなった', '炭水化物が多めです。午後のパフォーマンスを考えると野菜を追加すると良いでしょう。'),
  (4, date('now'), 54.2, 24.5, 38.5, 'breakfast', 'ヨーグルト、グラノーラ', 'ヨガ', 30, 7.0, 'good', 'リラックスできた', '軽めの朝食で良いスタートです。ヨガとの相性も抜群です。'),
  (4, date('now', '-1 day'), 54.5, 24.7, 38.3, 'dinner', '焼き肉定食', NULL, NULL, 6.0, 'normal', '友達と食事', 'タンパク質が豊富で良いですが、夜遅い時間の場合は量を控えめにしましょう。');

-- テストスタッフアドバイス挿入
INSERT OR IGNORE INTO staff_advices (user_id, staff_name, advice_text, advice_type, is_read) VALUES 
  (2, 'トレーナー田中', '体重が順調に減少していますね！この調子で継続しましょう。ただし、睡眠時間が少し短めなので、7.5時間以上を目指してください。', 'lifestyle', 0),
  (2, '栄養士佐々木', '朝食のバランスが素晴らしいです。昼食も同様に野菜を多めに摂取すると更に良くなります。', 'diet', 1),
  (3, 'トレーナー田中', '筋トレの成果が数値に表れています！タンパク質の摂取量も適切です。引き続き週3-4回のトレーニングを継続しましょう。', 'exercise', 0),
  (4, '栄養士佐々木', 'ヨガと軽めの食事の組み合わせは理想的です。夕食のタイミングを少し早めにすると睡眠の質が向上します。', 'lifestyle', 1);

-- テスト問い合わせ挿入
INSERT OR IGNORE INTO inquiries (user_id, name, email, phone, subject, message, status) VALUES 
  (2, '山田花子', 'user1@example.com', '090-1234-5678', '食事プランについて', 'ベジタリアン向けの食事プランはありますか？', 'pending'),
  (3, '佐藤太郎', 'user2@example.com', '080-2345-6789', 'トレーニング時間の変更', '平日夜のトレーニング予約を週末に変更したいです。', 'in_progress'),
  (NULL, '高橋春子', 'takahashi@example.com', '070-3456-7890', '入会について', '体験トレーニングは可能でしょうか？料金も教えてください。', 'pending');
