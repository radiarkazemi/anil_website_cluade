import type { User } from '../types';

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  full_name: 'نام و نام خانوادگی',
  phone: 'موبایل',
  email: 'ایمیل',
  national_code: 'کد ملی',
  address: 'آدرس',
  city: 'شهر',
  postal_code: 'کد پستی',
  phone_verified: 'تأیید موبایل',
  email_verified: 'تأیید ایمیل',
  login: 'ورود به حساب',
};

export function getProfileGaps(user: User | null | undefined): string[] {
  if (!user) return ['login'];
  if (Array.isArray(user.missing_fields) && user.missing_fields.length) {
    return user.missing_fields;
  }
  const gaps: string[] = [];
  if (!user.full_name?.trim()) gaps.push('full_name');
  if (!user.phone?.trim()) gaps.push('phone');
  if (!user.email?.trim()) gaps.push('email');
  if (!user.national_code?.trim()) gaps.push('national_code');
  if (!user.address?.trim()) gaps.push('address');
  if (!user.city?.trim()) gaps.push('city');
  if (!user.postal_code?.trim()) gaps.push('postal_code');
  if (!user.phone_verified) gaps.push('phone_verified');
  if (!user.email_verified) gaps.push('email_verified');
  return gaps;
}

export function isProfileReady(user: User | null | undefined): boolean {
  if (user && typeof user.profile_complete === 'boolean') return user.profile_complete;
  return getProfileGaps(user).length === 0;
}

export function profileGapMessage(user: User | null | undefined): string {
  const gaps = getProfileGaps(user);
  if (!gaps.length) return '';
  if (gaps.includes('login')) return 'برای افزودن به گلد باکس ابتدا وارد شوید یا ثبت‌نام کنید.';
  const labels = gaps.map((g) => PROFILE_FIELD_LABELS[g] || g);
  return `برای خرید، این موارد را تکمیل کنید: ${labels.join('، ')}`;
}

export function profileCompletePath(extra = ''): string {
  return `/account?tab=profile&complete=1${extra}`;
}
