import { Hono } from 'hono';
import type { Bindings, User } from '../types';
import { authMiddleware, adminMiddleware } from '../lib/auth';
import {
  getAllUsers,
  getAllInquiries,
  updateInquiryStatus,
  createStaffAdvice,
  getHealthLogs,
} from '../lib/db';

const admin = new Hono<{ Bindings: Bindings; Variables: { user: User } }>();

// 全ルートに認証&管理者ミドルウェアを適用
admin.use('*', authMiddleware);
admin.use('*', adminMiddleware);

// 全ユーザー取得
admin.get('/users', async (c) => {
  const users = await getAllUsers(c.env.DB);
  return c.json({ success: true, data: users });
});

// 特定ユーザーの健康ログ取得
admin.get('/users/:userId/logs', async (c) => {
  const userId = Number(c.req.param('userId'));
  const limit = Number(c.req.query('limit')) || 100;

  const logs = await getHealthLogs(c.env.DB, userId, limit);

  return c.json({ success: true, data: logs });
});

// スタッフアドバイス作成
admin.post('/advices', async (c) => {
  try {
    const data = await c.req.json();

    if (!data.userId || !data.staffName || !data.adviceText || !data.adviceType) {
      return c.json(
        { success: false, error: '必須項目が入力されていません' },
        400
      );
    }

    const advice = await createStaffAdvice(
      c.env.DB,
      data.userId,
      data.staffName,
      data.adviceText,
      data.adviceType
    );

    return c.json({ success: true, data: advice });
  } catch (error) {
    console.error('Create staff advice error:', error);
    return c.json({ success: false, error: 'アドバイスの作成に失敗しました' }, 500);
  }
});

// 全問い合わせ取得
admin.get('/inquiries', async (c) => {
  const inquiriesList = await getAllInquiries(c.env.DB);
  return c.json({ success: true, data: inquiriesList });
});

// 問い合わせステータス更新
admin.put('/inquiries/:id/status', async (c) => {
  try {
    const inquiryId = Number(c.req.param('id'));
    const data = await c.req.json();

    if (!data.status) {
      return c.json({ success: false, error: 'ステータスが指定されていません' }, 400);
    }

    const success = await updateInquiryStatus(c.env.DB, inquiryId, data.status);

    if (!success) {
      return c.json(
        { success: false, error: 'ステータスの更新に失敗しました' },
        400
      );
    }

    return c.json({ success: true, message: 'ステータスを更新しました' });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    return c.json({ success: false, error: 'ステータスの更新に失敗しました' }, 500);
  }
});

export default admin;
