import client from './client';
import type { AuthTokens, Category, GoldPrice, Order, PaginatedResponse, Product, User } from '../types';

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
  myOrders: () => client.get<PaginatedResponse<Order>>('/orders/mine/'),

  login: (phone: string, password: string) =>
    client.post<{ access: string; refresh: string; user?: User }>('/auth/login/', { phone, password }, {
      authSession: 'client',
    }),
  adminLogin: (phone: string, password: string) =>
    client.post<{ access: string; refresh: string; user?: User }>('/auth/admin/login/', { phone, password }, {
      authSession: 'admin',
    }),
  register: (data: Record<string, string>) =>
    client.post<{ user: User; tokens: AuthTokens }>('/auth/register/', data, { authSession: 'client' }),
  profile: (session: 'client' | 'admin' = 'client') =>
    client.get<User>('/auth/profile/', { authSession: session }),
  updateProfile: (data: Partial<User>) => client.patch<User>('/auth/profile/', data),
  logout: (refresh: string, session: 'client' | 'admin' = 'client') =>
    client.post('/auth/logout/', { refresh }, { authSession: session }),

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
    return client.post(`/admin/products/${productId}/images/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  adminCategories: () => client.get<Category[]>('/admin/categories/'),
  adminCreateCategory: (data: Partial<Category>) => client.post<Category>('/admin/categories/', data),
  adminUpdateCategory: (id: string, data: Partial<Category>) => client.patch<Category>(`/admin/categories/${id}/`, data),
  adminDeleteCategory: (id: string) => client.delete(`/admin/categories/${id}/`),
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
