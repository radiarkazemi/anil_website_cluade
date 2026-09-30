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

export interface HeroAlbumSlide {
  id: string;
  image?: string | null;
  image_url: string | null;
  alt_text: string;
  caption: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
}

export type CmsLink = { label: string; href: string };

export type SiteCms = {
  blog?: {
    hero_title?: string;
    hero_subtitle?: string;
    hero_lead?: string;
    latest_kicker?: string;
    latest_title?: string;
    cta_label?: string;
  };
  products_promo?: {
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
    image_path?: string;
  };
  products_page?: {
    crumb_home?: string;
    all_label?: string;
    filter_label?: string;
    sort_label?: string;
    load_more?: string;
    empty?: string;
  };
  moments?: {
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
    image_path?: string;
  };
  collection?: {
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
    image_path?: string;
  };
  editorial?: {
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
    image_path?: string;
  };
  why_anil?: {
    subtitle?: string;
    items?: { title: string; body: string }[];
  };
  footer?: {
    customers_title?: string;
    categories_title?: string;
    quick_title?: string;
    about_title?: string;
    customers_links?: CmsLink[];
    quick_links?: CmsLink[];
    legal_links?: CmsLink[];
    website_url?: string;
  };
  header?: {
    search_placeholder?: string;
  };
  home?: {
    featured_title?: string;
    featured_subtitle?: string;
    featured_all?: string;
    categories_title?: string;
    categories_subtitle?: string;
    categories_all?: string;
    category_cta?: string;
    calculator_title?: string;
    calculator_subtitle?: string;
    calculator_weight_label?: string;
    calculator_karat_label?: string;
    calculator_result_label?: string;
    rates_live?: string;
    rates_stale?: string;
    rates_empty?: string;
  };
  map?: {
    open_label?: string;
    iframe_title?: string;
  };
  ops?: {
    shipping_note?: string;
    tax_note?: string;
    low_stock_threshold?: number;
  };
};

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
  hero_album?: HeroAlbumSlide[];
  hero_mode: '3d' | 'image';
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_cta_primary_url: string;
  hero_cta_secondary_url: string;
  show_rates: boolean;
  show_categories: boolean;
  show_featured: boolean;
  show_trust: boolean;
  section_order: string[];
  trust_heading: string;
  footer_tagline: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  contact_kicker?: string;
  contact_title?: string;
  contact_body?: string;
  contact_cta_label?: string;
  contact_image_url?: string | null;
  map_embed_url?: string;
  map_query?: string;
  footer_copyright?: string;
  footer_about_heading?: string;
  cms?: SiteCms;
  products_promo_image_url?: string | null;
  moments_image_url?: string | null;
  collection_image_url?: string | null;
  editorial_image_url?: string | null;
  top_banner: string;
  /** When false, storefront checkout/order creation is blocked. */
  orders_enabled?: boolean;
  sales_closed_message?: string;
  updated_at?: string;
}

export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  share_code?: string;
  page_type: 'page' | 'blog';
  excerpt: string;
  body?: string;
  cover?: string | null;
  cover_url?: string | null;
  is_published?: boolean;
  show_in_nav: boolean;
  /** Pin as the top feature banner on /blog */
  is_featured?: boolean;
  /** Topic chips shown on magazine cards, e.g. ["آموزش و راهنما", "بازار و قیمت طلا"] */
  tags?: string[];
  /** Aggregated public read/view count from analytics */
  reads?: number;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  image?: string;
  image_url?: string | null;
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
  weight_g: string | null;
  has_weight?: boolean;
  needs_review?: boolean;
  karat: number;
  fee_ratio: string;
  stone_value: number;
  tag: string;
  description?: string;
  placeholder_label: string;
  price: number | null;
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
  payment_gateway?: string;
  payment_authority?: string;
  payment_ref_id?: string;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
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
  profile_complete?: boolean;
  missing_fields?: string[];
  missing_field_labels?: string[];
  created_at: string;
}

export interface WishlistItem {
  id: string;
  product: Product;
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
