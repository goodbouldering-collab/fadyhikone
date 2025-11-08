import { Hono } from 'hono';
import type { Bindings, User } from '../types';
import { authMiddleware } from '../lib/auth';
import {
  createHealthLog,
  getHealthLogs,
  updateHealthLog,
} from '../lib/db';

const healthLogs = new Hono<{ Bindings: Bindings; Variables: { user: User } }>();

// 全ルートに認証ミドルウェアを適用
healthLogs.use('*', authMiddleware);

// 健康ログ一覧取得
healthLogs.get('/', async (c) => {
  const user = c.get('user');
  const limit = Number(c.req.query('limit')) || 30;

  const logs = await getHealthLogs(c.env.DB, user.id, limit);

  return c.json({ success: true, data: logs });
});

// 健康ログ作成
healthLogs.post('/', async (c) => {
  try {
    const user = c.get('user');
    const data = await c.req.json();

    const log = await createHealthLog(c.env.DB, user.id, data);

    return c.json({ success: true, data: log });
  } catch (error) {
    console.error('Create health log error:', error);
    return c.json({ success: false, error: 'ログの作成に失敗しました' }, 500);
  }
});

// 健康ログ更新
healthLogs.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const logId = Number(c.req.param('id'));
    const data = await c.req.json();

    const success = await updateHealthLog(c.env.DB, logId, user.id, data);

    if (!success) {
      return c.json({ success: false, error: 'ログの更新に失敗しました' }, 400);
    }

    return c.json({ success: true, message: 'ログを更新しました' });
  } catch (error) {
    console.error('Update health log error:', error);
    return c.json({ success: false, error: 'ログの更新に失敗しました' }, 500);
  }
});

// 写真アップロード & AI解析（モック）
healthLogs.post('/upload-image', async (c) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return c.json({ success: false, error: '画像ファイルが必要です' }, 400);
    }

    // R2 に画像をアップロード
    const timestamp = Date.now();
    const filename = `${user.id}/${timestamp}-${file.name}`;
    const buffer = await file.arrayBuffer();

    await c.env.BUCKET.put(filename, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 画像URLを生成（本番環境では適切なURLに変更）
    const imageUrl = `/api/images/${filename}`;

    // モックAI解析（実際のAI APIに置き換え可能）
    const mockAnalysis = generateMockAnalysis(file.name);

    return c.json({
      success: true,
      data: {
        imageUrl,
        analysis: mockAnalysis,
      },
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return c.json({ success: false, error: '画像のアップロードに失敗しました' }, 500);
  }
});

// モックAI解析関数
function generateMockAnalysis(filename: string): string {
  const analyses = [
    'バランスの取れた食事です。タンパク質、炭水化物、野菜がバランス良く含まれています。カロリーは約600kcalと推定されます。',
    '野菜が豊富で健康的な食事です。ビタミンやミネラルが豊富に含まれています。カロリーは約450kcalと推定されます。',
    'タンパク質が豊富な食事です。筋肉の成長に効果的です。カロリーは約750kcalと推定されます。',
    '炭水化物がやや多めです。運動前のエネルギー補給には適していますが、夜遅い時間の場合は控えめにすることをお勧めします。カロリーは約800kcalと推定されます。',
    '低カロリーで健康的な選択です。ダイエット中の方に最適です。カロリーは約350kcalと推定されます。',
  ];

  return analyses[Math.floor(Math.random() * analyses.length)];
}

export default healthLogs;
