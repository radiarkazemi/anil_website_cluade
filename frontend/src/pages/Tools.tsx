import { SecondaryPageChrome } from '../components/SiteChrome';
import { GoldTradeCalculator } from '../components/GoldTradeCalculator';
import { usePageSeo } from '../hooks/usePageSeo';

const TOOLS = [
  {
    id: 'gold-calculator',
    title: 'ماشین‌حساب طلا',
    blurb: 'فروش، خرید و تعویض — فقط با وارد کردن وزن',
    status: 'ready' as const,
  },
  {
    id: 'coming-budget',
    title: 'برآورد بودجه',
    blurb: 'به‌زودی — تخمین وزن مناسب برای هدیه یا سرمایه‌گذاری',
    status: 'soon' as const,
  },
  {
    id: 'coming-compare',
    title: 'مقایسه قطعات',
    blurb: 'به‌زودی — مقایسه وزن، اجرت و ارزش چند قطعه',
    status: 'soon' as const,
  },
];

export function Tools() {
  usePageSeo({
    title: 'ابزارها | گالری طلا آنیل',
    description:
      'ابزارهای گالری آنیل — ماشین‌حساب طلا برای فروش، خرید و تعویض بر اساس وزن و نرخ زنده.',
    canonicalPath: '/tools',
  });

  return (
    <SecondaryPageChrome>
      <div className="tools-page">
        <header className="tools-hero">
          <div
            className="tools-hero-bg"
            style={{ backgroundImage: "url('/home/collection-banner.webp')" }}
            aria-hidden
          />
          <div className="container tools-hero-inner">
            <p className="tools-kicker">گالری طلا آنیل</p>
            <h1 className="tools-hero-title">ابزارها</h1>
            <p className="tools-hero-lead">
              ماشین‌حساب و ابزارهای کاربردی برای تصمیم خرید، فروش و تعویض طلا —
              شفاف، سریع و بر پایه نرخ زنده گالری.
            </p>
          </div>
        </header>

        <div className="container tools-main">
          <section className="tools-catalog" aria-label="فهرست ابزارها">
            {TOOLS.map((tool) =>
              tool.status === 'ready' ? (
                <a key={tool.id} href={`#${tool.id}`} className="tools-card">
                  <span className="tools-card-status">فعال</span>
                  <h2>{tool.title}</h2>
                  <p>{tool.blurb}</p>
                </a>
              ) : (
                <div key={tool.id} className="tools-card is-soon" aria-disabled="true">
                  <span className="tools-card-status">به‌زودی</span>
                  <h2>{tool.title}</h2>
                  <p>{tool.blurb}</p>
                </div>
              ),
            )}
          </section>

          <div id="gold-calculator">
            <GoldTradeCalculator />
          </div>
        </div>
      </div>
    </SecondaryPageChrome>
  );
}
