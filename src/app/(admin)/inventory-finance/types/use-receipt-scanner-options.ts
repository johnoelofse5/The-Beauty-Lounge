import { FinancialTransactionForm } from '@/types/inventory';

export interface UseReceiptScannerOptions {
  isOpen: boolean;
  onConfirm: (data: Partial<FinancialTransactionForm>) => void;
}
