-- Migration: Fix RLS policies for working_schedule table
-- Date: $(date)
-- Description: Allow practitioners to manage their own working schedules

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view all schedules" ON public.working_schedule;
DROP POLICY IF EXISTS "Super admins can manage all schedules" ON public.working_schedule;

-- Create new policies that allow practitioners to manage their own schedules

-- Anyone can view active schedules
CREATE POLICY "Anyone can view active schedules" 
    ON public.working_schedule FOR SELECT 
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Practitioners can manage their own schedules
CREATE POLICY "Practitioners can manage their own schedules" 
    ON public.working_schedule FOR ALL 
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
