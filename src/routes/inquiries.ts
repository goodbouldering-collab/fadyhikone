import { Hono } from 'hono';
import type { Bindings, Inquiry, ApiResponse } from '../types';

const inquiries = new Hono<{ Bindings: Bindings }>();

// 問い合わせ作成 (認証不要)
inquiries.post('/', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.name || !body.email || !body.subject || !body.message) {
      return c.json<ApiResponse>({
        success: false,
        error: '必須項目が入力されていません',
      }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO inquiries (name, email, phone, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      body.name,
      body.email,
      body.phone || null,
      body.subject,
      body.message
    ).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'お問い合わせを受け付けました。担当者より折り返しご連絡いたします。',
    });
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: 'お問い合わせの送信に失敗しました',
    }, 500);
  }
});

export default inquiries;
