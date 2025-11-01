-- Migration: Add database function to soft delete blocked dates (bypasses RLS)
-- Date: $(date)
-- Description: Create a SECURITY DEFINER function that can soft delete blocked dates
-- This is an alternative approach if RLS policies continue to cause issues

-- Create function to soft delete a blocked date
-- Uses SECURITY DEFINER so it runs with the function owner's privileges
CREATE OR REPLACE FUNCTION public.soft_delete_blocked_date(
    p_practitioner_id UUID,
    p_blocked_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Update the blocked date to mark it as deleted
    UPDATE public.blocked_dates
    SET 
        is_deleted = TRUE,
        is_active = FALSE,
        updated_at = NOW()
    WHERE 
        practitioner_id = p_practitioner_id
        AND blocked_date = p_blocked_date
        AND is_deleted = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_blocked_date(UUID, DATE) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.soft_delete_blocked_date IS 'Soft deletes a blocked date for a practitioner. Bypasses RLS by using SECURITY DEFINER.';
