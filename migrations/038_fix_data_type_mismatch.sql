-- Fix the get_appointments_needing_completion function to ensure correct data types
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
    COALESCE(a.client_first_name::TEXT, '') as client_first_name,
    COALESCE(a.client_last_name::TEXT, '') as client_last_name,
    COALESCE(a.client_email::TEXT, '') as client_email,
    COALESCE(a.client_phone::TEXT, '') as client_phone,
    a.practitioner_id,
    COALESCE(p.first_name::TEXT, '') as practitioner_first_name,
    COALESCE(p.last_name::TEXT, '') as practitioner_last_name,
    CASE 
      WHEN a.service_ids IS NOT NULL AND jsonb_typeof(a.service_ids) = 'array' THEN
        COALESCE(
          (SELECT ARRAY_AGG(s.name::TEXT) 
           FROM services s 
           WHERE s.id::text = ANY(
             SELECT jsonb_array_elements_text(a.service_ids)
           )
           AND s.is_active = true 
           AND s.is_deleted = false),
          ARRAY[]::TEXT[]
        )
      ELSE ARRAY[]::TEXT[]
    END as service_names,
    COALESCE(a.notes::TEXT, '') as notes,
    a.status::TEXT
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
        SELECT 1 FROM users u 
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = user_id_param 
        AND r.name = 'super_admin'
        AND u.is_active = true
        AND u.is_deleted = false
      )
    )
  ORDER BY a.end_time DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_appointments_needing_completion(UUID) TO authenticated;
