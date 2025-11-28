import { Hono } from 'hono';
import type { Bindings, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

const tts = new Hono<{ Bindings: Bindings }>();

// 認証ミドルウェア
tts.use('*', async (c, next) => {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) {
    return c.json<ApiResponse>({ success: false, error: '認証が必要です' }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json<ApiResponse>({ success: false, error: 'トークンが無効です' }, 401);
  }

  c.set('userId', payload.userId);
  c.set('userRole', payload.role);
  await next();
});

// OpenAI TTS APIを使用して音声を生成（ストリーミング版）
tts.post('/speak', async (c) => {
  try {
    const { text, voice = 'nova' } = await c.req.json();

    if (!text || text.trim().length === 0) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'テキストが必要です' 
      }, 400);
    }

    // OpenAI APIキーを取得（DB優先、なければ環境変数）
    let OPENAI_API_KEY = '';
    let OPENAI_BASE_URL = 'https://api.openai.com/v1';
    
    try {
      const settingsResult = await c.env.DB.prepare(
        'SELECT setting_value FROM settings WHERE setting_key = ?'
      ).bind('openai_api_key').first<{ setting_value: string }>();
      if (settingsResult?.setting_value) {
        OPENAI_API_KEY = settingsResult.setting_value;
      }
    } catch (e) {
      console.log('DB settings not available, checking env vars');
    }
    
    // 環境変数からフォールバック
    if (!OPENAI_API_KEY && c.env.OPENAI_API_KEY) {
      OPENAI_API_KEY = c.env.OPENAI_API_KEY;
      OPENAI_BASE_URL = c.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    }
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'OpenAI API キーが設定されていません' 
      }, 500);
    }

    // OpenAI TTS API呼び出し
    const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // tts-1 (faster) or tts-1-hd (higher quality)
        input: text,
        voice: voice, // alloy, echo, fable, onyx, nova, shimmer
        response_format: 'mp3',
        speed: 1.0, // 0.25 to 4.0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', response.status, errorText);
      return c.json<ApiResponse>({ 
        success: false, 
        error: '音声生成に失敗しました' 
      }, 500);
    }

    // 音声データを直接ストリーミング（Base64エンコード不要）
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('TTS error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: '音声生成中にエラーが発生しました' 
    }, 500);
  }
});

// 音声データをストリーミング（大きなテキスト用）
tts.post('/speak-stream', async (c) => {
  try {
    const { text, voice = 'nova' } = await c.req.json();

    if (!text || text.trim().length === 0) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'テキストが必要です' 
      }, 400);
    }

    // OpenAI APIキーを取得（DB優先、なければ環境変数）
    let OPENAI_API_KEY = '';
    let OPENAI_BASE_URL = 'https://api.openai.com/v1';
    
    try {
      const settingsResult = await c.env.DB.prepare(
        'SELECT setting_value FROM settings WHERE setting_key = ?'
      ).bind('openai_api_key').first<{ setting_value: string }>();
      if (settingsResult?.setting_value) {
        OPENAI_API_KEY = settingsResult.setting_value;
      }
    } catch (e) {
      console.log('DB settings not available, checking env vars');
    }
    
    // 環境変数からフォールバック
    if (!OPENAI_API_KEY && c.env.OPENAI_API_KEY) {
      OPENAI_API_KEY = c.env.OPENAI_API_KEY;
      OPENAI_BASE_URL = c.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    }
    
    if (!OPENAI_API_KEY) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'OpenAI API キーが設定されていません' 
      }, 500);
    }

    // OpenAI TTS API呼び出し
    const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', response.status, errorText);
      return c.json<ApiResponse>({ 
        success: false, 
        error: '音声生成に失敗しました' 
      }, 500);
    }

    // 音声データをそのままストリーミング
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline',
      },
    });

  } catch (error) {
    console.error('TTS stream error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: '音声生成中にエラーが発生しました' 
    }, 500);
  }
});

export default tts;
