import { useEffect, useId, useRef, useState } from 'react';
import { THEME_META, THEMES, useTheme, type Theme } from '../store/themeStore';

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (t: Theme) => {
    setTheme(t);
    setOpen(false);
  };

  return (
    <div className={`theme-picker${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="theme-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title="انتخاب تم"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="theme-picker-orb" style={{ background: THEME_META[theme].swatch }} aria-hidden />
        {!compact && <span className="theme-picker-label">{THEME_META[theme].label}</span>}
        <span className="theme-picker-chev" aria-hidden />
      </button>
      {open && (
        <ul id={listId} className="theme-picker-menu" role="listbox" aria-label="تم‌های سایت">
          {THEMES.map((t) => {
            const meta = THEME_META[t];
            const active = t === theme;
            return (
              <li key={t} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`theme-picker-option${active ? ' active' : ''}`}
                  onClick={() => pick(t)}
                >
                  <span className="theme-picker-orb" style={{ background: meta.swatch }} aria-hidden />
                  <span className="theme-picker-copy">
                    <strong>{meta.label}</strong>
                    <em>{meta.hint}</em>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
