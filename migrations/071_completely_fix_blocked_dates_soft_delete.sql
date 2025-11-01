-- Migration: Completely fix blocked dates soft delete by using minimal RLS policy
-- Date: $(date)
-- Description: Drop all UPDATE policies and create a single, minimal policy that only checks ownership

-- First, let's see what policies exist (for debugging - comment out in production)
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'blocked_dates';

-- Drop ALL existing policies for blocked_dates to avoid conflicts
-- This uses a DO block to dynamically drop all policies regardless of name
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies for the blocked_dates table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'blocked_dates') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.blocked_dates';
    END LOOP;
END $$;

-- Create a single, simple UPDATE policy that only checks ownership
-- This allows any update (including soft delete) as long as the user owns the row
CREATE POLICY "Practitioners can update own blocked dates" 
    ON public.blocked_dates FOR UPDATE 
    USING (
        -- Can only update rows you own that are currently active
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    )
    WITH CHECK (
        -- After update, only requirement is that you still own it
        -- This allows setting is_deleted = true
        practitioner_id = auth.uid()
    );

-- Recreate all necessary policies

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

-- Practitioners can delete their own blocked dates
CREATE POLICY "Practitioners can delete own blocked dates" 
    ON public.blocked_dates FOR DELETE 
    USING (
        practitioner_id = auth.uid() 
        AND is_active = TRUE 
        AND is_deleted = FALSE
    );

-- Recreate super admin policies separately for SELECT, INSERT, UPDATE, DELETE
-- This avoids conflicts with the practitioner policy
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
    );

CREATE POLICY "Super admins can insert blocked dates" 
    ON public.blocked_dates FOR INSERT 
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

CREATE POLICY "Super admins can update all blocked dates" 
    ON public.blocked_dates FOR UPDATE 
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

CREATE POLICY "Super admins can delete all blocked dates" 
    ON public.blocked_dates FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'super_admin'
            AND u.is_active = TRUE 
            AND u.is_deleted = FALSE
        )
    );
