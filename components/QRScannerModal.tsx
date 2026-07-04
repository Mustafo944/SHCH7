import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Loader2, Camera } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  expectedPrefix?: string;
  existingScans?: string[];
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "QR Kodni Skanerlang",
  expectedPrefix,
  existingScans = []
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanLockRef = useRef(false);
  const mountedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stabil ref lar
  const expectedPrefixRef = useRef(expectedPrefix);
  const existingScansRef = useRef(existingScans);
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => { expectedPrefixRef.current = expectedPrefix; }, [expectedPrefix]);
  useEffect(() => { existingScansRef.current = existingScans; }, [existingScans]);
  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDetected = useCallback((decodedText: string) => {
    if (scanLockRef.current) return;

    if (expectedPrefixRef.current && !decodedText.startsWith(expectedPrefixRef.current)) {
      setError('Xato: Bu QR kod boshqa bekat yoki tizimga tegishli.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (existingScansRef.current.includes(decodedText)) {
      setError('Xato: Siz bu qurilmani oldin skaner qilgansiz!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    scanLockRef.current = true;
    setError(null);
    setSuccess("✅ Muvaffaqiyatli o'qildi!");
    stopCamera();

    setTimeout(() => {
      onScanSuccessRef.current(decodedText);
    }, 800);
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) return;

    mountedRef.current = true;
    scanLockRef.current = false;
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    let barcodeDetector: any = null;
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (mountedRef.current) setIsLoading(false);

        // BarcodeDetector bo'lsa — native, bo'lmasa — html5-qrcode fallback
        if (hasBarcodeDetector) {
          try {
            // @ts-expect-error — BarcodeDetector TypeScript da yo'q
            barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            scanWithBarcodeDetector(barcodeDetector);
          } catch {
            scanWithHtml5QrCode();
          }
        } else {
          scanWithHtml5QrCode();
        }
      } catch {
        if (mountedRef.current) {
          setError("Kameraga ulanib bo'lmadi. Iltimos, brauzer ruxsatlarini tekshiring.");
          setIsLoading(false);
        }
      }
    };

    // ——— BarcodeDetector (native, tez) ———
    const scanWithBarcodeDetector = (detector: any) => {
      const scan = async () => {
        if (!mountedRef.current || scanLockRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < 2) {
          scanTimerRef.current = setTimeout(scan, 100);
          return;
        }

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleDetected(barcodes[0].rawValue);
            return;
          }
        } catch {
          // ignore
        }

        if (mountedRef.current && !scanLockRef.current) {
          scanTimerRef.current = setTimeout(scan, 150);
        }
      };
      scan();
    };

    // ——— html5-qrcode fallback (canvas → scanFileV2) ———
    const scanWithHtml5QrCode = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // html5-qrcode uchun yashirin konteyner
        const tempId = `qr-temp-${Date.now()}`;
        const tempDiv = document.createElement('div');
        tempDiv.id = tempId;
        tempDiv.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
        document.body.appendChild(tempDiv);

        const decoder = new Html5Qrcode(tempId);

        const scan = () => {
          if (!mountedRef.current || scanLockRef.current || !videoRef.current || !canvasRef.current) return;
          if (videoRef.current.readyState < 2) {
            scanTimerRef.current = setTimeout(scan, 200);
            return;
          }

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) { scanTimerRef.current = setTimeout(scan, 200); return; }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (!blob || scanLockRef.current || !mountedRef.current) return;
            try {
              const file = new File([blob], 'f.png', { type: 'image/png' });
              const result = await decoder.scanFileV2(file, false);
              if (result?.decodedText) {
                handleDetected(result.decodedText);
                // Tempdiv ni tozalash
                try { document.body.removeChild(tempDiv); } catch { /* */ }
                return;
              }
            } catch {
              // QR topilmadi — keyingi framega o'tish
            }

            if (mountedRef.current && !scanLockRef.current) {
              scanTimerRef.current = setTimeout(scan, 250);
            }
          }, 'image/png');
        };

        scan();
      } catch {
        if (mountedRef.current) {
          setError("QR kod o'qish kutubxonasi yuklanmadi.");
        }
      }
    };

    startCamera();

    return () => {
      mountedRef.current = false;
      stopCamera();
      // Temp div larni tozalash
      document.querySelectorAll('[id^="qr-temp-"]').forEach(el => el.remove());
    };
  }, [isOpen, handleDetected, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Camera size={18} />
            </div>
            <h3 className="font-black text-slate-800 text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition shadow-sm border border-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Kamera oynasi */}
        <div className="relative bg-black">
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-20">
              <Loader2 className="animate-spin text-white mb-3" size={36} />
              <span className="text-xs font-bold text-slate-300">Kamera ishga tushmoqda...</span>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full block"
            style={{ aspectRatio: '4/3', objectFit: 'cover' }}
          />

          {/* Skaner ramkasi */}
          {!isLoading && !error && !success && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-52 h-52 relative">
                <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white/90 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white/90 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white/90 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white/90 rounded-br-lg" />
                {/* Skanerlash chizig'i */}
                <div
                  className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                  style={{ animation: 'qrScanLine 2s ease-in-out infinite' }}
                />
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status */}
        <div className="px-5 py-4 space-y-2">
          {error && (
            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" /> {success}
            </div>
          )}
          {!error && !success && (
            <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-widest">
              Kamerani bekatdagi QR kodga qarating
            </p>
          )}
        </div>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @keyframes qrScanLine {
          0% { top: 4px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% - 4px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
