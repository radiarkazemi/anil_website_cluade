import { THEME_META, THEMES, useTheme, type Theme } from '../store/themeStore';

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  return (
    <div
      className={`theme-swatches${compact ? ' is-compact' : ''}`}
      role="radiogroup"
      aria-label="انتخاب تم سایت"
      title="تم نمایش"
    >
      {!compact && (
        <span className="theme-swatches-label">{THEME_META[theme].label}</span>
      )}
      <div className="theme-swatches-row">
        {THEMES.map((t) => {
          const meta = THEME_META[t];
          const active = t === theme;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={meta.label}
              title={`${meta.label} — ${meta.hint}`}
              className={`theme-swatch${active ? ' active' : ''}`}
              style={{ background: meta.swatch }}
              onClick={() => setTheme(t as Theme)}
            />
          );
        })}
      </div>
    </div>
  );
}
