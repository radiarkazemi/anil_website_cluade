import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';
import { faNum, faPrice } from '../utils/format';
import type { MarketRow } from '../types';
import { useRef, useState } from 'react';

/** Live rates board — replaces the low-contrast marquee strip. */
function RatesBoard({ rows }: { rows: MarketRow[] }) {
  return (
    <section id="market" className="rates-board" aria-label="نرخ زنده بازار">
      <div className="container rates-board-inner">
        <div className="rates-board-head">
          <div>
            <div className="rates-live">
              <span className="live-dot" />
              به‌روزرسانی زنده
            </div>
            <h2>نرخ طلا، سکه و ارز</h2>
          </div>
          <p className="rates-note">قیمت محصولات گالری بر اساس طلای ۱۸ عیار محاسبه می‌شود.</p>
        </div>
        <div className="rates-grid">
          {rows.map((r) => (
            <div key={r.key} className={`rate-chip${r.key === 'g18' ? ' featured' : ''}`}>
              <div className="rate-chip-label">{r.label}</div>
              <div className="rate-chip-value">
                {r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}
              </div>
              <div className="rate-chip-unit">{r.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ring() {
  const [rx, setRx] = useState(-14);
  const [ry, setRy] = useState(0);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    dragging.current = true;
    const pt = 'touches' in e ? e.touches[0] : e;
    start.current = { x: pt.clientX, y: pt.clientY, rx, ry };
    const move = (ev: MouseEvent | TouchEvent) => {
      const p = 'touches' in ev ? (ev as TouchEvent).touches[0] : (ev as MouseEvent);
      setRy(start.current.ry + (p.clientX - start.current.x) * 0.6);
      setRx(Math.max(-60, Math.min(60, start.current.rx - (p.clientY - start.current.y) * 0.5)));
    };
    const up = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  return (
    <div className="hero-ring">
      <div className="hero-ring-glow" />
      <div
        className="hero-ring-scene"
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }}
      >
        <div className="hero-ring-band outer" />
        <div className="hero-ring-band inner" />
      </div>
      <div className="hero-ring-hint">بکشید تا بچرخانید</div>
    </div>
  );
}

export function Home() {
  const goldPrice = useStore((s) => s.goldPrice);
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories().then((r) => r.data),
  });
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products().then((r) => r.data.results),
  });

  const categories = categoriesData ?? [];
  const products = productsData ?? [];
  const featured = products.slice(0, 8);
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  return (
    <div className="home">
      <section className="container home-hero">
        <div className="hero-copy">
          <div className="hero-badge">گالری طلا آنیل</div>
          <h1 className="shimmer-text hero-h1">
            طلا،
            <br />
            آن‌گونه که باید بدرخشد
          </h1>
          <p className="hero-lead">
            مجموعه‌ای زنده از زیورآلات دست‌ساز، با قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="gold-btn">مشاهده‌ی محصولات</Link>
            <a href="#market" className="outline-btn">قیمت لحظه‌ای طلا</a>
          </div>
          <div className="hero-stats">
            {[
              ['۱۲٬۰۰۰+', 'مشتری راضی'],
              ['۲۰ سال', 'تجربه و اعتماد'],
              ['۸۶۰+', 'قطعه‌ی منحصربه‌فرد'],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="hero-stat-n">{n}</div>
                <div className="hero-stat-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <Ring />
      </section>

      {goldPrice?.market_rows && <RatesBoard rows={goldPrice.market_rows} />}

      <section className="container section-pad">
        <h2 className="section-title">دسته‌بندی محصولات</h2>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="cat-card">
              <div className="cat-icon">{faNum(c.display_count || c.product_count)}</div>
              <div className="cat-title">{c.name}</div>
              <div className="cat-sub">{faNum(c.display_count || c.product_count)} محصول</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section-pad">
        <div className="section-row">
          <div>
            <div className="section-eyebrow">منتخب گالری</div>
            <h2 className="section-title tight">پرفروش‌ترین‌ها</h2>
          </div>
          <Link to="/products" className="text-link">مشاهده‌ی همه</Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="container pricing-wrap">
        <div className="pricing-band-classic">
          <div>
            <div className="section-eyebrow">فناوری آنیل</div>
            <h2 className="section-title tight">قیمت‌گذاری پویا و لحظه‌ای</h2>
            <p className="pricing-copy">
              قیمت هر قطعه به‌صورت زنده و بر پایه‌ی نرخ روز طلا محاسبه می‌شود.
            </p>
          </div>
          <div className="pricing-formula">
            (وزن × <strong>{faPrice(gp)}</strong>)
            <br />
            + اجرت + مالیات
            <br />
            <span className="pricing-eq">= قیمت نهایی زنده</span>
          </div>
        </div>
      </section>

      <section className="container section-pad trust-grid-wrap">
        <div className="trust-grid">
          {[
            { title: 'ضمانت اصالت', desc: 'فاکتور رسمی و ضمانت کتبی برای هر قطعه' },
            { title: 'ارسال بیمه‌شده', desc: 'بسته‌بندی امن و بیمه‌ی کامل تا درب منزل' },
            { title: 'بازخرید تضمینی', desc: 'امکان بازخرید بر اساس نرخ روز طلا' },
            { title: 'مشاوره‌ی تخصصی', desc: 'همراهی کارشناسان آنیل در تمام مراحل' },
          ].map((t) => (
            <div key={t.title} className="trust-item">
              <div className="trust-mark" />
              <div>
                <div className="trust-title">{t.title}</div>
                <div className="trust-desc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-brand-row">
              <div className="logo-mark">A</div>
              <div>
                <div className="footer-brand">ANIL</div>
                <div className="logo-sub">GOLD &amp; JEWELRY</div>
              </div>
            </div>
            <p className="footer-tag">گالری طلا آنیل، جایی برای انتخاب زیورآلات اصیل با قیمت شفاف و لحظه‌ای.</p>
          </div>
          <div>
            <h3>دسته‌بندی‌ها</h3>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>خدمات مشتریان</h3>
            <ul>
              <li>راهنمای خرید</li>
              <li>شرایط بازخرید</li>
              <li>ارسال و بیمه</li>
            </ul>
          </div>
          <div>
            <h3>تماس با ما</h3>
            <ul>
              <li>تهران، بازار بزرگ طلا</li>
              <li>۰۲۱ - ۱۲۳۴ ۵۶۷۸</li>
              <li>info@anilgold.ir</li>
            </ul>
          </div>
        </div>
        <div className="container footer-copy footer-copy-row">
          <span>© گالری طلا آنیل ۱۴۰۵ — تمامی حقوق محفوظ است.</span>
          <span>نماد اعتماد الکترونیکی · درگاه پرداخت امن</span>
        </div>
      </footer>
    </div>
  );
}
