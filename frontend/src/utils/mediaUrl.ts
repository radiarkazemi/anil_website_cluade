/** Prefer same-origin /media paths so VPS hairpin / mixed hosts don't blank images. */
export function mediaUrl(url?: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (u.pathname.startsWith('/media/')) return `${u.pathname}${u.search}`;
  } catch {
    /* keep original */
  }
  return url;
}
