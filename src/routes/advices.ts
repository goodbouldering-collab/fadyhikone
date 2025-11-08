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

export default advices;
