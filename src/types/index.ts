// Cloudflare bindings型定義
export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: any;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  JWT_SECRET: string;
};

// ユーザー型
export type User = {
  id: number;
  email: string;
  name: string;
  provider: 'google' | 'line';
  provider_id: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

// 健康ログ型
export type HealthLog = {
  id: number;
  user_id: number;
  log_date: string;
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_description?: string;
  meal_image_url?: string;
  exercise_type?: string;
  exercise_duration?: number;
  sleep_hours?: number;
  mood?: 'excellent' | 'good' | 'normal' | 'bad' | 'terrible';
  notes?: string;
  ai_analysis?: string;
  created_at: string;
  updated_at: string;
};

// スタッフアドバイス型
export type StaffAdvice = {
  id: number;
  user_id: number;
  staff_name: string;
  advice_text: string;
  advice_type: 'diet' | 'exercise' | 'lifestyle' | 'general';
  is_read: boolean;
  created_at: string;
};

// 問い合わせ型
export type Inquiry = {
  id: number;
  user_id?: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  resolved_at?: string;
};

// JWT ペイロード型
export type JWTPayload = {
  userId: number;
  email: string;
  role: string;
  exp: number;
};

// API レスポンス型
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
