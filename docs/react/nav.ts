import type { Locale } from './i18n.js';
import { CATEGORY_LABELS, DOC_LABELS, type DocPath } from './doc-labels.js';

function filePrefix(locale: Locale): string {
  return locale === 'en' ? 'docs/' : `${locale}/docs/`;
}

function doc(locale: Locale, path: DocPath, icon: string) {
  return {
    type: 'doc' as const,
    file: `${filePrefix(locale)}${path}`,
    label: DOC_LABELS[locale][path],
    icon,
  };
}

export function buildDocsNav(locale: Locale) {
  const cat = CATEGORY_LABELS[locale];
  return [
    {
      type: 'category' as const,
      label: cat.getting_started,
      icon: 'rocket',
      items: [
        doc(locale, 'getting-started/installation', 'package'),
        doc(locale, 'getting-started/quick-start', 'zap'),
      ],
    },
    {
      type: 'category' as const,
      label: cat.components,
      icon: 'layout-panel-left',
      items: [
        doc(locale, 'components/fluxis-qr-code', 'qr-code'),
        doc(locale, 'components/compatible-apps', 'smartphone'),
        doc(locale, 'components/compatible-apps-marquee', 'gallery-horizontal-end'),
        doc(locale, 'components/pay-with-app-button', 'mouse-pointer-click'),
      ],
    },
    {
      type: 'category' as const,
      label: cat.hooks,
      icon: 'webhook',
      items: [doc(locale, 'hooks/use-payment-status', 'refresh-cw')],
    },
    {
      type: 'category' as const,
      label: cat.guides,
      icon: 'book-open',
      items: [
        doc(locale, 'guides/theming', 'palette'),
        doc(locale, 'guides/merchant-backend', 'server'),
      ],
    },
    {
      type: 'category' as const,
      label: cat.reference,
      icon: 'file-text',
      items: [doc(locale, 'reference/naspip-tokens', 'key-round')],
    },
  ];
}
