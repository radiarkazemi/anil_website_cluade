import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'anil-pwa-install-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone);
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Optional, dismissible PWA install invitation (handoff board 09).
 * Uses the real beforeinstallprompt event when available; iOS shows A2HS hints.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    setIos(isIos());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Delay invite until after a useful interaction window
      window.setTimeout(() => setOpen(true), 4500);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    // iOS never fires beforeinstallprompt — soft invite after delay
    let iosTimer = 0;
    if (isIos()) {
      iosTimer = window.setTimeout(() => setOpen(true), 6000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    dismiss();
  };

  if (!open || isStandalone()) return null;

  return (
    <div className="pwa-install" role="dialog" aria-label="نصب اپلیکیشن آنیل">
      <button type="button" className="pwa-install-backdrop" aria-label="بستن" onClick={dismiss} />
      <div className="pwa-install-sheet">
        <div className="pwa-install-handle" aria-hidden />
        <button type="button" className="pwa-install-close" onClick={dismiss} aria-label="بستن">
          ✕
        </button>
        <div className="pwa-install-icon" aria-hidden>
          <img src="/logo-mark.png" alt="" width={64} height={64} />
        </div>
        <h2>آنیل همیشه همراه شما</h2>
        <p>با نصب میانبر، دسترسی سریع‌تر و روان‌تری به گالری آنیل روی دستگاه خود داشته باشید.</p>
        <ul className="pwa-install-features">
          <li>
            <strong>نصب آسان</strong>
            <span>با چند لمس، میانبر را روی صفحه اصلی قرار دهید.</span>
          </li>
          <li>
            <strong>دسترسی سریع</strong>
            <span>بدون نیاز به جستجو در مرورگر.</span>
          </li>
          <li>
            <strong>همیشه در دسترس</strong>
            <span>علاقه‌مندی‌ها و حساب کاربری در یک لمس.</span>
          </li>
        </ul>
        {deferred ? (
          <button type="button" className="gold-btn pwa-install-cta" onClick={install}>
            نصب اپلیکیشن آنیل
          </button>
        ) : null}
        <button type="button" className="outline-btn pwa-install-later" onClick={dismiss}>
          بعداً
        </button>
        {ios ? (
          <p className="pwa-install-ios">
            برای کاربران iOS: از منوی اشتراک‌گذاری، گزینه Add to Home Screen را انتخاب کنید.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-banner" role="status">
      اتصال اینترنت برقرار نیست — قیمت‌ها و موجودی ممکن است به‌روز نباشند.
    </div>
  );
}
