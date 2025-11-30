import { Hono } from 'hono';
import type { Bindings, Advice, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

const advices = new Hono<{ Bindings: Bindings }>();

// 認証ミドルウェア
advices.use('*', async (c, next) => {
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

// アドバイス一覧取得
advices.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const adviceList = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<Advice>();

    return c.json<ApiResponse<Advice[]>>({
      success: true,
      data: adviceList.results,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの取得に失敗しました' }, 500);
  }
});

// 日付別アドバイス取得
advices.get('/by-date/:date', async (c) => {
  try {
    const userId = c.get('userId');
    const date = c.req.param('date');
    
    const adviceList = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE user_id = ? AND log_date = ? ORDER BY advice_source ASC, created_at DESC'
    ).bind(userId, date).all<Advice>();

    return c.json<ApiResponse<Advice[]>>({
      success: true,
      data: adviceList.results,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの取得に失敗しました' }, 500);
  }
});

// 未読カウント取得
advices.get('/unread-count', async (c) => {
  try {
    const userId = c.get('userId');
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM advices WHERE user_id = ? AND is_read = 0'
    ).bind(userId).first<{ count: number }>();

    return c.json<ApiResponse<{ count: number }>>({
      success: true,
      data: { count: result?.count || 0 },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '未読カウントの取得に失敗しました' }, 500);
  }
});

// アドバイスを既読にする
advices.put('/:id/read', async (c) => {
  try {
    const userId = c.get('userId');
    const adviceId = c.req.param('id');

    // アドバイスの所有権確認
    const advice = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE id = ? AND user_id = ?'
    ).bind(adviceId, userId).first<Advice>();

    if (!advice) {
      return c.json<ApiResponse>({ success: false, error: 'アドバイスが見つかりません' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE advices SET is_read = 1 WHERE id = ?'
    ).bind(adviceId).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'アドバイスを既読にしました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの更新に失敗しました' }, 500);
  }
});

// すべてのアドバイスを既読にする
advices.put('/mark-all-read', async (c) => {
  try {
    const userId = c.get('userId');
    
    await c.env.DB.prepare(
      'UPDATE advices SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(userId).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'すべてのアドバイスを既読にしました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの更新に失敗しました' }, 500);
  }
});

// アドバイスを編集する
advices.put('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const adviceId = c.req.param('id');
    const body = await c.req.json<{ title?: string; content?: string }>();

    // アドバイスの所有権確認
    const advice = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE id = ? AND user_id = ?'
    ).bind(adviceId, userId).first<Advice>();

    if (!advice) {
      return c.json<ApiResponse>({ success: false, error: 'アドバイスが見つかりません' }, 404);
    }

    // 更新するフィールドを構築
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.content !== undefined) {
      updates.push('content = ?');
      values.push(body.content);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>({ success: false, error: '更新するデータがありません' }, 400);
    }

    values.push(adviceId);

    await c.env.DB.prepare(
      `UPDATE advices SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // 更新後のデータを取得
    const updatedAdvice = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE id = ?'
    ).bind(adviceId).first<Advice>();

    return c.json<ApiResponse<Advice>>({
      success: true,
      data: updatedAdvice!,
      message: 'アドバイスを更新しました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの更新に失敗しました' }, 500);
  }
});

// アドバイスを削除する
advices.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const adviceId = c.req.param('id');

    // アドバイスの所有権確認
    const advice = await c.env.DB.prepare(
      'SELECT * FROM advices WHERE id = ? AND user_id = ?'
    ).bind(adviceId, userId).first<Advice>();

    if (!advice) {
      return c.json<ApiResponse>({ success: false, error: 'アドバイスが見つかりません' }, 404);
    }

    await c.env.DB.prepare(
      'DELETE FROM advices WHERE id = ?'
    ).bind(adviceId).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'アドバイスを削除しました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'アドバイスの削除に失敗しました' }, 500);
  }
});

export default advices;
