-- ============================================================================
-- RLS Policy Fix for Financial Transactions
-- Allow clients to create financial transactions when booking appointments
-- ============================================================================

-- First, drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "financial_transactions_insert_policy" ON financial_transactions;

-- Create a new INSERT policy that allows both practitioners and clients to create transactions
-- Practitioners can create any transaction
-- Clients can only create income transactions with category 'service_revenue' (appointment bookings)
CREATE POLICY "financial_transactions_insert_policy" 
ON financial_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow practitioners and super_admins to insert any financial transaction
  EXISTS (
    SELECT 1 FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND u.is_deleted = false
    AND (u.is_practitioner = true OR r.name = 'super_admin')
  )
  OR
  -- Allow clients to insert ONLY income transactions for service revenue (appointment bookings)
  (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.is_deleted = false
    )
    AND transaction_type = 'income'
    AND category = 'service_revenue'
  )
);

-- Update the SELECT policy to allow clients to view their own appointment-related transactions
DROP POLICY IF EXISTS "financial_transactions_select_policy" ON financial_transactions;

CREATE POLICY "financial_transactions_select_policy" 
ON financial_transactions 
FOR SELECT 
TO authenticated
USING (
  -- Allow practitioners and super_admins to view all transactions
  EXISTS (
    SELECT 1 FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND u.is_deleted = false
    AND (u.is_practitioner = true OR r.name = 'super_admin')
  )
  OR
  -- Allow clients to view their own appointment-related transactions
  (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.is_deleted = false
    )
    AND transaction_type = 'income'
    AND category = 'service_revenue'
    AND created_by = auth.uid()
  )
);

-- Ensure UPDATE policy doesn't allow clients to modify transactions
DROP POLICY IF EXISTS "financial_transactions_update_policy" ON financial_transactions;

CREATE POLICY "financial_transactions_update_policy" 
ON financial_transactions 
FOR UPDATE 
TO authenticated
USING (
  -- Only practitioners and super_admins can update transactions
  EXISTS (
    SELECT 1 FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND u.is_deleted = false
    AND (u.is_practitioner = true OR r.name = 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND u.is_deleted = false
    AND (u.is_practitioner = true OR r.name = 'super_admin')
  )
);

-- Ensure DELETE policy doesn't allow clients to delete transactions
DROP POLICY IF EXISTS "financial_transactions_delete_policy" ON financial_transactions;

CREATE POLICY "financial_transactions_delete_policy" 
ON financial_transactions 
FOR DELETE 
TO authenticated
USING (
  -- Only practitioners and super_admins can delete transactions
  EXISTS (
    SELECT 1 FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND u.is_deleted = false
    AND (u.is_practitioner = true OR r.name = 'super_admin')
  )
);

-- ============================================================================
-- Verification Queries (Run these to test the policies)
-- ============================================================================

-- Check current policies on financial_transactions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'financial_transactions'
ORDER BY policyname;

-- Test if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'financial_transactions';

-- If RLS is not enabled, enable it:
-- ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_transactions FORCE ROW LEVEL SECURITY;