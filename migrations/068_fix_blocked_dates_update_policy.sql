-- Migration: Fix blocked dates UPDATE policy to allow soft deletes
-- Date: $(date)
-- Description: Allow practitioners to update blocked dates to set is_deleted = true (soft delete)

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Practitioners can update own blocked dates" ON public.blocked_dates;

-- Create updated policy that allows soft deletes
-- USING clause: what rows can be updated (must be active and not deleted)
-- WITH CHECK clause: what the new row state can be (allows setting is_deleted = true)
CREATE POLICY "Practitioners can update own blocked dates" 
    ON public.blocked_dates FOR UPDATE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        practitioner_id = auth.uid()
        -- Allow any update as long as the practitioner owns it
        -- This allows setting is_deleted = true (soft delete)
    );

-- Also update the super admin policy to allow soft deletes
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
    );
