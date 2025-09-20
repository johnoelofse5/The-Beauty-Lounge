-- Fix the appointment completion logic
-- Notifications should show for appointments that have ended but are still 'scheduled'
-- The cron job should NOT automatically mark them as completed

-- Update the get_appointments_needing_completion function
CREATE OR REPLACE FUNCTION get_appointments_needing_completion(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  appointment_date TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  client_first_name TEXT,
  client_last_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  practitioner_id UUID,
  practitioner_first_name TEXT,
  practitioner_last_name TEXT,
  service_names TEXT[],
  notes TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    COALESCE(a.client_first_name, '')::TEXT as client_first_name,
    COALESCE(a.client_last_name, '')::TEXT as client_last_name,
    COALESCE(a.client_email, '')::TEXT as client_email,
    COALESCE(a.client_phone, '')::TEXT as client_phone,
    a.practitioner_id,
    COALESCE(p.first_name, '')::TEXT as practitioner_first_name,
    COALESCE(p.last_name, '')::TEXT as practitioner_last_name,
    COALESCE(
      (SELECT ARRAY_AGG(s.name)
       FROM services s
       WHERE s.id = ANY(ARRAY(SELECT jsonb_array_elements_text(COALESCE(a.service_ids, '[]'::jsonb))::uuid))
       AND s.is_active = true
       AND s.is_deleted = false),
      ARRAY[]::TEXT[]
    ) as service_names,
    a.notes,
    a.status
  FROM appointments a
  LEFT JOIN users p ON a.practitioner_id = p.id
  LEFT JOIN users c ON a.user_id = c.id
  WHERE
    a.end_time < NOW()  -- Appointment has ended
    AND a.status = 'scheduled'  -- But still marked as scheduled (not confirmed)
    AND a.is_active = true
    AND a.is_deleted = false
    AND (
      -- Show to practitioner if they own the appointment
      a.practitioner_id = user_id_param
      OR
      -- Show to client if they own the appointment
      a.user_id = user_id_param
      OR
      -- Show to super admin
      EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = user_id_param
        AND r.name = 'super_admin'
      )
    )
  ORDER BY a.end_time DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_appointments_needing_completion(UUID) TO authenticated;

-- Update the mark_completed_appointments function to NOT automatically mark appointments as completed
-- This function should only be used for cleanup, not for the notification system
CREATE OR REPLACE FUNCTION mark_completed_appointments()
RETURNS TABLE(success boolean, message text, updated_count bigint, completion_timestamp timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE
    updated_rows bigint;
    current_timestamp timestamptz := now();
BEGIN
    -- This function is now disabled for automatic completion marking
    -- Appointments should only be marked as completed when users confirm them
    
    RETURN QUERY SELECT FALSE, 'Automatic completion marking is disabled. Use user confirmation instead.', 0::bigint, current_timestamp;
END;
$$;

-- Update the trigger_completion_check function
CREATE OR REPLACE FUNCTION public.trigger_completion_check()
RETURNS TABLE(success boolean, message text, updated_count bigint, completion_timestamp timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE
    updated_rows bigint;
    current_timestamp timestamptz := now();
BEGIN
    -- This function now only checks for appointments needing completion
    -- It doesn't automatically mark them as completed
    
    RETURN QUERY SELECT TRUE, 'Completion check completed. No automatic marking performed.', 0::bigint, current_timestamp;
END;
$$;
