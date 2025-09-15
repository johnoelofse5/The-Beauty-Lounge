-- Migration: Add time slot interval to working schedule
-- Date: $(date)
-- Description: Add configurable time slot interval for practitioners

-- Add time_slot_interval_minutes column to working_schedule table
ALTER TABLE public.working_schedule 
ADD COLUMN time_slot_interval_minutes INTEGER DEFAULT 30 CHECK (time_slot_interval_minutes > 0 AND time_slot_interval_minutes <= 120);

-- Add comment
COMMENT ON COLUMN public.working_schedule.time_slot_interval_minutes IS 'Time slot interval in minutes (15, 30, 45, 60, etc.)';

-- Update existing records to have default 30-minute intervals
UPDATE public.working_schedule 
SET time_slot_interval_minutes = 30 
WHERE time_slot_interval_minutes IS NULL;
