import { RefObject } from 'react';
import { ScanResult } from './scan-result';
import { ScanState } from './scan-state';

export interface ReceiptScannerViewProps {
  isClosing: boolean;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  scanState: ScanState;
  setScanState: (state: ScanState) => void;
  capturedImage: string | null;
  scanResult: ScanResult | null;
  cameraError: string | null;
  progress: number;
  ocrError: string | null;
  startCamera: () => void;
  stopCamera: () => void;
  capture: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  runOCR: () => void;
  retake: () => void;
  handleConfirm: () => void;
}
