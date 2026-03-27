import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnalyticsViewMode, PeakHourDataPoint } from '../types';

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function usePeakHours(viewMode: AnalyticsViewMode, selectedDate: Date) {
  const supabase = createClient();
  const [peakHours, setPeakHours] = useState<PeakHourDataPoint[]>([]);
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

      const { data, error } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .not('status', 'in', '("cancelled","no_show")')
        .gte('start_time', from)
        .lte('start_time', to);

      if (error) {
        console.error('Error fetching peak hours:', error);
        setLoading(false);
        return;
      }

      const counts: Record<number, number> = {};
      for (let h = 7; h <= 20; h++) counts[h] = 0;

      data?.forEach((row) => {
        const hour = new Date(row.start_time).getHours();
        if (hour >= 7 && hour <= 20) counts[hour] = (counts[hour] || 0) + 1;
      });

      setPeakHours(
        Object.entries(counts).map(([h, count]) => ({
          hour: formatHour(Number(h)),
          appointments: count,
        }))
      );

      setLoading(false);
    };

    fetch();
  }, [viewMode, selectedDate, supabase]);

  return { peakHours, loading };
}
