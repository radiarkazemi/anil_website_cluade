import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '../api/endpoints';
import type { Category, CmsLink, SiteSettings } from '../types';
import { mapsEmbedSrc, mapsExternalUrl } from '../utils/mapsEmbed';
import { mediaUrl } from '../utils/mediaUrl';

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

function FooterLink({ item }: { item: CmsLink }) {
  const href = item.href || '#';
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return <a href={href}>{item.label}</a>;
  }
  if (href.startsWith('#')) {
    return <a href={href}>{item.label}</a>;
  }
  return <Link to={href}>{item.label}</Link>;
}

/** Contact band with real Google Map embed — all copy from SiteSettings. */
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
  const photo =
    mediaUrl(site?.contact_image_url || '') || '/home/contact-atmosphere.webp';
  const kicker = (site?.contact_kicker || '').trim() || 'درخشش با ما';
  const heading = (site?.contact_title || '').trim() || 'در شهر ابهر، در کنار شما';
  const body =
    (site?.contact_body || '').trim() ||
    'گالری طلای آنیل در ابهر — مشاوره حضوری، قیمت شفاف بر پایه نرخ روز، و همراهی برای انتخاب درست.';
  const cta = (site?.contact_cta_label || '').trim() || 'تماس با ما';
  const embed = mapsEmbedSrc(site);
  const external = mapsExternalUrl(site);
  const mapOpen = site?.cms?.map?.open_label || 'باز کردن در گوگل‌مپ';
  const mapTitle = site?.cms?.map?.iframe_title || 'موقعیت گالری روی نقشه گوگل';

  return (
    <section id={id} className="handoff-abhar" aria-labelledby={`${id}-title`}>
      <div className="container handoff-abhar-inner">
        <div className="handoff-abhar-grid">
          <div
            className="handoff-abhar-photo"
            style={{ backgroundImage: `url('${photo}')` }}
            role="img"
            aria-label={heading}
          />
          <div className="handoff-abhar-copy">
            <div className="handoff-abhar-kicker">{kicker}</div>
            <h2 id={`${id}-title`}>{heading}</h2>
            <p>{body}</p>
            <a className="handoff-abhar-cta" href={ctaHref}>
              {cta}
              <span aria-hidden>‹</span>
            </a>
          </div>
          <div className="handoff-abhar-map">
            <iframe
              title={mapTitle}
              src={embed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              className="handoff-abhar-map-open"
              href={external}
              target="_blank"
              rel="noopener noreferrer"
            >
              {mapOpen}
            </a>
          </div>
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

  const foot = site?.cms?.footer || {};
  const customersTitle = foot.customers_title || 'خدمات مشتریان';
  const categoriesTitle = foot.categories_title || 'دسته‌بندی‌ها';
  const quickTitle = foot.quick_title || 'دسترسی سریع';
  const aboutTitle = foot.about_title || site?.footer_about_heading || 'گالری طلای آنیل';
  const customersLinks = foot.customers_links?.length
    ? foot.customers_links
    : [
        { label: 'راهنمای خرید', href: '/p/راهنمای-خرید' },
        { label: 'نحوه سفارش', href: '/p/راهنمای-خرید' },
        { label: 'بلاگ و آموزش', href: '/blog' },
        { label: 'پشتیبانی', href: `mailto:${contactEmail(site)}` },
      ];
  const quickLinks = foot.quick_links?.length
    ? foot.quick_links
    : [
        { label: 'محصولات', href: '/products' },
        { label: 'راهنمای خرید', href: '/p/راهنمای-خرید' },
        { label: 'بلاگ', href: '/blog' },
        { label: 'درباره ما', href: '/p/درباره-ما' },
        { label: 'تماس با ما', href: '#contact' },
      ];
  const legalLinks = foot.legal_links?.length
    ? foot.legal_links
    : [
        { label: 'حریم خصوصی', href: '/p/حریم-خصوصی' },
        { label: 'شرایط استفاده', href: '/p/شرایط-استفاده' },
        { label: 'نقشه سایت', href: '/' },
      ];
  const copyright =
    (site?.footer_copyright || '').trim() || 'تمامی حقوق برای گالری طلای آنیل محفوظ است.';

  return (
    <footer className="site-footer handoff-footer">
      <div className="container handoff-footer-inner">
        <div className="handoff-footer-cols">
          <div className="handoff-footer-col">
            <h3>{customersTitle}</h3>
            <ul>
              {customersLinks.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <FooterLink item={item} />
                </li>
              ))}
            </ul>
          </div>
          <div className="handoff-footer-col">
            <h3>{categoriesTitle}</h3>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="handoff-footer-col">
            <h3>{quickTitle}</h3>
            <ul>
              {quickLinks.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <FooterLink item={item} />
                </li>
              ))}
            </ul>
          </div>
          <div className="handoff-footer-col handoff-footer-about">
            <h3>{aboutTitle}</h3>
            <p>{tagline}</p>
            <div className="handoff-footer-social" aria-label="راه‌های ارتباط">
              <a href={`mailto:${contactEmail(site)}`} aria-label="ایمیل">✉</a>
              <a href={foot.website_url || 'https://goldanil.ir'} aria-label="وب‌سایت">◎</a>
              <a href="#contact" aria-label="تماس">☎</a>
              <Link to="/blog" aria-label="مجله">✎</Link>
            </div>
          </div>
          <div className="handoff-footer-col handoff-footer-brand">
            <div className="handoff-footer-wordmark">{site?.brand_name || 'ANIL'}</div>
            <div className="handoff-footer-tagline">{site?.brand_tagline || 'درخشش ابدی'}</div>
          </div>
        </div>

        <div className="handoff-footer-bar">
          <button type="button" className="handoff-footer-top" onClick={scrollTop} aria-label="بازگشت به بالا">
            ↑
          </button>
          <span className="handoff-footer-copy">{copyright}</span>
          <div className="handoff-footer-legal">
            {legalLinks.map((item, i) => (
              <span key={`${item.label}-${item.href}`} style={{ display: 'contents' }}>
                {i > 0 ? <span aria-hidden>|</span> : null}
                <FooterLink item={item} />
              </span>
            ))}
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

  const moments = site?.cms?.moments || {};
  const momentsImg =
    mediaUrl(site?.moments_image_url || '') ||
    moments.image_path ||
    '/home/editorial-triptych.webp';

  return (
    <div className="secondary-page">
      {children}
      {showMoments ? (
        <section className="container handoff-moments" aria-label="گالری لحظه‌ها">
          <div className="handoff-moments-grid">
            <div className="handoff-moments-copy">
              <h2>{moments.title || 'طلا در لحظه‌های خاص زندگی شما'}</h2>
              <p>{moments.subtitle || 'قطعات منتخب گالری را برای مناسبت‌های مهم ببینید.'}</p>
              <Link to={moments.cta_url || '/products'} className="handoff-abhar-cta">
                {moments.cta_label || 'مشاهده گالری'}
                <span aria-hidden>‹</span>
              </Link>
            </div>
            <div
              className="handoff-moments-art"
              style={{ backgroundImage: `url('${momentsImg}')` }}
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
