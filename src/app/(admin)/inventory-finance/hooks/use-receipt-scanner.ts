'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ScanResult } from '../components/types/scan-result';
import { ScanState } from '../components/types/scan-state';
import { UseReceiptScannerOptions } from '../components/types/use-receipt-scanner-options';
import { FinancialTransactionForm } from '@/types/inventory';

function parseReceiptText(text: string): ScanResult {
  const result: ScanResult = {};

  const totalMatch = text.match(
    /(?:total|amount due|subtotal|grand total|to pay|balance due)[:\s]*[Rr]?\s*([\d\s,]+\.?\d*)/i
  );
  if (totalMatch) {
    const parsed = parseFloat(totalMatch[1].replace(/[\s,]/g, ''));
    if (!isNaN(parsed) && parsed > 0) result.amount = parsed;
  }

  if (!result.amount) {
    const allAmounts = [...text.matchAll(/[Rr]\s*([\d,]+\.\d{2})/g)]
      .map((m) => parseFloat(m[1].replace(',', '')))
      .filter((n) => !isNaN(n) && n > 0);
    if (allAmounts.length > 0) result.amount = Math.max(...allAmounts);
  }

  const datePatterns: RegExp[] = [
    /(\d{4}[-/]\d{2}[-/]\d{2})/,
    /(\d{2}[-/]\d{2}[-/]\d{4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let date: Date | null = null;
      const s = match[1];
      if (/^\d{4}/.test(s)) {
        date = new Date(s);
      } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
        const sep = s.includes('/') ? '/' : '-';
        const [d, m, y] = s.split(sep);
        date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      } else {
        date = new Date(s);
      }
      if (date && !isNaN(date.getTime())) {
        result.transaction_date = date.toISOString().split('T')[0];
        break;
      }
    }
  }

  const refMatch = text.match(
    /(?:receipt|invoice|ref(?:erence)?|no\.?|inv\.?|#)[:\s#]*([A-Z0-9][A-Z0-9\-]{2,19})/i
  );
  if (refMatch) result.receipt_number = refMatch[1].trim();

  return result;
}

export function useReceiptScanner({ isOpen, onConfirm }: UseReceiptScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState, setScanState] = useState<ScanState>(ScanState.Camera);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) throw new Error('not supported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError('Camera not available. Use the upload option below.');
      setScanState(ScanState.Upload);
    }
  }, []);

  useEffect(() => {
    if (isOpen && scanState === ScanState.Camera) startCamera();
  }, [isOpen, scanState, startCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanState(ScanState.Camera);
      setCapturedImage(null);
      setScanResult(null);
      setCameraError(null);
      setOcrError(null);
      setProgress(0);
    }
  }, [isOpen, stopCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
    setScanState(ScanState.Captured);
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setScanState(ScanState.Captured);
    };
    reader.readAsDataURL(file);
  }, []);

  const runOCR = useCallback(async () => {
    if (!capturedImage) return;
    setScanState(ScanState.Scanning);
    setProgress(0);
    setOcrError(null);
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(capturedImage, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      setScanResult(parseReceiptText(data.text));
      setScanState(ScanState.Results);
    } catch (err) {
      console.error('OCR error:', err);
      setOcrError('Could not process the image. Please try again or enter details manually.');
      setScanState(ScanState.Captured);
    }
  }, [capturedImage]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setScanResult(null);
    setOcrError(null);
    setScanState(ScanState.Camera);
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(() => {
    if (!scanResult) return;
    const prefill: Partial<FinancialTransactionForm> = { transaction_type: 'expense' };
    if (scanResult.amount) prefill.amount = scanResult.amount;
    if (scanResult.transaction_date) prefill.transaction_date = scanResult.transaction_date;
    if (scanResult.receipt_number) prefill.receipt_number = scanResult.receipt_number;
    onConfirm(prefill);
  }, [scanResult, onConfirm]);

  return {
    videoRef,
    canvasRef,
    scanState,
    setScanState,
    capturedImage,
    scanResult,
    cameraError,
    progress,
    ocrError,
    startCamera,
    stopCamera,
    capture,
    handleFileUpload,
    runOCR,
    retake,
    handleConfirm,
  };
}
