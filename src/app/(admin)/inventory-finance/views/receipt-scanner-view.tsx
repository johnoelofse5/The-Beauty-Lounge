'use client';

import { ScanState } from '../components/types/scan-state';
import { ReceiptScannerViewProps } from '../components/types/receipt-scanner-view-props';

export function ReceiptScannerView({
  isClosing,
  onClose,
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
}: ReceiptScannerViewProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div
        className={`relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl overflow-hidden transition-all duration-300 ${
          isClosing ? 'translate-y-4 sm:scale-95' : 'translate-y-0 sm:scale-100'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Scan Receipt</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {scanState === ScanState.Camera && (
            <div className="space-y-4">
              {cameraError ? (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{cameraError}</p>
              ) : (
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-6 pointer-events-none">
                    <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl-sm" />
                    <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr-sm" />
                    <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl-sm" />
                    <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br-sm" />
                  </div>
                </div>
              )}
              <p className="text-xs text-center text-gray-500">
                Position the receipt within the frame and tap Capture
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopCamera();
                    setScanState(ScanState.Upload);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Upload Image
                </button>
                <button
                  onClick={capture}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                  </svg>
                  Capture
                </button>
              </div>
            </div>
          )}

          {scanState === ScanState.Upload && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <svg
                  className="w-10 h-10 text-gray-400 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Tap to select receipt image
                </span>
                <span className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={() => {
                  setScanState(ScanState.Camera);
                  startCamera();
                }}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Use Camera Instead
              </button>
            </div>
          )}

          {scanState === ScanState.Captured && capturedImage && (
            <div className="space-y-4">
              {ocrError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{ocrError}</p>
              )}
              <div className="rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={capturedImage}
                  alt="Captured receipt"
                  className="w-full max-h-64 object-contain"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={runOCR}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Scan Receipt
                </button>
              </div>
            </div>
          )}

          {scanState === ScanState.Scanning && (
            <div className="py-10 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">Scanning receipt…</p>
                <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {scanState === ScanState.Results && scanResult && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Receipt scanned successfully</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Review the extracted data below. You can edit any field after confirming.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                <ResultRow
                  label="Amount"
                  value={scanResult.amount ? `R ${scanResult.amount.toFixed(2)}` : undefined}
                  fallback="Not detected"
                />
                <ResultRow
                  label="Date"
                  value={scanResult.transaction_date}
                  fallback="Not detected — today's date will be used"
                />
                <ResultRow
                  label="Receipt No."
                  value={scanResult.receipt_number}
                  fallback="Not detected"
                />
                <div className="px-4 py-3 bg-gray-50 flex justify-between">
                  <span className="text-sm text-gray-600">Transaction Type</span>
                  <span className="text-sm font-medium text-gray-900">Expense (default)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Scan Again
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Use This Data
                </button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  fallback,
}: {
  label: string;
  value?: string;
  fallback: string;
}) {
  return (
    <div className="px-4 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      {value ? (
        <span className="text-sm font-medium text-gray-900">{value}</span>
      ) : (
        <span className="text-xs text-gray-400 italic">{fallback}</span>
      )}
    </div>
  );
}
