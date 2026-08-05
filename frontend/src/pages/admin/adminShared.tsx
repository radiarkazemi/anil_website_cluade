import { Link } from 'react-router-dom';
import { faNum, faPrice } from '../../utils/format';

export const ORDER_STATUSES: [string, string][] = [
  ['pending', 'در انتظار پرداخت'],
  ['paid', 'پرداخت‌شده'],
  ['processing', 'در حال پردازش'],
  ['shipped', 'ارسال‌شده'],
  ['delivered', 'تحویل‌شده'],
  ['cancelled', 'لغوشده'],
];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(ORDER_STATUSES);

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABEL[status] || status}</span>;
}

export function PageHeader({
  eyebrow = 'پنل مدیریت آنیل',
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-page-head">
      <div>
        <div className="admin-eyebrow">{eyebrow}</div>
        <h1 className="display admin-page-title">{title}</h1>
        {subtitle && <p className="admin-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'gold' | 'up' | 'down';
  to?: string;
}) {
  const body = (
    <>
      <div className="label">{label}</div>
      <div className={`value tone-${tone}`}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </>
  );
  if (to) return <Link to={to} className="stat-card kpi-card">{body}</Link>;
  return <div className="stat-card kpi-card">{body}</div>;
}

/** Simple SVG area/line chart for revenue series */
export function SparkArea({
  values,
  height = 120,
  color = 'var(--gold-light)',
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const w = 320;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * w;
    const y = height - (v / max) * (height - 12) - 6;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="spark-area" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" />
    </svg>
  );
}

export function BarSeries({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bar-series">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <div className="bar-value">{faNum(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

export function Money({ n }: { n: number }) {
  return <span className="money">{faPrice(n)}</span>;
}
