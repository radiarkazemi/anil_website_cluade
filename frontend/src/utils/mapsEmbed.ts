import type { SiteSettings } from '../types';

/** Build a Google Maps embed src from settings (real map iframe). */
export function mapsEmbedSrc(site?: SiteSettings | null): string {
  const pasted = (site?.map_embed_url || '').trim();
  if (pasted) {
    const fromIframe = pasted.match(/src=["']([^"']+)["']/i);
    if (fromIframe?.[1]) return fromIframe[1];
    if (/^https?:\/\//i.test(pasted)) return pasted;
  }
  const q =
    (site?.map_query || '').trim() ||
    (site?.contact_address || '').trim() ||
    'ابهر، استان زنجان';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=fa&z=15&output=embed`;
}

export function mapsExternalUrl(site?: SiteSettings | null): string {
  const q =
    (site?.map_query || '').trim() ||
    (site?.contact_address || '').trim() ||
    'ابهر، استان زنجان';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
