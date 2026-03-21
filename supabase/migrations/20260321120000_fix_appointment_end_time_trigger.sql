-- Remove the calculate_end_time_trigger on the appointments table.
--
-- This trigger was calling calculate_appointment_end_time() on INSERT and UPDATE,
-- which recalculated end_time from services.duration_minutes only.
-- It overwrote the correctly-computed end_time sent by the application,
-- because appointment_service_options rows (inserted after the appointment)
-- could not be seen at INSERT time.
--
-- end_time is now fully managed by the application layer, which correctly factors in
-- both base service duration and any chosen service option duration adjustments.

DROP TRIGGER IF EXISTS calculate_end_time_trigger ON public.appointments;
DROP FUNCTION IF EXISTS public.calculate_appointment_end_time() CASCADE;
