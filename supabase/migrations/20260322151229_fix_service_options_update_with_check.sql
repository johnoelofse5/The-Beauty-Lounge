DROP POLICY IF EXISTS "service_options_update" ON public.service_options;

CREATE POLICY "service_options_update" ON public.service_options
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
