import client from './client';
import type { AuthTokens, Category, GoldPrice, Order, PaginatedResponse, Product, User } from '../types';

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
};
