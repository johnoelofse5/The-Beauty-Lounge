-- Migration: Create blocked dates table
-- Date: $(date)
-- Description: Allow practitioners to block specific dates so clients cannot book appointments on those days

-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_blocked_dates_practitioner ON public.blocked_dates (practitioner_id) 
    WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_blocked_dates_date ON public.blocked_dates (blocked_date) 
    WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_blocked_dates_practitioner_date ON public.blocked_dates (practitioner_id, blocked_date) 
    WHERE is_active = TRUE AND is_deleted = FALSE;

-- Create unique index to prevent duplicate blocked dates for the same practitioner and date (only for active, non-deleted records)
CREATE UNIQUE INDEX idx_unique_practitioner_blocked_date ON public.blocked_dates (practitioner_id, blocked_date) 
    WHERE is_active = TRUE AND is_deleted = FALSE;

-- Add comments
COMMENT ON TABLE public.blocked_dates IS 'Stores dates that practitioners have blocked from client bookings';
COMMENT ON COLUMN public.blocked_dates.blocked_date IS 'The specific date that is blocked';
COMMENT ON COLUMN public.blocked_dates.reason IS 'Optional reason for blocking the date (e.g., holiday, time off)';

-- Enable RLS
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Practitioners can view their own blocked dates
CREATE POLICY "Practitioners can view own blocked dates" 
    ON public.blocked_dates FOR SELECT 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Clients can view blocked dates for practitioners (to see unavailable dates)
CREATE POLICY "Clients can view practitioner blocked dates" 
    ON public.blocked_dates FOR SELECT 
    USING (
        is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Practitioners can insert their own blocked dates
CREATE POLICY "Practitioners can create own blocked dates" 
    ON public.blocked_dates FOR INSERT 
    WITH CHECK (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Practitioners can update their own blocked dates
CREATE POLICY "Practitioners can update own blocked dates" 
    ON public.blocked_dates FOR UPDATE 
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

-- Practitioners can delete their own blocked dates
CREATE POLICY "Practitioners can delete own blocked dates" 
    ON public.blocked_dates FOR DELETE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Super admins can view all blocked dates
CREATE POLICY "Super admins can view all blocked dates" 
    ON public.blocked_dates FOR SELECT 
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

-- Super admins can manage all blocked dates
CREATE POLICY "Super admins can manage all blocked dates" 
    ON public.blocked_dates FOR ALL 
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
CREATE OR REPLACE FUNCTION update_blocked_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_blocked_dates_updated_at
    BEFORE UPDATE ON public.blocked_dates
    FOR EACH ROW
    EXECUTE FUNCTION update_blocked_dates_updated_at();

-- Example queries:
-- Get all blocked dates for a practitioner:
-- SELECT * FROM blocked_dates WHERE practitioner_id = 'practitioner-uuid' AND is_active = TRUE AND is_deleted = FALSE ORDER BY blocked_date;

-- Check if a specific date is blocked:
-- SELECT EXISTS (
--     SELECT 1 FROM blocked_dates 
--     WHERE practitioner_id = 'practitioner-uuid' 
--     AND blocked_date = '2024-01-15' 
--     AND is_active = TRUE 
--     AND is_deleted = FALSE
-- );
