export interface GoldPrice {
  id?: string;
  price_18k_per_gram: number;
  price_24k_per_gram: number;
  mesghal: number;
  mesghal_17?: number;
  coin_emami: number;
  coin_half: number;
  coin_quarter: number;
  usd_toman?: number;
  ounce_usd: number;
  source: string;
  created_at: string;
  market_rows: MarketRow[];
}

export interface MarketRow {
  key: string;
  label: string;
  v: number;
  unit: string;
  dollar: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  image_url?: string | null;
  order: number;
  display_count: number;
  product_count: number;
  is_active?: boolean;
}

export interface SiteSettings {
  brand_name: string;
  brand_tagline: string;
  brand_logo: string | null;
  brand_logo_url: string | null;
  cart_label: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string | null;
  hero_image_url: string | null;
  hero_mode: '3d' | 'image';
  hero_cta_primary: string;
  hero_cta_secondary: string;
  show_rates: boolean;
  show_categories: boolean;
  show_featured: boolean;
  show_trust: boolean;
  section_order: string[];
  top_banner: string;
  updated_at?: string;
}

export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  page_type: 'page' | 'blog';
  excerpt: string;
  body?: string;
  cover?: string | null;
  cover_url?: string | null;
  is_published?: boolean;
  show_in_nav: boolean;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  image: string;
  alt: string;
  order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  category_slug: string;
  weight_g: string;
  karat: number;
  fee_ratio: string;
  stone_value: number;
  tag: string;
  description?: string;
  placeholder_label: string;
  price: number;
  primary_image: string | null;
  in_stock: boolean;
  is_featured: boolean;
  images?: ProductImage[];
  breakdown?: PriceBreakdown;
  sku?: string;
  stock?: number;
  meta_title?: string;
  meta_description?: string;
  created_at?: string;
}

export interface PriceBreakdown {
  gold: number;
  fee: number;
  stone: number;
  tax: number;
  total: number;
}

export interface OrderItem {
  id: string;
  product: string;
  product_name: string;
  weight_g: string;
  fee_ratio: string;
  stone_value: number;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  status: string;
  gold_price_snapshot: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  note: string;
  tracking_code: string;
  created_at: string;
  items: OrderItem[];
}

export interface User {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  role: string;
  is_active?: boolean;
  is_staff?: boolean;
  national_code: string;
  address: string;
  city: string;
  postal_code: string;
  avatar: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
