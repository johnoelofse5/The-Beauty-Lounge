import { FinancialTransactionForm } from '@/types/inventory';

export interface ReceiptScannerProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onConfirm: (data: Partial<FinancialTransactionForm>) => void;
}
