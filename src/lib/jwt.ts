import type { JWTPayload } from '../types';

// Base64URL エンコード
function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64URL デコード
function base64UrlDecode(data: string): string {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// JWT トークン生成
export async function generateToken(
  payload: Omit<JWTPayload, 'exp'>,
  secret: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7日間（秒）
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const fullPayload = { ...payload, exp };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));

  const data = `${headerEncoded}.${payloadEncoded}`;
  
  // Web Crypto API を使用して署名
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = base64UrlEncode(
    String.fromCharCode(...signatureArray)
  );

  return `${data}.${signatureBase64}`;
}

// JWT トークン検証
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    const data = `${headerEncoded}.${payloadEncoded}`;

    // 署名検証
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(
      base64UrlDecode(signatureEncoded),
      (c) => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    );

    if (!isValid) {
      return null;
    }

    // ペイロードデコード
    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadEncoded));

    // 有効期限チェック
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

// トークンからユーザーID取得
export async function getUserIdFromToken(
  token: string,
  secret: string
): Promise<number | null> {
  const payload = await verifyToken(token, secret);
  return payload ? payload.userId : null;
}
