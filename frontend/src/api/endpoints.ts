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
  product: (slug: string) => client.get<Product>(`/products/${slug}/`),

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
  logout: (refresh: string, session: 'client' | 'admin' = 'client') =>
    client.post('/auth/logout/', { refresh }, { authSession: session }),
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
  logProductView: (product_id: string) => client.post('/analytics/product-view/', { product_id }),

  // Admin panel
  adminDashboard: () => client.get<DashboardStats>('/admin/dashboard/'),
  adminProducts: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Product>>('/admin/products/', { params }),
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
