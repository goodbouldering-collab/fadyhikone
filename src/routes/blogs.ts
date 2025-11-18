import { Hono } from 'hono';
import type { Bindings, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

const blogs = new Hono<{ Bindings: Bindings }>();

// 管理者認証ミドルウェア（管理者専用ルート用）
const adminAuth = async (c: any, next: any) => {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) {
    return c.json<ApiResponse>({ success: false, error: '認証が必要です' }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return c.json<ApiResponse>({ success: false, error: '管理者権限が必要です' }, 403);
  }

  // ユーザー情報をセット
  c.set('user', { id: payload.userId, role: payload.role, name: payload.name || '管理者' });
  await next();
};

// 全ブログ取得（公開済みのみ）
blogs.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, title, excerpt, author_name, featured_image, slug, 
             published_at, created_at
      FROM blogs
      WHERE status = 'published'
      ORDER BY published_at DESC
    `).all();

    return c.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 管理者用：全ブログ取得（下書き含む）
blogs.get('/admin/all', adminAuth, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT *
      FROM blogs
      ORDER BY created_at DESC
    `).all();

    return c.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ブログ詳細取得（slug）
blogs.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const result = await c.env.DB.prepare(`
      SELECT *
      FROM blogs
      WHERE slug = ? AND status = 'published'
    `).bind(slug).first();

    if (!result) {
      return c.json({ success: false, error: 'Blog not found' }, 404);
    }

    return c.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ブログ作成
blogs.post('/', adminAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { title, content, excerpt, featured_image, status, slug } = body;

    if (!title || !content) {
      return c.json({ success: false, error: 'Title and content are required' }, 400);
    }

    // slugの生成（提供されていない場合）
    const finalSlug = slug || title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    const result = await c.env.DB.prepare(`
      INSERT INTO blogs (title, content, author_id, author_name, excerpt, 
                        featured_image, status, slug, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      content,
      user.id,
      user.name,
      excerpt || content.substring(0, 200) + '...',
      featured_image || null,
      status || 'draft',
      finalSlug,
      publishedAt
    ).run();

    return c.json({
      success: true,
      data: { id: result.meta.last_row_id, slug: finalSlug }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ブログ更新
blogs.put('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { title, content, excerpt, featured_image, status, slug } = body;

    // 現在の状態を取得
    const current = await c.env.DB.prepare(`
      SELECT status FROM blogs WHERE id = ?
    `).bind(id).first() as any;

    if (!current) {
      return c.json({ success: false, error: 'Blog not found' }, 404);
    }

    // 公開日時の処理
    let publishedAt = null;
    if (status === 'published' && current.status !== 'published') {
      publishedAt = new Date().toISOString();
    }

    await c.env.DB.prepare(`
      UPDATE blogs
      SET title = ?, content = ?, excerpt = ?, featured_image = ?, 
          status = ?, slug = ?, published_at = COALESCE(?, published_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title,
      content,
      excerpt,
      featured_image,
      status,
      slug,
      publishedAt,
      id
    ).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ブログ削除
blogs.delete('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB.prepare(`
      DELETE FROM blogs WHERE id = ?
    `).bind(id).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default blogs;
