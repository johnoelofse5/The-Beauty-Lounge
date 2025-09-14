-- Migration: Add RLS policy for practitioners to create appointments for clients
-- Date: $(date)
-- Description: Allow practitioners to create appointments where they are the practitioner but the client is someone else

-- Add RLS policy for practitioners to create appointments for clients
CREATE POLICY "Practitioners can create appointments for clients" 
  ON public.appointments FOR insert 
  WITH CHECK (
    -- Allow if the current user is a practitioner and is assigned as the practitioner
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_practitioner = true 
      AND is_active = true 
      AND is_deleted = false
    )
    AND practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
  );

-- Add RLS policy for practitioners to view appointments they are assigned to
CREATE POLICY "Practitioners can view assigned appointments" 
  ON public.appointments FOR select 
  USING (
    -- Allow if the current user is a practitioner and is assigned to this appointment
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_practitioner = true 
      AND is_active = true 
      AND is_deleted = false
    )
    AND practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
  );

-- Add RLS policy for practitioners to update appointments they are assigned to
CREATE POLICY "Practitioners can update assigned appointments" 
  ON public.appointments FOR update 
  USING (
    -- Allow if the current user is a practitioner and is assigned to this appointment
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_practitioner = true 
      AND is_active = true 
      AND is_deleted = false
    )
    AND practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
  )
  WITH CHECK (
    -- Ensure they remain the practitioner after update
    practitioner_id = auth.uid()
    AND is_active = true 
    AND is_deleted = false
  );

-- Add RLS policy for super admins to have full access
CREATE POLICY "Super admins can manage all appointments" 
  ON public.appointments FOR ALL 
  USING (
    -- Allow if the current user is a super admin
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'super_admin'
      AND u.is_active = true 
      AND u.is_deleted = false
      AND r.is_active = true 
      AND r.is_deleted = false
    )
  )
  WITH CHECK (
    -- Allow if the current user is a super admin
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'super_admin'
      AND u.is_active = true 
      AND u.is_deleted = false
      AND r.is_active = true 
      AND r.is_deleted = false
    )
  );
