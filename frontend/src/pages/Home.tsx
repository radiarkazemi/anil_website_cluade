import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';
import { faNum, faPrice } from '../utils/format';

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
  const heroProduct = products.find((p) => p.primary_image) ?? products[0];
  const heroImage = heroProduct?.primary_image || '/logo.jpg';
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  return (
    <div className="home">
      {/* Full-bleed hero — brand first */}
      <section className="hero">
        <div className="hero-media" aria-hidden>
          <img src={heroImage} alt="" className="hero-photo" />
          <div className="hero-veil" />
          <div className="hero-grain" />
        </div>
        <div className="hero-content reveal">
          <p className="hero-brand">ANIL</p>
          <p className="hero-brand-fa">گالری طلا آنیل</p>
          <h1 className="hero-title">زیورآلاتی که با نرخ روز می‌درخشند</h1>
          <p className="hero-lead">
            انتخابی شفاف از طلای ۱۸ عیار، با قیمت‌گذاری لحظه‌ای بر پایه‌ی بازار.
          </p>
          <div className="hero-cta">
            <Link to="/products" className="gold-btn">ورود به گالری</Link>
          </div>
        </div>
      </section>

      {/* Live rates ticker */}
      {goldPrice?.market_rows && (
        <div className="ticker" aria-label="نرخ زنده بازار">
          <div className="ticker-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="ticker-group">
                {goldPrice.market_rows.map((r) => (
                  <div key={`${dup}-${r.key}`} className="ticker-item">
                    <span className="ticker-label">{r.label}</span>
                    <span className="ticker-value">
                      {r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}
                    </span>
                    <span className="ticker-unit">{r.unit}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories — one job */}
      <section className="section container">
        <header className="section-head">
          <h2>دسته‌بندی</h2>
          <p>از انگشتر تا سرویس — مسیر کوتاه به قطعه‌ی مورد نظرتان.</p>
        </header>
        <div className="cat-strip">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="cat-link">
              <span className="cat-name">{c.name}</span>
              <span className="cat-count">{faNum(c.display_count || c.product_count)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured catalog */}
      <section className="section container">
        <header className="section-head row">
          <div>
            <h2>منتخب گالری</h2>
            <p>قطعه‌های تازه با قیمت پویا بر اساس طلای ۱۸.</p>
          </div>
          <Link to="/products" className="text-link">همه محصولات</Link>
        </header>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Pricing — one idea */}
      <section className="pricing-band">
        <div className="container pricing-inner">
          <div>
            <h2>قیمت شفاف، لحظه‌ای</h2>
            <p>
              وزن × نرخ گرم طلای ۱۸
              {gp > 0 ? ` (${faPrice(gp)} تومان)` : ''}
              {' '}
              + اجرت + مالیات ۹٪ روی اجرت — همان عددی که در فاکتور می‌بینید.
            </p>
          </div>
          <Link to="/products" className="outline-btn">مشاهده قیمت‌ها</Link>
        </div>
      </section>

      {/* Trust — line, not cards */}
      <section className="section container trust">
        <p>
          <strong>ضمانت اصالت</strong>
          <span aria-hidden>·</span>
          <strong>ارسال بیمه‌شده</strong>
          <span aria-hidden>·</span>
          <strong>بازخرید بر اساس نرخ روز</strong>
          <span aria-hidden>·</span>
          <strong>مشاوره تخصصی</strong>
        </p>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-brand">ANIL</div>
            <p className="footer-tag">گالری طلا آنیل — زیورآلات اصیل با قیمت شفاف.</p>
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
        <div className="container footer-copy">
          © گالری طلا آنیل ۱۴۰۵
        </div>
      </footer>
    </div>
  );
}
