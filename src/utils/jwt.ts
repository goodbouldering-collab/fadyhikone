import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from '../types';

const JWT_SECRET = 'your-secret-key-change-in-production'; // 本番環境では環境変数から取得

export async function generateToken(payload: Omit<JWTPayload, 'exp'>): Promise<string> {
  const jwtPayload: JWTPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7日間有効
  };
  return await sign(jwtPayload, JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
