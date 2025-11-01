-- Migration: Allow blocked dates soft delete - simplified permissive policy
-- Date: $(date)
-- Description: Create a more permissive UPDATE policy that only checks ownership

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Practitioners can update own blocked dates" ON public.blocked_dates;

-- Create a very permissive policy that only checks ownership
-- This allows any update as long as the practitioner owns the row
CREATE POLICY "Practitioners can update own blocked dates" 
    ON public.blocked_dates FOR UPDATE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        -- Only check ownership - allow any update including is_deleted = true
        practitioner_id = auth.uid()
    );

-- Also update super admin policy to be more permissive
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
        -- Only check admin role - allow any update including soft deletes
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
    );
