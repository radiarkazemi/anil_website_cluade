import { createPortal } from 'react-dom';
import { useEffect, useCallback, useState } from 'react';
import { faNum } from '../utils/format';

type Props = {
  images: string[];
  alt: string;
  placeholder?: string;
  outOfStock?: boolean;
};

export function ProductImageGallery({ images, alt, placeholder, outOfStock }: Props) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const count = images.length;
  const safeIdx = count ? ((idx % count) + count) % count : 0;
  const main = images[safeIdx] || '';

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      setIdx(((next % count) + count) % count);
      setFadeKey((k) => k + 1);
    },
    [count],
  );

  useEffect(() => {
    setIdx(0);
    setLightbox(false);
  }, [images.join('|')]);

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') go(safeIdx + 1); // RTL: left = next
      if (e.key === 'ArrowRight') go(safeIdx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox, go, safeIdx]);

  if (!count) {
    return (
      <div className="pd-gallery">
        <div className="pd-main-media is-empty">
          <span className="pd-placeholder">{placeholder || alt}</span>
          {outOfStock && <div className="pd-oos">ناموجود</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="pd-gallery">
      <div className="pd-main-stage">
        <button
          type="button"
          className="pd-main-media is-zoomable"
          onClick={() => setLightbox(true)}
          aria-label="نمایش تصویر در اندازه کامل"
        >
          <img
            key={fadeKey}
            className="pd-main-img"
            src={main}
            alt={alt}
          />
          {outOfStock && <div className="pd-oos">ناموجود</div>}
          <span className="pd-zoom-hint" aria-hidden>بزرگ‌نمایی</span>
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              className="pd-nav pd-nav-prev"
              aria-label="تصویر قبلی"
              onClick={() => go(safeIdx - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="pd-nav pd-nav-next"
              aria-label="تصویر بعدی"
              onClick={() => go(safeIdx + 1)}
            >
              ›
            </button>
            <div className="pd-counter">{faNum(safeIdx + 1)} / {faNum(count)}</div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="pd-thumbs" role="tablist" aria-label="گالری تصاویر">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === safeIdx}
              className={`pd-thumb${i === safeIdx ? ' active' : ''}`}
              onClick={() => go(i)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}

      {lightbox &&
        createPortal(
          <div
            className="pd-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="نمایش تصویر"
            onClick={() => setLightbox(false)}
          >
            <div className="pd-lightbox-veil" aria-hidden />
            <button
              type="button"
              className="pd-lightbox-close"
              aria-label="بستن"
              onClick={() => setLightbox(false)}
            >
              ✕
            </button>
            {count > 1 && (
              <>
                <button
                  type="button"
                  className="pd-lightbox-nav prev"
                  aria-label="قبلی"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(safeIdx - 1);
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="pd-lightbox-nav next"
                  aria-label="بعدی"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(safeIdx + 1);
                  }}
                >
                  ›
                </button>
              </>
            )}
            <figure
              className="pd-lightbox-frame"
              onClick={(e) => e.stopPropagation()}
            >
              <img key={`lb-${fadeKey}`} src={main} alt={alt} />
              <figcaption>
                {alt}
                {count > 1 ? ` — ${faNum(safeIdx + 1)} از ${faNum(count)}` : ''}
              </figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </div>
  );
}
