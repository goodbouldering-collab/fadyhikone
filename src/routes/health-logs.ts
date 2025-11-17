import { Hono } from 'hono';
import type { Bindings, HealthLog, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

// AI分析関数（Gemini API使用）
async function generateAIAdvice(
  env: Bindings,
  userId: number,
  logDate: string,
  healthLog: HealthLog,
  meals: any
): Promise<void> {
  try {
    // 過去7日間のログを取得（トレンド分析用）
    const pastLogs = await env.DB.prepare(`
      SELECT * FROM health_logs 
      WHERE user_id = ? AND log_date < ? 
      ORDER BY log_date DESC LIMIT 7
    `).bind(userId, logDate).all<HealthLog>();

    // ユーザー情報取得
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId).first<any>();

    // AI分析用のプロンプト作成
    const prompt = `あなたはファディー彦根のプロフェッショナルトレーナーです。30年のクライミング経験と最新の科学的知見を基に、ユーザーの健康ログを分析してパーソナライズされたアドバイスを提供してください。

【ユーザー情報】
- 名前: ${user?.name || '未設定'}
- 身長: ${user?.height || '未設定'}cm
- 目標: ${user?.goal || '未設定'}

【今日のデータ (${logDate})】
- 体重: ${healthLog.weight || '未記録'}kg
- 体脂肪率: ${healthLog.body_fat_percentage || '未記録'}%
- 睡眠時間: ${healthLog.sleep_hours || '未記録'}時間
- 運動時間: ${healthLog.exercise_minutes || '未記録'}分
- 体調評価: ${healthLog.condition_rating || 3}/5
- 運動メモ: ${healthLog.condition_note || 'なし'}
- 朝食カロリー: ${meals?.breakfast?.calories || 0}kcal
- 昼食カロリー: ${meals?.lunch?.calories || 0}kcal
- 夕食カロリー: ${meals?.dinner?.calories || 0}kcal
- 総カロリー: ${(meals?.breakfast?.calories || 0) + (meals?.lunch?.calories || 0) + (meals?.dinner?.calories || 0)}kcal

【過去7日間のトレンド】
${pastLogs.results.map((log: HealthLog, i: number) => 
  `${i + 1}日前: 体重${log.weight || '-'}kg, 運動${log.exercise_minutes || 0}分, 睡眠${log.sleep_hours || '-'}h`
).join('\n')}

【アドバイス要件】
1. **カテゴリー分類**: 以下から最も適切な1つを選択
   - "meal" (食事): カロリーバランス、栄養素、食事タイミング
   - "exercise" (運動): 運動量、運動種目、トレーニング強度
   - "mental" (メンタル): ストレス管理、モチベーション、目標達成
   - "sleep" (睡眠): 睡眠時間、睡眠の質、回復
   - "weight" (体重管理): 体重変化、体脂肪率、BMI

2. **タイトル**: 20文字以内の具体的なタイトル（例: "タンパク質を20g追加しましょう"）

3. **アドバイス内容**: 150-300文字で以下を含む
   - 現状の評価（ポジティブな表現で）
   - 具体的な改善提案（数値を含む）
   - クライミング的な視点や比喩
   - 次のアクション（実行可能な1-2つ）

4. **信頼度スコア**: 0.0-1.0（データの充実度に応じて）

以下のJSON形式で返してください：
{
  "category": "meal|exercise|mental|sleep|weight",
  "title": "具体的なタイトル",
  "content": "アドバイス本文",
  "confidence_score": 0.85,
  "ai_analysis_data": {
    "detected_issues": ["検出された問題点"],
    "positive_points": ["良い点"],
    "recommendations": ["推奨事項"]
  }
}`;

    // Gemini API呼び出し（Cloudflare AI Gateway経由）
    const GEMINI_API_KEY = env.GEMINI_API_KEY || 'dummy-key';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return;
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSONを抽出（```json ... ``` の中身を取得）
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI response JSON not found:', aiText);
      return;
    }

    const aiAdvice = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // advicesテーブルに保存
    await env.DB.prepare(`
      INSERT INTO advices (
        user_id, log_date, advice_type, title, content,
        advice_source, ai_analysis_data, confidence_score,
        staff_name, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      logDate,
      aiAdvice.category || 'meal',
      aiAdvice.title,
      aiAdvice.content,
      'ai',
      JSON.stringify(aiAdvice.ai_analysis_data || {}),
      aiAdvice.confidence_score || 0.75,
      'AI Assistant',
      0  // 未読
    ).run();

    console.log('AI advice generated successfully for', userId, logDate);
  } catch (error) {
    console.error('AI advice generation error:', error);
    // エラーでも処理を継続（ログ保存は成功させる）
  }
}

const healthLogs = new Hono<{ Bindings: Bindings }>();

// 認証ミドルウェア
healthLogs.use('*', async (c, next) => {
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

// 健康ログ一覧取得（食事データを含む）
healthLogs.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const logs = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE user_id = ? ORDER BY log_date DESC'
    ).bind(userId).all<HealthLog>();

    // 各ログに食事データを追加
    const logsWithMeals = await Promise.all(logs.results.map(async (log) => {
      const meals = await c.env.DB.prepare(`
        SELECT m.*, GROUP_CONCAT(mp.photo_url, '|||') as photo_urls
        FROM meals m
        LEFT JOIN meal_photos mp ON mp.meal_id = m.id
        WHERE m.health_log_id = ?
        GROUP BY m.id, m.meal_type
      `).bind(log.id).all();

      // meals を { breakfast: {}, lunch: {}, dinner: {} } 形式に変換
      const mealsObj: any = {};
      meals.results.forEach((meal: any) => {
        mealsObj[meal.meal_type] = {
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          ai_analysis_text: meal.ai_analysis_text,
          ai_confidence: meal.ai_confidence,
          input_method: meal.input_method,
          photos: meal.photo_urls ? meal.photo_urls.split('|||') : []
        };
      });

      return { ...log, meals: mealsObj };
    }));

    return c.json<ApiResponse<any[]>>({
      success: true,
      data: logsWithMeals,
    });
  } catch (error) {
    console.error('ログ取得エラー:', error);
    return c.json<ApiResponse>({ success: false, error: 'ログの取得に失敗しました' }, 500);
  }
});

// 健康ログ作成
healthLogs.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    // 1. health_logsレコードを作成（食事データは除外）
    const result = await c.env.DB.prepare(`
      INSERT INTO health_logs (
        user_id, log_date, weight, body_fat_percentage, body_temperature,
        sleep_hours, exercise_minutes, condition_rating, condition_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      body.log_date,
      body.weight || null,
      body.body_fat_percentage || null,
      body.body_temperature || null,
      body.sleep_hours || null,
      body.exercise_minutes || null,
      body.condition_rating || 3,
      body.condition_note || null
    ).run();

    const healthLogId = result.meta.last_row_id;

    // 2. mealsレコードを作成（breakfast, lunch, dinner）
    if (body.meals) {
      for (const [mealType, mealData] of Object.entries(body.meals)) {
        if (mealData && typeof mealData === 'object') {
          const meal: any = mealData;
          const mealResult = await c.env.DB.prepare(`
            INSERT INTO meals (
              health_log_id, meal_type, calories, protein, carbs, fat,
              ai_analysis_text, ai_confidence, input_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            healthLogId,
            mealType,
            meal.calories || 0,
            meal.protein || 0,
            meal.carbs || 0,
            meal.fat || 0,
            meal.ai_analysis_text || null,
            meal.ai_confidence || null,
            meal.input_method || 'manual'
          ).run();

          const mealId = mealResult.meta.last_row_id;

          // 3. meal_photosレコードを作成（複数写真対応）
          if (meal.photos && Array.isArray(meal.photos)) {
            for (let i = 0; i < meal.photos.length; i++) {
              await c.env.DB.prepare(`
                INSERT INTO meal_photos (meal_id, photo_url, photo_order)
                VALUES (?, ?, ?)
              `).bind(mealId, meal.photos[i], i + 1).run();
            }
          }
        }
      }
    }

    const newLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ?'
    ).bind(healthLogId).first<HealthLog>();

    // AI自動分析を非同期で実行（レスポンスをブロックしない）
    c.executionCtx.waitUntil(
      generateAIAdvice(c.env, userId, body.log_date, newLog as HealthLog, body.meals || {})
    );

    return c.json<ApiResponse<HealthLog>>({
      success: true,
      data: newLog as HealthLog,
    });
  } catch (error) {
    console.error('ログ作成エラー:', error);
    return c.json<ApiResponse>({ success: false, error: 'ログの作成に失敗しました' }, 500);
  }
});

// 食事写真アップロード&AI解析
healthLogs.post('/upload-meal', async (c) => {
  try {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('photo') as File;
    const logDate = formData.get('log_date') as string;

    if (!file) {
      return c.json<ApiResponse>({ success: false, error: '写真が提供されていません' }, 400);
    }

    // 画像アップロード（R2が設定されていない場合はモックURLを使用）
    let imageUrl: string;
    
    if (c.env.BUCKET) {
      // R2にアップロード
      const filename = `meals/${userId}/${Date.now()}-${file.name}`;
      await c.env.BUCKET.put(filename, await file.arrayBuffer(), {
        httpMetadata: {
          contentType: file.type,
        },
      });
      imageUrl = `/api/images/${filename}`;
    } else {
      // R2未設定の場合はモック画像URLを使用
      imageUrl = `https://picsum.photos/seed/${Date.now()}/400/300`;
    }

    // モックAI解析結果
    const mockAnalysis = {
      食材: ['ご飯', '鶏胸肉', 'ブロッコリー', 'トマト'],
      カロリー: 450,
      タンパク質: 35,
      炭水化物: 52,
      脂質: 8,
      評価: '高タンパク低脂質で素晴らしいバランスです！',
    };

    // 健康ログを更新または作成
    const existingLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE user_id = ? AND log_date = ?'
    ).bind(userId, logDate).first<HealthLog>();

    if (existingLog) {
      await c.env.DB.prepare(`
        UPDATE health_logs SET
          meal_photo_url = ?,
          meal_analysis = ?,
          meal_calories = ?,
          meal_protein = ?,
          meal_carbs = ?,
          meal_fat = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        imageUrl,
        JSON.stringify(mockAnalysis),
        mockAnalysis.カロリー,
        mockAnalysis.タンパク質,
        mockAnalysis.炭水化物,
        mockAnalysis.脂質,
        existingLog.id
      ).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO health_logs (
          user_id, log_date, meal_photo_url, meal_analysis,
          meal_calories, meal_protein, meal_carbs, meal_fat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        logDate,
        imageUrl,
        JSON.stringify(mockAnalysis),
        mockAnalysis.カロリー,
        mockAnalysis.タンパク質,
        mockAnalysis.炭水化物,
        mockAnalysis.脂質
      ).run();
    }

    return c.json<ApiResponse<{ analysis: any; photoUrl: string }>>({
      success: true,
      data: {
        analysis: mockAnalysis,
        photoUrl: imageUrl,
      },
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: '写真のアップロードに失敗しました' }, 500);
  }
});

// 健康ログ更新
healthLogs.put('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const logId = c.req.param('id');
    const body = await c.req.json();

    // ログの所有権確認
    const log = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ? AND user_id = ?'
    ).bind(logId, userId).first<HealthLog>();

    if (!log) {
      return c.json<ApiResponse>({ success: false, error: 'ログが見つかりません' }, 404);
    }

    // 1. health_logsレコードを更新（食事データは除外）
    await c.env.DB.prepare(`
      UPDATE health_logs SET
        weight = ?, body_fat_percentage = ?, body_temperature = ?,
        sleep_hours = ?, exercise_minutes = ?,
        condition_rating = ?, condition_note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.weight || null,
      body.body_fat_percentage || null,
      body.body_temperature || null,
      body.sleep_hours || null,
      body.exercise_minutes || null,
      body.condition_rating || 3,
      body.condition_note || null,
      logId
    ).run();

    // 2. 既存のmealsレコードを削除して再作成（簡略化のため）
    await c.env.DB.prepare('DELETE FROM meals WHERE health_log_id = ?').bind(logId).run();

    // 3. mealsレコードを作成（breakfast, lunch, dinner）
    if (body.meals) {
      for (const [mealType, mealData] of Object.entries(body.meals)) {
        if (mealData && typeof mealData === 'object') {
          const meal: any = mealData;
          const mealResult = await c.env.DB.prepare(`
            INSERT INTO meals (
              health_log_id, meal_type, calories, protein, carbs, fat,
              ai_analysis_text, ai_confidence, input_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            logId,
            mealType,
            meal.calories || 0,
            meal.protein || 0,
            meal.carbs || 0,
            meal.fat || 0,
            meal.ai_analysis_text || null,
            meal.ai_confidence || null,
            meal.input_method || 'manual'
          ).run();

          const mealId = mealResult.meta.last_row_id;

          // 4. meal_photosレコードを作成（複数写真対応）
          if (meal.photos && Array.isArray(meal.photos)) {
            for (let i = 0; i < meal.photos.length; i++) {
              await c.env.DB.prepare(`
                INSERT INTO meal_photos (meal_id, photo_url, photo_order)
                VALUES (?, ?, ?)
              `).bind(mealId, meal.photos[i], i + 1).run();
            }
          }
        }
      }
    }

    const updatedLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ?'
    ).bind(logId).first<HealthLog>();

    // AI自動分析を非同期で実行（既存のアドバイスがあれば上書き）
    c.executionCtx.waitUntil(
      generateAIAdvice(c.env, userId, log.log_date, updatedLog as HealthLog, body.meals || {})
    );

    return c.json<ApiResponse<HealthLog>>({
      success: true,
      data: updatedLog as HealthLog,
    });
  } catch (error) {
    console.error('ログ更新エラー:', error);
    return c.json<ApiResponse>({ success: false, error: 'ログの更新に失敗しました' }, 500);
  }
});

// 健康ログ削除
healthLogs.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const logId = c.req.param('id');

    // ログの所有権確認
    const log = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ? AND user_id = ?'
    ).bind(logId, userId).first<HealthLog>();

    if (!log) {
      return c.json<ApiResponse>({ success: false, error: 'ログが見つかりません' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM health_logs WHERE id = ?').bind(logId).run();

    return c.json<ApiResponse>({
      success: true,
      message: 'ログを削除しました',
    });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'ログの削除に失敗しました' }, 500);
  }
});

export default healthLogs;
