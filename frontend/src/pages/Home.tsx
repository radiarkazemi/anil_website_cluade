import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';
import { faNum, faPrice } from '../utils/format';
import type { MarketRow } from '../types';
import { useRef, useState } from 'react';

function MarketPanel({ rows }: { rows: MarketRow[] }) {
  const show = rows.filter((r) => ['g18', 'g24', 'sek', 'usd'].includes(r.key));
  return (
    <section className="container" style={{ padding: '70px var(--px) 30px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 2, color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 8 }}>— بازار زنده</div>
          <h2 style={{ fontSize: 32, fontWeight: 800 }}>قیمت لحظه‌ای طلا و سکه</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {show.map((c) => (
          <div key={c.key} style={{
            borderRadius: 18, padding: 22, background: 'linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.01))',
            border: '1px solid rgba(212,175,55,.16)',
          }}>
            <div style={{ color: '#c8bfb0', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{c.dollar ? `$${faPrice(c.v)}` : faPrice(c.v)}</div>
            <div style={{ fontSize: 12, color: '#7c7263' }}>{c.unit}</div>
          </div>
        ))}
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
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
  };

  return (
    <div style={{ position: 'relative', height: 470, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1100 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,.5), rgba(212,175,55,0) 65%)', animation: 'glow 4.5s ease-in-out infinite' }} />
      <div onMouseDown={onDown} onTouchStart={onDown} style={{
        position: 'relative', width: 340, height: 340, transformStyle: 'preserve-3d', cursor: 'grab',
        transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, zIndex: 5,
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 0deg,#6f5124,#e8c976,#fff6d8,#caa24d,#7a5b28,#f2e2a6,#6f5124)',
          animation: 'spin3d 9s linear infinite',
          WebkitMask: 'radial-gradient(circle, transparent 52%, #000 54%, #000 72%, transparent 74%)',
          mask: 'radial-gradient(circle, transparent 52%, #000 54%, #000 72%, transparent 74%)',
          boxShadow: '0 0 60px rgba(212,175,55,.4)',
        }} />
        <div style={{
          position: 'absolute', inset: 46, borderRadius: '50%',
          background: 'conic-gradient(from 180deg,#caa24d,#fff6d8,#8a6a2f,#e8c976,#caa24d)',
          animation: 'spin3d 6s linear infinite reverse',
          WebkitMask: 'radial-gradient(circle, transparent 60%, #000 62%, #000 76%, transparent 78%)',
          mask: 'radial-gradient(circle, transparent 60%, #000 62%, #000 76%, transparent 78%)',
          opacity: 0.85,
        }} />
      </div>
      <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: '#7c7263', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 15 }}>↔</span> بکشید تا بچرخانید
      </div>
    </div>
  );
}

export function Home() {
  const goldPrice = useStore((s) => s.goldPrice);
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => api.categories().then((r) => r.data) });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => api.products().then((r) => r.data.results) });

  const categories = categoriesData ?? [];
  const products = productsData ?? [];
  const featured = products.slice(0, 8);
  const _arrivals = products.filter((p) => p.tag === 'جدید' || p.tag === 'ویژه').concat(products).slice(0, 6);
  void _arrivals;
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  return (
    <div>
      {/* Hero */}
      <section className="container" style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 20, alignItems: 'center', padding: '70px var(--px) 50px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', border: '1px solid rgba(212,175,55,.3)', borderRadius: 'var(--radius-pill)', fontSize: 12.5, letterSpacing: 2, color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 26 }}>✦ گالری طلا آنیل</div>
          <h1 className="shimmer-text" style={{ fontWeight: 800, fontSize: 60, lineHeight: 1.15, marginBottom: 22 }}>طلا،<br />آن‌گونه که باید بدرخشد</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 17, lineHeight: 2, maxWidth: 450, marginBottom: 34 }}>مجموعه‌ای زنده از زیورآلات دست‌ساز، با قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا.</p>
          <div style={{ display: 'flex', gap: 14, marginBottom: 40 }}>
            <Link to="/products" className="gold-btn">مشاهده‌ی محصولات</Link>
            <Link to="/products" className="outline-btn">قیمت لحظه‌ای طلا</Link>
          </div>
          <div style={{ display: 'flex', gap: 36 }}>
            {[['۱۲٬۰۰۰+', 'مشتری راضی'], ['۲۰ سال', 'تجربه و اعتماد'], ['۸۶۰+', 'قطعه‌ی منحصربه‌فرد']].map(([n, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{n}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <Ring />
      </section>

      {/* Ticker */}
      {goldPrice?.market_rows && (
        <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--border-gold)', borderBottom: '1px solid var(--border-gold)', background: 'rgba(212,175,55,.04)', padding: '14px 0' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 34s linear infinite' }}>
            {[0, 1].map((dup) => (
              <div key={dup} style={{ display: 'flex' }}>
                {goldPrice.market_rows.map((r) => (
                  <div key={`${dup}-${r.key}`} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 26px', borderLeft: '1px solid rgba(255,255,255,.07)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#9a9186', fontSize: 13 }}>{r.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Panel */}
      {goldPrice?.market_rows && <MarketPanel rows={goldPrice.market_rows} />}

      {/* Categories */}
      <section className="container" style={{ padding: '50px var(--px) 20px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>دسته‌بندی محصولات</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 16 }}>
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} style={{
              borderRadius: 16, padding: '26px 16px', textAlign: 'center',
              background: 'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))',
              border: '1px solid rgba(212,175,55,.16)',
            }}>
              <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', border: '1.5px solid rgba(212,175,55,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--gold-light)' }}>
                {faNum(c.display_count || c.product_count)}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{faNum(c.display_count || c.product_count)} محصول</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container" style={{ padding: '44px var(--px) 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 2, color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 8 }}>— منتخب گالری</div>
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>پرفروش‌ترین‌ها</h2>
          </div>
          <Link to="/products" style={{ color: 'var(--gold-deep)', fontSize: 14, fontWeight: 600 }}>مشاهده‌ی همه ←</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Pricing Band */}
      <section className="container" style={{ margin: '60px auto', padding: '0 var(--px)' }}>
        <div style={{
          borderRadius: 24, padding: '44px 48px',
          background: 'linear-gradient(120deg,rgba(212,175,55,.13),rgba(212,175,55,.02))',
          border: '1px solid rgba(212,175,55,.22)',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 36, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 2, color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 10 }}>— فناوری آنیل</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>قیمت‌گذاری پویا و لحظه‌ای</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15.5, maxWidth: 560, lineHeight: 2 }}>قیمت هر قطعه به‌صورت زنده و بر پایه‌ی نرخ روز طلا محاسبه می‌شود.</p>
          </div>
          <div style={{ fontSize: 15, color: 'var(--gold-light)', textAlign: 'center', whiteSpace: 'nowrap', padding: '22px 28px', border: '1px dashed rgba(212,175,55,.4)', borderRadius: 16, background: 'rgba(0,0,0,.28)', lineHeight: 2.2 }}>
            (وزن × <span style={{ fontWeight: 800 }}>{faPrice(gp)}</span>)<br />+ اجرت + مالیات<br /><span style={{ color: 'var(--up)', fontWeight: 700 }}>= قیمت نهایی زنده</span>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container" style={{ padding: '20px var(--px) 50px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {[
            { icon: '✦', title: 'ضمانت اصالت', desc: 'فاکتور رسمی و ضمانت کتبی برای هر قطعه' },
            { icon: '◈', title: 'ارسال بیمه‌شده', desc: 'بسته‌بندی امن و بیمه‌ی کامل تا درب منزل' },
            { icon: '⟳', title: 'بازخرید تضمینی', desc: 'امکان بازخرید بر اساس نرخ روز طلا' },
            { icon: '☎', title: 'مشاوره‌ی تخصصی', desc: 'همراهی کارشناسان آنیل در تمام مراحل' },
          ].map((t) => (
            <div key={t.title} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, padding: 22, borderRadius: 16,
              background: 'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))',
              border: '1px solid var(--border)',
            }}>
              <div style={{ flex: '0 0 44px', width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(212,175,55,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--gold-light)' }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{t.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border-gold)', padding: '56px var(--px) 28px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-light)', fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 22 }}>A</div>
              <div style={{ lineHeight: 1.05 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", letterSpacing: 5, fontSize: 19, fontWeight: 600 }}>ANIL</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>GOLD & JEWELRY</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 2, maxWidth: 300 }}>گالری طلا آنیل، جایی برای انتخاب زیورآلات اصیل با قیمت شفاف و لحظه‌ای.</p>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>دسته‌بندی‌ها</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, color: 'var(--text-dim)', fontSize: 13.5 }}>
              {categories.slice(0, 5).map((c) => <Link key={c.id} to={`/products?category=${c.slug}`}>{c.name}</Link>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>خدمات مشتریان</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, color: 'var(--text-dim)', fontSize: 13.5 }}>
              <span>راهنمای خرید</span><span>شرایط بازخرید</span><span>ارسال و بیمه</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>تماس با ما</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, color: 'var(--text-dim)', fontSize: 13.5 }}>
              <span>تهران، بازار بزرگ طلا</span><span>۰۲۱ - ۱۲۳۴ ۵۶۷۸</span><span>info@anilgold.ir</span>
            </div>
          </div>
        </div>
        <div className="container" style={{ marginTop: 36, paddingTop: 22, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6f6553', fontSize: 12.5 }}>
          <span>© گالری طلا آنیل ۱۴۰۵ — تمامی حقوق محفوظ است.</span>
          <span style={{ color: 'var(--text-dim)' }}>نماد اعتماد الکترونیکی · درگاه پرداخت امن</span>
        </div>
      </footer>
    </div>
  );
}
