import type { CompatibleApp, ManualTransferData } from '../types.js';
import type { WalletCatalogApp, WalletCatalogAppRaw, WalletKind } from './types.js';
import { hasTransferPlaceholders } from './resolveWalletLink.js';

const WALLET_KINDS = new Set<WalletKind>(['CEFI', 'DEFI']);

export function isWalletKind(value: unknown): value is WalletKind {
  return value === 'CEFI' || value === 'DEFI';
}

export function normalizeWalletCatalogApp(raw: WalletCatalogAppRaw): WalletCatalogApp | null {
  if (!raw?.name || !isWalletKind(raw.type) || !raw.deep_link) return null;

  const app: WalletCatalogApp = {
    name: raw.name,
    displayName: raw.display_name,
    imageUrl: raw.image_url,
    websiteUrl: raw.website_url,
    appStoreUrl: raw.app_store_url,
    googlePlayUrl: raw.google_play_url,
    deepLink: raw.deep_link,
    type: raw.type,
  };

  if (raw.network_map && typeof raw.network_map === 'object') {
    app.networkMap = raw.network_map;
  }
  if (Array.isArray(raw.supported_transfers)) {
    app.supportedTransfers = raw.supported_transfers;
  }

  return app;
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

/**
 * Returns `true` when this catalog entry requires a `manual_transfer` to build its deeplink.
 * Entries that only use `[NASPIP_TOKEN]`, `[CHECKOUT_URL]`, or `[CHECKOUT_HOST_PATH]` are
 * always shown and return `false`.
 */
export function isTransferRequired(app: WalletCatalogApp): boolean {
  return hasTransferPlaceholders(app.deepLink);
}

/**
 * Returns `true` when `app` should be shown for the current session state.
 *
 * Rules:
 * - Apps that do NOT use transfer placeholders are always shown.
 * - Apps that DO use transfer placeholders are hidden when:
 *     a) no `manual_transfer` is present (session hasn't resolved an asset yet), or
 *     b) `supported_transfers` is declared and the session's `network:asset` is not listed.
 */
export function isAppSupportedForTransfer(
  app: WalletCatalogApp,
  transfer: ManualTransferData | undefined,
): boolean {
  if (!isTransferRequired(app)) return true;
  if (!transfer) return false;
  if (!app.supportedTransfers || app.supportedTransfers.length === 0) return false;
  const key = `${transfer.network}:${transfer.crypto_asset}`;
  return app.supportedTransfers.includes(key);
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
