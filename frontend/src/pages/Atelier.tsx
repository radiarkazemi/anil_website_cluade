import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const CHAPTERS = [
  {
    n: '۰۱',
    title: 'ایده و انتخاب',
    body: 'از سلیقه و مناسبت شروع می‌کنیم — گردنی، انگشتر، یا قطعه‌ای برای ماندگاری. مشاور هوشمند آنیل هم همراهتان است.',
  },
  {
    n: '۰۲',
    title: 'وزن و درخشش',
    body: 'قیمت لحظه‌ای روی نرخ روز طلای ۱۸ محاسبه می‌شود؛ اجرت شفاف، فاکتور رسمی، بدون سورپرایز.',
  },
  {
    n: '۰۳',
    title: 'تحویل مطمئن',
    body: 'بسته‌بندی گالری و ارسال بیمه شده؛ قطعه‌ای که انتخاب کردید، با همان درخشش به دستتان می‌رسد.',
  },
];

const OCCASIONS = [
  { title: 'نامزدی و حلقه', hint: 'انتخاب با حس لمس و وزن واقعی', to: '/products?search=انگشتر' },
  { title: 'هدیه ماندگار', hint: 'قطعه‌ای که سال‌ها می‌درخشد', to: '/products?search=گردنی' },
  { title: 'سرمایه‌ی نرم', hint: 'وزن بالاتر، ارزش ملموس‌تر', to: '/products?sort=-weight_g' },
];

export function Atelier() {
  const stageRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.title = 'آتلیه آنیل | گالری طلا آنیل';
  }, []);

  return (
    <div className="atelier-page">
      <section
        className="atelier-hero"
        ref={stageRef}
        onMouseMove={(e) => {
          const el = stageRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          setTilt({ x: px * 8, y: py * -6 });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div className="atelier-hero-bg" aria-hidden />
        <div className="container atelier-hero-inner">
          <p className="atelier-kicker">آتلیه آنیل</p>
          <h1 className="atelier-title">
            طلا،
            <span> از ایده تا درخشش</span>
          </h1>
          <p className="atelier-lead">
            اینجا کارگاه دیجیتال گالری است — جایی برای فهمیدن مسیر یک قطعه،
            انتخاب آگاهانه، و سفارش با اعتماد به نرخ روز.
          </p>
          <div className="atelier-hero-actions">
            <Link to="/products" className="gold-btn">ورود به گالری</Link>
            <Link to="/p/راهنمای-خرید" className="outline-btn">راهنمای خرید</Link>
          </div>
          <div
            className="atelier-orb"
            style={{ transform: `translate3d(${tilt.x}px, ${tilt.y}px, 0)` }}
            aria-hidden
          >
            <span className="atelier-orb-ring" />
            <span className="atelier-orb-core">ANIL</span>
          </div>
        </div>
      </section>

      <section className="container atelier-chapters">
        <header className="atelier-section-head">
          <h2>سه گام تا قطعه شما</h2>
          <p>مسیر ساده، بدون شلوغی — فقط آنچه برای تصمیم‌گیری لازم است.</p>
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
            <h2>برای چه مناسبتی؟</h2>
            <p>سه ورودی سریع به گالری — انتخاب را کوتاه‌تر کنید.</p>
          </header>
          <div className="atelier-occasion-grid">
            {OCCASIONS.map((o) => (
              <Link key={o.title} to={o.to} className="atelier-occasion">
                <strong>{o.title}</strong>
                <em>{o.hint}</em>
                <span>مشاهده ←</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container atelier-closing">
        <div className="atelier-closing-card">
          <h2>نور کارگاه، قیمت شفاف</h2>
          <p>
            در آنیل هر قطعه با وزن و نرخ زنده قیمت‌گذاری می‌شود.
            اگر هنوز بین چند مدل مردد هستید، مشاور هوشمند یا تیم گالری کمکتان می‌کند.
          </p>
          <div className="atelier-closing-actions">
            <Link to="/products" className="gold-btn">مشاهده محصولات</Link>
            <Link to="/blog" className="outline-btn">خواندن بلاگ</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
