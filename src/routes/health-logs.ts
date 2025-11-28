import { Hono } from 'hono';
import type { Bindings, HealthLog, ApiResponse } from '../types';
import { verifyToken, extractToken } from '../utils/jwt';

// 仮想AI解析（Gemini APIキーが未設定の場合に使用）
function generateMockAnalysis() {
  const mockFoods = [
    ['ご飯', '鶏胸肉', 'ブロッコリー', 'トマト'],
    ['サラダ', 'サーモン', 'アボカド', 'オリーブオイル'],
    ['玄米', '豆腐', '納豆', '海藻サラダ'],
    ['パスタ', '野菜', 'ツナ', 'ガーリック'],
    ['そば', '天ぷら', '大根おろし', 'ねぎ'],
  ];
  
  const randomFoods = mockFoods[Math.floor(Math.random() * mockFoods.length)];
  const baseCalories = 350 + Math.floor(Math.random() * 200); // 350-550kcal
  const protein = Math.floor(baseCalories * (0.15 + Math.random() * 0.15)); // 15-30%
  const carbs = Math.floor(baseCalories * (0.40 + Math.random() * 0.20)); // 40-60%
  const fat = Math.floor(baseCalories * (0.15 + Math.random() * 0.15)); // 15-30%
  
  const evaluations = [
    'バランスの良い食事です！タンパク質がしっかり取れています。',
    '低カロリーで栄養価の高い選択です。継続しましょう！',
    '炭水化物とタンパク質のバランスが理想的です。',
    'ビタミンとミネラルが豊富で健康的な食事です。',
    '適度なカロリーで満足感のある食事内容です。',
  ];
  
  return {
    食材: randomFoods,
    カロリー: baseCalories,
    タンパク質: protein,
    炭水化物: carbs,
    脂質: fat,
    評価: evaluations[Math.floor(Math.random() * evaluations.length)],
  };
}

// AI分析関数（OpenAI API使用）
async function generateAIAdvice(
  env: Bindings & { OPENAI_API_KEY?: string; OPENAI_BASE_URL?: string },
  userId: number,
  logDate: string,
  healthLog: HealthLog,
  meals: any,
  exerciseActivities?: any[]
): Promise<void> {
  try {
    // OpenAI APIキーを取得（DB優先、なければ環境変数）
    let OPENAI_API_KEY = '';
    let OPENAI_BASE_URL = 'https://api.openai.com/v1';
    
    try {
      const settingsResult = await env.DB.prepare(
        'SELECT setting_value FROM settings WHERE setting_key = ?'
      ).bind('openai_api_key').first<{ setting_value: string }>();
      if (settingsResult?.setting_value) {
        OPENAI_API_KEY = settingsResult.setting_value;
      }
    } catch (e) {
      console.log('DB settings not available, checking env vars');
    }
    
    // 環境変数からフォールバック
    if (!OPENAI_API_KEY && env.OPENAI_API_KEY) {
      OPENAI_API_KEY = env.OPENAI_API_KEY;
      OPENAI_BASE_URL = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    }
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured (neither in DB nor env)');
      return;
    }
    
    console.log('🤖 Starting AI advice generation for user', userId, 'date', logDate);

    // 過去7日間のログを取得（トレンド分析用）
    const pastLogs = await env.DB.prepare(`
      SELECT * FROM health_logs 
      WHERE user_id = ? AND log_date < ? 
      ORDER BY log_date DESC LIMIT 7
    `).bind(userId, logDate).all<HealthLog>();

    // ユーザー情報取得
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId).first<any>();

    // 過去30日間のトレンドサマリー計算
    const last30Days = await env.DB.prepare(`
      SELECT 
        AVG(weight) as avg_weight,
        AVG(body_fat_percentage) as avg_bf,
        AVG(meal_calories) as avg_calories,
        AVG(sleep_hours) as avg_sleep,
        SUM(exercise_minutes) as total_exercise
      FROM health_logs 
      WHERE user_id = ? AND log_date >= date(?, '-30 days')
    `).bind(userId, logDate).first<any>();

    // 総カロリーと栄養素計算
    const totalCalories = (meals?.breakfast?.calories || 0) + (meals?.lunch?.calories || 0) + (meals?.dinner?.calories || 0);
    const totalProtein = (meals?.breakfast?.protein || 0) + (meals?.lunch?.protein || 0) + (meals?.dinner?.protein || 0);
    const totalCarbs = (meals?.breakfast?.carbs || 0) + (meals?.lunch?.carbs || 0) + (meals?.dinner?.carbs || 0);
    const totalFat = (meals?.breakfast?.fat || 0) + (meals?.lunch?.fat || 0) + (meals?.dinner?.fat || 0);

    // 運動データの取得（パラメータにない場合はDBから取得）
    let activities = exerciseActivities;
    if (!activities) {
      const activitiesResult = await env.DB.prepare(`
        SELECT * FROM exercise_activities WHERE health_log_id = ?
      `).bind(healthLog.id).all();
      activities = activitiesResult.results;
    }

    // 運動データの集計
    const totalExerciseCalories = activities?.reduce((sum: number, act: any) => sum + (act.calories_burned || 0), 0) || 0;
    const exerciseDetails = activities?.map((act: any) => 
      `${act.exercise_name}: ${act.duration_minutes}分（強度: ${act.intensity}, 消費: ${act.calories_burned}kcal）`
    ).join('\n') || 'なし';

    // AI分析用の包括的プロンプト作成
    const prompt = `あなたはファディー彦根のプロフェッショナルトレーナーです。30年のクライミング経験と科学的知見を基に、ユーザーの健康データを包括的に分析し、実用的なアドバイスを提供してください。

# ユーザー情報
- 名前: ${user?.name || '未設定'}
- 身長: ${user?.height || '未設定'}cm
- 目標: ${user?.goal || '未設定'}

# 今日の記録 (${logDate})
## 基本データ
- 体重: ${healthLog.weight || '未記録'}kg
- 体脂肪率: ${healthLog.body_fat_percentage || '未記録'}%
- 睡眠時間: ${healthLog.sleep_hours || '未記録'}時間

## 運動データ（詳細）
- 記録された運動種目数: ${activities?.length || 0}種目
- 総運動時間: ${healthLog.exercise_minutes || '未記録'}分
- 総消費カロリー: ${totalExerciseCalories}kcal
- 体調評価: ${healthLog.condition_rating || 3}/5
- 運動メモ: ${healthLog.condition_note || 'なし'}

### 運動詳細リスト
${exerciseDetails}

## 食事データ（本日）
- **朝食**: ${meals?.breakfast?.calories || 0}kcal (P:${meals?.breakfast?.protein || 0}g / C:${meals?.breakfast?.carbs || 0}g / F:${meals?.breakfast?.fat || 0}g)
- **昼食**: ${meals?.lunch?.calories || 0}kcal (P:${meals?.lunch?.protein || 0}g / C:${meals?.lunch?.carbs || 0}g / F:${meals?.lunch?.fat || 0}g)
- **夕食**: ${meals?.dinner?.calories || 0}kcal (P:${meals?.dinner?.protein || 0}g / C:${meals?.dinner?.carbs || 0}g / F:${meals?.dinner?.fat || 0}g)
- **総カロリー**: ${totalCalories}kcal
- **総タンパク質**: ${totalProtein}g
- **総炭水化物**: ${totalCarbs}g
- **総脂質**: ${totalFat}g

# 過去7日間の詳細トレンド
${pastLogs.results.map((log: HealthLog, i: number) => 
  `${i + 1}日前(${log.log_date}): 体重${log.weight || '-'}kg, 体脂肪${log.body_fat_percentage || '-'}%, 運動${log.exercise_minutes || 0}分, カロリー${log.meal_calories || 0}kcal, 睡眠${log.sleep_hours || '-'}h`
).join('\n')}

# 過去30日間の統計サマリー
- 平均体重: ${last30Days?.avg_weight?.toFixed(1) || '-'}kg
- 平均体脂肪率: ${last30Days?.avg_bf?.toFixed(1) || '-'}%
- 平均カロリー: ${last30Days?.avg_calories?.toFixed(0) || '-'}kcal/日
- 平均睡眠: ${last30Days?.avg_sleep?.toFixed(1) || '-'}時間
- 総運動時間: ${last30Days?.total_exercise || 0}分（月間）

# アドバイス作成要件

あなたは以下の観点から包括的な分析を行い、実用的なアドバイスを提供してください：

## 1. 現在の状態分析
- 今日入力されたすべてのデータ（体重、体脂肪率、食事、運動、睡眠）を総合評価
- PFC（タンパク質・脂質・炭水化物）バランスの評価
- カロリー摂取量の適切性（ユーザーの目標に対して）
- **運動種目と強度の評価**（記録された各運動の時間・強度・消費カロリーを分析）
- **摂取カロリーと消費カロリーのバランス**（食事による摂取 vs 運動による消費）

## 2. 過去データとの比較
- 過去7日間のトレンド変化（増加/減少/安定）
- 過去30日間の統計と比較した今日の位置づけ
- 継続的に改善できている点、注意すべき点
- **運動習慣の継続性**（運動種目の多様性、頻度、強度の変化）

## 3. 今後の課題と改善提案
- 短期目標（今週〜来週）
- 中期目標（今月〜来月）
- 具体的な数値目標（カロリー調整、運動時間増加など）
- ファディー彦根でのトレーニングへの取り組み方
- **運動プログラムの最適化**（推奨する運動種目、時間配分、強度調整）

## 4. 健康・トレーニングアドバイス
- クライミング的な視点での体作り
- 栄養バランスの最適化提案
- 回復とコンディショニング
- モチベーション維持のヒント
- **運動効果の最大化**（ファディー、ストレッチ、筋トレ等の効果的な組み合わせ）

# 出力形式（JSON）

以下のJSON形式で返してください。contentは250-400文字で、上記の分析観点をすべて含めた包括的な内容にしてください：

{
  "category": "meal|exercise|mental|sleep|weight のいずれか（最も重要な分野）",
  "title": "20文字以内の具体的で魅力的なタイトル",
  "content": "250-400文字の包括的アドバイス。現状評価→過去トレンド→今後の課題→具体的アクションを含む",
  "confidence_score": 0.0-1.0（データの充実度に基づくスコア）,
  "ai_analysis_data": {
    "current_status": ["今日のデータから読み取れる状態"],
    "past_trends": ["過去データから見えるトレンド"],
    "detected_issues": ["改善が必要な点"],
    "positive_points": ["継続できている良い点"],
    "short_term_goals": ["今週〜来週の目標"],
    "long_term_goals": ["今月〜来月の目標"],
    "recommendations": ["具体的な実行アクション（数値を含む）"]
  }
}`;

    // OpenAI API呼び出し
    console.log('🔄 Calling OpenAI API at', OPENAI_BASE_URL);
    const response = await fetch(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'あなたはファディー彦根の経験豊富なプロトレーナーです。クライミング30年の実績と最新の運動科学、栄養学の知識を持ち、データに基づいた実践的なアドバイスを提供します。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    const aiText = result.choices?.[0]?.message?.content || '';
    
    if (!aiText) {
      console.error('OpenAI response empty');
      return;
    }

    const aiAdvice = JSON.parse(aiText);

    // 既存のAIアドバイスを削除（上書きするため）
    await env.DB.prepare(`
      DELETE FROM advices 
      WHERE user_id = ? AND log_date = ? AND advice_source = 'ai'
    `).bind(userId, logDate).run();
    
    console.log('🗑️ Deleted old AI advice for user', userId, 'date', logDate);

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
      'AI トレーナー',
      0  // 未読
    ).run();

    console.log('✅ AI advice generated successfully for user', userId, 'date', logDate);
  } catch (error) {
    console.error('❌ AI advice generation error:', error);
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

    // 各ログに食事データと運動データを追加
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

      // 運動アクティビティを取得
      const exerciseActivities = await c.env.DB.prepare(`
        SELECT * FROM exercise_activities WHERE health_log_id = ?
      `).bind(log.id).all();

      return { 
        ...log, 
        meals: mealsObj,
        exercise_activities: exerciseActivities.results || []
      };
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
    
    console.log('Received body:', JSON.stringify(body, null, 2));

    // 同じ日付の既存ログをチェック
    const existingLog = await c.env.DB.prepare(
      'SELECT id FROM health_logs WHERE user_id = ? AND log_date = ? ORDER BY id DESC LIMIT 1'
    ).bind(userId, body.log_date).first<{ id: number }>();

    // 既存ログがある場合は上書き（UPSERT動作）
    if (existingLog) {
      console.log(`📝 Existing log found for ${body.log_date}, will overwrite (ID: ${existingLog.id})`);
      // 既存のmeals, exercise_activities, meal_photosを削除
      await c.env.DB.prepare('DELETE FROM exercise_activities WHERE health_log_id = ?').bind(existingLog.id).run();
      await c.env.DB.prepare('DELETE FROM meals WHERE health_log_id = ?').bind(existingLog.id).run();
      await c.env.DB.prepare('DELETE FROM health_logs WHERE id = ?').bind(existingLog.id).run();
      console.log(`🗑️ Deleted old log and related data for ID: ${existingLog.id}`);
    }

    // 食事データの合計を計算（間食も含む）
    const totalMealCalories = (body.meals?.breakfast?.calories || 0) + 
                              (body.meals?.lunch?.calories || 0) + 
                              (body.meals?.dinner?.calories || 0) +
                              (body.meals?.snack?.calories || 0);
    const totalMealProtein = (body.meals?.breakfast?.protein || 0) + 
                             (body.meals?.lunch?.protein || 0) + 
                             (body.meals?.dinner?.protein || 0) +
                             (body.meals?.snack?.protein || 0);
    const totalMealCarbs = (body.meals?.breakfast?.carbs || 0) + 
                           (body.meals?.lunch?.carbs || 0) + 
                           (body.meals?.dinner?.carbs || 0) +
                           (body.meals?.snack?.carbs || 0);
    const totalMealFat = (body.meals?.breakfast?.fat || 0) + 
                         (body.meals?.lunch?.fat || 0) + 
                         (body.meals?.dinner?.fat || 0) +
                         (body.meals?.snack?.fat || 0);

    // 1. health_logsレコードを作成（食事データも含む）
    const result = await c.env.DB.prepare(`
      INSERT INTO health_logs (
        user_id, log_date, weight, body_fat_percentage, body_temperature,
        sleep_hours, exercise_minutes, condition_rating, condition_note,
        meal_calories, meal_protein, meal_carbs, meal_fat, total_calories
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      body.log_date,
      body.weight || null,
      body.body_fat_percentage || null,
      body.body_temperature || null,
      body.sleep_hours || null,
      body.exercise_minutes || null,
      body.condition_rating || 3,
      body.condition_note || null,
      totalMealCalories,
      totalMealProtein,
      totalMealCarbs,
      totalMealFat,
      body.total_calories || totalMealCalories  // ユーザー入力値 or 自動計算値
    ).run();

    const healthLogId = result.meta.last_row_id;
    console.log(`✅ Health log created: ID=${healthLogId}, meal_calories=${totalMealCalories}, total_calories=${body.total_calories || totalMealCalories}`);

    // 2. mealsテーブルの作成（エラーがあっても継続）
    try {
      if (body.meals) {
        for (const [mealType, mealData] of Object.entries(body.meals)) {
          if (mealData && typeof mealData === 'object') {
            const meal: any = mealData;
            
            // カロリーが0でも保存する（空データも記録）
            
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
            console.log(`✅ Saved meal: ${mealType}, calories: ${meal.calories || 0}, protein: ${meal.protein || 0}`);

            // meal_photosレコードを作成（複数写真対応）
            if (meal.photos && Array.isArray(meal.photos) && meal.photos.length > 0) {
              for (let i = 0; i < meal.photos.length; i++) {
                if (meal.photos[i]) {
                  // 写真URLを文字列として取得（objectの場合はtoStringで変換）
                  const photoUrl = typeof meal.photos[i] === 'string' ? meal.photos[i] : String(meal.photos[i]);
                  await c.env.DB.prepare(`
                    INSERT INTO meal_photos (meal_id, photo_url, photo_order)
                    VALUES (?, ?, ?)
                  `).bind(mealId, photoUrl, i + 1).run();
                }
              }
            }
          }
        }
      }
    } catch (mealsError) {
      // mealsテーブルのエラーはログに記録するが、処理は継続
      console.error('meals table error (continuing):', mealsError);
    }

    // 運動アクティビティを保存
    try {
      if (body.exercise_activities && Array.isArray(body.exercise_activities)) {
        console.log(`💪 Saving ${body.exercise_activities.length} exercise activities for health_log_id=${healthLogId}`);
        
        for (const activity of body.exercise_activities) {
          const result = await c.env.DB.prepare(`
            INSERT INTO exercise_activities (
              health_log_id, exercise_type, exercise_name,
              duration_minutes, intensity, calories_burned
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            healthLogId,
            activity.exercise_type || 'other',
            activity.exercise_name || '',
            activity.duration_minutes || 0,
            activity.intensity || 'medium',
            activity.calories_burned || 0
          ).run();
          
          console.log(`✅ Saved exercise: ${activity.exercise_name}, duration: ${activity.duration_minutes}min, calories: ${activity.calories_burned}`);
        }
      } else {
        console.log('ℹ️ No exercise activities to save');
      }
    } catch (exerciseError) {
      console.error('❌ exercise_activities table error (continuing):', exerciseError);
    }

    const newLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ?'
    ).bind(healthLogId).first<HealthLog>();

    // AI自動分析を非同期で実行（レスポンスをブロックしない）
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        generateAIAdvice(c.env, userId, body.log_date, newLog as HealthLog, body.meals || {}, body.exercise_activities || [])
      );
    }

    return c.json<ApiResponse<HealthLog>>({
      success: true,
      data: newLog as HealthLog,
    });
  } catch (error) {
    console.error('ログ作成エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('エラー詳細:', errorMessage);
    return c.json<ApiResponse>({ 
      success: false, 
      error: `ログの作成に失敗しました: ${errorMessage}` 
    }, 500);
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
    let imageBase64: string | null = null;
    
    if (c.env.BUCKET) {
      // R2にアップロード
      const filename = `meals/${userId}/${Date.now()}-${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      await c.env.BUCKET.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });
      imageUrl = `/api/images/${filename}`;
      
      // Gemini API用にBase64エンコード
      const uint8Array = new Uint8Array(arrayBuffer);
      imageBase64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
    } else {
      // R2未設定の場合はモック画像URLを使用
      imageUrl = `https://picsum.photos/seed/${Date.now()}/400/300`;
    }

    // OpenAI APIキーを詳細設定から取得
    let openaiApiKey: string | null = null;
    try {
      const setting = await c.env.DB.prepare(
        'SELECT setting_value FROM settings WHERE setting_key = ?'
      ).bind('openai_api_key').first<{ setting_value: string }>();
      openaiApiKey = setting?.setting_value || null;
    } catch (error) {
      console.log('設定テーブルからAPIキー取得失敗、仮想実装を使用');
    }

    let analysis: any;
    
    // OpenAI APIが利用可能な場合は実際のAI解析
    if (openaiApiKey && imageBase64) {
      try {
        const openaiResponse = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: '画像の食事を分析して、以下のJSON形式のみで応答してください（説明文は不要）：{"食材": ["食材1", "食材2", ...], "カロリー": 数値, "タンパク質": 数値, "炭水化物": 数値, "脂質": 数値, "評価": "評価コメント"}' 
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${file.type};base64,${imageBase64}`
                    }
                  }
                ]
              }],
              max_tokens: 500
            })
          }
        );

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const textContent = openaiData.choices?.[0]?.message?.content || '';
          // JSONを抽出して解析
          const jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('JSON解析失敗');
          }
        } else {
          const errorText = await openaiResponse.text();
          console.error('OpenAI APIエラー:', errorText);
          throw new Error('OpenAI API呼び出し失敗');
        }
      } catch (error) {
        console.log('OpenAI API呼び出し失敗、仮想実装にフォールバック:', error);
        // APIエラー時は仮想実装にフォールバック
        analysis = generateMockAnalysis();
      }
    } else {
      // APIキーが未設定の場合は仮想実装
      console.log('OpenAI APIキー未設定、仮想実装を使用');
      analysis = generateMockAnalysis();
      console.log('仮想分析結果:', analysis);
    }

    // analysisが正しく生成されたか確認
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('AI解析結果の生成に失敗しました');
    }

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
        JSON.stringify(analysis),
        analysis.カロリー || 0,
        analysis.タンパク質 || 0,
        analysis.炭水化物 || 0,
        analysis.脂質 || 0,
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
        JSON.stringify(analysis),
        analysis.カロリー || 0,
        analysis.タンパク質 || 0,
        analysis.炭水化物 || 0,
        analysis.脂質 || 0
      ).run();
    }

    return c.json<ApiResponse<{ analysis: any; photoUrl: string }>>({
      success: true,
      data: {
        analysis: analysis,
        photoUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error('食事写真アップロードエラー:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: `写真のアップロードに失敗しました: ${error instanceof Error ? error.message : String(error)}` 
    }, 500);
  }
});

// 健康ログ更新
healthLogs.put('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const logId = c.req.param('id');
    const body = await c.req.json();
    
    console.log('PUT /:id - Received body:', JSON.stringify(body, null, 2));

    // ログの所有権確認
    const log = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ? AND user_id = ?'
    ).bind(logId, userId).first<HealthLog>();

    if (!log) {
      return c.json<ApiResponse>({ success: false, error: 'ログが見つかりません' }, 404);
    }

    // 食事データの合計を計算（間食も含む）
    const totalMealCalories = (body.meals?.breakfast?.calories || 0) + 
                              (body.meals?.lunch?.calories || 0) + 
                              (body.meals?.dinner?.calories || 0) +
                              (body.meals?.snack?.calories || 0);
    const totalMealProtein = (body.meals?.breakfast?.protein || 0) + 
                             (body.meals?.lunch?.protein || 0) + 
                             (body.meals?.dinner?.protein || 0) +
                             (body.meals?.snack?.protein || 0);
    const totalMealCarbs = (body.meals?.breakfast?.carbs || 0) + 
                           (body.meals?.lunch?.carbs || 0) + 
                           (body.meals?.dinner?.carbs || 0) +
                           (body.meals?.snack?.carbs || 0);
    const totalMealFat = (body.meals?.breakfast?.fat || 0) + 
                         (body.meals?.lunch?.fat || 0) + 
                         (body.meals?.dinner?.fat || 0) +
                         (body.meals?.snack?.fat || 0);

    // 1. health_logsレコードを更新（食事データも含む）
    await c.env.DB.prepare(`
      UPDATE health_logs SET
        weight = ?, body_fat_percentage = ?, body_temperature = ?,
        sleep_hours = ?, exercise_minutes = ?,
        condition_rating = ?, condition_note = ?,
        meal_calories = ?, meal_protein = ?, meal_carbs = ?, meal_fat = ?,
        total_calories = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.weight || null,
      body.body_fat_percentage || null,
      body.body_temperature || null,
      body.sleep_hours || null,
      body.exercise_minutes || null,
      body.condition_rating || 3,
      body.condition_note || null,
      totalMealCalories,
      totalMealProtein,
      totalMealCarbs,
      totalMealFat,
      body.total_calories || totalMealCalories,  // ユーザー入力値 or 自動計算値
      logId
    ).run();
    
    console.log(`✅ Health log updated: ID=${logId}, meal_calories=${totalMealCalories}, total_calories=${body.total_calories || totalMealCalories}`);

    // 2. mealsテーブルの更新（エラーがあっても継続）
    try {
      // 既存のmealsレコードを削除
      await c.env.DB.prepare('DELETE FROM meals WHERE health_log_id = ?').bind(logId).run();

      // mealsレコードを作成（breakfast, lunch, dinner）
      if (body.meals) {
        for (const [mealType, mealData] of Object.entries(body.meals)) {
          if (mealData && typeof mealData === 'object') {
            const meal: any = mealData;
            
            // カロリーが0でも保存する（空データも記録）
            
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
            console.log(`✅ Saved meal: ${mealType}, calories: ${meal.calories || 0}, protein: ${meal.protein || 0}`);

            // meal_photosレコードを作成（複数写真対応）
            if (meal.photos && Array.isArray(meal.photos) && meal.photos.length > 0) {
              for (let i = 0; i < meal.photos.length; i++) {
                if (meal.photos[i]) {
                  // 写真URLを文字列として取得（objectの場合はtoStringで変換）
                  const photoUrl = typeof meal.photos[i] === 'string' ? meal.photos[i] : String(meal.photos[i]);
                  await c.env.DB.prepare(`
                    INSERT INTO meal_photos (meal_id, photo_url, photo_order)
                    VALUES (?, ?, ?)
                  `).bind(mealId, photoUrl, i + 1).run();
                }
              }
            }
          }
        }
      }
    } catch (mealsError) {
      // mealsテーブルのエラーはログに記録するが、処理は継続
      console.error('meals table error (continuing):', mealsError);
    }

    // 運動アクティビティを更新（既存を削除して再作成）
    try {
      // 既存のexercise_activitiesレコードを削除
      await c.env.DB.prepare('DELETE FROM exercise_activities WHERE health_log_id = ?').bind(logId).run();
      console.log(`🗑️ Deleted old exercise activities for health_log_id=${logId}`);

      if (body.exercise_activities && Array.isArray(body.exercise_activities)) {
        console.log(`💪 Saving ${body.exercise_activities.length} exercise activities for health_log_id=${logId}`);
        
        for (const activity of body.exercise_activities) {
          const result = await c.env.DB.prepare(`
            INSERT INTO exercise_activities (
              health_log_id, exercise_type, exercise_name,
              duration_minutes, intensity, calories_burned
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            logId,
            activity.exercise_type || 'other',
            activity.exercise_name || '',
            activity.duration_minutes || 0,
            activity.intensity || 'medium',
            activity.calories_burned || 0
          ).run();
          
          console.log(`✅ Saved exercise: ${activity.exercise_name}, duration: ${activity.duration_minutes}min, calories: ${activity.calories_burned}`);
        }
      } else {
        console.log('ℹ️ No exercise activities to save');
      }
    } catch (exerciseError) {
      console.error('❌ exercise_activities table error (continuing):', exerciseError);
    }

    const updatedLog = await c.env.DB.prepare(
      'SELECT * FROM health_logs WHERE id = ?'
    ).bind(logId).first<HealthLog>();

    // AI自動分析を非同期で実行（既存のアドバイスがあれば上書き）
    if (c.executionCtx) {
      c.executionCtx.waitUntil(
        generateAIAdvice(c.env, userId, log.log_date, updatedLog as HealthLog, body.meals || {}, body.exercise_activities || [])
      );
    }

    return c.json<ApiResponse<HealthLog>>({
      success: true,
      data: updatedLog as HealthLog,
    });
  } catch (error) {
    console.error('ログ更新エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('エラー詳細:', errorMessage);
    return c.json<ApiResponse>({ 
      success: false, 
      error: `ログの更新に失敗しました: ${errorMessage}` 
    }, 500);
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
