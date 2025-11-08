import { Hono } from 'hono';
import type { Bindings, User } from '../types';
import { authMiddleware } from '../lib/auth';
import { getStaffAdvices, markAdviceAsRead } from '../lib/db';

const advices = new Hono<{ Bindings: Bindings; Variables: { user: User } }>();

// 全ルートに認証ミドルウェアを適用
advices.use('*', authMiddleware);

// スタッフアドバイス一覧取得
advices.get('/', async (c) => {
  const user = c.get('user');
  const limit = Number(c.req.query('limit')) || 10;

  const adviceList = await getStaffAdvices(c.env.DB, user.id, limit);

  return c.json({ success: true, data: adviceList });
});

// アドバイス既読マーク
advices.post('/:id/read', async (c) => {
  try {
    const user = c.get('user');
    const adviceId = Number(c.req.param('id'));

    const success = await markAdviceAsRead(c.env.DB, adviceId, user.id);

    if (!success) {
      return c.json({ success: false, error: 'アドバイスの更新に失敗しました' }, 400);
    }

    return c.json({ success: true, message: 'アドバイスを既読にしました' });
  } catch (error) {
    console.error('Mark advice as read error:', error);
    return c.json({ success: false, error: 'アドバイスの更新に失敗しました' }, 500);
  }
});

export default advices;
