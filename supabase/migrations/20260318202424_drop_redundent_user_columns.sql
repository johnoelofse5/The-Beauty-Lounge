BEGIN;

-- ============================================
-- STEP 1: Drop all FK constraints referencing public.users
-- ============================================
ALTER TABLE public.service_inventory_relationships DROP CONSTRAINT service_inventory_relationships_created_by_fkey;
ALTER TABLE public.service_inventory_relationships DROP CONSTRAINT service_inventory_relationships_updated_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT appointments_practitioner_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT appointments_user_id_fkey;
ALTER TABLE public.portfolio DROP CONSTRAINT portfolio_practitioner_id_fkey;
ALTER TABLE public.working_schedule DROP CONSTRAINT working_schedule_practitioner_id_fkey;
ALTER TABLE public.booking_progress DROP CONSTRAINT booking_progress_user_id_fkey;
ALTER TABLE public.booking_progress DROP CONSTRAINT booking_progress_practitioner_id_fkey;
ALTER TABLE public.booking_progress DROP CONSTRAINT booking_progress_selected_practitioner_id_fkey;
ALTER TABLE public.booking_progress DROP CONSTRAINT booking_progress_selected_client_id_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_created_by_fkey;
ALTER TABLE public.financial_transactions DROP CONSTRAINT financial_transactions_created_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT invoices_practitioner_id_fkey;
ALTER TABLE public.blocked_dates DROP CONSTRAINT blocked_dates_practitioner_id_fkey;

-- ============================================
-- STEP 2: Fix auto_assign_client_role before any inserts happen
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_assign_client_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    client_role_id uuid;
BEGIN
    SELECT id INTO client_role_id FROM public.roles WHERE name = 'client';

    IF client_role_id IS NOT NULL AND NEW.role_id IS NULL THEN
        NEW.role_id := client_role_id;
        RAISE NOTICE 'Automatically assigned client role to new user: %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- STEP 3: Clean up orphaned references
--         SET NULL  → nullable columns
--         DELETE    → NOT NULL constrained columns
-- ============================================

-- appointments (nullable) → SET NULL
UPDATE public.appointments SET user_id = NULL
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

UPDATE public.appointments SET practitioner_id = NULL
WHERE practitioner_id IS NOT NULL AND practitioner_id NOT IN (SELECT id FROM auth.users);

-- blocked_dates (NOT NULL) → DELETE
DELETE FROM public.blocked_dates
WHERE practitioner_id NOT IN (SELECT id FROM auth.users);

-- booking_progress (all nullable) → SET NULL
UPDATE public.booking_progress SET user_id = NULL
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

UPDATE public.booking_progress SET practitioner_id = NULL
WHERE practitioner_id IS NOT NULL AND practitioner_id NOT IN (SELECT id FROM auth.users);

UPDATE public.booking_progress SET selected_client_id = NULL
WHERE selected_client_id IS NOT NULL AND selected_client_id NOT IN (SELECT id FROM auth.users);

UPDATE public.booking_progress SET selected_practitioner_id = NULL
WHERE selected_practitioner_id IS NOT NULL AND selected_practitioner_id NOT IN (SELECT id FROM auth.users);

-- financial_transactions (nullable) → SET NULL
UPDATE public.financial_transactions SET created_by = NULL
WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);

-- invoices (NOT NULL) → DELETE
DELETE FROM public.invoices
WHERE practitioner_id NOT IN (SELECT id FROM auth.users);

-- notifications (nullable) → SET NULL
UPDATE public.notifications SET user_id = NULL
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

-- portfolio (NOT NULL) → DELETE
DELETE FROM public.portfolio
WHERE practitioner_id NOT IN (SELECT id FROM auth.users);

-- purchase_orders (nullable) → SET NULL
UPDATE public.purchase_orders SET created_by = NULL
WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);

-- service_inventory_relationships (nullable) → SET NULL
UPDATE public.service_inventory_relationships SET created_by = NULL
WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);

UPDATE public.service_inventory_relationships SET updated_by = NULL
WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM auth.users);

-- working_schedule (NOT NULL) → DELETE
DELETE FROM public.working_schedule
WHERE practitioner_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- STEP 4: Swap the ID on public.users
-- ============================================
ALTER TABLE public.users ADD COLUMN auth_id uuid;

UPDATE public.users pu
SET auth_id = au.id
FROM auth.users au
WHERE au.email = pu.email;

DELETE FROM public.users WHERE auth_id IS NULL;

ALTER TABLE public.users DROP CONSTRAINT users_pkey;

-- CASCADE drops all dependent policies and views automatically
ALTER TABLE public.users DROP COLUMN id CASCADE;

-- Drop all existing policies on public.users before recreating them
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own active profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert new users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update any user" ON public.users;
DROP POLICY IF EXISTS "Users can update own active profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete any user" ON public.users;

-- Drop all existing policies on other tables before recreating them
DROP POLICY IF EXISTS "Super admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "admins can modify app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Super admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Super admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Super admins can update all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Super admins can delete all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can create appointments for clients" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can view assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can update assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can view appointments assigned to them" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can update appointments assigned to them" ON public.appointments;
DROP POLICY IF EXISTS "Practitioners can delete appointments assigned to them" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
DROP POLICY IF EXISTS "Super admins can view all blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Super admins can insert blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Super admins can update all blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Super admins can delete all blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Practitioners can view own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Practitioners can create own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Practitioners can update own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Practitioners can delete own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Clients can view practitioner blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Super admins can manage all booking progress" ON public.booking_progress;
DROP POLICY IF EXISTS "Users can manage their own booking progress" ON public.booking_progress;
DROP POLICY IF EXISTS "Practitioners can view booking progress for their appointments" ON public.booking_progress;
DROP POLICY IF EXISTS "Super admins and practitioners can manage financial transaction" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_select_policy" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_insert_policy" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_update_policy" ON public.financial_transactions;
DROP POLICY IF EXISTS "financial_transactions_delete_policy" ON public.financial_transactions;
DROP POLICY IF EXISTS "Super admins and practitioners can manage inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Super admins can manage all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Super admins can manage all lookup types" ON public.lookup_type;
DROP POLICY IF EXISTS "Super admins can manage all lookups" ON public.lookup;
DROP POLICY IF EXISTS "Super admins and practitioners can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Super admins and practitioners can manage purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Super admins and practitioners can manage stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can delete stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Super admins and practitioners can manage service revenue" ON public.service_revenue;
DROP POLICY IF EXISTS "Users can view service inventory relationships" ON public.service_inventory_relationships;
DROP POLICY IF EXISTS "Users can insert service inventory relationships" ON public.service_inventory_relationships;
DROP POLICY IF EXISTS "Users can update service inventory relationships" ON public.service_inventory_relationships;
DROP POLICY IF EXISTS "Users can delete service inventory relationships" ON public.service_inventory_relationships;
DROP POLICY IF EXISTS "Super admins can manage all portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Allow super admins to manage all schedules" ON public.working_schedule;
DROP POLICY IF EXISTS "admins can manage sms_logs" ON public.sms_logs;

ALTER TABLE public.users RENAME COLUMN auth_id TO id;
ALTER TABLE public.users ADD PRIMARY KEY (id);

-- ============================================
-- STEP 5: Drop redundant columns
-- ============================================
ALTER TABLE public.users
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS created_at;

-- ============================================
-- STEP 6: Add FK from public.users → auth.users
-- ============================================
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 7: Create missing profile rows for valid
--         auth users referenced in other tables
-- ============================================
INSERT INTO public.users (id, first_name, last_name, is_active, is_deleted, is_practitioner, updated_at)
SELECT DISTINCT au.id, NULL, NULL, true, false, false, now()
FROM auth.users au
WHERE au.id IN (
  SELECT user_id FROM public.appointments WHERE user_id IS NOT NULL
  UNION
  SELECT practitioner_id FROM public.appointments WHERE practitioner_id IS NOT NULL
  UNION
  SELECT user_id FROM public.booking_progress WHERE user_id IS NOT NULL
  UNION
  SELECT practitioner_id FROM public.booking_progress WHERE practitioner_id IS NOT NULL
  UNION
  SELECT selected_client_id FROM public.booking_progress WHERE selected_client_id IS NOT NULL
  UNION
  SELECT selected_practitioner_id FROM public.booking_progress WHERE selected_practitioner_id IS NOT NULL
  UNION
  SELECT practitioner_id FROM public.portfolio WHERE practitioner_id IS NOT NULL
  UNION
  SELECT practitioner_id FROM public.working_schedule WHERE practitioner_id IS NOT NULL
  UNION
  SELECT practitioner_id FROM public.blocked_dates WHERE practitioner_id IS NOT NULL
  UNION
  SELECT practitioner_id FROM public.invoices WHERE practitioner_id IS NOT NULL
  UNION
  SELECT user_id FROM public.notifications WHERE user_id IS NOT NULL
  UNION
  SELECT created_by FROM public.purchase_orders WHERE created_by IS NOT NULL
  UNION
  SELECT created_by FROM public.financial_transactions WHERE created_by IS NOT NULL
  UNION
  SELECT created_by FROM public.service_inventory_relationships WHERE created_by IS NOT NULL
  UNION
  SELECT updated_by FROM public.service_inventory_relationships WHERE updated_by IS NOT NULL
)
AND au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 8: Recreate all FK constraints
-- ============================================
ALTER TABLE public.service_inventory_relationships
  ADD CONSTRAINT service_inventory_relationships_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.service_inventory_relationships
  ADD CONSTRAINT service_inventory_relationships_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_practitioner_id_fkey
  FOREIGN KEY (practitioner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.portfolio
  ADD CONSTRAINT portfolio_practitioner_id_fkey
  FOREIGN KEY (practitioner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.working_schedule
  ADD CONSTRAINT working_schedule_practitioner_id_fkey
  FOREIGN KEY (practitioner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.booking_progress
  ADD CONSTRAINT booking_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.booking_progress
  ADD CONSTRAINT booking_progress_practitioner_id_fkey
  FOREIGN KEY (practitioner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.booking_progress
  ADD CONSTRAINT booking_progress_selected_practitioner_id_fkey
  FOREIGN KEY (selected_practitioner_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.booking_progress
  ADD CONSTRAINT booking_progress_selected_client_id_fkey
  FOREIGN KEY (selected_client_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.financial_transactions
  ADD CONSTRAINT financial_transactions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_practitioner_id_fkey
  FOREIGN KEY (practitioner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.blocked_dates
  ADD CONSTRAINT blocked_dates_practitioner_id_fkey
  FOREIGN KEY (practitioner_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 9: Recreate the users_with_roles view
-- ============================================
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.role_id,
  u.is_active,
  u.is_deleted,
  u.is_practitioner,
  u.updated_at,
  r.name AS role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id;

-- ============================================
-- STEP 10: Recreate user_profiles view
-- ============================================
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  au.id,
  au.email,
  au.phone,
  au.created_at,
  u.first_name,
  u.last_name,
  u.role_id,
  u.is_active,
  u.is_deleted,
  u.is_practitioner,
  u.updated_at
FROM public.users u
JOIN auth.users au ON au.id = u.id;

-- ============================================
-- STEP 11: Recreate all RLS policies on public.users
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can view own active profile" ON public.users
  FOR SELECT USING ((auth.uid() = id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Users can insert new users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK ((auth.uid() = id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Users can update any user" ON public.users
  FOR UPDATE USING (true);

CREATE POLICY "Users can update own active profile" ON public.users
  FOR UPDATE USING ((auth.uid() = id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Users can delete any user" ON public.users
  FOR DELETE USING (true);

-- ============================================
-- STEP 12: Recreate all RLS policies on app_settings
-- ============================================
CREATE POLICY "Super admins can manage app settings" ON public.app_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "admins can modify app_settings" ON public.app_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE (users.id = auth.uid()) AND (users.role_id = '37cbb082-37bb-4fbd-aedc-71e39ac50ea4'::uuid)));

-- ============================================
-- STEP 13: Recreate all RLS policies on appointments
-- ============================================
CREATE POLICY "Super admins can manage all appointments" ON public.appointments
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false) AND (r.is_active = true) AND (r.is_deleted = false)))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false) AND (r.is_active = true) AND (r.is_deleted = false)));

CREATE POLICY "Super admins can view all appointments" ON public.appointments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Super admins can update all appointments" ON public.appointments
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Super admins can delete all appointments" ON public.appointments
  FOR DELETE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can create appointments for clients" ON public.appointments
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE (users.id = auth.uid()) AND (users.is_practitioner = true) AND (users.is_active = true) AND (users.is_deleted = false)) AND (practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false) AND ((user_id IS NOT NULL) OR ((is_external_client = true) AND (client_first_name IS NOT NULL) AND (client_last_name IS NOT NULL) AND ((client_email IS NOT NULL) OR (client_phone IS NOT NULL)))));

CREATE POLICY "Practitioners can view assigned appointments" ON public.appointments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE (users.id = auth.uid()) AND (users.is_practitioner = true) AND (users.is_active = true) AND (users.is_deleted = false)) AND (practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can update assigned appointments" ON public.appointments
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE (users.id = auth.uid()) AND (users.is_practitioner = true) AND (users.is_active = true) AND (users.is_deleted = false)) AND (practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can view appointments assigned to them" ON public.appointments
  FOR SELECT USING ((auth.uid() = practitioner_id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can update appointments assigned to them" ON public.appointments
  FOR UPDATE USING ((auth.uid() = practitioner_id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can delete appointments assigned to them" ON public.appointments
  FOR DELETE USING ((auth.uid() = practitioner_id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Users can view their own appointments" ON public.appointments
  FOR SELECT USING ((auth.uid() = user_id) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Users can create appointments" ON public.appointments
  FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (auth.uid() = practitioner_id));

CREATE POLICY "appointments_select_policy" ON public.appointments
  FOR SELECT USING ((auth.uid() = user_id) OR (auth.uid() = practitioner_id) OR (auth.role() = 'authenticated'));

CREATE POLICY "appointments_insert_policy" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_update_policy" ON public.appointments
  FOR UPDATE USING ((auth.uid() = user_id) OR (auth.uid() = practitioner_id));

CREATE POLICY "appointments_delete_policy" ON public.appointments
  FOR DELETE USING ((auth.uid() = user_id) OR (auth.uid() = practitioner_id));

-- ============================================
-- STEP 14: Recreate all RLS policies on blocked_dates
-- ============================================
CREATE POLICY "Super admins can view all blocked dates" ON public.blocked_dates
  FOR SELECT USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins can insert blocked dates" ON public.blocked_dates
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins can update all blocked dates" ON public.blocked_dates
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins can delete all blocked dates" ON public.blocked_dates
  FOR DELETE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Practitioners can view own blocked dates" ON public.blocked_dates
  FOR SELECT USING ((practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can create own blocked dates" ON public.blocked_dates
  FOR INSERT WITH CHECK ((practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Practitioners can update own blocked dates" ON public.blocked_dates
  FOR UPDATE
  USING ((practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false))
  WITH CHECK (practitioner_id = auth.uid());

CREATE POLICY "Practitioners can delete own blocked dates" ON public.blocked_dates
  FOR DELETE USING ((practitioner_id = auth.uid()) AND (is_active = true) AND (is_deleted = false));

CREATE POLICY "Clients can view practitioner blocked dates" ON public.blocked_dates
  FOR SELECT USING ((is_active = true) AND (is_deleted = false));

-- ============================================
-- STEP 15: Recreate all RLS policies on booking_progress
-- ============================================
CREATE POLICY "Super admins can manage all booking progress" ON public.booking_progress
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin')));

CREATE POLICY "Users can manage their own booking progress" ON public.booking_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Practitioners can view booking progress for their appointments" ON public.booking_progress
  FOR SELECT USING (auth.uid() = practitioner_id);

-- ============================================
-- STEP 16: Recreate all RLS policies on financial_transactions
-- ============================================
CREATE POLICY "Super admins and practitioners can manage financial transaction" ON public.financial_transactions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner'])) AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "financial_transactions_select_policy" ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM users u LEFT JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false) AND ((u.is_practitioner = true) OR (r.name = 'super_admin'))))
    OR
    ((EXISTS (SELECT 1 FROM users u WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false))) AND ((transaction_type)::text = 'income') AND ((category)::text = 'service_revenue') AND (created_by = auth.uid()))
  );

CREATE POLICY "financial_transactions_insert_policy" ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM users u LEFT JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false) AND ((u.is_practitioner = true) OR (r.name = 'super_admin'))))
    OR
    ((EXISTS (SELECT 1 FROM users u WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false))) AND ((transaction_type)::text = 'income') AND ((category)::text = 'service_revenue'))
  );

CREATE POLICY "financial_transactions_update_policy" ON public.financial_transactions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u LEFT JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false) AND ((u.is_practitioner = true) OR (r.name = 'super_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM users u LEFT JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false) AND ((u.is_practitioner = true) OR (r.name = 'super_admin'))));

CREATE POLICY "financial_transactions_delete_policy" ON public.financial_transactions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u LEFT JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (u.is_active = true) AND (u.is_deleted = false) AND ((u.is_practitioner = true) OR (r.name = 'super_admin'))));

-- ============================================
-- STEP 17: Recreate RLS policies on remaining tables
-- ============================================
CREATE POLICY "Super admins and practitioners can manage inventory items" ON public.inventory_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner'])) AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins can manage all invoices" ON public.invoices
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin')));

CREATE POLICY "Super admins can manage all lookup types" ON public.lookup_type
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins can manage all lookups" ON public.lookup
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins and practitioners can manage purchase orders" ON public.purchase_orders
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner'])) AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins and practitioners can manage purchase order items" ON public.purchase_order_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner'])) AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Super admins and practitioners can manage stock movements" ON public.stock_movements
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner'])) AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Users can view stock movements" ON public.stock_movements
  FOR SELECT USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Users can insert stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Users can update stock movements" ON public.stock_movements
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Users can delete stock movements" ON public.stock_movements
  FOR DELETE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Super admins and practitioners can manage service revenue" ON public.service_revenue
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner'])) AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Users can view service inventory relationships" ON public.service_inventory_relationships
  FOR SELECT USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Users can insert service inventory relationships" ON public.service_inventory_relationships
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Users can update service inventory relationships" ON public.service_inventory_relationships
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Users can delete service inventory relationships" ON public.service_inventory_relationships
  FOR DELETE USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = ANY (ARRAY['super_admin','practitioner']))));

CREATE POLICY "Super admins can manage all portfolio" ON public.portfolio
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin') AND (u.is_active = true) AND (u.is_deleted = false)));

CREATE POLICY "Allow super admins to manage all schedules" ON public.working_schedule
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM users u JOIN roles r ON (u.role_id = r.id) WHERE (u.id = auth.uid()) AND (r.name = 'super_admin')));

CREATE POLICY "admins can manage sms_logs" ON public.sms_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE (users.id = auth.uid()) AND (users.role_id = '37cbb082-37bb-4fbd-aedc-71e39ac50ea4'::uuid)));

-- ============================================
-- STEP 18: Recreate trigger + auto-profile creation
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, is_active, is_deleted, is_practitioner, updated_at)
  VALUES (NEW.id, NULL, NULL, true, false, false, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- STEP 19: Verify results
-- ============================================
SELECT * FROM public.users LIMIT 10;
SELECT * FROM public.user_profiles LIMIT 10;

COMMIT; -- Change to COMMIT when happy