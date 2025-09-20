-- Fix the get_appointments_needing_completion function to handle null service_ids
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
    a.client_first_name,
    a.client_last_name,
    a.client_email,
    a.client_phone,
    a.practitioner_id,
    p.first_name as practitioner_first_name,
    p.last_name as practitioner_last_name,
    CASE 
      WHEN a.service_ids IS NOT NULL AND array_length(a.service_ids, 1) > 0 THEN
        COALESCE(
          (SELECT ARRAY_AGG(s.name) 
           FROM services s 
           WHERE s.id = ANY(a.service_ids) 
           AND s.is_active = true 
           AND s.is_deleted = false),
          ARRAY[]::TEXT[]
        )
      ELSE ARRAY[]::TEXT[]
    END as service_names,
    a.notes,
    a.status
  FROM appointments a
  LEFT JOIN users p ON a.practitioner_id = p.id
  WHERE 
    a.end_time < NOW()
    AND a.status = 'completed'
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
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_id_param 
        AND r.name = 'super_admin'
      )
    )
  ORDER BY a.end_time DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_appointments_needing_completion(UUID) TO authenticated;
