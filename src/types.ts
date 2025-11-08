// Cloudflare Bindings
export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
};

// User
export type User = {
  id: number;
  email: string;
  name: string;
  auth_provider: 'google' | 'line';
  auth_provider_id: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

// Health Log
export type HealthLog = {
  id: number;
  user_id: number;
  log_date: string;
  weight?: number;
  body_fat_percentage?: number;
  body_temperature?: number;
  sleep_hours?: number;
  meal_photo_url?: string;
  meal_analysis?: string;
  meal_calories?: number;
  meal_protein?: number;
  meal_carbs?: number;
  meal_fat?: number;
  exercise_minutes?: number;
  condition_note?: string;
  created_at: string;
  updated_at: string;
};

// Advice
export type Advice = {
  id: number;
  user_id: number;
  staff_name: string;
  advice_type: 'diet' | 'exercise' | 'general';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

// Inquiry
export type Inquiry = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied' | 'closed';
  admin_reply?: string;
  created_at: string;
  updated_at: string;
};

// JWT Payload
export type JWTPayload = {
  userId: number;
  email: string;
  role: string;
  exp: number;
};

// API Response
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
