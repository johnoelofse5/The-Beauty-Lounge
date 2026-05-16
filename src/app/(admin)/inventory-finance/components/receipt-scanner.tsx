'use client';

import { ReceiptScannerProps } from './types/receipt-scanner-props';
import { useReceiptScanner } from '../hooks/use-receipt-scanner';
import { ReceiptScannerView } from '../views/receipt-scanner-view';

export default function ReceiptScanner({
  isOpen,
  isClosing,
  onClose,
  onConfirm,
}: ReceiptScannerProps) {
  const scanner = useReceiptScanner({ isOpen, onConfirm });

  if (!isOpen) return null;

  return <ReceiptScannerView {...scanner} isClosing={isClosing} onClose={onClose} />;
}
