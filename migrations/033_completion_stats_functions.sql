-- Function to manually trigger completion check (can be called from frontend)
CREATE OR REPLACE FUNCTION trigger_completion_check()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Call the completion function
  PERFORM mark_completed_appointments();
  
  -- Get the count of updated rows
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'message', 'Completion check completed',
    'updated_count', updated_count,
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION trigger_completion_check() TO authenticated;

-- Create a function to get completion statistics
CREATE OR REPLACE FUNCTION get_completion_stats(user_id_param UUID)
RETURNS TABLE (
  total_completed INTEGER,
  pending_confirmation INTEGER,
  recent_completions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total completed appointments
    (SELECT COUNT(*)::INTEGER 
     FROM appointments 
     WHERE status = 'completed' 
     AND is_active = true 
     AND is_deleted = false
     AND (
       practitioner_id = user_id_param
       OR EXISTS (
         SELECT 1 FROM user_roles ur 
         WHERE ur.user_id = user_id_param 
         AND ur.role_name = 'super_admin'
       )
     )) as total_completed,
    
    -- Pending confirmation (completed but not yet confirmed by user)
    (SELECT COUNT(*)::INTEGER 
     FROM appointments 
     WHERE status = 'completed' 
     AND end_time < NOW()
     AND is_active = true 
     AND is_deleted = false
     AND (
       practitioner_id = user_id_param
       OR EXISTS (
         SELECT 1 FROM user_roles ur 
         WHERE ur.user_id = user_id_param 
         AND ur.role_name = 'super_admin'
       )
     )) as pending_confirmation,
    
    -- Recent completions (last 7 days)
    (SELECT COUNT(*)::INTEGER 
     FROM appointments 
     WHERE status = 'completed' 
     AND end_time >= NOW() - INTERVAL '7 days'
     AND is_active = true 
     AND is_deleted = false
     AND (
       practitioner_id = user_id_param
       OR EXISTS (
         SELECT 1 FROM user_roles ur 
         WHERE ur.user_id = user_id_param 
         AND ur.role_name = 'super_admin'
       )
     )) as recent_completions;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_completion_stats(UUID) TO authenticated;
