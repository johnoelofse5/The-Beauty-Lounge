import { ValidationInput, ValidationSelect } from '@/components/validation/ValidationComponents'
import { SelectItem } from '@/components/ui/select'
import { useFinancialTransactions } from '../hooks/use-financial-transactions'
import { formatCurrency, formatDate } from '../utils/inventory-formatter'
import TransactionModal from '../modals/transaction-modal'

interface Props {
  userId: string
  showSuccess: (msg: string) => void
  showError: (msg: string) => void
}

export default function FinancialTransactionsView({ userId, showSuccess, showError }: Props) {
  const {
    loading, summary, paymentMethods, revenueTypes, transactionTypes, transactions,
    showAddModal, isAddModalClosing, editingTransaction, showEditModal, isEditModalClosing,
    addForm, editForm, addErrors, editErrors,
    searchTerm, setSearchTerm, filterType, setFilterType, filterCategory, setFilterCategory,
    sortBy, setSortBy, sortOrder, setSortOrder,
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    selectedYearlyYear, setSelectedYearlyYear, currentDate,
    openAddModal, closeAddModal, openEditModal, closeEditModal,
    updateAddField, updateEditField,
    handleAdd, handleUpdate, handleMonthlyReport, handleYearlyReport
  } = useFinancialTransactions(userId, showError, showSuccess)

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const yearOptions = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Transactions</h1>
          <p className="text-sm text-gray-600">Track money coming in and going out</p>
        </div>
        <button onClick={openAddModal}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Transaction
        </button>
      </div>

      {/* Report Generation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Financial Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monthly */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Monthly Report</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <ValidationSelect label="Month" value={selectedMonth} onValueChange={setSelectedMonth} placeholder="Select Month">
                  {['January','February','March','April','May','June','July','August','September','October','November','December']
                    .map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </ValidationSelect>
              </div>
              <div className="flex-1">
                <ValidationSelect label="Year" value={selectedYear} onValueChange={setSelectedYear} placeholder="Select Year">
                  {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </ValidationSelect>
              </div>
            </div>
            <button onClick={handleMonthlyReport} disabled={loading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <DownloadIcon /> Generate Monthly Report
            </button>
          </div>

          {/* Yearly */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Yearly Report</h3>
            <div className="flex-1">
              <ValidationSelect label="Year" value={selectedYearlyYear} onValueChange={setSelectedYearlyYear} placeholder="Select Year">
                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </ValidationSelect>
            </div>
            <button onClick={handleYearlyReport} disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <DownloadIcon /> Generate Yearly Report
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { label: 'Total Income', value: formatCurrency(summary.total_income), colour: 'green' },
            { label: 'Total Expenses', value: formatCurrency(summary.total_expenses), colour: 'red' },
            { label: 'Net Profit', value: formatCurrency(summary.net_profit), colour: summary.net_profit >= 0 ? 'green' : 'red' }
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <p className="text-xs sm:text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`text-lg sm:text-xl font-semibold ${card.colour === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ValidationInput label="Search" type="text" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} placeholder="Search transactions..." />
          <ValidationSelect label="Transaction Type" value={filterType} onValueChange={setFilterType}>
            <SelectItem value="all">All Types</SelectItem>
            {transactionTypes.map(t => <SelectItem key={t.id} value={t.secondary_value || t.value}>{t.value}</SelectItem>)}
          </ValidationSelect>
          <ValidationSelect label="Category" value={filterCategory} onValueChange={setFilterCategory}>
            <SelectItem value="all">All Categories</SelectItem>
            {revenueTypes.map(t => <SelectItem key={t.id} value={t.secondary_value || t.value}>{t.value}</SelectItem>)}
          </ValidationSelect>
          <ValidationSelect label="Sort By" value={`${sortBy}-${sortOrder}`}
            onValueChange={v => { const [f, o] = v.split('-'); setSortBy(f as any); setSortOrder(o as any) }}>
            <SelectItem value="date-desc">Date (Newest)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest)</SelectItem>
            <SelectItem value="amount-desc">Amount (Highest)</SelectItem>
            <SelectItem value="amount-asc">Amount (Lowest)</SelectItem>
            <SelectItem value="type-asc">Type (A-Z)</SelectItem>
            <SelectItem value="type-desc">Type (Z-A)</SelectItem>
          </ValidationSelect>
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Transactions ({transactions.length})</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' || filterCategory !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first financial transaction'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map(tx => (
              <div key={tx.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tx.transaction_type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.category}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(tx.transaction_date)}
                        {tx.receipt_number && ` • ${tx.receipt_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${tx.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{tx.payment_method}</p>
                    </div>
                    <button onClick={() => openEditModal(tx)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100" title="Edit transaction">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        mode="add"
        isOpen={showAddModal}
        isClosing={isAddModalClosing}
        onClose={closeAddModal}
        onSubmit={handleAdd}
        form={addForm}
        updateField={updateAddField}
        errors={addErrors}
        paymentMethods={paymentMethods}
        revenueTypes={revenueTypes}
        transactionTypes={transactionTypes}
        loading={loading}
      />

      {editingTransaction && (
        <TransactionModal
          mode="edit"
          isOpen={showEditModal}
          isClosing={isEditModalClosing}
          onClose={closeEditModal}
          onSubmit={handleUpdate}
          form={editForm}
          updateField={updateEditField}
          errors={editErrors}
          paymentMethods={paymentMethods}
          revenueTypes={revenueTypes}
          transactionTypes={transactionTypes}
          loading={loading}
        />
      )}
    </div>
  )
}

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)