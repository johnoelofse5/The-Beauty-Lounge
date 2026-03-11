-- Lookup Types
INSERT INTO lookup_type (id, name, lookup_type_code, description, is_active, is_deleted, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'SMS_STATUS', 'SMS_STATUS', 'SMS log statuses', true, false, now(), now()),
  (gen_random_uuid(), 'SMS_FILTER_TYPE', 'SMS_FILTER_TYPE', 'SMS notification types', true, false, now(), now());

-- SMS_STATUS Lookups
INSERT INTO lookup (id, lookup_type_id, value, display_order, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), id, unnest(ARRAY['sent', 'suppressed', 'failed', 'scheduled']), generate_subscripts(ARRAY['sent', 'suppressed', 'failed', 'scheduled'], 1), true, false, now(), now()
FROM lookup_type WHERE lookup_type_code = 'SMS_STATUS';

-- SMS_FILTER_TYPE Lookups
INSERT INTO lookup (id, lookup_type_id, value, display_order, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), id, unnest(ARRAY['confirmation', 'reschedule', 'cancellation', 'reminder']), generate_subscripts(ARRAY['confirmation', 'reschedule', 'cancellation', 'reminder'], 1), true, false, now(), now()
FROM lookup_type WHERE lookup_type_code = 'SMS_FILTER_TYPE';