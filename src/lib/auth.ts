import type { Context, MiddlewareHandler } from 'hono';
import type { Bindings, User } from '../types';
import { verifyToken } from './jwt';

// Context に user プロパティを追加
type AuthContext = {
  user: User;
};

// 認証ミドルウェア
export const authMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: AuthContext;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '認証が必要です' }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';

  const payload = await verifyToken(token, jwtSecret);
  
  if (!payload) {
    return c.json({ success: false, error: '無効なトークンです' }, 401);
  }

  // データベースからユーザー情報取得
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(payload.userId)
    .first<User>();

  if (!user) {
    return c.json({ success: false, error: 'ユーザーが見つかりません' }, 401);
  }

  // Context に user を設定
  c.set('user', user);

  await next();
};

// 管理者権限チェックミドルウェア
export const adminMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: AuthContext;
}> = async (c, next) => {
  const user = c.get('user');

  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: '管理者権限が必要です' }, 403);
  }

  await next();
};

// Google OAuth 認証用URL生成
export function getGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// LINE OAuth 認証用URL生成
export function getLineAuthUrl(
  channelId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state: state,
    scope: 'profile openid email',
  });

  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

// Google トークン交換
export async function exchangeGoogleCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  return await response.json();
}

// Google ユーザー情報取得
export async function getGoogleUserInfo(accessToken: string): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
  );

  return await response.json();
}

// LINE トークン交換
export async function exchangeLineCode(
  code: string,
  channelId: string,
  channelSecret: string,
  redirectUri: string
): Promise<any> {
  const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  return await response.json();
}

// LINE ユーザー情報取得
export async function getLineUserInfo(accessToken: string): Promise<any> {
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return await response.json();
}
