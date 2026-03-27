import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canViewAdmin, isPractitioner } from '@/lib/rbac';
import { createClient } from '@/lib/supabase/client';
import { AnalyticsViewMode, ChartDataPoint } from '../types';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function useAnalytics(viewMode: AnalyticsViewMode, selectedDate: Date) {
  const { user, userRoleData, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const canView =
    canViewAdmin(userRoleData?.role || null) || isPractitioner(userRoleData?.role || null);

  const fetchMonthData = useCallback(
    async (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, status')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gte('start_time', new Date(year, month, 1).toISOString())
        .lte('start_time', new Date(year, month + 1, 0, 23, 59, 59).toISOString());

      if (error) {
        console.error('Error fetching month data:', error);
        return;
      }

      const counts: Record<number, number> = {};
      for (let d = 1; d <= daysInMonth; d++) counts[d] = 0;
      let cancelled = 0;

      data?.forEach((row) => {
        const day = new Date(row.start_time).getDate();
        counts[day] = (counts[day] || 0) + 1;
        if (row.status === 'cancelled' || row.status === 'no_show') cancelled++;
      });

      setChartData(
        Array.from({ length: daysInMonth }, (_, i) => ({
          label: String(i + 1),
          appointments: counts[i + 1],
        }))
      );
      setTotalCount(data?.length ?? 0);
      setCancelledCount(cancelled);
    },
    [supabase]
  );

  const fetchYearData = useCallback(
    async (date: Date) => {
      const year = date.getFullYear();

      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, status')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gte('start_time', new Date(year, 0, 1).toISOString())
        .lte('start_time', new Date(year, 11, 31, 23, 59, 59).toISOString());

      if (error) {
        console.error('Error fetching year data:', error);
        return;
      }

      const counts: number[] = new Array(12).fill(0);
      let cancelled = 0;

      data?.forEach((row) => {
        counts[new Date(row.start_time).getMonth()]++;
        if (row.status === 'cancelled' || row.status === 'no_show') cancelled++;
      });

      setChartData(MONTH_NAMES.map((name, i) => ({ label: name, appointments: counts[i] })));
      setTotalCount(data?.length ?? 0);
      setCancelledCount(cancelled);
    },
    [supabase]
  );

  useEffect(() => {
    if (!user || !canView) return;

    setLoading(true);
    const fetch = viewMode === 'month' ? fetchMonthData : fetchYearData;
    fetch(selectedDate).finally(() => setLoading(false));
  }, [user, canView, viewMode, selectedDate, fetchMonthData, fetchYearData]);

  const cancellationRate = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;

  return {
    chartData,
    totalCount,
    cancelledCount,
    cancellationRate,
    loading,
    authLoading,
    user,
    canView,
  };
}
