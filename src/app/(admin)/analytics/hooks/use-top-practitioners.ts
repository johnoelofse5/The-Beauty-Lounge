import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnalyticsViewMode, PractitionerPopularity } from '../types';

export function useTopPractitioners(viewMode: AnalyticsViewMode, selectedDate: Date) {
  const supabase = createClient();
  const [practitioners, setPractitioners] = useState<PractitionerPopularity[]>([]);
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
        .select('practitioner_id')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gte('start_time', from)
        .lte('start_time', to);

      if (apptError || !appointments) {
        console.error('Error fetching appointments for practitioners:', apptError);
        setLoading(false);
        return;
      }

      const counts: Record<string, number> = {};
      appointments.forEach((a) => {
        if (a.practitioner_id) counts[a.practitioner_id] = (counts[a.practitioner_id] ?? 0) + 1;
      });

      const practitionerIds = Object.keys(counts);
      if (practitionerIds.length === 0) {
        setPractitioners([]);
        setLoading(false);
        return;
      }

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', practitionerIds);

      if (userError || !users) {
        console.error('Error fetching practitioner names:', userError);
        setLoading(false);
        return;
      }

      const result: PractitionerPopularity[] = users
        .map((u) => ({
          practitionerId: u.id,
          name: `${u.first_name} ${u.last_name}`.trim(),
          count: counts[u.id] ?? 0,
        }))
        .sort((a, b) => b.count - a.count);

      setPractitioners(result);
      setLoading(false);
    };

    fetch();
  }, [viewMode, selectedDate, supabase]);

  return { practitioners, loading };
}
