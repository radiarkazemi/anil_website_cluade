import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '../api/endpoints';
import type { Category, SiteSettings } from '../types';

const SAMPLE_PHONE_RE = /^(0?21[- ]?12345678|۰۲۱[- ]?۱۲۳۴۵۶۷۸)$/;
const TEHRAN_SAMPLE_RE = /تهران|بازار بزرگ طلا/;
const UNVERIFIED_CLAIM_RE = /بیمه|فاکتور رسمی|ارسال.*کشور|درب منزل|پرداخت امن|بازخرید تضمینی/;

export function contactAddress(site?: SiteSettings | null): string {
  const a = (site?.contact_address || '').trim();
  if (!a || TEHRAN_SAMPLE_RE.test(a)) return 'ابهر، استان زنجان';
  return a;
}

export function contactPhone(site?: SiteSettings | null): string {
  const p = (site?.contact_phone || '').trim();
  if (!p || SAMPLE_PHONE_RE.test(p.replace(/\s/g, ''))) return '';
  return p;
}

export function contactEmail(site?: SiteSettings | null): string {
  return (site?.contact_email || '').trim() || 'info@goldanil.ir';
}

/** Handoff Abhar band: city photo | copy + CTA | stylized map pin */
export function ContactBand({
  site,
  id = 'contact',
}: {
  site?: SiteSettings | null;
  id?: string;
  title?: string;
  primaryTo?: string;
  primaryLabel?: string;
}) {
  const phone = contactPhone(site);
  const email = contactEmail(site);
  const ctaHref = phone
    ? `tel:${phone.replace(/[^\d+]/g, '')}`
    : `mailto:${email}`;

  return (
    <section id={id} className="handoff-abhar" aria-labelledby={`${id}-title`}>
      <div className="container handoff-abhar-inner">
        <div className="handoff-abhar-grid">
          <div
            className="handoff-abhar-photo"
            style={{ backgroundImage: "url('/home/contact-atmosphere.webp')" }}
            role="img"
            aria-label="نمای شهر ابهر"
          />
          <div className="handoff-abhar-copy">
            <div className="handoff-abhar-kicker">درخشش با ما</div>
            <h2 id={`${id}-title`}>در شهر ابهر، در کنار شما</h2>
            <p>
              گالری طلای آنیل در ابهر — مشاوره حضوری، قیمت شفاف بر پایه نرخ روز،
              و همراهی برای انتخاب درست.
            </p>
            <a className="handoff-abhar-cta" href={ctaHref}>
              تماس با ما
              <span aria-hidden>‹</span>
            </a>
          </div>
          <a
            className="handoff-abhar-map"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('ابهر، استان زنجان')}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="موقعیت ابهر روی نقشه"
          >
            <img src="/home/abhar-map.svg" alt="" width={640} height={420} />
          </a>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({
  site,
  categories = [],
}: {
  site?: SiteSettings | null;
  categories?: Category[];
}) {
  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tagline =
    site?.footer_tagline && !UNVERIFIED_CLAIM_RE.test(site.footer_tagline)
      ? site.footer_tagline
      : 'زیورآلات اصیل با قیمت شفاف و لحظه‌ای — گالری آنیل، ابهر.';

  return (
    <footer className="site-footer handoff-footer">
      <div className="container handoff-footer-inner">
        <div className="handoff-footer-cols">
          <div className="handoff-footer-col">
            <h3>خدمات مشتریان</h3>
            <ul>
              <li><Link to="/p/راهنمای-خرید">راهنمای خرید</Link></li>
              <li><Link to="/p/راهنمای-خرید">نحوه سفارش</Link></li>
              <li><Link to="/blog">بلاگ و آموزش</Link></li>
              <li><a href={`mailto:${contactEmail(site)}`}>پشتیبانی</a></li>
            </ul>
          </div>
          <div className="handoff-footer-col">
            <h3>دسته‌بندی‌ها</h3>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="handoff-footer-col">
            <h3>دسترسی سریع</h3>
            <ul>
              <li><Link to="/products">محصولات</Link></li>
              <li><Link to="/p/راهنمای-خرید">راهنمای خرید</Link></li>
              <li><Link to="/blog">بلاگ</Link></li>
              <li><Link to="/p/درباره-ما">درباره ما</Link></li>
              <li><a href="#contact">تماس با ما</a></li>
            </ul>
          </div>
          <div className="handoff-footer-col handoff-footer-about">
            <h3>گالری طلای آنیل</h3>
            <p>{tagline}</p>
            <div className="handoff-footer-social" aria-label="راه‌های ارتباط">
              <a href={`mailto:${contactEmail(site)}`} aria-label="ایمیل">✉</a>
              <a href="https://goldanil.ir" aria-label="وب‌سایت">◎</a>
              <a href="#contact" aria-label="تماس">☎</a>
              <Link to="/blog" aria-label="مجله">✎</Link>
            </div>
          </div>
          <div className="handoff-footer-col handoff-footer-brand">
            <div className="handoff-footer-wordmark">ANIL</div>
            <div className="handoff-footer-tagline">{site?.brand_tagline || 'درخشش ابدی'}</div>
          </div>
        </div>

        <div className="handoff-footer-bar">
          <button type="button" className="handoff-footer-top" onClick={scrollTop} aria-label="بازگشت به بالا">
            ↑
          </button>
          <span className="handoff-footer-copy">تمامی حقوق برای گالری طلای آنیل محفوظ است.</span>
          <div className="handoff-footer-legal">
            <Link to="/p/حریم-خصوصی">حریم خصوصی</Link>
            <span aria-hidden>|</span>
            <Link to="/p/شرایط-استفاده">شرایط استفاده</Link>
            <span aria-hidden>|</span>
            <Link to="/">نقشه سایت</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SecondaryPageChrome({
  children,
  showMoments = false,
}: {
  children: ReactNode;
  showMoments?: boolean;
}) {
  const { data: site } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories().then((r) => r.data),
    staleTime: 120_000,
  });

  return (
    <div className="secondary-page">
      {children}
      {showMoments ? (
        <section className="container handoff-moments" aria-label="گالری لحظه‌ها">
          <div className="handoff-moments-grid">
            <div className="handoff-moments-copy">
              <h2>طلا در لحظه‌های خاص زندگی شما</h2>
              <p>قطعات منتخب گالری را برای مناسبت‌های مهم ببینید.</p>
              <Link to="/products" className="handoff-abhar-cta">
                مشاهده گالری
                <span aria-hidden>‹</span>
              </Link>
            </div>
            <div
              className="handoff-moments-art"
              style={{ backgroundImage: "url('/home/editorial-triptych.webp')" }}
              aria-hidden
            />
          </div>
        </section>
      ) : null}
      <ContactBand site={site} id="contact" />
      <SiteFooter site={site} categories={categories} />
    </div>
  );
}
