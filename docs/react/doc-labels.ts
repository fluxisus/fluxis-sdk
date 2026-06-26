import type { Locale } from './i18n.js';

export type DocPath =
  | 'getting-started/installation'
  | 'getting-started/quick-start'
  | 'components/fluxis-qr-code'
  | 'components/compatible-apps'
  | 'components/compatible-apps-marquee'
  | 'components/pay-with-app-button'
  | 'hooks/use-payment-status'
  | 'guides/theming'
  | 'guides/merchant-backend'
  | 'reference/naspip-tokens';

export type CategoryKey =
  | 'getting_started'
  | 'components'
  | 'hooks'
  | 'guides'
  | 'reference';

type DocLabels = Record<DocPath, string>;
type CategoryLabels = Record<CategoryKey, string>;

export const DOC_LABELS: Record<Locale, DocLabels> = {
  en: {
    'getting-started/installation': 'Installation',
    'getting-started/quick-start': 'Quick Start',
    'components/fluxis-qr-code': 'FluxisQrCode',
    'components/compatible-apps': 'CompatibleApps',
    'components/compatible-apps-marquee': 'CompatibleAppsMarquee',
    'components/pay-with-app-button': 'PayWithAppButton',
    'hooks/use-payment-status': 'usePaymentStatus',
    'guides/theming': 'Theming',
    'guides/merchant-backend': 'Merchant Backend',
    'reference/naspip-tokens': 'NASPIP Tokens',
  },
  es: {
    'getting-started/installation': 'Instalación',
    'getting-started/quick-start': 'Inicio Rápido',
    'components/fluxis-qr-code': 'FluxisQrCode',
    'components/compatible-apps': 'CompatibleApps',
    'components/compatible-apps-marquee': 'CompatibleAppsMarquee',
    'components/pay-with-app-button': 'PayWithAppButton',
    'hooks/use-payment-status': 'usePaymentStatus',
    'guides/theming': 'Temas',
    'guides/merchant-backend': 'Backend del Comerciante',
    'reference/naspip-tokens': 'Tokens NASPIP',
  },
  pt: {
    'getting-started/installation': 'Instalação',
    'getting-started/quick-start': 'Início Rápido',
    'components/fluxis-qr-code': 'FluxisQrCode',
    'components/compatible-apps': 'CompatibleApps',
    'components/compatible-apps-marquee': 'CompatibleAppsMarquee',
    'components/pay-with-app-button': 'PayWithAppButton',
    'hooks/use-payment-status': 'usePaymentStatus',
    'guides/theming': 'Temas',
    'guides/merchant-backend': 'Backend do Comerciante',
    'reference/naspip-tokens': 'Tokens NASPIP',
  },
};

export const CATEGORY_LABELS: Record<Locale, CategoryLabels> = {
  en: {
    getting_started: 'Getting Started',
    components: 'Components',
    hooks: 'Hooks',
    guides: 'Guides',
    reference: 'Reference',
  },
  es: {
    getting_started: 'Primeros Pasos',
    components: 'Componentes',
    hooks: 'Hooks',
    guides: 'Guías',
    reference: 'Referencia',
  },
  pt: {
    getting_started: 'Primeiros Passos',
    components: 'Componentes',
    hooks: 'Hooks',
    guides: 'Guias',
    reference: 'Referência',
  },
};
