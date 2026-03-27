export type AnalyticsViewMode = 'month' | 'year';

export interface ChartDataPoint {
  label: string;
  appointments: number;
}

export interface ServicePopularity {
  serviceId: string;
  name: string;
  count: number;
}

export interface PractitionerPopularity {
  practitionerId: string;
  name: string;
  count: number;
}

export interface PeakHourDataPoint {
  hour: string;
  appointments: number;
}

export interface RevenueDataPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}
