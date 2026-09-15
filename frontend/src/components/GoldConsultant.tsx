import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { faNum, faPrice } from '../utils/format';

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  weight_g: string | null;
  fee_pct: number;
  price: number | null;
  primary_image: string | null;
  reasons: string[];
  description?: string;
};

type Msg = { role: 'user' | 'assistant'; text: string; suggestions?: Suggestion[] };

const QUICK = [
  'النگو حدود ۳ گرم',
  'انگشتر کم‌اجرت',
  'دستبند بین ۲ تا ۵ گرم',
  'نیم‌ست برای هدیه',
];

export function GoldConsultant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [weight, setWeight] = useState('');
  const [feeMax, setFeeMax] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'سلام! مشاور موجودی آنیل هستم. وزن، اجرت یا شکل قطعه را بگویید تا از ویترین پیشنهاد بدهم.',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q && !weight && !feeMax) return;
    const display = q || [
      weight ? `وزن ${weight} گرم` : '',
      feeMax ? `اجرت تا ${feeMax}٪` : '',
    ].filter(Boolean).join(' · ');

    setMsgs((m) => [...m, { role: 'user', text: display }]);
    setInput('');
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { message: q || display, limit: 5 };
      if (weight) payload.weight = Number(weight);
      if (feeMax) payload.fee_max_pct = Number(feeMax);
      const { data } = await api.consultant(payload);
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.reply || 'پیشنهادی پیدا شد.',
          suggestions: data.suggestions || [],
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: 'ارتباط با مشاور برقرار نشد. لطفاً دوباره تلاش کنید.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <div className={`gold-consultant${open ? ' is-open' : ''}`}>
      {open && (
        <div className="gc-panel" role="dialog" aria-label="مشاور هوشمند موجودی">
          <header className="gc-head">
            <div>
              <strong>مشاور هوشمند آنیل</strong>
              <span>پیشنهاد از موجودی واقعی · وزن · اجرت · شکل</span>
            </div>
            <button type="button" className="gc-close" onClick={() => setOpen(false)} aria-label="بستن">
              ×
            </button>
          </header>

          <div className="gc-filters">
            <label>
              وزن (گرم)
              <input
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="مثلاً ۳.۵"
              />
            </label>
            <label>
              حداکثر اجرت ٪
              <input
                inputMode="decimal"
                value={feeMax}
                onChange={(e) => setFeeMax(e.target.value)}
                placeholder="مثلاً ۸"
              />
            </label>
          </div>

          <div className="gc-quick">
            {QUICK.map((q) => (
              <button key={q} type="button" disabled={busy} onClick={() => void ask(q)}>
                {q}
              </button>
            ))}
          </div>

          <div className="gc-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`gc-msg gc-${m.role}`}>
                <p>{m.text}</p>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="gc-suggestions">
                    {m.suggestions.map((s) => (
                      <Link key={s.id} to={`/products/${s.slug}`} className="gc-card" onClick={() => setOpen(false)}>
                        <div className="gc-card-media">
                          {s.primary_image ? (
                            <img src={s.primary_image} alt="" />
                          ) : (
                            <span>{s.category_name}</span>
                          )}
                        </div>
                        <div className="gc-card-body">
                          <strong>{s.name}</strong>
                          <small>
                            {s.weight_g ? `${faNum(Number(s.weight_g))} گرم` : 'وزن پس از تأیید'}
                            {' · '}
                            اجرت {faNum(s.fee_pct)}٪
                          </small>
                          {s.price != null && <em>{faPrice(s.price)} تومان</em>}
                          {s.reasons?.[0] && <span className="gc-reason">{s.reasons[0]}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="gc-msg gc-assistant"><p>در حال جست‌وجوی موجودی…</p></div>}
            <div ref={endRef} />
          </div>

          <form className="gc-form" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="مثلاً: النگو حدود ۴ گرم با اجرت کم"
              disabled={busy}
            />
            <button type="submit" className="gold-btn" disabled={busy}>
              بفرست
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="gc-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="مشاور هوشمند موجودی"
      >
        {open ? 'بستن' : 'مشاور هوشمند'}
      </button>
    </div>
  );
}
