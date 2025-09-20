-- Create a test appointment that has ended but is still marked as 'scheduled'
-- This will allow us to test the notification system

-- First, let's create an appointment for yesterday that has ended
INSERT INTO appointments (
  id,
  appointment_date,
  start_time,
  end_time,
  practitioner_id,
  client_first_name,
  client_last_name,
  client_email,
  client_phone,
  service_ids,
  status,
  is_external_client,
  is_active,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  NOW() - INTERVAL '1 day' + INTERVAL '10 hours',  -- Yesterday at 10 AM
  NOW() - INTERVAL '1 day' + INTERVAL '10 hours',  -- Yesterday at 10 AM
  NOW() - INTERVAL '1 day' + INTERVAL '12 hours',  -- Yesterday at 12 PM
  '87f4db64-4ec0-453f-9d65-04095f924e4c',  -- Your practitioner ID
  'Test',
  'Client',
  'test@example.com',
  '1234567890',
  '["02fe54bf-02d4-4b68-91df-204c8b486186"]'::jsonb,  -- Gel fill service
  'scheduled',  -- Still scheduled (not completed)
  true,
  true,
  false,
  NOW(),
  NOW()
);

-- Also create one for 2 days ago
INSERT INTO appointments (
  id,
  appointment_date,
  start_time,
  end_time,
  practitioner_id,
  client_first_name,
  client_last_name,
  client_email,
  client_phone,
  service_ids,
  status,
  is_external_client,
  is_active,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  NOW() - INTERVAL '2 days' + INTERVAL '14 hours',  -- 2 days ago at 2 PM
  NOW() - INTERVAL '2 days' + INTERVAL '14 hours',  -- 2 days ago at 2 PM
  NOW() - INTERVAL '2 days' + INTERVAL '16 hours',  -- 2 days ago at 4 PM
  '87f4db64-4ec0-453f-9d65-04095f924e4c',  -- Your practitioner ID
  'Another',
  'Test Client',
  'another@example.com',
  '0987654321',
  '["02fe54bf-02d4-4b68-91df-204c8b486186"]'::jsonb,  -- Gel fill service
  'scheduled',  -- Still scheduled (not completed)
  true,
  true,
  false,
  NOW(),
  NOW()
);

-- Check what we created
SELECT 
  id,
  appointment_date,
  start_time,
  end_time,
  client_first_name,
  client_last_name,
  status,
  (end_time < NOW()) as is_past_appointment
FROM appointments 
WHERE client_first_name IN ('Test', 'Another')
ORDER BY end_time DESC;
