import { describe, expect, it } from 'vitest';
import {
  isAppSupportedForTransfer,
  isNaspipCompatible,
  isTransferRequired,
  parseWalletCatalog,
  splitWalletCatalog,
  toCompatibleApp,
} from '../src/hosted/normalizeWalletCatalog.js';

const BELO_RAW = {
  name: 'belo',
  display_name: 'Belo App',
  image_url: 'https://assets.fluxis.us/apps/belo.svg',
  website_url: 'https://belo.app',
  app_store_url: null,
  google_play_url: null,
  deep_link: 'https://api.belo.app/dynamic-link?naspip_token=[NASPIP_TOKEN]',
  type: 'CEFI',
};

const METAMASK_RAW = {
  name: 'metamask',
  display_name: 'Metamask',
  image_url: 'https://assets.fluxis.us/apps/metamask.png',
  website_url: 'https://metamask.io',
  app_store_url: null,
  google_play_url: null,
  deep_link: 'https://metamask.app.link/dapp/[CHECKOUT_HOST_PATH]',
  type: 'DEFI',
};

const LEMON_RAW = {
  name: 'lemon',
  display_name: 'Lemon',
  image_url: 'https://assets.fluxis.us/apps/lemon.png',
  website_url: 'https://lemon.me',
  app_store_url: null,
  google_play_url: null,
  deep_link:
    'https://www.lemon.me/app/cash-out-crypto?network=[NETWORK]&address=[ADDRESS]&currency=[ASSET]&amount=[AMOUNT]&partner=fluxis',
  type: 'CEFI',
  network_map: { polygon: 'POLYGON' },
  supported_transfers: ['polygon:USDT', 'polygon:USDC'],
};

const RAW = [
  BELO_RAW,
  METAMASK_RAW,
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
  LEMON_RAW,
];

describe('parseWalletCatalog', () => {
  it('keeps CEFI and DEFI entries and drops unknown types', () => {
    const apps = parseWalletCatalog(RAW);
    expect(apps.map((a) => a.name)).toEqual(['belo', 'metamask', 'lemon']);
    expect(apps[0]?.type).toBe('CEFI');
    expect(apps[1]?.type).toBe('DEFI');
    expect(apps[2]?.type).toBe('CEFI');
  });

  it('returns an empty list for non-arrays', () => {
    expect(parseWalletCatalog(null)).toEqual([]);
    expect(parseWalletCatalog({})).toEqual([]);
  });

  it('preserves networkMap and supportedTransfers on Lemon', () => {
    const apps = parseWalletCatalog([LEMON_RAW]);
    const lemon = apps[0]!;
    expect(lemon.networkMap).toEqual({ polygon: 'POLYGON' });
    expect(lemon.supportedTransfers).toEqual(['polygon:USDT', 'polygon:USDC']);
  });

  it('leaves networkMap and supportedTransfers undefined for Belo (no raw fields)', () => {
    const apps = parseWalletCatalog([BELO_RAW]);
    const belo = apps[0]!;
    expect(belo.networkMap).toBeUndefined();
    expect(belo.supportedTransfers).toBeUndefined();
  });
});

describe('splitWalletCatalog', () => {
  it('partitions all entries by type', () => {
    const { cefi, defi } = splitWalletCatalog(parseWalletCatalog(RAW));
    expect(cefi.map((a) => a.name)).toEqual(['belo', 'lemon']);
    expect(defi.map((a) => a.name)).toEqual(['metamask']);
  });

  it('provides naspipCefi containing only NASPIP-compatible CEFI apps', () => {
    const { naspipCefi } = splitWalletCatalog(parseWalletCatalog(RAW));
    // Belo uses [NASPIP_TOKEN] → included; Lemon uses transfer fields → excluded
    expect(naspipCefi.map((a) => a.name)).toEqual(['belo']);
  });

  it('naspipCefi is a strict subset of cefi', () => {
    const { cefi, naspipCefi } = splitWalletCatalog(parseWalletCatalog(RAW));
    for (const app of naspipCefi) {
      expect(cefi.some((c) => c.name === app.name)).toBe(true);
    }
  });
});

describe('toCompatibleApp', () => {
  it('drops type so existing stack components can consume the entry', () => {
    const [belo] = parseWalletCatalog([BELO_RAW]);
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

describe('isNaspipCompatible', () => {
  it('returns true for Belo (deepLink contains [NASPIP_TOKEN])', () => {
    const [belo] = parseWalletCatalog([BELO_RAW]);
    expect(isNaspipCompatible(belo!)).toBe(true);
  });

  it('returns false for Lemon (deepLink uses transfer fields, not [NASPIP_TOKEN])', () => {
    const [lemon] = parseWalletCatalog([LEMON_RAW]);
    expect(isNaspipCompatible(lemon!)).toBe(false);
  });

  it('returns false for MetaMask (deepLink uses [CHECKOUT_HOST_PATH])', () => {
    const [mm] = parseWalletCatalog([METAMASK_RAW]);
    expect(isNaspipCompatible(mm!)).toBe(false);
  });

  it('is consistent: isNaspipCompatible and isTransferRequired are mutually exclusive for the catalog entries', () => {
    const apps = parseWalletCatalog([BELO_RAW, METAMASK_RAW, LEMON_RAW]);
    for (const app of apps) {
      // An app can't simultaneously require NASPIP and transfer fields
      // (a template using both would be a catalog authoring error)
      if (isNaspipCompatible(app)) {
        expect(isTransferRequired(app)).toBe(false);
      }
    }
  });
});

describe('isTransferRequired', () => {
  it('returns false for Belo (NASPIP template)', () => {
    const [belo] = parseWalletCatalog([BELO_RAW]);
    expect(isTransferRequired(belo!)).toBe(false);
  });

  it('returns false for MetaMask (CHECKOUT_HOST_PATH template)', () => {
    const [mm] = parseWalletCatalog([METAMASK_RAW]);
    expect(isTransferRequired(mm!)).toBe(false);
  });

  it('returns true for Lemon (uses [ADDRESS] etc.)', () => {
    const [lemon] = parseWalletCatalog([LEMON_RAW]);
    expect(isTransferRequired(lemon!)).toBe(true);
  });
});

describe('isAppSupportedForTransfer', () => {
  const [belo] = parseWalletCatalog([BELO_RAW]);
  const [lemon] = parseWalletCatalog([LEMON_RAW]);

  const polygonUsdt = {
    wallet_address: '0xAbc',
    network: 'polygon',
    crypto_asset: 'USDT',
    crypto_amount: '1.0',
  };

  it('always returns true for apps that do not use transfer placeholders', () => {
    expect(isAppSupportedForTransfer(belo!, undefined)).toBe(true);
    expect(isAppSupportedForTransfer(belo!, polygonUsdt)).toBe(true);
  });

  it('returns false when no transfer is provided for a transfer-required app', () => {
    expect(isAppSupportedForTransfer(lemon!, undefined)).toBe(false);
  });

  it('returns true for a supported polygon:USDT transfer', () => {
    expect(isAppSupportedForTransfer(lemon!, polygonUsdt)).toBe(true);
  });

  it('returns true for a supported polygon:USDC transfer', () => {
    expect(isAppSupportedForTransfer(lemon!, { ...polygonUsdt, crypto_asset: 'USDC' })).toBe(true);
  });

  it('returns false for an unsupported asset on polygon', () => {
    expect(isAppSupportedForTransfer(lemon!, { ...polygonUsdt, crypto_asset: 'wARS' })).toBe(false);
  });

  it('returns false for an unsupported network', () => {
    expect(isAppSupportedForTransfer(lemon!, { ...polygonUsdt, network: 'base' })).toBe(false);
  });

  it('returns false when supported_transfers is an empty array', () => {
    const [noCombo] = parseWalletCatalog([{ ...LEMON_RAW, supported_transfers: [] }]);
    expect(isAppSupportedForTransfer(noCombo!, polygonUsdt)).toBe(false);
  });
});
