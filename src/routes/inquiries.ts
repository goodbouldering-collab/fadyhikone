import { Hono } from 'hono';
import type { Bindings, User } from '../types';
import { authMiddleware } from '../lib/auth';
import { createInquiry } from '../lib/db';

const inquiries = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>();

// 問い合わせ作成（認証不要）
inquiries.post('/', async (c) => {
  try {
    // 認証トークンがあればユーザーIDを取得
    const authHeader = c.req.header('Authorization');
    let userId: number | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtSecret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const { verifyToken } = await import('../lib/jwt');
      const payload = await verifyToken(token, jwtSecret);
      
      if (payload) {
        userId = payload.userId;
      }
    }

    const data = await c.req.json();

    if (!data.name || !data.email || !data.subject || !data.message) {
      return c.json(
        { success: false, error: '必須項目が入力されていません' },
        400
      );
    }

    const inquiry = await createInquiry(c.env.DB, {
      userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });

    return c.json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Create inquiry error:', error);
    return c.json({ success: false, error: '問い合わせの送信に失敗しました' }, 500);
  }
});

export default inquiries;
