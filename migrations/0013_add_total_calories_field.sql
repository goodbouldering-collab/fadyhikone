-- Add total_calories field to health_logs table
-- This field stores the user's manually input total calories,
-- which may differ from the sum of meal_calories (breakfast + lunch + dinner + snack)

ALTER TABLE health_logs ADD COLUMN total_calories INTEGER DEFAULT 0;

-- Update existing records: set total_calories to meal_calories as initial value
UPDATE health_logs SET total_calories = meal_calories WHERE total_calories = 0;
