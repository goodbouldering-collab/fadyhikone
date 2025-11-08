import { Hono } from 'hono';
import type { Bindings, User, HealthLog, Advice, Inquiry, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

const admin = new Hono<{ Bindings: Bindings }>();

// 管理者認証ミドルウェア
admin.use('*', async (c, next) => {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) {
    return c.json<ApiResponse>({ success: false, error: '認証が必要です' }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return c.json<ApiResponse>({ success: false, error: '管理者権限が必要です' }, 403);
  }

  c.set('userId', payload.userId);
  c.set('userRole', payload.role);
  await next();
});

// 全顧客一覧取得
admin.get('/users', async (c) => {
  try {
    const search = c.req.query('search') || '';
    
    let query = 'SELECT * FROM users WHERE role = "user"';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const users = params.length > 0
      ? await c.env.DB.prepare(query).bind(...params).all<User>()
      : await c.env.DB.prepare(query).all<User>();

    return c.json<ApiResponse<User[]>>({
      success: true,
      data: users.results,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'ユーザーの取得に失敗しました' }, 500);
  }
});

// 特定顧客の健康ログ一覧取得
admin.get('/users/:userId/logs', async (c) => {
  try {
    const userId = c.req.param('userId');
    const logs = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE user_id = ? ORDER BY log_date DESC'
    ).bind(userId).all<HealthLog>();

    return c.json<ApiResponse<HealthLog[]>>({
      success: true,
      data: logs.results,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'ログの取得に失敗しました' }, 500);
  }
});

// 健康ログ更新 (管理者用)
admin.put('/logs/:logId', async (c) => {
  try {
    const logId = c.req.param('logId');
    const body = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE health_logs SET
        weight = ?, body_fat_percentage = ?, body_temperature = ?,
        sleep_hours = ?, meal_calories = ?, meal_protein = ?,
        meal_carbs = ?, meal_fat = ?, exercise_minutes = ?,
        condition_rating = ?, condition_note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.weight || null,
      body.body_fat_percentage || null,
      body.body_temperature || null,
      body.sleep_hours || null,
      body.meal_calories || null,
      body.meal_protein || null,
      body.meal_carbs || null,
      body.meal_fat || null,
      body.exercise_minutes || null,
      body.condition_rating || 3,
      body.condition_note || null,
      logId
    ).run();

    const updatedLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ?'
    ).bind(logId).first<HealthLog>();

    return c.json<ApiResponse<HealthLog>>({
      success: true,
      data: updatedLog as HealthLog,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'ログの更新に失敗しました' }, 500);
  }
});

// アドバイス作成 (管理者用)
admin.post('/advices', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.user_id || !body.staff_name || !body.advice_type || !body.title || !body.content) {
      return c.json<ApiResponse>({
        success: false,
        error: '必須項目が入力されていません',
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO advices (user_id, staff_name, advice_type, title, content)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      body.user_id,
      body.staff_name,
      body.advice_type,
      body.title,
      body.content
    ).run();

    const newAdvice = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE id = ?'
    ).bind(result.meta.last_row_id).first<Advice>();

    return c.json<ApiResponse<Advice>>({
      success: true,
      data: newAdvice as Advice,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの作成に失敗しました' }, 500);
  }
});

// アドバイス更新 (管理者用)
admin.put('/advices/:adviceId', async (c) => {
  try {
    const adviceId = c.req.param('adviceId');
    const body = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE advices SET
        staff_name = ?, advice_type = ?, title = ?, content = ?
      WHERE id = ?
    `).bind(
      body.staff_name,
      body.advice_type,
      body.title,
      body.content,
      adviceId
    ).run();

    const updatedAdvice = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE id = ?'
    ).bind(adviceId).first<Advice>();

    return c.json<ApiResponse<Advice>>({
      success: true,
      data: updatedAdvice as Advice,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの更新に失敗しました' }, 500);
  }
});

// アドバイス削除 (管理者用)
admin.delete('/advices/:adviceId', async (c) => {
  try {
    const adviceId = c.req.param('adviceId');
    await c.env.DB.prepare('DELETE FROM advices WHERE id = ?').bind(adviceId).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'アドバイスを削除しました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの削除に失敗しました' }, 500);
  }
});

// 問い合わせ一覧取得 (管理者用)
admin.get('/inquiries', async (c) => {
  try {
    const status = c.req.query('status') || '';
    
    let query = 'SELECT * FROM inquiries';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const inquiriesList = params.length > 0
      ? await c.env.DB.prepare(query).bind(...params).all<Inquiry>()
      : await c.env.DB.prepare(query).all<Inquiry>();

    return c.json<ApiResponse<Inquiry[]>>({
      success: true,
      data: inquiriesList.results,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '問い合わせの取得に失敗しました' }, 500);
  }
});

// 問い合わせ返信 (管理者用)
admin.put('/inquiries/:inquiryId', async (c) => {
  try {
    const inquiryId = c.req.param('inquiryId');
    const body = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE inquiries SET
        status = ?, admin_reply = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.status || 'replied',
      body.admin_reply,
      inquiryId
    ).run();

    const updatedInquiry = await c.env.DB.prepare(
      'SELECT * FROM inquiries WHERE id = ?'
    ).bind(inquiryId).first<Inquiry>();

    return c.json<ApiResponse<Inquiry>>({
      success: true,
      data: updatedInquiry as Inquiry,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '問い合わせの更新に失敗しました' }, 500);
  }
});

// 統計情報取得 (管理者用)
admin.get('/stats', async (c) => {
  try {
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "user"'
    ).first<{ count: number }>();

    const totalLogs = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM health_logs'
    ).first<{ count: number }>();

    const pendingInquiries = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM inquiries WHERE status = "pending"'
    ).first<{ count: number }>();

    const todayLogs = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM health_logs WHERE DATE(log_date) = DATE("now")'
    ).first<{ count: number }>();

    return c.json<ApiResponse>({
      success: true,
      data: {
        totalUsers: totalUsers?.count || 0,
        totalLogs: totalLogs?.count || 0,
        pendingInquiries: pendingInquiries?.count || 0,
        todayLogs: todayLogs?.count || 0,
      },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '統計情報の取得に失敗しました' }, 500);
  }
});

export default admin;
