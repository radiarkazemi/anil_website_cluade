import { useEffect } from 'react';

type SeoProps = {
  title: string;
  description?: string;
  canonicalPath?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: unknown) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Client-side SEO tags for SPA navigations (complements server HTML shells). */
export function usePageSeo({
  title,
  description,
  canonicalPath,
  image,
  type = 'website',
  jsonLd,
  noindex = false,
}: SeoProps) {
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://goldanil.ir';
    const canonical = canonicalPath
      ? `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
      : (typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : origin);
    const desc = (description || '').trim() || 'گالری طلا آنیل — زیورآلات طلا با قیمت‌گذاری لحظه‌ای';
    const img = image || `${origin}/logo.jpg`;

    document.title = title;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:locale', 'fa_IR');
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', 'گالری طلا آنیل');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', img);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);

    if (jsonLd) {
      upsertJsonLd('anil-jsonld', jsonLd);
    }

    // Remove server-injected crawl block once React has painted
    const seoNode = document.getElementById('anil-seo-content');
    if (seoNode) seoNode.remove();
  }, [title, description, canonicalPath, image, type, jsonLd, noindex]);
}
