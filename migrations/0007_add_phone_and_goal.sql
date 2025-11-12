-- Add phone and goal fields to users table
ALTER TABLE users ADD COLUMN phone TEXT; -- 電話番号
ALTER TABLE users ADD COLUMN goal TEXT; -- 目標・備考
