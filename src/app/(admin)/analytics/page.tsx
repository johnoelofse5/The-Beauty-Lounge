'use client';

import { useState } from 'react';
import { AnalyticsViewMode } from './types';
import { useAnalytics } from './hooks/use-analytics';
import { usePopularServices } from './hooks/use-popular-services';
import { usePeakHours } from './hooks/use-peak-hours';
import { useTopPractitioners } from './hooks/use-top-practitioners';
import { useRevenueTrend } from './hooks/use-revenue-trend';
import ViewToggle from './components/view-toggle';
import PeriodNavigator from './components/period-navigator';
import AppointmentsChart from './components/appointments-chart';
import SummaryCard from './components/summary-card';
import PopularServices from './components/popular-services';
import PeakHoursChart from './components/peak-hours-chart';
import TopPractitioners from './components/top-practitioners';
import RevenueTrendChart from './components/revenue-trend-chart';

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    chartData,
    totalCount,
    cancelledCount,
    cancellationRate,
    loading,
    authLoading,
    user,
    canView,
  } = useAnalytics(viewMode, selectedDate);

  const { services: popularServices, loading: servicesLoading } = usePopularServices(
    viewMode,
    selectedDate
  );

  const { peakHours, loading: peakHoursLoading } = usePeakHours(viewMode, selectedDate);

  const { practitioners, loading: practitionersLoading } = useTopPractitioners(
    viewMode,
    selectedDate
  );

  const { revenueData, loading: revenueLoading } = useRevenueTrend(selectedDate);

  const handleNavigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1;
    setSelectedDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + delta);
      else d.setFullYear(d.getFullYear() + delta);
      return d;
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F2C7EB]" />
      </div>
    );
  }

  if (!user || !canView) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have permission to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-1 text-sm text-gray-600">Appointment trends over time</p>
            </div>
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary stats */}
        <SummaryCard
          data={chartData}
          totalCount={totalCount}
          cancelledCount={cancelledCount}
          cancellationRate={cancellationRate}
          viewMode={viewMode}
          selectedDate={selectedDate}
          topServices={popularServices}
          servicesLoading={servicesLoading}
        />

        {/* Appointments over time chart */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
          <PeriodNavigator
            viewMode={viewMode}
            selectedDate={selectedDate}
            totalCount={totalCount}
            onNavigate={handleNavigate}
          />
          <AppointmentsChart data={chartData} viewMode={viewMode} />
        </div>

        {/* Revenue growth line chart */}
        <RevenueTrendChart
          data={revenueData}
          loading={revenueLoading}
          selectedDate={selectedDate}
        />

        {/* Peak hours + Top practitioners side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PeakHoursChart
            data={peakHours}
            loading={peakHoursLoading}
            viewMode={viewMode}
            selectedDate={selectedDate}
          />
          <TopPractitioners
            practitioners={practitioners}
            loading={practitionersLoading}
            viewMode={viewMode}
            selectedDate={selectedDate}
          />
        </div>

        {/* Full popular services list */}
        <PopularServices
          services={popularServices}
          loading={servicesLoading}
          viewMode={viewMode}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
