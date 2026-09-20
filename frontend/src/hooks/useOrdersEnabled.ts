import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';

const DEFAULT_CLOSED_MSG =
  'فروش آنلاین موقتاً بسته است. به‌زودی با درگاه پرداخت باز می‌شود.';

/** Shared site-settings query for sales gate + layout. */
export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
    staleTime: 60_000,
  });
}

/** Whether customers may place orders (defaults to closed until payment is ready). */
export function useOrdersEnabled() {
  const { data } = useSiteSettings();
  return {
    ordersEnabled: data?.orders_enabled === true,
    salesClosedMessage: (data?.sales_closed_message || '').trim() || DEFAULT_CLOSED_MSG,
    isLoading: !data,
  };
}
