-- Migration: Fix blocked dates UPDATE policy to explicitly allow soft deletes
-- Date: $(date)
-- Description: Ensure practitioners can update blocked dates to set is_deleted = true (soft delete)
-- This is a fix for migration 068 if it didn't work as expected

-- Drop and recreate the UPDATE policy with explicit soft delete permission
DROP POLICY IF EXISTS "Practitioners can update own blocked dates" ON public.blocked_dates;

-- Create policy that explicitly allows soft deletes
-- USING: Can only update rows that belong to the user and are currently active/not deleted
-- WITH CHECK: After update, must belong to user, and explicitly allows is_deleted = true
CREATE POLICY "Practitioners can update own blocked dates" 
    ON public.blocked_dates FOR UPDATE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        practitioner_id = auth.uid()
        -- Explicitly allow is_deleted = true (soft delete) OR keep existing active state
        -- This is necessary because PostgreSQL RLS checks the new row values in WITH CHECK
        AND (
            is_deleted = TRUE OR 
            (is_active = TRUE AND is_deleted = FALSE)
        )
    );

-- Also fix the super admin policy to allow soft deletes
DROP POLICY IF EXISTS "Super admins can manage all blocked dates" ON public.blocked_dates;

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
        -- Allow soft deletes for super admins too
        AND (
            is_deleted = TRUE OR 
            (is_active = TRUE AND is_deleted = FALSE)
        )
    );

-- Verify the policies were created correctly
-- You can check with: SELECT * FROM pg_policies WHERE tablename = 'blocked_dates';
