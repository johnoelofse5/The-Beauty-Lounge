import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnalyticsViewMode, ServicePopularity } from '../types';

export function usePopularServices(viewMode: AnalyticsViewMode, selectedDate: Date) {
  const supabase = createClient();
  const [services, setServices] = useState<ServicePopularity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();

      const from =
        viewMode === 'month'
          ? new Date(year, month, 1).toISOString()
          : new Date(year, 0, 1).toISOString();

      const to =
        viewMode === 'month'
          ? new Date(year, month + 1, 0, 23, 59, 59).toISOString()
          : new Date(year, 11, 31, 23, 59, 59).toISOString();

      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('service_id, service_ids')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gte('start_time', from)
        .lte('start_time', to);

      if (apptError || !appointments) {
        console.error('Error fetching appointments for popular services:', apptError);
        setLoading(false);
        return;
      }

      const counts: Record<string, number> = {};
      appointments.forEach((appt) => {
        const ids: string[] =
          appt.service_ids?.length > 0
            ? appt.service_ids
            : appt.service_id
              ? [appt.service_id]
              : [];

        ids.forEach((id) => {
          counts[id] = (counts[id] ?? 0) + 1;
        });
      });

      const serviceIds = Object.keys(counts);
      if (serviceIds.length === 0) {
        setServices([]);
        setLoading(false);
        return;
      }

      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, name')
        .in('id', serviceIds)
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (serviceError || !serviceData) {
        console.error('Error fetching service names:', serviceError);
        setLoading(false);
        return;
      }

      const result: ServicePopularity[] = serviceData
        .map((s) => ({ serviceId: s.id, name: s.name, count: counts[s.id] ?? 0 }))
        .sort((a, b) => b.count - a.count);

      setServices(result);
      setLoading(false);
    };

    fetch();
  }, [viewMode, selectedDate, supabase]);

  return { services, loading };
}
