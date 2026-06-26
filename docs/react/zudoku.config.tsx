import type { ZudokuConfig } from 'zudoku';
import { LanguageSwitcher } from './components/LanguageSwitcher.js';
import { showForEn, showForEs, showForPt } from './i18n.js';
import { buildDocsNav } from './nav.js';

const config: ZudokuConfig = {
  site: {
    logo: {
      src: {
        light: '/fluxis_light_mode.svg',
        dark: '/fluxis_dark_mode.svg',
      },
      alt: 'Fluxis',
      width: 130,
    },
    footer: {
      columns: [
        {
          title: '@fluxisus/react',
          links: [
            { label: 'GitHub', href: 'https://github.com/fluxisus/fluxis-sdk' },
            { label: 'npm', href: 'https://www.npmjs.com/package/@fluxisus/react' },
            { label: 'Changelog', href: 'https://github.com/fluxisus/fluxis-sdk/releases' },
          ],
        },
        {
          title: 'Fluxis',
          links: [
            { label: 'API Docs', href: 'https://docs.fluxis.us' },
            { label: 'Website', href: 'https://fluxis.us' },
            { label: 'Support', href: 'mailto:dev@fluxis.us' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Fluxis. All rights reserved.`,
    },
  },

  slots: {
    'head-navigation-end': <LanguageSwitcher />,
  },

  navigation: [
    {
      type: 'category',
      label: 'Documentation',
      display: showForEn,
      items: buildDocsNav('en'),
    },
    {
      type: 'category',
      label: 'Documentación',
      display: showForEs,
      items: buildDocsNav('es'),
    },
    {
      type: 'category',
      label: 'Documentação',
      display: showForPt,
      items: buildDocsNav('pt'),
    },
  ],

  redirects: [
    { from: '/', to: '/docs/getting-started/installation' },
    { from: '/es', to: '/es/docs/getting-started/installation' },
    { from: '/pt', to: '/pt/docs/getting-started/installation' },
  ],

  docs: {
    files: '/pages/**/*.{md,mdx}',
  },

  metadata: {
    title: '%s | @fluxisus/react',
    favicon: '/favicon.ico',
    description: 'Official React SDK for Fluxis payment UI — QR codes, compatible apps, and live payment status.',
    keywords: ['fluxis', 'react', 'sdk', 'crypto', 'payments', 'naspip', 'qr-code'],
  },

  theme: {
    dark: {
      primary: '163 100% 41%',
    },
    light: {
      primary: '163 100% 35%',
    },
  },
};

export default config;
