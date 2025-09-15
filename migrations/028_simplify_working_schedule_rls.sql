-- Migration: Simplify RLS policies for working_schedule table
-- Date: $(date)
-- Description: Create simpler, more permissive RLS policies for working_schedule

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view active schedules" ON public.working_schedule;
DROP POLICY IF EXISTS "Practitioners can manage their own schedules" ON public.working_schedule;
DROP POLICY IF EXISTS "Super admins can manage all schedules" ON public.working_schedule;
DROP POLICY IF EXISTS "Super admins can view all schedules" ON public.working_schedule;
DROP POLICY IF EXISTS "Super admins can manage all schedules" ON public.working_schedule;

-- Create simple, permissive policies

-- Allow everyone to view active schedules
CREATE POLICY "Allow viewing active schedules" 
    ON public.working_schedule FOR SELECT 
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Allow practitioners to manage their own schedules (simplified)
CREATE POLICY "Allow practitioners to manage own schedules" 
    ON public.working_schedule FOR ALL 
    USING (practitioner_id = auth.uid())
    WITH CHECK (practitioner_id = auth.uid());

-- Allow super admins to manage all schedules (simplified)
CREATE POLICY "Allow super admins to manage all schedules" 
    ON public.working_schedule FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
        )
    );
