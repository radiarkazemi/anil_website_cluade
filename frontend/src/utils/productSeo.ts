import { faNum } from './format';

export type ProductSeoInput = {
  name?: string;
  categoryName?: string;
  weight_g?: string | number;
  karat?: string | number;
  tag?: string;
  sku?: string;
  description?: string;
  brand?: string;
};

export type SeoSuggestion = {
  id: string;
  label: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  score: number;
  tips: string[];
};

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function titleLenScore(len: number) {
  // Ideal Google title ~50–60 chars
  if (len >= 48 && len <= 60) return 30;
  if (len >= 40 && len <= 65) return 22;
  if (len >= 30 && len <= 70) return 14;
  return 6;
}

function descLenScore(len: number) {
  // Ideal meta description ~140–160
  if (len >= 140 && len <= 160) return 30;
  if (len >= 120 && len <= 170) return 22;
  if (len >= 90 && len <= 180) return 14;
  return 6;
}

function tipsFor(title: string, desc: string): string[] {
  const tips: string[] = [];
  if (title.length < 40) tips.push('عنوان کمی کوتاه است؛ جزئیات عیار/وزن را اضافه کنید.');
  if (title.length > 60) tips.push('عنوان بلندتر از ۶۰ کاراکتر است و ممکن است در گوگل کوتاه شود.');
  if (desc.length < 120) tips.push('توضیح سئو را کمی کامل‌تر کنید تا نرخ کلیک بهتر شود.');
  if (desc.length > 160) tips.push('توضیح سئو کمی طولانی است؛ جمله آخر را کوتاه‌تر کنید.');
  if (!tips.length) tips.push('طول عنوان و توضیح در بازه پیشنهادی گوگل است.');
  return tips;
}

/** Build ranked SEO suggestions from product fields (Persian jewelry storefront). */
export function suggestProductSeo(input: ProductSeoInput): SeoSuggestion[] {
  const name = (input.name || '').trim();
  if (!name) return [];

  const brand = (input.brand || 'گالری طلا آنیل').trim();
  const category = (input.categoryName || '').trim();
  const karat = Number(input.karat) || 18;
  const weight = Number(input.weight_g);
  const hasWeight = Number.isFinite(weight) && weight > 0;
  const weightFa = hasWeight ? faNum(Number(weight.toFixed(2))) : '';
  const karatFa = faNum(karat);
  const tag = (input.tag || '').trim();
  const sku = (input.sku || '').trim();
  const descSeed = (input.description || '').trim();

  const catBit = category ? `${category} طلا` : 'زیورآلات طلا';
  const weightBit = hasWeight ? ` وزن ${weightFa} گرم` : '';
  const karatBit = ` عیار ${karatFa}`;
  const tagBit = tag ? ` | ${tag}` : '';
  const buyBits = 'قیمت لحظه‌ای · ضمانت اصالت · ارسال بیمه‌شده';

  const titles = [
    `${name} | ${catBit}${karatBit} | ${brand}`,
    `خرید ${name}${weightBit}${karatBit} | ${brand}`,
    `${name}${weightBit} | طلای ${karatFa} عیار ${category ? `· ${category}` : ''} | ${brand}`,
    `${catBit} ${name}${tagBit} | ${brand}`,
  ];

  const descriptions = [
    `${name}${category ? ` از دسته ${category}` : ''} با طلای ${karatFa} عیار${hasWeight ? ` و وزن ${weightFa} گرم` : ''}. خرید آنلاین از ${brand} با ${buyBits}.`,
    `برای خرید ${name}${hasWeight ? ` ${weightFa} گرمی` : ''} با قیمت‌گذاری لحظه‌ای طلا به ${brand} سر بزنید. ${buyBits}${sku ? ` · کد کالا ${sku}` : ''}.`,
    `${descSeed || `${name} دست‌چین‌شده در ${brand}`} — عیار ${karatFa}${hasWeight ? `، وزن ${weightFa} گرم` : ''}. مناسب هدیه و استفاده روزمره با ضمانت اصالت.`,
    `بهترین انتخاب برای ${catBit}: ${name}. قیمت شفاف بر اساس نرخ روز طلا، بازخرید تضمینی و مشاوره تخصصی در ${brand}.`,
  ];

  const keywordSets = [
    [name, catBit, `طلا ${karatFa} عیار`, brand, 'خرید طلا آنلاین'],
    [name, category || 'زیورآلات', 'قیمت لحظه‌ای طلا', 'ضمانت اصالت', brand],
    [`خرید ${name}`, `طلای ${karatFa} عیار`, hasWeight ? `${weightFa} گرم` : 'طلا', tag || 'گالری طلا', brand],
  ];

  const out: SeoSuggestion[] = titles.map((rawTitle, i) => {
    const meta_title = clip(rawTitle, 60);
    const meta_description = clip(descriptions[i] || descriptions[0], 158);
    const keywords = (keywordSets[i] || keywordSets[0]).filter(Boolean);
    const score =
      titleLenScore(meta_title.length) +
      descLenScore(meta_description.length) +
      (category ? 10 : 0) +
      (hasWeight ? 10 : 0) +
      (tag ? 5 : 0) +
      (name.length >= 4 ? 10 : 0);
    return {
      id: `seo-${i}`,
      label: i === 0 ? 'پیشنهاد برتر' : i === 1 ? 'تمرکز روی خرید' : i === 2 ? 'جزئیات محصول' : 'تمرکز روی دسته',
      meta_title,
      meta_description,
      keywords,
      score,
      tips: tipsFor(meta_title, meta_description),
    };
  });

  return out.sort((a, b) => b.score - a.score);
}

export function bestProductSeo(input: ProductSeoInput): SeoSuggestion | null {
  return suggestProductSeo(input)[0] || null;
}
