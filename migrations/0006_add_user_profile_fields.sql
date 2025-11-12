-- Add profile fields to users table
ALTER TABLE users ADD COLUMN height REAL; -- 身長 (cm)
ALTER TABLE users ADD COLUMN weight REAL; -- 体重 (kg)
ALTER TABLE users ADD COLUMN birth_date TEXT; -- 生年月日 (YYYY-MM-DD)
ALTER TABLE users ADD COLUMN gender TEXT; -- 性別 (male/female/other)
