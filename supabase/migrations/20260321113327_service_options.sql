CREATE TABLE IF NOT EXISTS public.service_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0,
    duration_adjustment_minutes INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointment_service_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id),
    service_option_id UUID NOT NULL REFERENCES public.service_options(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_service_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_options_select" ON public.service_options
    FOR SELECT TO authenticated USING (is_deleted = false);

CREATE POLICY "service_options_insert" ON public.service_options
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "service_options_update" ON public.service_options
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "service_options_delete" ON public.service_options
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "appointment_service_options_select" ON public.appointment_service_options
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "appointment_service_options_insert" ON public.appointment_service_options
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "appointment_service_options_delete" ON public.appointment_service_options
    FOR DELETE TO authenticated USING (true);

ALTER TABLE public.booking_progress
    ADD COLUMN IF NOT EXISTS selected_service_options TEXT;
