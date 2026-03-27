import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RevenueDataPoint } from '../types';

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

export function useRevenueTrend(selectedDate: Date) {
  const supabase = createClient();
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      const year = selectedDate.getFullYear();
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('transaction_type, amount, transaction_date')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gte('transaction_date', from)
        .lte('transaction_date', to);

      if (error) {
        console.error('Error fetching revenue trend:', error);
        setLoading(false);
        return;
      }

      const income = new Array(12).fill(0);
      const expenses = new Array(12).fill(0);

      data?.forEach((row) => {
        const month = new Date(row.transaction_date).getMonth();
        if (row.transaction_type === 'income') income[month] += row.amount;
        else expenses[month] += row.amount;
      });

      setRevenueData(
        MONTH_NAMES.map((name, i) => ({
          month: name,
          income: Math.round(income[i] * 100) / 100,
          expenses: Math.round(expenses[i] * 100) / 100,
          net: Math.round((income[i] - expenses[i]) * 100) / 100,
        }))
      );

      setLoading(false);
    };

    fetch();
  }, [selectedDate, supabase]);

  return { revenueData, loading };
}
