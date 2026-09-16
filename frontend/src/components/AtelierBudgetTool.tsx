import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { calcPrice, faFeePct, faNum, faPrice, PROFIT_RATIO, TAX_RATIO } from '../utils/format';
import type { Product } from '../types';

type Mode = 'weight' | 'budget';

const SHAPES = [
  { id: 'all', label: 'همه', search: '' },
  { id: 'ring', label: 'انگشتر', search: 'انگشتر' },
  { id: 'necklace', label: 'گردنی', search: 'گردنی' },
  { id: 'bracelet', label: 'دستبند', search: 'دستبند' },
  { id: 'bangle', label: 'النگو', search: 'النگو' },
  { id: 'set', label: 'نیم‌ست', search: 'نیم' },
] as const;

const FEE_PRESETS = [
  { label: 'کم‌اجرت', value: 7 },
  { label: 'معمول', value: 12 },
  { label: 'طراحی', value: 18 },
] as const;

/** Reverse of calcPrice (stone=0) → weight for a target total. */
function weightFromBudget(budget: number, rate: number, feeRatio: number): number {
  if (budget <= 0 || rate <= 0) return 0;
  const f = feeRatio;
  const mult =
    1 +
    f +
    (1 + f) * PROFIT_RATIO +
    (f + (1 + f) * PROFIT_RATIO) * TAX_RATIO;
  return budget / (rate * mult);
}

function band(weight: number) {
  const lo = Math.max(0.3, weight * 0.82);
  const hi = Math.max(lo + 0.2, weight * 1.18);
  return { lo: Number(lo.toFixed(2)), hi: Number(hi.toFixed(2)) };
}

export function AtelierBudgetTool() {
  const liveRate = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const [rateInput, setRateInput] = useState('');
  const [rateTouched, setRateTouched] = useState(false);
  const [mode, setMode] = useState<Mode>('weight');
  const [weight, setWeight] = useState(4);
  const [budgetM, setBudgetM] = useState(80); // million toman
  const [feePct, setFeePct] = useState(12);
  const [shape, setShape] = useState<(typeof SHAPES)[number]['id']>('all');
  const weightId = useId();
  const budgetId = useId();
  const feeId = useId();
  const rateId = useId();

  // Sync editable rate from live feed until the user edits it
  useEffect(() => {
    if (!rateTouched && liveRate > 0) {
      setRateInput(String(Math.round(liveRate)));
    }
  }, [liveRate, rateTouched]);

  const rate = (() => {
    const n = Number(String(rateInput).replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
    return liveRate;
  })();
  const feeRatio = feePct / 100;
  const budget = budgetM * 1_000_000;

  const estimatedWeight = useMemo(
    () => (mode === 'budget' ? weightFromBudget(budget, rate, feeRatio) : weight),
    [mode, budget, rate, feeRatio, weight],
  );

  const breakdown = useMemo(
    () => calcPrice(estimatedWeight, rate, feeRatio, 0),
    [estimatedWeight, rate, feeRatio],
  );

  const { lo, hi } = band(estimatedWeight);
  const shapeMeta = SHAPES.find((s) => s.id === shape) ?? SHAPES[0];

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ['atelier-matches', lo, hi, feePct, shapeMeta.search],
    queryFn: () =>
      api
        .products({
          weight_min: String(lo),
          weight_max: String(hi),
          fee_max: String(feePct),
          page_size: '6',
          ordering: 'price',
          ...(shapeMeta.search ? { search: shapeMeta.search } : {}),
        })
        .then((r) => r.data.results as Product[]),
    enabled: rate > 0 && estimatedWeight > 0,
    staleTime: 20_000,
  });

  // Soft fallback: broaden fee, then drop shape keyword if still empty
  const { data: fallback = [] } = useQuery({
    queryKey: ['atelier-matches-fallback', feePct, shapeMeta.search, matches.length],
    queryFn: async () => {
      const withShape = await api
        .products({
          fee_max: String(Math.max(feePct, 22)),
          page_size: '6',
          ordering: 'price',
          ...(shapeMeta.search ? { search: shapeMeta.search } : {}),
        })
        .then((r) => r.data.results as Product[]);
      if (withShape.length || !shapeMeta.search) return withShape;
      return api
        .products({
          fee_max: String(Math.max(feePct, 22)),
          page_size: '6',
          ordering: 'price',
        })
        .then((r) => r.data.results as Product[]);
    },
    enabled: rate > 0 && estimatedWeight > 0 && !isFetching && matches.length === 0,
    staleTime: 20_000,
  });

  const results = matches.length ? matches : fallback;
  const usingFallback = matches.length === 0 && results.length > 0;
  const galleryQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('weight_min', String(lo));
    p.set('weight_max', String(hi));
    p.set('fee_max', String(feePct));
    if (shapeMeta.search) p.set('search', shapeMeta.search);
    return p.toString();
  }, [lo, hi, feePct, shapeMeta.search]);

  return (
    <section className="atelier-tool" aria-labelledby="atelier-tool-title">
      <div className="container atelier-tool-shell">
        <header className="atelier-tool-head">
          <p className="atelier-section-eyebrow">ماشین‌حساب طلا</p>
          <h2 id="atelier-tool-title">استودیو بودجه آنیل</h2>
          <p>
            وزن، اجرت و نرخ طلا را خودتان تنظیم کنید — قیمت تقریبی با همان فرمول فاکتور رسمی
            محاسبه می‌شود و قطعات نزدیک از ویترین پیشنهاد می‌گردد.
          </p>
        </header>

        <div className="atelier-tool-layout">
          <div className="atelier-tool-controls">
            <div className="atelier-mode" role="tablist" aria-label="حالت برآورد">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'weight'}
                className={mode === 'weight' ? 'is-active' : ''}
                onClick={() => setMode('weight')}
              >
                از روی وزن
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'budget'}
                className={mode === 'budget' ? 'is-active' : ''}
                onClick={() => setMode('budget')}
              >
                از روی بودجه
              </button>
            </div>

            <label className="atelier-field atelier-rate-field" htmlFor={rateId}>
              <span className="atelier-field-label">
                نرخ طلای ۱۸ عیار
                <strong>تومان / گرم</strong>
              </span>
              <div className="atelier-rate-edit">
                <input
                  id={rateId}
                  type="text"
                  inputMode="numeric"
                  className="atelier-rate-input"
                  value={rateInput}
                  placeholder={liveRate > 0 ? faPrice(liveRate) : 'نرخ را وارد کنید'}
                  onChange={(e) => {
                    setRateTouched(true);
                    setRateInput(e.target.value.replace(/[^\d]/g, ''));
                  }}
                />
                <button
                  type="button"
                  className="atelier-rate-reset"
                  disabled={!liveRate}
                  onClick={() => {
                    setRateTouched(false);
                    setRateInput(liveRate > 0 ? String(Math.round(liveRate)) : '');
                  }}
                >
                  نرخ روز
                </button>
              </div>
              {liveRate > 0 && rateTouched && Math.round(rate) !== Math.round(liveRate) && (
                <span className="atelier-rate-hint">
                  نرخ زنده بازار: {faPrice(liveRate)} — برای مقایسه ویرایش کرده‌اید
                </span>
              )}
            </label>

            {mode === 'weight' ? (
              <label className="atelier-field" htmlFor={weightId}>
                <span className="atelier-field-label">
                  وزن هدف
                  <strong>{faNum(Number(weight.toFixed(1)))} گرم</strong>
                </span>
                <input
                  id={weightId}
                  type="range"
                  min={1}
                  max={40}
                  step={0.5}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
                <span className="atelier-field-scale">
                  <em>۱g</em>
                  <em>۴۰g</em>
                </span>
              </label>
            ) : (
              <label className="atelier-field" htmlFor={budgetId}>
                <span className="atelier-field-label">
                  بودجه تقریبی
                  <strong>{faNum(budgetM)} میلیون تومان</strong>
                </span>
                <input
                  id={budgetId}
                  type="range"
                  min={15}
                  max={600}
                  step={5}
                  value={budgetM}
                  onChange={(e) => setBudgetM(Number(e.target.value))}
                />
                <span className="atelier-field-scale">
                  <em>۱۵</em>
                  <em>۶۰۰</em>
                </span>
              </label>
            )}

            <label className="atelier-field" htmlFor={feeId}>
              <span className="atelier-field-label">
                سقف اجرت
                <strong>{faNum(feePct)}٪</strong>
              </span>
              <input
                id={feeId}
                type="range"
                min={5}
                max={25}
                step={1}
                value={feePct}
                onChange={(e) => setFeePct(Number(e.target.value))}
              />
              <div className="atelier-fee-presets">
                {FEE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={feePct === p.value ? 'is-active' : ''}
                    onClick={() => setFeePct(p.value)}
                  >
                    {p.label} · {faNum(p.value)}٪
                  </button>
                ))}
              </div>
            </label>

            <div className="atelier-shapes" role="group" aria-label="شکل قطعه">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={shape === s.id ? 'is-active' : ''}
                  onClick={() => setShape(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <aside className="atelier-tool-result" aria-live="polite">
            <div className="atelier-rate-line">
              <span>نرخ محاسبه‌شده</span>
              {rate > 0 ? (
                <strong>{faPrice(rate)} تومان / گرم</strong>
              ) : (
                <strong className="is-muted">نرخ را وارد کنید</strong>
              )}
            </div>

            <div className="atelier-total">
              <span>{mode === 'budget' ? 'برآورد برای بودجه شما' : 'برآورد قیمت قطعه'}</span>
              <strong>{rate > 0 ? `${faPrice(breakdown.total)} تومان` : '—'}</strong>
              <em>
                حدود {faNum(Number(estimatedWeight.toFixed(2)))} گرم · اجرت تا {faNum(feePct)}٪
              </em>
            </div>

            <ul className="atelier-breakdown">
              <li>
                <span>طلای خام</span>
                <b>{faPrice(breakdown.gold)}</b>
              </li>
              <li>
                <span>اجرت</span>
                <b>{faPrice(breakdown.fee)}</b>
              </li>
              <li>
                <span>مالیات</span>
                <b>{faPrice(breakdown.tax)}</b>
              </li>
            </ul>

            <p className="atelier-tool-note">
              سود گالری در مجموع لحاظ شده و در این جدول جداگانه نمایش داده نمی‌شود — مطابق فاکتور رسمی.
            </p>

            <Link to={`/products?${galleryQs}`} className="gold-btn atelier-tool-cta">
              دیدن نزدیک‌ترین‌ها در گالری
            </Link>
          </aside>
        </div>

        <div className="atelier-matches">
          <header className="atelier-matches-head">
            <h3>پیشنهاد از ویترین</h3>
            <p>
              {isFetching
                ? 'در حال جستجو…'
                : results.length
                  ? usingFallback
                    ? `${faNum(results.length)} پیشنهاد نزدیک از ویترین (بازه وزن کمی بازتر شد)`
                    : `${faNum(results.length)} قطعه نزدیک به انتخاب شما`
                  : 'قطعه‌ای با این شرایط پیدا نشد — وزن یا اجرت را کمی بازتر کنید.'}
            </p>
          </header>

          {results.length > 0 && (
            <ul className="atelier-match-list">
              {results.map((p) => {
                const w = p.weight_g != null ? Number(p.weight_g) : 0;
                const total =
                  w > 0 && rate > 0
                    ? calcPrice(w, rate, Number(p.fee_ratio), p.stone_value).total
                    : p.price;
                return (
                  <li key={p.id}>
                    <Link to={`/products/${p.slug}`} className="atelier-match">
                      <span className="atelier-match-media">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt="" loading="lazy" />
                        ) : (
                          <em>{p.category_name || 'طلا'}</em>
                        )}
                      </span>
                      <span className="atelier-match-copy">
                        <strong>{p.name}</strong>
                        <small>
                          {p.category_name}
                          {w > 0 ? ` · ${faNum(w)} گرم` : ''}
                          {` · اجرت ${faFeePct(p.fee_ratio)}٪`}
                        </small>
                        {total != null && <em>{faPrice(total)} تومان</em>}
                      </span>
                      <span className="atelier-match-go">مشاهده</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
