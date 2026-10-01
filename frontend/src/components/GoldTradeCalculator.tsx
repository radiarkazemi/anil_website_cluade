import { useId, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  faNum,
  faPrice,
  faWeight,
  formatWeightInput,
  parseWeightGrams,
  roundWeightG,
  WEIGHT_DECIMALS,
} from '../utils/format';

/** Internal assay factors — never shown in UI. */
const BASE_ASSAY = 750;
const TRADE_MODES = [
  {
    key: 'sell',
    label: 'فروش ما به مشتری',
    assay: 750,
    tone: 'sell' as const,
    hint: 'مبلغی که گالری برای فروش طلا به شما محاسبه می‌کند',
  },
  {
    key: 'buy',
    label: 'خرید ما از مشتری',
    assay: 737,
    tone: 'buy' as const,
    hint: 'مبلغ خرید طلای شما توسط گالری آنیل',
  },
  {
    key: 'exchange',
    label: 'تعویض مشتری با طلا',
    assay: 740,
    tone: 'exchange' as const,
    hint: 'ارزش طلای شما هنگام تعویض با قطعه جدید',
  },
] as const;

function tradeAmount(weightG: number, rate18: number, assay: number): number {
  if (weightG <= 0 || rate18 <= 0) return 0;
  return Math.round(weightG * rate18 * (assay / BASE_ASSAY));
}

const WEIGHT_PRESETS = [0.5, 1, 2.5, 5, 10, 20] as const;
const NUDGE = 0.001;

export function GoldTradeCalculator() {
  const liveRate = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const [weightRaw, setWeightRaw] = useState('5');
  const [active, setActive] = useState<(typeof TRADE_MODES)[number]['key']>('sell');
  const weightId = useId();
  const weight = parseWeightGrams(weightRaw);

  const rows = useMemo(
    () =>
      TRADE_MODES.map((mode) => ({
        ...mode,
        amount: tradeAmount(weight, liveRate, mode.assay),
        perGram: tradeAmount(1, liveRate, mode.assay),
      })),
    [weight, liveRate],
  );

  const nudge = (delta: number) => {
    const base = weight > 0 ? weight : 0;
    const next = roundWeightG(Math.max(NUDGE, base + delta), WEIGHT_DECIMALS);
    setWeightRaw(formatWeightInput(next));
  };

  const onWeightChange = (raw: string) => {
    // Allow typing intermediate values like "1." / "0.00" while capping decimals.
    let s = String(raw)
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/,/g, '.')
      .replace(/[^\d.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
      const [whole, frac = ''] = s.split('.');
      s = `${whole}.${frac.slice(0, WEIGHT_DECIMALS)}`;
    }
    setWeightRaw(s);
  };

  return (
    <section className="tools-calc" aria-labelledby="tools-calc-title">
      <header className="tools-calc-head">
        <div>
          <p className="tools-kicker">ماشین‌حساب طلا</p>
          <h2 id="tools-calc-title">وزن را وارد کنید؛ سه نرخ گالری را ببینید</h2>
          <p className="tools-calc-lead">
            محاسبه بر اساس نرخ زنده گالری آنیل — بدون پیچیدگی، فقط وزن و مبلغ.
          </p>
        </div>
        <div className="tools-calc-rate" aria-live="polite">
          <span className="tools-calc-rate-dot" aria-hidden />
          <div>
            <em>نرخ زنده</em>
            <strong>{liveRate > 0 ? `${faPrice(liveRate)} تومان` : 'در حال دریافت…'}</strong>
          </div>
        </div>
      </header>

      <div className="tools-calc-grid">
        <div className="tools-calc-panel">
          <label className="tools-calc-label" htmlFor={weightId}>
            وزن طلا
            <span>گرم</span>
          </label>
          <div className="tools-calc-weight">
            <button type="button" className="tools-calc-step" onClick={() => nudge(-NUDGE)} aria-label="کاهش وزن">
              −
            </button>
            <input
              id={weightId}
              className="tools-calc-input"
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={weightRaw}
              onChange={(e) => onWeightChange(e.target.value)}
              aria-describedby="tools-calc-weight-hint"
              placeholder="مثلاً 4.125"
            />
            <button type="button" className="tools-calc-step" onClick={() => nudge(NUDGE)} aria-label="افزایش وزن">
              +
            </button>
          </div>
          <p id="tools-calc-weight-hint" className="tools-calc-hint">
            وزن خالص تا سه رقم اعشار (مثلاً ۴٫۱۲۵ گرم)
          </p>
          <div className="tools-calc-presets" role="group" aria-label="وزن‌های پیشنهادی">
            {WEIGHT_PRESETS.map((w) => (
              <button
                key={w}
                type="button"
                className={`tools-calc-chip${weight === w ? ' is-active' : ''}`}
                onClick={() => setWeightRaw(formatWeightInput(w))}
              >
                {faWeight(w)} گرم
              </button>
            ))}
          </div>
        </div>

        <div className="tools-calc-results" role="list">
          {rows.map((row, index) => (
            <button
              key={row.key}
              type="button"
              role="listitem"
              className={`tools-calc-row is-${row.tone}${active === row.key ? ' is-active' : ''}`}
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => setActive(row.key)}
            >
              <div className="tools-calc-row-copy">
                <span className="tools-calc-row-index" aria-hidden>
                  {faNum(index + 1)}
                </span>
                <div>
                  <strong>{row.label}</strong>
                  <em>{row.hint}</em>
                </div>
              </div>
              <div className="tools-calc-row-amount" dir="ltr">
                <b>{row.amount > 0 ? faPrice(row.amount) : '—'}</b>
                <span>تومان</span>
                {row.perGram > 0 && weight > 0 ? (
                  <small>{faPrice(row.perGram)} / گرم</small>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="tools-calc-note">
        مبالغ تقریبی و بر پایه نرخ لحظه‌ای گالری است؛ مبلغ نهایی در فاکتور حضوری اعلام می‌شود.
      </p>
    </section>
  );
}
