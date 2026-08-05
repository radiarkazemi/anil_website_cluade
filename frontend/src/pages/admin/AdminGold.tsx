import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { faPrice } from '../../utils/format';
import { useToast } from '../../store/toastStore';
import { useStore } from '../../store/useStore';

export function AdminGold() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const setGoldPrice = useStore((s) => s.setGoldPrice);
  const current = useStore((s) => s.goldPrice);
  const { data } = useQuery({
    queryKey: ['admin-gold'],
    queryFn: async () => {
      const r = await api.adminGoldList();
      const d = r.data as any;
      return Array.isArray(d) ? d : d.results || [];
    },
  });

  const [form, setForm] = useState({
    price_18k_per_gram: current?.price_18k_per_gram || 3850000,
    price_24k_per_gram: current?.price_24k_per_gram || 5131050,
    mesghal_17: current?.mesghal || current?.mesghal_17 || 0,
    coin_emami: current?.coin_emami || 43850000,
    coin_half: current?.coin_half || 24100000,
    coin_quarter: current?.coin_quarter || 14200000,
    ounce_usd: current?.ounce_usd || 2412,
  });

  const create = useMutation({
    mutationFn: () => api.adminCreateGold(form),
    onSuccess: (r) => {
      toast('نرخ طلا ثبت شد — کل فروشگاه به‌روز شد');
      setGoldPrice(r.data);
      qc.invalidateQueries({ queryKey: ['admin-gold'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      try {
        return await api.adminRefreshGold();
      } catch {
        // Public live endpoint as fallback
        return api.refreshGoldLive();
      }
    },
    onSuccess: (r) => {
      toast(`نرخ زنده دریافت شد (${(r.data as any).source || 'live'})`);
      setGoldPrice(r.data);
      qc.invalidateQueries({ queryKey: ['admin-gold'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: () => toast('خطا در دریافت نرخ زنده از منبع'),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="display" style={{ fontSize: 32 }}>نرخ طلا</h1>
        <button className="outline-btn" type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? 'در حال دریافت…' : 'دریافت نرخ زنده (آنلاین)'}
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 14 }}>ثبت نرخ جدید (منبع حقیقت قیمت‌گذاری)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {([
            ['price_18k_per_gram', 'طلای ۱۸ عیار'],
            ['price_24k_per_gram', 'طلای ۲۴ عیار'],
            ['mesghal_17', 'مثقال ۱۷'],
            ['coin_emami', 'سکه امامی'],
            ['coin_half', 'نیم سکه'],
            ['coin_quarter', 'ربع سکه'],
            ['ounce_usd', 'انس جهانی'],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
              <input className="input" value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <button className="gold-btn" style={{ marginTop: 16 }} type="button" onClick={() => create.mutate()}>اعمال نرخ جدید</button>
      </div>

      <div className="admin-card">
        <h3 style={{ marginBottom: 14 }}>تاریخچه نرخ‌ها</h3>
        <table className="admin-table">
          <thead><tr><th>۱۸ عیار</th><th>مثقال ۱۷</th><th>سکه</th><th>انس</th><th>منبع</th><th>زمان</th></tr></thead>
          <tbody>
            {(data || []).slice(0, 20).map((g: any) => (
              <tr key={g.id}>
                <td style={{ color: 'var(--gold-light)', fontWeight: 700 }}>{faPrice(g.price_18k_per_gram)}</td>
                <td>{faPrice(g.mesghal || g.mesghal_17)}</td>
                <td>{faPrice(g.coin_emami)}</td>
                <td>{g.ounce_usd ? `$${faPrice(g.ounce_usd)}` : '—'}</td>
                <td>{g.source}</td>
                <td>{new Date(g.created_at).toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
