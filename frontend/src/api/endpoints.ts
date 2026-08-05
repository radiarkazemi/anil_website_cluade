import client from './client';
import type { AuthTokens, Category, GoldPrice, Order, PaginatedResponse, Product, User } from '../types';

export interface DashboardStats {
  products_total: number;
  products_active: number;
  categories_total: number;
  orders_total: number;
  orders_pending: number;
  orders_today: number;
  revenue_total: number;
  revenue_today: number;
  users_total: number;
  gold_price_18k: number;
  gold_updated_at: string | null;
  recent_orders: Order[];
  low_stock: Product[];
}

export const api = {
  goldPrice: () => client.get<GoldPrice>('/gold-price/'),
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
    client.post<{ access: string; refresh: string }>('/auth/login/', { phone, password }),
  register: (data: Record<string, string>) =>
    client.post<{ user: User; tokens: AuthTokens }>('/auth/register/', data),
  profile: () => client.get<User>('/auth/profile/'),
  updateProfile: (data: Partial<User>) => client.patch<User>('/auth/profile/', data),
  logout: (refresh: string) => client.post('/auth/logout/', { refresh }),

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
  adminGoldList: () => client.get<PaginatedResponse<GoldPrice> | GoldPrice[]>('/admin/gold-price/'),
  adminCreateGold: (data: Partial<GoldPrice>) => client.post<GoldPrice>('/admin/gold-price/', data),
  adminRefreshGold: () => client.post<GoldPrice>('/admin/gold-price/refresh/'),
};
