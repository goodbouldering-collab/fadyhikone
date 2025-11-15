-- アドバイステーブルの改善（日付ごとの記録を強化）

-- log_dateにインデックスを追加（既存の場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_advices_log_date ON advices(log_date DESC);

-- user_id + log_date の複合インデックス（既存の場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_advices_user_date ON advices(user_id, log_date DESC);

-- advice_sourceにインデックス追加（AI/スタッフのフィルタリング高速化）
CREATE INDEX IF NOT EXISTS idx_advices_source ON advices(advice_source);

-- 既読状態のインデックス（未読フィルタリング高速化）
CREATE INDEX IF NOT EXISTS idx_advices_is_read ON advices(is_read);

-- 複合インデックス：ユーザー + 日付 + ソース（最適なクエリパフォーマンス）
CREATE INDEX IF NOT EXISTS idx_advices_user_date_source ON advices(user_id, log_date DESC, advice_source);
