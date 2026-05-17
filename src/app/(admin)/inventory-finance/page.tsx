'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDashboard } from './hooks/use-dashboard';
import DashboardView from './views/dashboard-view';
import ServiceInventoryView from './views/service-inventory-view';
import InventoryView from './views/inventory-view';
import FinancialTransactionsView from './views/financial-transactions-view';
import { RoleName } from '@/types/enums/role-name.enum';

type TabKey = 'dashboard' | 'inventory' | 'service-inventory' | 'finances';

export default function InventoryFinancePage() {
  const { user, userRoleData } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const hasAccess =
    userRoleData?.role?.name === RoleName.SuperAdmin ||
    userRoleData?.role?.name === RoleName.Practitioner;

  const { loading, inventorySummary, financialSummary, lowStockItems } = useDashboard(
    !!user && hasAccess
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to access inventory and financial management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        {/* Page title — scrolls away */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Inventory & Financial Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">
              Manage your stock, track purchases, and monitor financial performance
            </p>
          </div>
        </div>

        {/* Tab bar — sticks below the app header */}
        <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto scrollbar-hide py-3 gap-2">
              <TabsList className="gap-1 p-1 h-auto min-w-max">
                <TabsTrigger
                  value="dashboard"
                  className="px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base whitespace-nowrap"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base whitespace-nowrap"
                >
                  Inventory
                </TabsTrigger>
                <TabsTrigger
                  value="service-inventory"
                  className="px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base whitespace-nowrap"
                >
                  Service Inventory
                </TabsTrigger>
                <TabsTrigger
                  value="finances"
                  className="px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base whitespace-nowrap"
                >
                  Finances
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TabsContent value="dashboard">
            <DashboardView
              inventorySummary={inventorySummary}
              financialSummary={financialSummary}
              lowStockItems={lowStockItems}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryView showSuccess={showSuccess} showError={showError} />
          </TabsContent>

          <TabsContent value="service-inventory">
            <ServiceInventoryView
              userId={user?.id || ''}
              showSuccess={showSuccess}
              showError={showError}
            />
          </TabsContent>

          <TabsContent value="finances">
            <FinancialTransactionsView
              userId={user?.id || ''}
              showSuccess={showSuccess}
              showError={showError}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
