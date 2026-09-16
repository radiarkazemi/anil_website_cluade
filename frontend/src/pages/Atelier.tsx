import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const CHAPTERS = [
  {
    n: '۰۱',
    title: 'ایده و انتخاب',
    body: 'از سلیقه و مناسبت شروع می‌کنیم — گردنی، انگشتر، یا قطعه‌ای برای ماندگاری.',
  },
  {
    n: '۰۲',
    title: 'وزن و درخشش',
    body: 'قیمت لحظه‌ای روی نرخ روز طلای ۱۸؛ اجرت شفاف و فاکتور رسمی.',
  },
  {
    n: '۰۳',
    title: 'تحویل مطمئن',
    body: 'بسته‌بندی گالری و ارسال بیمه شده تا همان درخشش به دستتان برسد.',
  },
];

const OCCASIONS = [
  { title: 'نامزدی و حلقه', hint: 'انتخاب با حس لمس و وزن واقعی', to: '/products?search=انگشتر', mark: '◇' },
  { title: 'هدیه ماندگار', hint: 'قطعه‌ای که سال‌ها می‌درخشد', to: '/products?search=گردنی', mark: '✦' },
  { title: 'سرمایه‌ی نرم', hint: 'وزن بالاتر، ارزش ملموس‌تر', to: '/products?sort=-weight_g', mark: '◎' },
];

export function Atelier() {
  useEffect(() => {
    document.title = 'آتلیه آنیل | گالری طلا آنیل';
  }, []);

  return (
    <div className="atelier-page">
      <section className="atelier-hero">
        <div className="atelier-hero-wash" aria-hidden />
        <div className="atelier-hero-grid" aria-hidden />
        <div className="container atelier-hero-layout">
          <div className="atelier-hero-copy">
            <p className="atelier-kicker">آتلیه آنیل</p>
            <h1 className="atelier-title">
              طلا،
              <span> از ایده تا درخشش</span>
            </h1>
            <p className="atelier-lead">
              کارگاه دیجیتال گالری — مسیر یک قطعه را ببینید، آگاهانه انتخاب کنید،
              و با نرخ روز سفارش دهید.
            </p>
            <div className="atelier-hero-actions">
              <Link to="/products" className="gold-btn">ورود به گالری</Link>
              <Link to="/p/راهنمای-خرید" className="outline-btn">راهنمای خرید</Link>
            </div>
          </div>
          <aside className="atelier-hero-stage" aria-hidden>
            <div className="atelier-stage-frame">
              <span className="atelier-stage-ring" />
              <span className="atelier-stage-ring delay" />
              <strong className="atelier-stage-mark">ANIL</strong>
              <em className="atelier-stage-caption">کارگاه · نور · طلا</em>
            </div>
          </aside>
        </div>
      </section>

      <section className="atelier-strip">
        <div className="container atelier-strip-inner">
          <span>نرخ لحظه‌ای</span>
          <i aria-hidden />
          <span>فاکتور رسمی</span>
          <i aria-hidden />
          <span>ارسال بیمه شده</span>
        </div>
      </section>

      <section className="container atelier-chapters">
        <header className="atelier-section-head">
          <p className="atelier-section-eyebrow">مسیر ساخت</p>
          <h2>سه گام تا قطعه‌ی شما</h2>
          <p>ساده و شفاف — فقط آنچه برای تصمیم‌گیری لازم است.</p>
        </header>
        <ol className="atelier-chapter-list">
          {CHAPTERS.map((c) => (
            <li key={c.n} className="atelier-chapter">
              <span className="atelier-chapter-n">{c.n}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="atelier-occasions-bleed">
        <div className="container">
          <header className="atelier-section-head">
            <p className="atelier-section-eyebrow">ورودی سریع</p>
            <h2>برای چه مناسبتی؟</h2>
            <p>سه مسیر کوتاه به گالری.</p>
          </header>
          <div className="atelier-occasion-grid">
            {OCCASIONS.map((o) => (
              <Link key={o.title} to={o.to} className="atelier-occasion">
                <span className="atelier-occasion-mark" aria-hidden>{o.mark}</span>
                <strong>{o.title}</strong>
                <em>{o.hint}</em>
                <span className="atelier-occasion-cta">مشاهده</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container atelier-closing">
        <div className="atelier-closing-card">
          <div className="atelier-closing-copy">
            <h2>نور کارگاه، قیمت شفاف</h2>
            <p>
              هر قطعه با وزن و نرخ زنده قیمت‌گذاری می‌شود.
              اگر هنوز بین چند مدل مردد هستید، مشاور هوشمند یا تیم گالری کمکتان می‌کند.
            </p>
          </div>
          <div className="atelier-closing-actions">
            <Link to="/products" className="gold-btn">مشاهده محصولات</Link>
            <Link to="/blog" className="outline-btn">خواندن بلاگ</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
