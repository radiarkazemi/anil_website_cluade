import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../store/toastStore';

type Props = {
  title: string;
  excerpt?: string;
  /** Absolute or site path, e.g. /blog/my-slug or /b/abc123 */
  path: string;
  className?: string;
};

function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://goldanil.ir';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function ShareBar({ title, excerpt = '', path, className = '' }: Props) {
  const toast = useToast((s) => s.show);
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => absoluteUrl(path), [path]);
  const text = excerpt ? `${title}\n${excerpt}` : title;

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast('لینک کپی شد');
    } catch {
      toast('کپی لینک ممکن نشد');
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to copy */
      }
    }
    await copy();
  };

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div className={`share-bar ${className}`.trim()}>
      <div className="share-bar-label">اشتراک‌گذاری</div>
      <div className="share-bar-row">
        <button type="button" className="share-chip primary" onClick={nativeShare}>
          اشتراک
        </button>
        <button type="button" className="share-chip" onClick={copy}>
          {copied ? 'کپی شد ✓' : 'کپی لینک'}
        </button>
        <a className="share-chip" href={wa} target="_blank" rel="noreferrer">
          واتساپ
        </a>
        <a className="share-chip" href={tg} target="_blank" rel="noreferrer">
          تلگرام
        </a>
      </div>
      <div className="share-bar-url" dir="ltr" title={url}>
        <code>{url.replace(/^https?:\/\//, '')}</code>
        <button type="button" className="share-bar-copy-mini" onClick={copy} aria-label="کپی لینک">
          کپی
        </button>
      </div>
    </div>
  );
}
