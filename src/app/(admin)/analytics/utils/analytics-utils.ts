import { AnalyticsViewMode, ChartDataPoint } from '../types';

export interface AnalyticsSummary {
  total: number;
  average: number;
  busiestLabel: string;
  busiestCount: number;
  periodDescription: string;
}

export function computeSummary(
  data: ChartDataPoint[],
  totalCount: number,
  viewMode: AnalyticsViewMode,
  selectedDate: Date
): AnalyticsSummary {
  const nonZero = data.filter((d) => d.appointments > 0);
  const busiest = data.reduce(
    (max, d) => (d.appointments > max.appointments ? d : max),
    data[0] ?? { label: '-', appointments: 0 }
  );

  const average = nonZero.length > 0 ? totalCount / nonZero.length : 0;

  const periodDescription =
    viewMode === 'month'
      ? selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      : selectedDate.getFullYear().toString();

  return {
    total: totalCount,
    average: Math.round(average * 10) / 10,
    busiestLabel: busiest?.label ?? '-',
    busiestCount: busiest?.appointments ?? 0,
    periodDescription,
  };
}

export function buildSummaryText(summary: AnalyticsSummary, viewMode: AnalyticsViewMode): string {
  if (summary.total === 0) {
    return `No appointments were recorded in ${summary.periodDescription}.`;
  }

  const unit = viewMode === 'month' ? 'day' : 'month';
  const busiestPrefix = viewMode === 'month' ? 'the ' : '';
  const busiestSuffix = viewMode === 'month' ? `th` : '';

  return (
    `${summary.periodDescription} had ${summary.total} appointment${summary.total !== 1 ? 's' : ''} in total. ` +
    `On average, there ${summary.average === 1 ? 'was' : 'were'} ${summary.average} appointment${summary.average !== 1 ? 's' : ''} per active ${unit}. ` +
    `The busiest ${unit} was ${busiestPrefix}${summary.busiestLabel}${busiestSuffix}, with ${summary.busiestCount} appointment${summary.busiestCount !== 1 ? 's' : ''}.`
  );
}
