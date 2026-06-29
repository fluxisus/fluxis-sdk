import type { UseAuthReturn } from 'zudoku/hooks';
import type { ZudokuContext } from 'zudoku';

export type Locale = 'en' | 'es' | 'pt';

export const LOCALES: Locale[] = ['en', 'es', 'pt'];

const LOCALE_PATH_PREFIX: Record<Locale, string> = {
  en: '',
  es: '/es',
  pt: '/pt',
};

export function getDocsPathPrefix(locale: Locale): string {
  return `${LOCALE_PATH_PREFIX[locale]}/docs/`;
}

export function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith('/es/') || pathname === '/es') return 'es';
  if (pathname.startsWith('/pt/') || pathname === '/pt') return 'pt';
  return 'en';
}

export function swapLocaleInPath(pathname: string, targetLocale: Locale): string {
  const current = getLocaleFromPath(pathname);
  const stripped =
    current === 'en' ? pathname : pathname.replace(`/${current}`, '');
  const prefix = LOCALE_PATH_PREFIX[targetLocale];
  return `${prefix}${stripped}`;
}

export function showForEn(_params: { context: ZudokuContext; auth: UseAuthReturn }) {
  if (typeof window === 'undefined') return true;
  const p = window.location.pathname;
  return p !== '/es' && !p.startsWith('/es/') && p !== '/pt' && !p.startsWith('/pt/');
}

export function showForEs(_params: { context: ZudokuContext; auth: UseAuthReturn }) {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p === '/es' || p.startsWith('/es/');
}

export function showForPt(_params: { context: ZudokuContext; auth: UseAuthReturn }) {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p === '/pt' || p.startsWith('/pt/');
}
