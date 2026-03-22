CREATE POLICY "Admins can update service options"
ON service_options
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users_with_roles
    WHERE id = auth.uid()
    AND role_name IN ('super_admin', 'practitioner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_with_roles
    WHERE id = auth.uid()
    AND role_name IN ('super_admin', 'practitioner')
  )
);

CREATE POLICY "Admins can delete service options"
ON service_options
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users_with_roles
    WHERE id = auth.uid()
    AND role_name IN ('super_admin', 'practitioner')
  )
);