-- Migration: Create working schedule table
-- Date: $(date)
-- Description: Allow practitioners to manage their working days and hours

-- Create working_schedule table
CREATE TABLE IF NOT EXISTS public.working_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure start_time is before end_time
    CONSTRAINT check_time_order CHECK (start_time < end_time)
);

-- Create indexes for efficient querying
CREATE INDEX idx_working_schedule_practitioner ON public.working_schedule (practitioner_id) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_working_schedule_day ON public.working_schedule (day_of_week) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_working_schedule_practitioner_day ON public.working_schedule (practitioner_id, day_of_week) WHERE is_active = TRUE AND is_deleted = FALSE;

-- Create unique index to prevent duplicate schedules for the same practitioner and day
CREATE UNIQUE INDEX idx_unique_practitioner_day ON public.working_schedule (practitioner_id, day_of_week) 
WHERE is_active = TRUE AND is_deleted = FALSE;

-- Add comments
COMMENT ON TABLE public.working_schedule IS 'Stores working hours for practitioners by day of week';
COMMENT ON COLUMN public.working_schedule.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN public.working_schedule.start_time IS 'Start time of working hours (HH:MM:SS format)';
COMMENT ON COLUMN public.working_schedule.end_time IS 'End time of working hours (HH:MM:SS format)';

-- Enable RLS
ALTER TABLE public.working_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Practitioners can view their own schedule
CREATE POLICY "Practitioners can view own schedule" 
    ON public.working_schedule FOR SELECT 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Practitioners can insert their own schedule
CREATE POLICY "Practitioners can create own schedule" 
    ON public.working_schedule FOR INSERT 
    WITH CHECK (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Practitioners can update their own schedule
CREATE POLICY "Practitioners can update own schedule" 
    ON public.working_schedule FOR UPDATE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Practitioners can delete their own schedule
CREATE POLICY "Practitioners can delete own schedule" 
    ON public.working_schedule FOR DELETE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Super admins can view all schedules
CREATE POLICY "Super admins can view all schedules" 
    ON public.working_schedule FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Super admins can manage all schedules
CREATE POLICY "Super admins can manage all schedules" 
    ON public.working_schedule FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
        AND is_active = TRUE 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_working_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_working_schedule_updated_at
    BEFORE UPDATE ON public.working_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_working_schedule_updated_at();

-- Example queries:
-- Get working schedule for a practitioner:
-- SELECT * FROM working_schedule WHERE practitioner_id = 'practitioner-uuid' AND is_active = TRUE AND is_deleted = FALSE ORDER BY day_of_week, start_time;

-- Get working hours for a specific day:
-- SELECT start_time, end_time FROM working_schedule WHERE practitioner_id = 'practitioner-uuid' AND day_of_week = 1 AND is_active = TRUE AND is_deleted = FALSE;
