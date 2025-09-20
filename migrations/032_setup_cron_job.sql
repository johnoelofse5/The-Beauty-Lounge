-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job that runs every hour to mark completed appointments
-- This will run at the top of every hour
SELECT cron.schedule(
  'mark-completed-appointments',
  '0 * * * *', -- Every hour at minute 0
  'SELECT mark_completed_appointments();'
);

-- Optional: Create a more frequent job (every 15 minutes) for testing
-- Uncomment the line below if you want more frequent updates
-- SELECT cron.schedule(
--   'mark-completed-appointments-frequent',
--   '*/15 * * * *', -- Every 15 minutes
--   'SELECT mark_completed_appointments();'
-- );

-- Grant necessary permissions for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;
