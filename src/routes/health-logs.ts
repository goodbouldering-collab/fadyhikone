import { Hono } from 'hono';
import type { Bindings, HealthLog, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

const healthLogs = new Hono<{ Bindings: Bindings }>();

// 認証ミドルウェア
healthLogs.use('*', async (c, next) => {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) {
    return c.json<ApiResponse>({ success: false, error: '認証が必要です' }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json<ApiResponse>({ success: false, error: 'トークンが無効です' }, 401);
  }

  c.set('userId', payload.userId);
  c.set('userRole', payload.role);
  await next();
});

// 健康ログ一覧取得
healthLogs.get('/', async (c) => {
  try {
    const userId = c.get('userId');
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

// 健康ログ作成
healthLogs.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const result = await c.env.DB.prepare(`
      INSERT INTO health_logs (
        user_id, log_date, weight, body_fat_percentage, body_temperature,
        sleep_hours, meal_calories, meal_protein, meal_carbs, meal_fat,
        exercise_minutes, condition_rating, condition_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      body.log_date,
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
      body.condition_note || null
    ).run();

    const newLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ?'
    ).bind(result.meta.last_row_id).first<HealthLog>();

    return c.json<ApiResponse<HealthLog>>({
      success: true,
      data: newLog as HealthLog,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'ログの作成に失敗しました' }, 500);
  }
});

// 食事写真アップロード&AI解析
healthLogs.post('/upload-meal', async (c) => {
  try {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('photo') as File;
    const logDate = formData.get('log_date') as string;

    if (!file) {
      return c.json<ApiResponse>({ success: false, error: '写真が提供されていません' }, 400);
    }

    // R2にアップロード
    const filename = `meals/${userId}/${Date.now()}-${file.name}`;
    await c.env.BUCKET.put(filename, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // モックAI解析結果
    const mockAnalysis = {
      食材: ['ご飯', '鶏胸肉', 'ブロッコリー', 'トマト'],
      カロリー: 450,
      タンパク質: 35,
      炭水化物: 52,
      脂質: 8,
      評価: '高タンパク低脂質で素晴らしいバランスです！',
    };

    // 健康ログを更新または作成
    const existingLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE user_id = ? AND log_date = ?'
    ).bind(userId, logDate).first<HealthLog>();

    if (existingLog) {
      await c.env.DB.prepare(`
        UPDATE health_logs SET
          meal_photo_url = ?,
          meal_analysis = ?,
          meal_calories = ?,
          meal_protein = ?,
          meal_carbs = ?,
          meal_fat = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        filename,
        JSON.stringify(mockAnalysis),
        mockAnalysis.カロリー,
        mockAnalysis.タンパク質,
        mockAnalysis.炭水化物,
        mockAnalysis.脂質,
        existingLog.id
      ).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO health_logs (
          user_id, log_date, meal_photo_url, meal_analysis,
          meal_calories, meal_protein, meal_carbs, meal_fat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        logDate,
        filename,
        JSON.stringify(mockAnalysis),
        mockAnalysis.カロリー,
        mockAnalysis.タンパク質,
        mockAnalysis.炭水化物,
        mockAnalysis.脂質
      ).run();
    }

    return c.json<ApiResponse<{ analysis: any; photoUrl: string }>>({
      success: true,
      data: {
        analysis: mockAnalysis,
        photoUrl: `/api/images/${filename}`,
      },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '写真のアップロードに失敗しました' }, 500);
  }
});

// 健康ログ更新
healthLogs.put('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const logId = c.req.param('id');
    const body = await c.req.json();

    // ログの所有権確認
    const log = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ? AND user_id = ?'
    ).bind(logId, userId).first<HealthLog>();

    if (!log) {
      return c.json<ApiResponse>({ success: false, error: 'ログが見つかりません' }, 404);
    }

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

// 健康ログ削除
healthLogs.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const logId = c.req.param('id');

    // ログの所有権確認
    const log = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ? AND user_id = ?'
    ).bind(logId, userId).first<HealthLog>();

    if (!log) {
      return c.json<ApiResponse>({ success: false, error: 'ログが見つかりません' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM health_logs WHERE id = ?').bind(logId).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'ログを削除しました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'ログの削除に失敗しました' }, 500);
  }
});

export default healthLogs;
