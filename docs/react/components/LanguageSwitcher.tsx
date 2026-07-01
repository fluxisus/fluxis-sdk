import { useLocation, useNavigate } from 'react-router';
import { getLocaleFromPath, swapLocaleInPath, type Locale } from '../i18n.js';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export function LanguageSwitcher() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = getLocaleFromPath(pathname);

  function switchTo(locale: Locale) {
    if (locale === current) return;
    const next = swapLocaleInPath(pathname, locale);
    document.documentElement.lang = locale;
    void navigate(next);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {(['en', 'es', 'pt'] as Locale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchTo(locale)}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.8125rem',
            borderRadius: '0.375rem',
            border: locale === current ? '1px solid currentColor' : '1px solid transparent',
            background: 'transparent',
            cursor: locale === current ? 'default' : 'pointer',
            opacity: locale === current ? 1 : 0.6,
          }}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
