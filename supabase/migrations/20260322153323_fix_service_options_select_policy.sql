DROP POLICY IF EXISTS "service_options_select" ON public.service_options;

CREATE POLICY "service_options_select" ON public.service_options
    FOR SELECT TO authenticated
    USING (true);
