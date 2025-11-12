-- Enhance advices table for daily AI and staff advices
ALTER TABLE advices ADD COLUMN log_date TEXT; -- 対象日付 (YYYY-MM-DD)
ALTER TABLE advices ADD COLUMN advice_source TEXT DEFAULT 'staff'; -- 'ai' or 'staff'
ALTER TABLE advices ADD COLUMN ai_analysis_data TEXT; -- AI分析の詳細データ（JSON形式）
ALTER TABLE advices ADD COLUMN confidence_score REAL; -- AI分析の信頼度スコア (0.0-1.0)

-- Create index for faster queries by date and user
CREATE INDEX IF NOT EXISTS idx_advices_user_date ON advices(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_advices_source ON advices(advice_source);
