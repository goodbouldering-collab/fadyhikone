-- ===================================================================
-- Migration 0011: health_logsに食事関連カラムを追加（互換性維持）
-- 目的: OpenAI API連携でのAI解析をサポート
-- ===================================================================

-- health_logsテーブルに食事関連カラムを追加
ALTER TABLE health_logs ADD COLUMN meal_photo_url TEXT;
ALTER TABLE health_logs ADD COLUMN meal_analysis TEXT;
ALTER TABLE health_logs ADD COLUMN meal_calories INTEGER DEFAULT 0;
ALTER TABLE health_logs ADD COLUMN meal_protein REAL DEFAULT 0;
ALTER TABLE health_logs ADD COLUMN meal_carbs REAL DEFAULT 0;
ALTER TABLE health_logs ADD COLUMN meal_fat REAL DEFAULT 0;

-- ===================================================================
-- マイグレーション完了
-- これにより、health_logsテーブルで直接AI解析結果を保存できる
-- ===================================================================
