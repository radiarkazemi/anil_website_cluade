import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../store/toastStore';

type Props = {
  title: string;
  excerpt?: string;
  /** Absolute or site path, e.g. /blog/my-slug or /b/abc123 */
  path: string;
  className?: string;
};

export function absoluteShareUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://goldanil.ir';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** One-tap short-link copy — for blog cards / admin tables. */
export function CopyShortLinkButton({
  shareCode,
  className = '',
  label,
}: {
  shareCode?: string | null;
  className?: string;
  label?: string;
}) {
  const toast = useToast((s) => s.show);
  const [copied, setCopied] = useState(false);
  if (!shareCode) return null;
  const path = `/b/${shareCode}`;
  const url = absoluteShareUrl(path);

  return (
    <button
      type="button"
      className={`share-chip copy-short-link ${className}`.trim()}
      title={url}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await copyText(url);
        if (ok) {
          setCopied(true);
          toast('لینک کوتاه کپی شد');
          window.setTimeout(() => setCopied(false), 2000);
        } else {
          toast(url);
        }
      }}
    >
      {copied ? 'کپی شد ✓' : label || 'کپی لینک کوتاه'}
    </button>
  );
}

export function ShareBar({ title, excerpt = '', path, className = '' }: Props) {
  const toast = useToast((s) => s.show);
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => absoluteShareUrl(path), [path]);
  const text = excerpt ? `${title}\n${excerpt}` : title;

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      toast('لینک کوتاه کپی شد');
    } else {
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
      <div className="share-bar-label">لینک کوتاه برای شبکه‌های اجتماعی</div>
      <div className="share-bar-url" dir="ltr" title={url}>
        <code>{url.replace(/^https?:\/\//, '')}</code>
        <button type="button" className="share-bar-copy-mini" onClick={copy} aria-label="کپی لینک">
          {copied ? '✓' : 'کپی'}
        </button>
      </div>
      <div className="share-bar-row">
        <button type="button" className="share-chip primary" onClick={copy}>
          {copied ? 'کپی شد ✓' : 'کپی لینک کوتاه'}
        </button>
        <button type="button" className="share-chip" onClick={nativeShare}>
          اشتراک
        </button>
        <a className="share-chip" href={wa} target="_blank" rel="noreferrer">
          واتساپ
        </a>
        <a className="share-chip" href={tg} target="_blank" rel="noreferrer">
          تلگرام
        </a>
      </div>
    </div>
  );
}
