/** Shared luxury icons for Anil Gold storefront */

type IconProps = {
  size?: number;
  className?: string;
};

export function IconGoldBox({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Jewelry gift box — lid + body + gold clasp */}
      <path
        d="M4.5 10.2h15v8.3c0 1-.8 1.8-1.8 1.8H6.3c-1 0-1.8-.8-1.8-1.8v-8.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 10.2 5.6 5.9c.3-.7 1-1.2 1.8-1.2h9.2c.8 0 1.5.5 1.8 1.2l1.8 4.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 4.7v15.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="10.2" r="1.35" fill="currentColor" />
      <path
        d="M9.8 14.2h4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".85"
      />
    </svg>
  );
}

export function IconShieldCheck({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.2 5.5 5.8v5.4c0 4.1 2.7 7.8 6.5 9.1 3.8-1.3 6.5-5 6.5-9.1V5.8L12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 12.1 1.9 1.9 3.8-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconInsuredShip({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4.5 8.2h10.2v9.6H6.2c-.9 0-1.7-.8-1.7-1.7V8.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14.7 11.2h3.1L20 14v2.1c0 .9-.8 1.7-1.7 1.7h-3.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.8" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 11.5h10.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M8.8 5.2 10.4 3.8h2.4L14.2 5.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBuyback({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8.2v7.6M9.8 10.2c.5-.9 1.3-1.3 2.2-1.3 1.4 0 2.3.7 2.3 1.9s-.9 1.9-2.3 1.9h-1M13.2 12.7H11.7c-1.4 0-2.3.7-2.3 1.9 0 1.2.9 1.9 2.3 1.9.9 0 1.7-.4 2.2-1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.8 6.2a8.6 8.6 0 0 1 1.4 2.4M5.2 17.4a8.6 8.6 0 0 1-1-2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconConsult({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5.2 6.5c0-1 .8-1.8 1.8-1.8h10c1 0 1.8.8 1.8 1.8v7.2c0 1-.8 1.8-1.8 1.8H10l-3.4 2.8v-2.8H7c-1 0-1.8-.8-1.8-1.8V6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 9.2h6M9 12h4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m16.8 4.2.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export const TRUST_ICONS = {
  authenticity: IconShieldCheck,
  ship: IconInsuredShip,
  buyback: IconBuyback,
  consult: IconConsult,
} as const;

export type TrustIconKey = keyof typeof TRUST_ICONS;
