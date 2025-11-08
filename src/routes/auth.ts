import { Hono } from 'hono';
import type { Bindings, User, ApiResponse } from '../types';
import { generateToken, verifyToken, extractToken } from '../utils/jwt';

const auth = new Hono<{ Bindings: Bindings }>();

// Google OAuth認証 (モック実装)
auth.post('/google', async (c) => {
  try {
    const { token } = await c.req.json();
    
    // 本番環境ではGoogle OAuth APIで検証
    // ここではモック実装
    const mockGoogleUser = {
      email: 'user@example.com',
      name: 'テストユーザー',
      picture: 'https://via.placeholder.com/150',
      sub: 'google_' + Date.now(),
    };

    // ユーザーを取得または作成
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE auth_provider = ? AND auth_provider_id = ?'
    ).bind('google', mockGoogleUser.sub).first<User>();

    if (!user) {
      // 新規ユーザー作成
      const result = await c.env.DB.prepare(
        'INSERT INTO users (email, name, auth_provider, auth_provider_id, avatar_url) VALUES (?, ?, ?, ?, ?)'
      ).bind(mockGoogleUser.email, mockGoogleUser.name, 'google', mockGoogleUser.sub, mockGoogleUser.picture).run();

      user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first<User>();
    }

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'ユーザー作成に失敗しました' }, 500);
    }

    // JWTトークン生成
    const jwtToken = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json<ApiResponse<{ token: string; user: User }>>({
      success: true,
      data: { token: jwtToken, user },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '認証に失敗しました' }, 500);
  }
});

// LINE OAuth認証 (モック実装)
auth.post('/line', async (c) => {
  try {
    const { code } = await c.req.json();
    
    // 本番環境ではLINE OAuth APIで検証
    // ここではモック実装
    const mockLineUser = {
      email: 'lineuser@example.com',
      name: 'LINEユーザー',
      picture: 'https://via.placeholder.com/150',
      userId: 'line_' + Date.now(),
    };

    // ユーザーを取得または作成
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE auth_provider = ? AND auth_provider_id = ?'
    ).bind('line', mockLineUser.userId).first<User>();

    if (!user) {
      // 新規ユーザー作成
      const result = await c.env.DB.prepare(
        'INSERT INTO users (email, name, auth_provider, auth_provider_id, avatar_url) VALUES (?, ?, ?, ?, ?)'
      ).bind(mockLineUser.email, mockLineUser.name, 'line', mockLineUser.userId, mockLineUser.picture).run();

      user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first<User>();
    }

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'ユーザー作成に失敗しました' }, 500);
    }

    // JWTトークン生成
    const jwtToken = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json<ApiResponse<{ token: string; user: User }>>({
      success: true,
      data: { token: jwtToken, user },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '認証に失敗しました' }, 500);
  }
});

// パスワードハッシュ関数（簡易版）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// メール新規登録
auth.post('/register', async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    
    if (!name || !email || !password) {
      return c.json<ApiResponse>({ success: false, error: '必須項目が入力されていません' }, 400);
    }
    
    // メール重複チェック
    const existingUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first<User>();
    
    if (existingUser) {
      return c.json<ApiResponse>({ success: false, error: 'このメールアドレスは既に登録されています' }, 400);
    }
    
    // パスワードのハッシュ化
    const hashedPassword = await hashPassword(password);
    
    // 新規ユーザー作成
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, name, auth_provider, auth_provider_id, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, name, 'email', hashedPassword, 'user').run();

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first<User>();

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'ユーザー作成に失敗しました' }, 500);
    }

    // JWTトークン生成
    const jwtToken = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json<ApiResponse<{ token: string; user: User }>>({
      success: true,
      data: { token: jwtToken, user },
    });
  } catch (error) {
    console.error('Register error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return c.json<ApiResponse>({ success: false, error: `登録に失敗しました: ${errorMessage}` }, 500);
  }
});

// 管理者ログイン
auth.post('/admin-login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json<ApiResponse>({ success: false, error: 'メールアドレスとパスワードを入力してください' }, 400);
    }
    
    // ユーザー取得
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND auth_provider = ?'
    ).bind(email, 'email').first<User>();
    
    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }
    
    // パスワード検証
    const hashedPassword = await hashPassword(password);
    if (user.auth_provider_id !== hashedPassword) {
      return c.json<ApiResponse>({ success: false, error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }
    
    // 管理者権限チェック
    if (user.role !== 'admin') {
      return c.json<ApiResponse>({ success: false, error: '管理者権限がありません' }, 403);
    }
    
    // JWTトークン生成
    const jwtToken = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json<ApiResponse<{ token: string; user: User }>>({
      success: true,
      data: { token: jwtToken, user },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return c.json<ApiResponse>({ success: false, error: `ログインに失敗しました: ${errorMessage}` }, 500);
  }
});

// トークン検証
auth.get('/verify', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'));
    if (!token) {
      return c.json<ApiResponse>({ success: false, error: 'トークンが提供されていません' }, 401);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return c.json<ApiResponse>({ success: false, error: 'トークンが無効です' }, 401);
    }

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.userId).first<User>();

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'ユーザーが見つかりません' }, 404);
    }

    return c.json<ApiResponse<User>>({
      success: true,
      data: user,
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'トークン検証に失敗しました' }, 500);
  }
});

export default auth;
