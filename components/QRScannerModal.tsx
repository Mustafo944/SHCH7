import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Loader2, Camera, Flashlight, FlashlightOff } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  expectedPrefix?: string;
  existingScans?: string[];
}

// BarcodeDetector brauzerda mavjudligini bir marta aniqlaymiz (SSR-xavfsiz)
const hasBarcodeDetector = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window;

export function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "QR Kodni Skanerlang",
  expectedPrefix,
  existingScans = []
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const vfcRef = useRef<number | null>(null);
  const html5Ref = useRef<any>(null);
  const scanLockRef = useRef(false);
  const mountedRef = useRef(false);
  // Oxirgi rad etilgan kod + vaqti — bir xil noto'g'ri kodni har kadrda takror ishlamaslik uchun
  const lastRejectRef = useRef<{ text: string; at: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  // Faol dvigatel: native BarcodeDetector yoki html5-qrcode fallback.
  // Native ishlamay qolsa runtime'da fallback'ga o'tamiz.
  const [engine, setEngine] = useState<'native' | 'fallback'>(() => hasBarcodeDetector() ? 'native' : 'fallback');

  // Stabil ref lar
  const expectedPrefixRef = useRef(expectedPrefix);
  const existingScansRef = useRef(existingScans);
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => { expectedPrefixRef.current = expectedPrefix; }, [expectedPrefix]);
  useEffect(() => { existingScansRef.current = existingScans; }, [existingScans]);
  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (vfcRef.current !== null && videoRef.current && 'cancelVideoFrameCallback' in videoRef.current) {
      (videoRef.current as any).cancelVideoFrameCallback(vfcRef.current);
      vfcRef.current = null;
    }
    if (html5Ref.current) {
      const decoder = html5Ref.current;
      html5Ref.current = null;
      try {
        // isScanning bo'lsa to'xtatamiz, keyin tozalaymiz
        if (decoder.getState && decoder.getState() === 2 /* SCANNING */) {
          decoder.stop().then(() => { try { decoder.clear(); } catch { /* */ } }).catch(() => { /* */ });
        } else {
          try { decoder.clear(); } catch { /* */ }
        }
      } catch { /* */ }
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

    const wrongPrefix = !!expectedPrefixRef.current && !decodedText.startsWith(expectedPrefixRef.current);
    const duplicate = existingScansRef.current.includes(decodedText);

    if (wrongPrefix || duplicate) {
      // Rad etilgan kod — skaner TO'XTAMAYDI, tekshirishda davom etadi.
      // Bir xil noto'g'ri kod har kadrda takror ishlanmasin (titrash/xato spam bo'lmasin):
      // shu qiymatni qisqa muddat (1.5s) e'tiborsiz qoldiramiz.
      const now = Date.now();
      const last = lastRejectRef.current;
      if (last && last.text === decodedText && now - last.at < 1500) return;
      lastRejectRef.current = { text: decodedText, at: now };

      setError(wrongPrefix
        ? 'Xato: Bu QR kod boshqa bekat yoki qurilmaga tegishli.'
        : 'Xato: Siz bu qurilmani oldin skaner qilgansiz!');
      try { navigator.vibrate?.([60, 40, 60]); } catch { /* */ }
      setTimeout(() => setError(null), 2500);
      return;
    }

    scanLockRef.current = true;
    setError(null);
    setSuccess("✅ Muvaffaqiyatli o'qildi!");
    // Muvaffaqiyat — qisqa haptik javob (tez his qilinishi uchun)
    try { navigator.vibrate?.(120); } catch { /* */ }
    stopCamera();

    setTimeout(() => {
      onScanSuccessRef.current(decodedText);
    }, 450);
  }, [stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] } as any);
      setTorchOn(next);
    } catch { /* qurilma qo'llab-quvvatlamasa jim o'tamiz */ }
  }, [torchOn]);

  useEffect(() => {
    if (!isOpen) return;

    mountedRef.current = true;
    scanLockRef.current = false;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    setTorchOn(false);
    setTorchSupported(false);

    const useNative = hasBarcodeDetector();
    setEngine(useNative ? 'native' : 'fallback');

    // ——— Native BarcodeDetector: kamera + har kadrda aniqlash (eng tez) ———
    const startNative = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              // Uzluksiz avtofokus — QR ni tez va aniq ushlaydi
              focusMode: 'continuous',
              advanced: [{ focusMode: 'continuous' }]
            } as any,
            audio: false
          });
        } catch {
          // Qattiq cheklovlar rad etilsa — soddaroq bilan qayta urinamiz
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });
        }

        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        // Fonar (torch) qo'llab-quvvatlanishini tekshiramiz
        try {
          const track = stream.getVideoTracks()[0];
          const caps: any = track.getCapabilities?.();
          if (caps && 'torch' in caps && caps.torch) setTorchSupported(true);
        } catch { /* */ }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => { /* */ });
        }
        if (mountedRef.current) setIsLoading(false);

        let detector: any;
        try {
          // @ts-expect-error — BarcodeDetector TypeScript da yo'q
          detector = new BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          // Native detektor ishlamasa — fallback ga o'tamiz
          setEngine('fallback');
          startFallback();
          return;
        }

        const supportsVFC = !!video && 'requestVideoFrameCallback' in video;

        const scheduleNext = () => {
          if (!mountedRef.current || scanLockRef.current) return;
          if (supportsVFC && video) {
            vfcRef.current = (video as any).requestVideoFrameCallback(() => tick());
          } else {
            rafRef.current = requestAnimationFrame(() => tick());
          }
        };

        const tick = async () => {
          if (!mountedRef.current || scanLockRef.current || !videoRef.current) return;
          if (videoRef.current.readyState < 2) { scheduleNext(); return; }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetected(barcodes[0].rawValue);
              // Faqat kod QABUL qilinganda (bloklanganda) to'xtaymiz.
              // Rad etilgan bo'lsa — tekshirishda davom etamiz.
              if (scanLockRef.current) return;
            }
          } catch { /* kadr o'qib bo'lmadi — keyingisiga o'tamiz */ }
          scheduleNext();
        };

        tick();
      } catch {
        if (mountedRef.current) {
          setError("Kameraga ulanib bo'lmadi. Iltimos, brauzer ruxsatlarini tekshiring.");
          setIsLoading(false);
        }
      }
    };

    // ——— Fallback: html5-qrcode o'zining optimizatsiyalangan kamera skaneri ———
    const startFallback = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mountedRef.current) return;

        // Native oqim ishlagan bo'lsa uni to'xtatamiz (html5-qrcode o'zi kamera oladi)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;

        const decoder = new Html5Qrcode('qr-reader-region', { verbose: false } as any);
        html5Ref.current = decoder;

        await decoder.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.333,
            disableFlip: false
          },
          (decodedText: string) => { handleDetected(decodedText); },
          () => { /* har kadrdagi "topilmadi" xatolari — e'tiborsiz */ }
        );

        if (mountedRef.current) setIsLoading(false);
      } catch {
        if (mountedRef.current) {
          setError("QR kod o'qish kutubxonasi yuklanmadi.");
          setIsLoading(false);
        }
      }
    };

    if (useNative) startNative();
    else startFallback();

    return () => {
      mountedRef.current = false;
      stopCamera();
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
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-20">
              <Loader2 className="animate-spin text-white mb-3" size={36} />
              <span className="text-xs font-bold text-slate-300">Kamera ishga tushmoqda...</span>
            </div>
          )}

          {/* Fallback konteyneri DOIM mavjud bo'lsin — native ishlamay qolib
              fallback'ga o'tsa, html5-qrcode shu div'ni topa olishi kerak. */}
          <div id="qr-reader-region" className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Native rejim: o'z video elementimiz fallback konteyneri ustida turadi */}
          {engine === 'native' && (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full block"
              style={{ objectFit: 'cover' }}
            />
          )}

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

          {/* Fonar tugmasi (qo'llab-quvvatlansa) */}
          {torchSupported && !isLoading && !error && !success && (
            <button
              onClick={toggleTorch}
              className={`absolute bottom-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition active:scale-90 ${torchOn ? 'bg-amber-400 text-slate-900' : 'bg-slate-900/60 text-white backdrop-blur-sm'}`}
              aria-label="Fonar"
            >
              {torchOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
            </button>
          )}
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
              Kamerani qurilmadagi QR kodga qarating
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
