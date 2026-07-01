import { describe, expect, it } from 'vitest';
import {
  filterCompatibleApps,
  normalizeCompatibleApp,
} from '../src/utils/compatibleApps.js';
import type { CompatibleApp, CompatibleAppRaw } from '../src/types.js';

const rawApp: CompatibleAppRaw = {
  name: 'belo',
  display_name: 'Belo App',
  image_url: 'https://assets.fluxis.us/apps/belo.svg',
  website_url: 'https://belo.app',
  app_store_url: 'https://apps.apple.com/belo',
  google_play_url: null,
  deep_link: 'https://api.belo.app/pay?token=[NASPIP_TOKEN]',
};

const apps: CompatibleApp[] = [
  normalizeCompatibleApp(rawApp),
  {
    name: 'metamask',
    displayName: 'Metamask',
    imageUrl: 'https://assets.fluxis.us/apps/metamask.png',
    websiteUrl: 'https://metamask.io',
    appStoreUrl: null,
    googlePlayUrl: null,
    deepLink: 'https://metamask.app.link/pay?token=[NASPIP_TOKEN]',
  },
];

describe('normalizeCompatibleApp', () => {
  it('converts snake_case API fields to camelCase', () => {
    expect(normalizeCompatibleApp(rawApp)).toEqual({
      name: 'belo',
      displayName: 'Belo App',
      imageUrl: 'https://assets.fluxis.us/apps/belo.svg',
      websiteUrl: 'https://belo.app',
      appStoreUrl: 'https://apps.apple.com/belo',
      googlePlayUrl: null,
      deepLink: 'https://api.belo.app/pay?token=[NASPIP_TOKEN]',
    });
  });
});

describe('filterCompatibleApps', () => {
  it('filters by include list', () => {
    expect(filterCompatibleApps(apps, ['belo'])).toHaveLength(1);
    expect(filterCompatibleApps(apps, ['belo'])[0]?.name).toBe('belo');
  });

  it('filters by exclude list', () => {
    expect(filterCompatibleApps(apps, undefined, ['metamask'])).toHaveLength(1);
    expect(filterCompatibleApps(apps, undefined, ['metamask'])[0]?.name).toBe('belo');
  });
});
