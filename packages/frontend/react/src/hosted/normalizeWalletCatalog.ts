import type { CompatibleApp } from '../types.js';
import type { WalletCatalogApp, WalletCatalogAppRaw, WalletKind } from './types.js';

const WALLET_KINDS = new Set<WalletKind>(['CEFI', 'DEFI']);

export function isWalletKind(value: unknown): value is WalletKind {
  return value === 'CEFI' || value === 'DEFI';
}

export function normalizeWalletCatalogApp(raw: WalletCatalogAppRaw): WalletCatalogApp | null {
  if (!raw?.name || !isWalletKind(raw.type) || !raw.deep_link) return null;

  return {
    name: raw.name,
    displayName: raw.display_name,
    imageUrl: raw.image_url,
    websiteUrl: raw.website_url,
    appStoreUrl: raw.app_store_url,
    googlePlayUrl: raw.google_play_url,
    deepLink: raw.deep_link,
    type: raw.type,
  };
}

export function parseWalletCatalog(raw: unknown): WalletCatalogApp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeWalletCatalogApp(entry as WalletCatalogAppRaw))
    .filter((app): app is WalletCatalogApp => app !== null);
}

export function splitWalletCatalog(apps: WalletCatalogApp[]): {
  cefi: WalletCatalogApp[];
  defi: WalletCatalogApp[];
} {
  return {
    cefi: apps.filter((app) => app.type === 'CEFI'),
    defi: apps.filter((app) => app.type === 'DEFI'),
  };
}

/** Shape expected by existing CompatibleAppsStack / PayWithAppButton. */
export function toCompatibleApp(app: WalletCatalogApp): CompatibleApp {
  return {
    name: app.name,
    displayName: app.displayName,
    imageUrl: app.imageUrl,
    websiteUrl: app.websiteUrl,
    appStoreUrl: app.appStoreUrl,
    googlePlayUrl: app.googlePlayUrl,
    deepLink: app.deepLink,
  };
}

export { WALLET_KINDS };
