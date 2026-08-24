import { describe, expect, it } from 'vitest';
import {
  parseWalletCatalog,
  splitWalletCatalog,
  toCompatibleApp,
} from '../src/hosted/normalizeWalletCatalog.js';

const RAW = [
  {
    name: 'belo',
    display_name: 'Belo App',
    image_url: 'https://assets.fluxis.us/apps/belo.svg',
    website_url: 'https://belo.app',
    app_store_url: null,
    google_play_url: null,
    deep_link: 'https://api.belo.app/dynamic-link?naspip_token=[NASPIP_TOKEN]',
    type: 'CEFI',
  },
  {
    name: 'metamask',
    display_name: 'Metamask',
    image_url: 'https://assets.fluxis.us/apps/metamask.png',
    website_url: 'https://metamask.io',
    app_store_url: null,
    google_play_url: null,
    deep_link: 'https://metamask.app.link/dapp/[CHECKOUT_HOST_PATH]',
    type: 'DEFI',
  },
  {
    name: 'unknown',
    display_name: 'Skip me',
    image_url: '',
    website_url: '',
    app_store_url: null,
    google_play_url: null,
    deep_link: 'https://example.com',
    type: 'OTHER',
  },
];

describe('parseWalletCatalog', () => {
  it('keeps CEFI and DEFI entries and drops unknown types', () => {
    const apps = parseWalletCatalog(RAW);
    expect(apps.map((a) => a.name)).toEqual(['belo', 'metamask']);
    expect(apps[0]?.type).toBe('CEFI');
    expect(apps[1]?.type).toBe('DEFI');
  });

  it('returns an empty list for non-arrays', () => {
    expect(parseWalletCatalog(null)).toEqual([]);
    expect(parseWalletCatalog({})).toEqual([]);
  });
});

describe('splitWalletCatalog', () => {
  it('partitions by type', () => {
    const { cefi, defi } = splitWalletCatalog(parseWalletCatalog(RAW));
    expect(cefi.map((a) => a.name)).toEqual(['belo']);
    expect(defi.map((a) => a.name)).toEqual(['metamask']);
  });
});

describe('toCompatibleApp', () => {
  it('drops type so existing stack components can consume the entry', () => {
    const [belo] = parseWalletCatalog(RAW);
    expect(toCompatibleApp(belo!)).toEqual({
      name: 'belo',
      displayName: 'Belo App',
      imageUrl: 'https://assets.fluxis.us/apps/belo.svg',
      websiteUrl: 'https://belo.app',
      appStoreUrl: null,
      googlePlayUrl: null,
      deepLink: 'https://api.belo.app/dynamic-link?naspip_token=[NASPIP_TOKEN]',
    });
  });
});
