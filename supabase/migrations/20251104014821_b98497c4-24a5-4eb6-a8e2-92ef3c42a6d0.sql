-- Remove allow_simultaneous_bookings column
ALTER TABLE company_settings
DROP COLUMN IF EXISTS allow_simultaneous_bookings;

-- Add new fields for monthly opening configuration
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS opening_type TEXT DEFAULT 'date_range' CHECK (opening_type IN ('date_range', 'week_defined')),
ADD COLUMN IF NOT EXISTS opening_start_day INTEGER DEFAULT 1 CHECK (opening_start_day BETWEEN 1 AND 31),
ADD COLUMN IF NOT EXISTS opening_end_day INTEGER DEFAULT 5 CHECK (opening_end_day BETWEEN 1 AND 31),
ADD COLUMN IF NOT EXISTS opening_week TEXT CHECK (opening_week IN ('first', 'second', 'third', 'fourth', 'last'));

-- Update auto_mark_no_show_hours max to 24
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS auto_mark_no_show_hours INTEGER DEFAULT 1,
DROP CONSTRAINT IF EXISTS company_settings_auto_mark_no_show_hours_check,
ADD CONSTRAINT company_settings_auto_mark_no_show_hours_check CHECK (auto_mark_no_show_hours BETWEEN 1 AND 24);
