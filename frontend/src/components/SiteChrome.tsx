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

export function ContactBand({
  site,
  id = 'contact',
  title = 'در شهر ابهر، در کنار شما',
  primaryTo,
  primaryLabel = 'تماس با ما',
}: {
  site?: SiteSettings | null;
  id?: string;
  title?: string;
  primaryTo?: string;
  primaryLabel?: string;
}) {
  const address = contactAddress(site);
  const phone = contactPhone(site);
  const email = contactEmail(site);
  const mapSrc =
    'https://maps.google.com/maps?q=' +
    encodeURIComponent('ابهر، استان زنجان') +
    '&hl=fa&z=14&output=embed';

  return (
    <section id={id} className="container home-contact handoff-04-contact" aria-labelledby={`${id}-title`}>
      <div className="handoff-04-contact-grid">
        <div className="handoff-04-map-wrap">
          <iframe
            className="handoff-04-map"
            title="موقعیت گالری آنیل روی نقشه"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="handoff-04-contact-copy">
          <h2 id={`${id}-title`}>{title}</h2>
          <p className="handoff-04-contact-lead">گالری طلای آنیل — ابهر</p>
          <ul className="handoff-04-contact-list">
            <li>{address}</li>
            {phone ? (
              <li>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">{phone}</a>
              </li>
            ) : null}
            <li>
              <a href={`mailto:${email}`} dir="ltr">{email}</a>
            </li>
          </ul>
          <div className="handoff-04-contact-actions">
            {primaryTo ? (
              <Link className="gold-btn" to={primaryTo}>{primaryLabel}</Link>
            ) : (
              <a className="gold-btn" href={`mailto:${email}`}>ارسال ایمیل</a>
            )}
            <a
              className="outline-btn"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              باز کردن در نقشه
            </a>
          </div>
          <p className="handoff-04-contact-note">موقعیت دقیق فروشگاه به‌زودی روی نقشه به‌روزرسانی می‌شود.</p>
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
  const address = contactAddress(site);
  const phone = contactPhone(site);
  const email = contactEmail(site);

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div className="footer-brand-row">
            <img className="logo-img footer-logo" src={site?.brand_logo_url || '/logo.png'} alt="" />
            <div>
              <div className="footer-brand">{site?.brand_name || 'Anil'}</div>
              <div className="logo-sub">{site?.brand_tagline || 'درخششی ابدی'}</div>
            </div>
          </div>
          <p className="footer-tag">
            {site?.footer_tagline && !UNVERIFIED_CLAIM_RE.test(site.footer_tagline)
              ? site.footer_tagline
              : 'زیورآلات اصیل با قیمت شفاف و لحظه‌ای — گالری آنیل، ابهر.'}
          </p>
          <Link to="/products" className="footer-shop-btn">مشاهده محصولات</Link>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h3>دسته‌بندی‌ها</h3>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h3>دسترسی سریع</h3>
            <ul>
              <li><Link to="/p/راهنمای-خرید">راهنمای خرید</Link></li>
              <li><Link to="/blog">بلاگ</Link></li>
              <li><Link to="/products">محصولات</Link></li>
              <li><Link to="/atelier">برآورد بودجه</Link></li>
              <li><Link to="/account">حساب کاربری</Link></li>
            </ul>
          </div>
          <div className="footer-col footer-contact">
            <h3>تماس</h3>
            <ul>
              <li>{address}</li>
              {phone ? (
                <li>
                  <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">{phone}</a>
                </li>
              ) : null}
              <li>
                <a href={`mailto:${email}`} dir="ltr">{email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-copy footer-copy-row">
          <span>© گالری طلا آنیل ۱۴۰۵</span>
          <span>قیمت لحظه‌ای · مشاوره حضوری</span>
        </div>
      </div>
    </footer>
  );
}

/** Loads site settings + categories for secondary pages. */
export function SecondaryPageChrome({ children }: { children: ReactNode }) {
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
      <ContactBand site={site} id="page-contact" title="در شهر ابهر، در کنار شما" />
      <SiteFooter site={site} categories={categories} />
    </div>
  );
}
