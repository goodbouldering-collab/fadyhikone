import { Hono } from 'hono';
import type { Bindings } from '../types';
import {
  getGoogleAuthUrl,
  getLineAuthUrl,
  exchangeGoogleCode,
  getGoogleUserInfo,
  exchangeLineCode,
  getLineUserInfo,
} from '../lib/auth';
import { upsertUser } from '../lib/db';
import { generateToken } from '../lib/jwt';

const auth = new Hono<{ Bindings: Bindings }>();

// Google OAuth 開始
auth.get('/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  const authUrl = getGoogleAuthUrl(clientId, redirectUri, state);

  return c.json({ success: true, data: { authUrl, state } });
});

// Google OAuth コールバック
auth.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code');
    
    if (!code) {
      return c.json({ success: false, error: '認証コードがありません' }, 400);
    }

    const clientId = c.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;

    // トークン交換
    const tokenData = await exchangeGoogleCode(code, clientId, clientSecret, redirectUri);

    if (!tokenData.access_token) {
      return c.json({ success: false, error: 'トークン取得に失敗しました' }, 400);
    }

    // ユーザー情報取得
    const userInfo = await getGoogleUserInfo(tokenData.access_token);

    // ユーザー登録または更新
    const user = await upsertUser(
      c.env.DB,
      'google',
      userInfo.id,
      userInfo.email,
      userInfo.name,
      userInfo.picture
    );

    // JWT 生成
    const jwtSecret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = await generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret
    );

    // フロントエンドへリダイレクト（トークンをクエリパラメータで渡す）
    return c.redirect(`/?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return c.json({ success: false, error: '認証に失敗しました' }, 500);
  }
});

// LINE OAuth 開始
auth.get('/line', async (c) => {
  const channelId = c.env.LINE_CHANNEL_ID || 'your-line-channel-id';
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/line/callback`;
  const state = crypto.randomUUID();

  const authUrl = getLineAuthUrl(channelId, redirectUri, state);

  return c.json({ success: true, data: { authUrl, state } });
});

// LINE OAuth コールバック
auth.get('/line/callback', async (c) => {
  try {
    const code = c.req.query('code');
    
    if (!code) {
      return c.json({ success: false, error: '認証コードがありません' }, 400);
    }

    const channelId = c.env.LINE_CHANNEL_ID || 'your-line-channel-id';
    const channelSecret = c.env.LINE_CHANNEL_SECRET || 'your-line-channel-secret';
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/line/callback`;

    // トークン交換
    const tokenData = await exchangeLineCode(code, channelId, channelSecret, redirectUri);

    if (!tokenData.access_token) {
      return c.json({ success: false, error: 'トークン取得に失敗しました' }, 400);
    }

    // ユーザー情報取得
    const userInfo = await getLineUserInfo(tokenData.access_token);

    // LINE はメールアドレスを提供しない場合があるので、デフォルト値を使用
    const email = userInfo.email || `${userInfo.userId}@line.user`;

    // ユーザー登録または更新
    const user = await upsertUser(
      c.env.DB,
      'line',
      userInfo.userId,
      email,
      userInfo.displayName,
      userInfo.pictureUrl
    );

    // JWT 生成
    const jwtSecret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = await generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret
    );

    // フロントエンドへリダイレクト（トークンをクエリパラメータで渡す）
    return c.redirect(`/?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (error) {
    console.error('LINE OAuth error:', error);
    return c.json({ success: false, error: '認証に失敗しました' }, 500);
  }
});

// 現在のユーザー情報取得（認証必要）
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '認証が必要です' }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';

  // JWT 検証は auth ミドルウェアで行われるが、ここでも念のため
  const { verifyToken } = await import('../lib/jwt');
  const payload = await verifyToken(token, jwtSecret);
  
  if (!payload) {
    return c.json({ success: false, error: '無効なトークンです' }, 401);
  }

  const { getUser } = await import('../lib/db');
  const user = await getUser(c.env.DB, payload.userId);

  if (!user) {
    return c.json({ success: false, error: 'ユーザーが見つかりません' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
    },
  });
});

export default auth;
