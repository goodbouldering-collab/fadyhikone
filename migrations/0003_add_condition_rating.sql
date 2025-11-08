-- Add condition rating to health_logs
ALTER TABLE health_logs ADD COLUMN condition_rating INTEGER DEFAULT 3 CHECK(condition_rating >= 1 AND condition_rating <= 5);

-- Add comment to explain: 1=Very Bad, 2=Bad, 3=Normal, 4=Good, 5=Excellent
