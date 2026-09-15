import { useEffect, useId, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Props = {
  className?: string;
  /** Close mobile menu after submit */
  onSubmitExtra?: () => void;
  autoFocus?: boolean;
};

/** Global product search — navigates to /products?search=… */
export function SiteSearch({ className = '', onSubmitExtra, autoFocus }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQ = params.get('search') || '';
  const [q, setQ] = useState(urlQ);
  const inputId = useId();

  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    const next = new URLSearchParams(params);
    if (term) next.set('search', term);
    else next.delete('search');
    const qs = next.toString();
    navigate(qs ? `/products?${qs}` : '/products');
    onSubmitExtra?.();
  };

  return (
    <form className={`site-search ${className}`.trim()} onSubmit={submit} role="search">
      <label className="sr-only" htmlFor={inputId}>جستجوی محصول</label>
      <input
        id={inputId}
        className="site-search-input"
        type="search"
        enterKeyHint="search"
        placeholder="جستجو: انگشتر، گردنی، نام…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      <button type="submit" className="site-search-btn" aria-label="جستجو">
        جستجو
      </button>
    </form>
  );
}
