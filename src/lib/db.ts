import type { D1Database } from '@cloudflare/workers-types';
import type { User, HealthLog, StaffAdvice, Inquiry } from '../types';

// ユーザー作成または更新
export async function upsertUser(
  db: D1Database,
  provider: 'google' | 'line',
  providerId: string,
  email: string,
  name: string,
  avatarUrl?: string
): Promise<User> {
  // 既存ユーザーチェック
  const existingUser = await db
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?')
    .bind(provider, providerId)
    .first<User>();

  if (existingUser) {
    // 更新
    await db
      .prepare(
        'UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .bind(email, name, avatarUrl, existingUser.id)
      .run();

    return {
      ...existingUser,
      email,
      name,
      avatar_url: avatarUrl,
    };
  } else {
    // 新規作成
    const result = await db
      .prepare(
        'INSERT INTO users (email, name, provider, provider_id, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(email, name, provider, providerId, avatarUrl, 'user')
      .run();

    const newUser = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<User>();

    return newUser!;
  }
}

// ユーザー取得
export async function getUser(db: D1Database, userId: number): Promise<User | null> {
  return await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>();
}

// 健康ログ作成
export async function createHealthLog(
  db: D1Database,
  userId: number,
  data: Partial<HealthLog>
): Promise<HealthLog> {
  const result = await db
    .prepare(
      `INSERT INTO health_logs (
        user_id, log_date, weight, body_fat_percentage, muscle_mass,
        meal_type, meal_description, meal_image_url,
        exercise_type, exercise_duration, sleep_hours, mood, notes, ai_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      userId,
      data.log_date || new Date().toISOString().split('T')[0],
      data.weight || null,
      data.body_fat_percentage || null,
      data.muscle_mass || null,
      data.meal_type || null,
      data.meal_description || null,
      data.meal_image_url || null,
      data.exercise_type || null,
      data.exercise_duration || null,
      data.sleep_hours || null,
      data.mood || null,
      data.notes || null,
      data.ai_analysis || null
    )
    .run();

  const log = await db
    .prepare('SELECT * FROM health_logs WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<HealthLog>();

  return log!;
}

// 健康ログ取得（ユーザー別）
export async function getHealthLogs(
  db: D1Database,
  userId: number,
  limit: number = 30
): Promise<HealthLog[]> {
  const { results } = await db
    .prepare('SELECT * FROM health_logs WHERE user_id = ? ORDER BY log_date DESC, created_at DESC LIMIT ?')
    .bind(userId, limit)
    .all<HealthLog>();

  return results;
}

// 健康ログ更新
export async function updateHealthLog(
  db: D1Database,
  logId: number,
  userId: number,
  data: Partial<HealthLog>
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.weight !== undefined) {
    fields.push('weight = ?');
    values.push(data.weight);
  }
  if (data.body_fat_percentage !== undefined) {
    fields.push('body_fat_percentage = ?');
    values.push(data.body_fat_percentage);
  }
  if (data.muscle_mass !== undefined) {
    fields.push('muscle_mass = ?');
    values.push(data.muscle_mass);
  }
  if (data.meal_type !== undefined) {
    fields.push('meal_type = ?');
    values.push(data.meal_type);
  }
  if (data.meal_description !== undefined) {
    fields.push('meal_description = ?');
    values.push(data.meal_description);
  }
  if (data.meal_image_url !== undefined) {
    fields.push('meal_image_url = ?');
    values.push(data.meal_image_url);
  }
  if (data.exercise_type !== undefined) {
    fields.push('exercise_type = ?');
    values.push(data.exercise_type);
  }
  if (data.exercise_duration !== undefined) {
    fields.push('exercise_duration = ?');
    values.push(data.exercise_duration);
  }
  if (data.sleep_hours !== undefined) {
    fields.push('sleep_hours = ?');
    values.push(data.sleep_hours);
  }
  if (data.mood !== undefined) {
    fields.push('mood = ?');
    values.push(data.mood);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes);
  }
  if (data.ai_analysis !== undefined) {
    fields.push('ai_analysis = ?');
    values.push(data.ai_analysis);
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(logId, userId);

  const query = `UPDATE health_logs SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
  const result = await db.prepare(query).bind(...values).run();

  return result.success;
}

// スタッフアドバイス取得
export async function getStaffAdvices(
  db: D1Database,
  userId: number,
  limit: number = 10
): Promise<StaffAdvice[]> {
  const { results } = await db
    .prepare('SELECT * FROM staff_advices WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .bind(userId, limit)
    .all<StaffAdvice>();

  return results;
}

// スタッフアドバイス作成（管理者用）
export async function createStaffAdvice(
  db: D1Database,
  userId: number,
  staffName: string,
  adviceText: string,
  adviceType: 'diet' | 'exercise' | 'lifestyle' | 'general'
): Promise<StaffAdvice> {
  const result = await db
    .prepare(
      'INSERT INTO staff_advices (user_id, staff_name, advice_text, advice_type) VALUES (?, ?, ?, ?)'
    )
    .bind(userId, staffName, adviceText, adviceType)
    .run();

  const advice = await db
    .prepare('SELECT * FROM staff_advices WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<StaffAdvice>();

  return advice!;
}

// アドバイス既読マーク
export async function markAdviceAsRead(
  db: D1Database,
  adviceId: number,
  userId: number
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE staff_advices SET is_read = 1 WHERE id = ? AND user_id = ?')
    .bind(adviceId, userId)
    .run();

  return result.success;
}

// 問い合わせ作成
export async function createInquiry(
  db: D1Database,
  data: {
    userId?: number;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }
): Promise<Inquiry> {
  const result = await db
    .prepare(
      'INSERT INTO inquiries (user_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(data.userId || null, data.name, data.email, data.phone || null, data.subject, data.message)
    .run();

  const inquiry = await db
    .prepare('SELECT * FROM inquiries WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<Inquiry>();

  return inquiry!;
}

// 全ユーザー取得（管理者用）
export async function getAllUsers(db: D1Database): Promise<User[]> {
  const { results } = await db
    .prepare('SELECT * FROM users ORDER BY created_at DESC')
    .all<User>();

  return results;
}

// 全問い合わせ取得（管理者用）
export async function getAllInquiries(db: D1Database): Promise<Inquiry[]> {
  const { results } = await db
    .prepare('SELECT * FROM inquiries ORDER BY created_at DESC')
    .all<Inquiry>();

  return results;
}

// 問い合わせステータス更新（管理者用）
export async function updateInquiryStatus(
  db: D1Database,
  inquiryId: number,
  status: 'pending' | 'in_progress' | 'resolved'
): Promise<boolean> {
  const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

  const result = await db
    .prepare('UPDATE inquiries SET status = ?, resolved_at = ? WHERE id = ?')
    .bind(status, resolvedAt, inquiryId)
    .run();

  return result.success;
}
