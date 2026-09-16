import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { AtelierBudgetTool } from '../components/AtelierBudgetTool';

const OCCASIONS = [
  { title: 'نامزدی و حلقه', hint: 'با بودجه حلقه شروع کنید', to: '/atelier#atelier-tool-title', mark: '◇' },
  { title: 'هدیه ماندگار', hint: 'وزن هدیه را تخمین بزنید', to: '/atelier#atelier-tool-title', mark: '✦' },
  { title: 'سرمایه‌ی نرم', hint: 'قطعات سنگین‌تر در گالری', to: '/products?sort=-weight_g', mark: '◎' },
];

const FALLBACK_HERO = '/hero/anil-gallery.jpg';

export function Atelier() {
  const { data: site } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
    staleTime: 60_000,
  });

  const heroSrc =
    site?.hero_album?.find((s) => s.is_active)?.image_url
    || site?.hero_image_url
    || FALLBACK_HERO;

  useEffect(() => {
    document.title = 'ماشین‌حساب طلا | آتلیه آنیل';
  }, []);

  return (
    <div className="atelier-page">
      <section className="atelier-hero">
        <div className="atelier-hero-media" aria-hidden>
          <img src={heroSrc} alt="" />
          <div className="atelier-hero-veil" />
        </div>
        <div className="atelier-hero-wash" aria-hidden />
        <div className="container atelier-hero-layout">
          <div className="atelier-hero-copy">
            <p className="atelier-kicker">آتلیه آنیل</p>
            <h1 className="atelier-title">
              قیمت را
              <span> قبل از خرید ببینید</span>
            </h1>
            <p className="atelier-lead">
              ماشین‌حساب طلا با نرخ قابل ویرایش، وزن و اجرت — همان فرمول فاکتور رسمی،
              به‌همراه پیشنهاد واقعی از ویترین.
            </p>
            <div className="atelier-hero-actions">
              <a href="#atelier-tool-title" className="gold-btn">شروع محاسبه</a>
              <Link to="/products" className="outline-btn">ورود به گالری</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="atelier-strip">
        <div className="container atelier-strip-inner">
          <span>نرخ قابل ویرایش</span>
          <i aria-hidden />
          <span>فرمول شفاف فاکتور</span>
          <i aria-hidden />
          <span>پیشنهاد واقعی از موجودی</span>
        </div>
      </section>

      <AtelierBudgetTool />

      <section className="atelier-occasions-bleed">
        <div className="container">
          <header className="atelier-section-head">
            <p className="atelier-section-eyebrow">شروع سریع</p>
            <h2>برای چه مناسبتی؟</h2>
            <p>از ماشین‌حساب بالا شروع کنید، یا مستقیم به گالری بروید.</p>
          </header>
          <div className="atelier-occasion-grid">
            {OCCASIONS.map((o) => (
              <Link key={o.title} to={o.to} className="atelier-occasion">
                <span className="atelier-occasion-mark" aria-hidden>{o.mark}</span>
                <strong>{o.title}</strong>
                <em>{o.hint}</em>
                <span className="atelier-occasion-cta">ادامه</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container atelier-closing">
        <div className="atelier-closing-card">
          <div className="atelier-closing-copy">
            <h2>از عدد تا قطعه واقعی</h2>
            <p>
              برآورد تقریبی است؛ نرخ را می‌توانید با عدد روز یا سناریوی خودتان تنظیم کنید.
              برای انتخاب نهایی، قطعه را در گالری باز کنید یا از مشاور هوشمند بپرسید.
            </p>
          </div>
          <div className="atelier-closing-actions">
            <a href="#atelier-tool-title" className="gold-btn">دوباره محاسبه کن</a>
            <Link to="/products" className="outline-btn">گالری محصولات</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
