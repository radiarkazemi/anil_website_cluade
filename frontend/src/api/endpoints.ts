import client from './client';
import type {
  AuthTokens, Category, ContentPage, GoldPrice, HeroAlbumSlide, Order, PaginatedResponse, Product, SiteSettings, User,
} from '../types';

export interface DashboardStats {
  products_total: number;
  products_active: number;
  products_featured?: number;
  categories_total: number;
  orders_total: number;
  orders_pending: number;
  orders_today: number;
  revenue_total: number;
  revenue_today: number;
  avg_order_value?: number;
  users_total: number;
  users_by_role?: Record<string, number>;
  gold_price_18k: number;
  gold_updated_at: string | null;
  revenue_series?: { date: string; label: string; revenue: number; orders: number }[];
  orders_by_status?: { status: string; label: string; count: number }[];
  top_products?: { product_name: string; qty: number; revenue: number }[];
  gold_history?: { price_18k_per_gram: number; created_at: string; source: string }[];
  recent_orders: Order[];
  low_stock: Product[];
  orders_paid?: number;
  orders_processing?: number;
  orders_shipped?: number;
  orders_delivered?: number;
  orders_cancelled?: number;
  revenue_paid?: number;
  pending_payment_value?: number;
  payment_gateway_mix?: { payment_gateway: string; c: number; revenue: number }[];
  conversion?: { orders_total: number; paid_rate: number; cancel_rate: number };
  stock_health?: { out_of_stock: number; low_stock: number; healthy: number };
}

export const api = {
  goldPrice: () => client.get<GoldPrice>('/gold-price/'),
  goldPriceLive: (persist = true) =>
    client.get<GoldPrice & { live?: boolean; live_error?: string }>(
      '/gold-price/live/',
      { params: { persist: persist ? '1' : '0' } },
    ),
  refreshGoldLive: () => client.post<GoldPrice & { live?: boolean }>('/gold-price/live/'),
  categories: () => client.get<Category[]>('/categories/'),
  siteSettings: () => client.get<SiteSettings>('/site-settings/'),
  pages: (params?: Record<string, string>) => client.get<ContentPage[]>('/pages/', { params }),
  page: (slug: string) => client.get<ContentPage>(`/pages/${slug}/`),
  products: (params?: Record<string, string>) => client.get<PaginatedResponse<Product>>('/products/', { params }),
  /** Load every page so «همه» never silently truncates the catalog. */
  productsAll: async (params?: Record<string, string>) => {
    const base = { ...(params || {}), page_size: params?.page_size || '200' };
    const first = await client.get<PaginatedResponse<Product>>('/products/', { params: { ...base, page: '1' } });
    const all = [...(first.data.results || [])];
    const total = first.data.count ?? all.length;
    let page = 2;
    while (all.length < total && first.data.next) {
      const res = await client.get<PaginatedResponse<Product>>('/products/', {
        params: { ...base, page: String(page) },
      });
      const batch = res.data.results || [];
      if (!batch.length) break;
      all.push(...batch);
      page += 1;
      if (!res.data.next) break;
      if (page > 50) break;
    }
    return all;
  },
  product: (slug: string) => client.get<Product>(`/products/${slug}/`),
  consultant: (data: Record<string, unknown>) =>
    client.post<{
      reply: string;
      suggestions: {
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
      }[];
      count: number;
    }>('/consultant/', data),

  createOrder: (data: {
    full_name: string;
    phone: string;
    address: string;
    email?: string;
    city?: string;
    postal_code?: string;
    note?: string;
    items: { product_id: string; qty: number }[];
  }) => client.post<Order>('/orders/', data),
  myOrders: () => client.get<PaginatedResponse<Order> | Order[]>('/orders/mine/'),
  trackOrder: (data: { order_number: string; phone: string }) =>
    client.post<Order>('/orders/track/', data, { authSession: 'client' }),
  paymentGateways: () =>
    client.get<{ gateways: { code: string; label: string; sandbox?: boolean }[]; sandbox: boolean }>(
      '/payments/gateways/',
    ),
  payOrder: (orderNumber: string, data: { gateway: string; phone?: string }) =>
    client.post<{
      order_number: string;
      gateway: string;
      authority: string;
      payment_url: string;
      sandbox: boolean;
      message?: string;
      amount: number;
    }>(`/orders/${orderNumber}/pay/`, data),
  sandboxConfirmPayment: (orderNumber: string, phone?: string) =>
    client.post<{ ok: boolean; order?: Order }>(`/orders/${orderNumber}/pay/sandbox-confirm/`, {
      phone: phone || '',
    }),

  login: (phone: string, password: string) =>
    client.post<{ access: string; refresh: string; user?: User }>('/auth/login/', { phone, password }, {
      authSession: 'client',
    }),
  adminLogin: (phone: string, password: string) =>
    client.post<{ access: string; refresh: string; user?: User }>('/auth/admin/login/', { phone, password }, {
      authSession: 'admin',
    }),
  register: (data: Record<string, string>) =>
    client.post<{ user: User; tokens: AuthTokens; next?: string; detail?: string }>('/auth/register/', data, {
      authSession: 'client',
    }),
  profile: (session: 'client' | 'admin' = 'client') =>
    client.get<User>('/auth/profile/', { authSession: session }),
  updateProfile: (data: Partial<User>) => client.patch<User>('/auth/profile/', data),
  changePassword: (old_password: string, new_password: string) =>
    client.post<{ detail: string }>('/auth/change-password/', { old_password, new_password }),
  logout: (refresh: string, session: 'client' | 'admin' = 'client') =>
    client.post('/auth/logout/', { refresh }, { authSession: session }),
  wishlist: () =>
    client.get<
      | { id: string; product: Product; created_at: string }[]
      | PaginatedResponse<{ id: string; product: Product; created_at: string }>
    >('/wishlist/'),
  addWishlist: (product_id: string) =>
    client.post<{ id: string; product: Product; created_at: string }>('/wishlist/', { product_id }),
  removeWishlist: (id: string) => client.delete(`/wishlist/${id}/`),
  sendPhoneOtp: () =>
    client.post<{ detail: string; demo_code?: string; expires_in?: number; user?: User }>(
      '/auth/verify/phone/send/',
      {},
    ),
  confirmPhoneOtp: (code: string) =>
    client.post<{ detail: string; user: User }>('/auth/verify/phone/confirm/', { code }),
  sendEmailOtp: () =>
    client.post<{ detail: string; demo_code?: string; expires_in?: number; user?: User }>(
      '/auth/verify/email/send/',
      {},
    ),
  confirmEmailOtp: (code: string) =>
    client.post<{ detail: string; user: User }>('/auth/verify/email/confirm/', { code }),

  createOrderFromProfile: (data: { items: { product_id: string; qty: number }[]; note?: string }) =>
    client.post<Order>('/orders/', data),
  priceHistory: (limit = 50) => client.get('/analytics/price-history/', { params: { limit } }),
  logProductView: (product_id: string, extra?: Record<string, string>) =>
    client.post('/analytics/product-view/', { product_id, ...extra }),
  logSiteVisit: (data: {
    path: string;
    title?: string;
    referrer?: string;
    session_id?: string;
    user_agent?: string;
    screen?: string;
    language?: string;
    product_id?: string;
  }) => client.post('/analytics/site-visit/', data),
  adminTraffic: (params?: {
    days?: number;
    from?: string;
    to?: string;
    path?: string;
    product_id?: string;
  }) =>
    client.get<{
      days: number;
      date_from?: string;
      date_to?: string;
      filters?: { path?: string; product_id?: string };
      available: boolean;
      totals: {
        visits: number;
        unique_visitors: number;
        visits_today: number;
        unique_today: number;
        product_views: number;
      };
      series: { date: string; visits: number; unique_visitors: number }[];
      top_pages: { path: string; views: number; title?: string }[];
      top_referrers: { host: string; views: number }[];
      top_products: { product_id: string; views: number; name?: string; slug?: string | null }[];
      devices: { device: string; views: number }[];
      recent: {
        path?: string;
        title?: string;
        referrer_host?: string;
        device?: string;
        ts?: string;
        product_id?: string;
      }[];
    }>('/admin/traffic/', {
      params: {
        days: params?.days ?? 14,
        from: params?.from || undefined,
        to: params?.to || undefined,
        path: params?.path || undefined,
        product_id: params?.product_id || undefined,
      },
    }),
  adminTrafficExportUrl: (params?: {
    days?: number;
    from?: string;
    to?: string;
    path?: string;
    product_id?: string;
  }) => {
    const q = new URLSearchParams();
    q.set('days', String(params?.days ?? 14));
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.path) q.set('path', params.path);
    if (params?.product_id) q.set('product_id', params.product_id);
    return `/api/v1/admin/traffic/export/?${q.toString()}`;
  },

  // Admin panel
  adminDashboard: () => client.get<DashboardStats>('/admin/dashboard/'),
  adminProducts: async (params?: Record<string, string>) => {
    const res = await client.get<PaginatedResponse<Product> | Product[]>('/admin/products/', { params });
    const data = res.data;
    const results = Array.isArray(data) ? data : (data?.results || []);
    return { ...res, data: { count: results.length, next: null, previous: null, results } };
  },
  adminProduct: (id: string) => client.get<Product>(`/admin/products/${id}/`),
  adminCreateProduct: (data: Record<string, unknown>) => client.post<Product>('/admin/products/', data),
  adminUpdateProduct: (id: string, data: Record<string, unknown>) => client.patch<Product>(`/admin/products/${id}/`, data),
  adminDeleteProduct: (id: string) => client.delete(`/admin/products/${id}/`),
  adminUploadImage: (productId: string, file: File, isPrimary = true) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('is_primary', String(isPrimary));
    return client.post(`/admin/products/${productId}/images/`, fd);
  },
  adminDeleteProductImage: (productId: string, imageId: string) =>
    client.delete(`/admin/products/${productId}/images/`, { params: { image_id: imageId } }),
  adminClearProductImages: (productId: string) =>
    client.delete(`/admin/products/${productId}/images/`, { params: { all: '1' } }),
  adminApplyAutoSeo: (onlyEmpty = false) =>
    client.post<{ updated: number; total: number }>('/admin/products/apply-seo/', { only_empty: onlyEmpty }),
  adminCategories: () => client.get<Category[]>('/admin/categories/'),
  adminCreateCategory: (data: Partial<Category>) => client.post<Category>('/admin/categories/', data),
  adminUpdateCategory: (id: string, data: Partial<Category>) => client.patch<Category>(`/admin/categories/${id}/`, data),
  adminDeleteCategory: (id: string) => client.delete(`/admin/categories/${id}/`),
  adminUploadCategoryImage: (categoryId: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return client.post<Category>(`/admin/categories/${categoryId}/image/`, fd);
  },
  adminSiteSettings: () => client.get<SiteSettings>('/admin/site-settings/'),
  adminUpdateSiteSettings: (data: FormData | Record<string, unknown>) =>
    client.patch<SiteSettings>('/admin/site-settings/', data),
  adminHeroAlbum: () => client.get<HeroAlbumSlide[]>('/admin/site-settings/hero-album/'),
  adminUploadHeroSlide: (file: File, meta?: { alt_text?: string; caption?: string }) => {
    const fd = new FormData();
    fd.append('image', file);
    if (meta?.alt_text) fd.append('alt_text', meta.alt_text);
    if (meta?.caption) fd.append('caption', meta.caption);
    return client.post<HeroAlbumSlide & { site?: SiteSettings }>('/admin/site-settings/hero-album/', fd);
  },
  adminUpdateHeroSlide: (
    id: string,
    data: FormData | { alt_text?: string; caption?: string; sort_order?: number; is_active?: boolean },
  ) => client.patch<HeroAlbumSlide & { site?: SiteSettings }>(`/admin/site-settings/hero-album/${id}/`, data),
  adminDeleteHeroSlide: (id: string) =>
    client.delete<{ ok: boolean; site?: SiteSettings }>(`/admin/site-settings/hero-album/${id}/`),
  adminReorderHeroAlbum: (ids: string[]) =>
    client.post<SiteSettings>('/admin/site-settings/hero-album/reorder/', { order: ids }),
  adminPages: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<ContentPage> | ContentPage[]>('/admin/pages/', { params }),
  adminCreatePage: (data: Partial<ContentPage>) => client.post<ContentPage>('/admin/pages/', data),
  adminUpdatePage: (id: string, data: Partial<ContentPage>) => client.patch<ContentPage>(`/admin/pages/${id}/`, data),
  adminDeletePage: (id: string) => client.delete(`/admin/pages/${id}/`),
  adminOrders: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Order>>('/admin/orders/', { params }),
  adminUpdateOrder: (orderNumber: string, data: Partial<Order>) =>
    client.patch<Order>(`/admin/orders/${orderNumber}/`, data),
  adminUsers: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<User>>('/admin/users/', { params }),
  adminUpdateUser: (id: string, data: Partial<User> & { is_active?: boolean }) =>
    client.patch<User>(`/admin/users/${id}/`, data),
  adminGoldList: () => client.get<PaginatedResponse<GoldPrice> | GoldPrice[]>('/admin/gold-price/'),
  adminCreateGold: (data: Partial<GoldPrice>) => client.post<GoldPrice>('/admin/gold-price/', data),
  adminRefreshGold: () => client.post<GoldPrice>('/admin/gold-price/refresh/'),
};
