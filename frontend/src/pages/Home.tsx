import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { GoldDust } from '../components/GoldDust';
import { GoldStage } from '../components/GoldStage';
import { IntroCurtain } from '../components/IntroCurtain';
import { useInView, usePointerParallax } from '../hooks/useMotion';
import { useStore } from '../store/useStore';
import { faNum, faPrice } from '../utils/format';

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, visible] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal-block ${visible ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
  const [ref, visible] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);

  return <span ref={ref}>{faNum(n)}</span>;
}

export function Home() {
  const goldPrice = useStore((s) => s.goldPrice);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem('anil-intro') !== '1';
    } catch {
      return true;
    }
  });
  const [heroReady, setHeroReady] = useState(!showIntro);
  const [heroRef, mouse] = usePointerParallax<HTMLElement>();

  const onIntroDone = useCallback(() => {
    try {
      sessionStorage.setItem('anil-intro', '1');
    } catch { /* ignore */ }
    setShowIntro(false);
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

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
  const gallery = products.filter((p) => p.primary_image).slice(0, 10);
  const heroProduct = products.find((p) => p.primary_image) ?? products[0];
  const heroImage = heroProduct?.primary_image || '/logo.jpg';
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  return (
    <div className={`home cinematic ${heroReady ? 'hero-live' : ''}`}>
      {showIntro && <IntroCurtain onDone={onIntroDone} />}

      {/* Immersive hero */}
      <section className="cinematic-hero" ref={heroRef}>
        <div className="cinematic-hero-bg" aria-hidden>
          <img
            src={heroImage}
            alt=""
            className="cinematic-hero-photo"
            style={{
              transform: `scale(1.12) translate(${mouse.x * -28}px, ${mouse.y * -18}px)`,
            }}
          />
          <div className="cinematic-hero-veil" />
          <div className="cinematic-hero-beam" />
          <GoldDust active={heroReady} />
        </div>

        <div className="cinematic-hero-grid container">
          <div className="cinematic-copy">
            <div className={`stagger ${heroReady ? 'go' : ''}`}>
              <p className="cinematic-kicker s1">گالری طلا آنیل</p>
              <p className="cinematic-brand s2">
                <span className="brand-shimmer">ANIL</span>
              </p>
              <h1 className="cinematic-title s3">
                طلایی که
                <br />
                <em>نمی‌توانید</em> چشم از آن بردارید
              </h1>
              <p className="cinematic-lead s4">
                تجربه‌ای زنده از زیبایی و قیمت لحظه‌ای — هر قطعه با نرخ روز بازار طلا می‌درخشد.
              </p>
              <div className="cinematic-actions s5">
                <Link to="/products" className="gold-btn magnetic-btn">
                  ورود به گالری
                  <span className="btn-shine" aria-hidden />
                </Link>
                <a href="#featured" className="ghost-link">منتخب امروز</a>
              </div>
            </div>

            {gp > 0 && (
              <div className={`live-chip s6 ${heroReady ? 'go' : ''}`}>
                <span className="live-dot" />
                طلای ۱۸ · {faPrice(gp)} تومان
              </div>
            )}
          </div>

          <div className={`cinematic-stage ${heroReady ? 'go' : ''}`}>
            <div
              className="cinematic-stage-parallax"
              style={{ transform: `translate3d(${mouse.x * 16}px, ${mouse.y * 10}px, 0)` }}
            >
              <GoldStage mouseX={mouse.x} mouseY={mouse.y} />
            </div>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden>
          <span />
          کشف کنید
        </div>
      </section>

      {/* Live rates */}
      {goldPrice?.market_rows && (
        <div className="ticker ticker-cinematic" aria-label="نرخ زنده بازار">
          <div className="ticker-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="ticker-group">
                {goldPrice.market_rows.map((r) => (
                  <div key={`${dup}-${r.key}`} className="ticker-item">
                    <span className="ticker-label">{r.label}</span>
                    <span className="ticker-value">
                      {r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating image marquee */}
      {gallery.length > 0 && (
        <section className="image-river" aria-label="گالری تصاویر">
          <div className="image-river-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="image-river-group">
                {gallery.map((p) => (
                  <Link key={`${dup}-${p.id}`} to={`/products/${p.slug}`} className="river-shot">
                    <img src={p.primary_image!} alt={p.name} loading="lazy" />
                    <span>{p.name}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Impact numbers */}
      <section className="section container">
        <Reveal>
          <div className="impact-row">
            {[
              { n: 12000, suffix: '+', label: 'مشتری راضی' },
              { n: 20, suffix: '', label: 'سال اعتماد' },
              { n: 860, suffix: '+', label: 'قطعه‌ی منحصربه‌فرد' },
            ].map((s, i) => (
              <div key={s.label} className="impact-item" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="impact-num">
                  <CountUp to={s.n} />
                  {s.suffix}
                </div>
                <div className="impact-label">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Categories */}
      <section className="section container">
        <Reveal>
          <header className="section-head">
            <h2>دنیای آنیل</h2>
            <p>هر دسته، روایتی از درخشش — لمس کنید و وارد شوید.</p>
          </header>
        </Reveal>
        <div className="cat-orbit">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 70}>
              <Link to={`/products?category=${c.slug}`} className="cat-tile">
                <span className="cat-tile-glow" aria-hidden />
                <span className="cat-tile-name">{c.name}</span>
                <span className="cat-tile-count">{faNum(c.display_count || c.product_count)} اثر</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="section container" id="featured">
        <Reveal>
          <header className="section-head row">
            <div>
              <h2>منتخب گالری</h2>
              <p>قطعه‌هایی که همین حالا با نرخ زنده قیمت‌گذاری شده‌اند.</p>
            </div>
            <Link to="/products" className="text-link">همه محصولات</Link>
          </header>
        </Reveal>
        <div className="product-grid">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing spectacle */}
      <section className="pricing-spectacle">
        <div className="pricing-spectacle-bg" aria-hidden />
        <Reveal className="container pricing-spectacle-inner">
          <h2>قیمتی که با بازار نفس می‌کشد</h2>
          <div className="formula">
            <span className="formula-part">وزن</span>
            <span className="formula-op">×</span>
            <span className="formula-part accent">نرخ طلای ۱۸</span>
            <span className="formula-op">+</span>
            <span className="formula-part">اجرت</span>
            <span className="formula-op">+</span>
            <span className="formula-part">مالیات</span>
            <span className="formula-op">=</span>
            <span className="formula-part result">قیمت زنده</span>
          </div>
          {gp > 0 && (
            <p className="pricing-now">
              نرخ فعلی: <strong>{faPrice(gp)}</strong> تومان برای هر گرم
            </p>
          )}
          <Link to="/products" className="gold-btn magnetic-btn" style={{ marginTop: 28 }}>
            مشاهده قیمت‌ها
            <span className="btn-shine" aria-hidden />
          </Link>
        </Reveal>
      </section>

      <section className="section container trust trust-cinematic">
        <Reveal>
          <p>
            <strong>ضمانت اصالت</strong>
            <span aria-hidden>·</span>
            <strong>ارسال بیمه‌شده</strong>
            <span aria-hidden>·</span>
            <strong>بازخرید بر اساس نرخ روز</strong>
            <span aria-hidden>·</span>
            <strong>مشاوره تخصصی</strong>
          </p>
        </Reveal>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-brand">ANIL</div>
            <p className="footer-tag">گالری طلا آنیل — جایی که درخشش، متوقف‌تان می‌کند.</p>
          </div>
          <div>
            <h3>دسته‌ها</h3>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>تماس</h3>
            <ul>
              <li>تهران، بازار بزرگ طلا</li>
              <li>۰۲۱ - ۱۲۳۴ ۵۶۷۸</li>
              <li>info@anilgold.ir</li>
            </ul>
          </div>
        </div>
        <div className="container footer-copy">© گالری طلا آنیل ۱۴۰۵</div>
      </footer>
    </div>
  );
}
