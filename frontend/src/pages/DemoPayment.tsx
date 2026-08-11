import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { faPrice } from '../utils/format';

/**
 * Demo / sandbox payment page — simulates Iranian gateway success/failure
 * until real Zarinpal/IDPay merchant keys are configured.
 */
export function DemoPayment() {
  const { orderNumber = '' } = useParams();
  const tokens = useStore((s) => s.tokens);
  const user = useStore((s) => s.user);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const r = await api.myOrders();
      const d = r.data as any;
      return Array.isArray(d) ? d : d.results || [];
    },
    enabled: !!tokens && !!orderNumber,
  });

  const order = orders.find((o: any) => o.order_number === orderNumber);

  const pay = useMutation({
    mutationFn: async () => {
      const start = await api.payOrder(orderNumber, {
        gateway: 'zarinpal',
        phone: user?.phone || order?.phone,
      });
      if (start.data.sandbox) {
        await api.sandboxConfirmPayment(orderNumber, user?.phone || order?.phone);
        return { sandbox: true as const };
      }
      if (start.data.payment_url) {
        window.location.href = start.data.payment_url;
        return { sandbox: false as const };
      }
      throw new Error('لینک پرداخت دریافت نشد');
    },
    onSuccess: (res) => {
      if (res.sandbox) {
        toast('پرداخت آزمایشی با موفقیت انجام شد');
        qc.invalidateQueries({ queryKey: ['my-orders'] });
        nav(`/account?tab=orders&paid=${orderNumber}`);
      }
    },
    onError: (e: any) => toast(e.response?.data?.detail || e.message || 'پرداخت ناموفق'),
  });

  if (!tokens) return <Navigate to="/login" replace />;

  return (
    <div className="container demo-pay-page">
      <div className="demo-pay-card">
        <div className="section-eyebrow">پرداخت آزمایشی</div>
        <h1 className="section-title tight">درگاه تست آنیل</h1>
        <p className="content-excerpt">
          این صفحه برای آزمایش جریان خرید است. با اتصال درگاه واقعی، مشتری به زرین‌پال / آیدی‌پی هدایت می‌شود.
        </p>

        {isLoading ? (
          <p>در حال بارگذاری سفارش…</p>
        ) : !order ? (
          <div className="account-empty">
            <p>سفارش یافت نشد یا متعلق به حساب دیگری است.</p>
            <Link to="/account" className="gold-btn">
              بازگشت به حساب
            </Link>
          </div>
        ) : order.status !== 'pending' ? (
          <div className="demo-pay-done">
            <div className="demo-pay-amount">{faPrice(order.total)} تومان</div>
            <p>
              وضعیت فعلی: <strong>{order.status}</strong>
            </p>
            <Link to="/account?tab=orders" className="gold-btn">
              مشاهده سفارش‌ها
            </Link>
          </div>
        ) : (
          <>
            <div className="demo-pay-box">
              <div>
                شماره سفارش: <b dir="ltr">{order.order_number}</b>
              </div>
              <div className="demo-pay-amount">{faPrice(order.total)} تومان</div>
              <ul className="order-items">
                {order.items?.map((it: any) => (
                  <li key={it.id}>
                    {it.product_name} × {it.qty}
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" className="gold-btn" disabled={pay.isPending} onClick={() => pay.mutate()} style={{ width: '100%' }}>
              {pay.isPending ? 'در حال پرداخت آزمایشی…' : 'تأیید پرداخت آزمایشی (موفق)'}
            </button>
            <Link to="/account?tab=orders" className="outline-btn" style={{ textAlign: 'center', marginTop: 10 }}>
              انصراف و بازگشت
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
