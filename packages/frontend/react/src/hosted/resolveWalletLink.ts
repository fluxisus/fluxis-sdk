const NASPIP_PLACEHOLDER = '[NASPIP_TOKEN]';
const CHECKOUT_URL_PLACEHOLDER = '[CHECKOUT_URL]';
const CHECKOUT_HOST_PATH_PLACEHOLDER = '[CHECKOUT_HOST_PATH]';

/** Placeholders filled from session.manual_transfer. */
const ADDRESS_PLACEHOLDER = '[ADDRESS]';
const NETWORK_PLACEHOLDER = '[NETWORK]';
const ASSET_PLACEHOLDER = '[ASSET]';
const AMOUNT_PLACEHOLDER = '[AMOUNT]';

/** Regexp that matches any transfer-field placeholder. */
const TRANSFER_PLACEHOLDER_RE = /\[(ADDRESS|NETWORK|ASSET|AMOUNT)\]/;

export function checkoutHostPath(checkoutUrl: string): string {
  return checkoutUrl.replace(/^https?:\/\//i, '');
}

/** True when the template contains any session-field placeholders. */
export function hasTransferPlaceholders(template: string): boolean {
  return TRANSFER_PLACEHOLDER_RE.test(template);
}

/**
 * Session-level transfer context extracted from `manual_transfer`.
 * `networkMap` is the wallet's own network-name translation table (from the catalog entry).
 */
export interface TransferParams {
  /** `manual_transfer.wallet_address` — the deposit address. */
  address: string;
  /**
   * `manual_transfer.network` after applying `networkMap`.
   * Pass the raw network name; `resolveWalletLink` applies the mapping automatically.
   */
  network: string;
  /** `manual_transfer.crypto_asset`. */
  asset: string;
  /**
   * `manual_transfer.crypto_amount` with any comma thousands separators stripped.
   * Dot-decimal; `resolveWalletLink` does not reformat.
   */
  amount: string;
  /**
   * Per-wallet network-name mapping, taken from `WalletCatalogApp.networkMap`.
   * Example: `{ polygon: 'POLYGON' }`.
   */
  networkMap?: Record<string, string>;
}

/**
 * Fills CDN deep_link templates. Placeholders in the JSON must be left unencoded;
 * this function applies encodeURIComponent where the wallet's URL scheme needs it.
 *
 * Legacy placeholders (all wallets in the existing catalog):
 *   [NASPIP_TOKEN]        encodeURIComponent(session.recipient_address)
 *   [CHECKOUT_URL]        encodeURIComponent(checkoutUrl)
 *   [CHECKOUT_HOST_PATH]  checkoutUrl without the https:// prefix (MetaMask dapp/ links)
 *
 * Session-field placeholders (wallets like Lemon that need individual transfer params):
 *   [ADDRESS]   encodeURIComponent(manual_transfer.wallet_address)
 *   [NETWORK]   encodeURIComponent(networkMap[manual_transfer.network] ?? manual_transfer.network)
 *   [ASSET]     encodeURIComponent(manual_transfer.crypto_asset)
 *   [AMOUNT]    encodeURIComponent(manual_transfer.crypto_amount, commas stripped)
 */
export function resolveWalletLink(
  template: string,
  {
    naspipToken,
    checkoutUrl,
    transfer,
  }: {
    naspipToken?: string;
    checkoutUrl?: string;
    transfer?: TransferParams;
  },
): string {
  let resolved = template;

  if (naspipToken) {
    resolved = resolved.split(NASPIP_PLACEHOLDER).join(encodeURIComponent(naspipToken));
  }

  if (checkoutUrl) {
    resolved = resolved
      .split(CHECKOUT_URL_PLACEHOLDER)
      .join(encodeURIComponent(checkoutUrl));
    resolved = resolved
      .split(CHECKOUT_HOST_PATH_PLACEHOLDER)
      .join(checkoutHostPath(checkoutUrl));
  }

  if (transfer) {
    const mappedNetwork = transfer.networkMap?.[transfer.network] ?? transfer.network;
    // Strip comma thousands separators; keep dot decimal.
    const amount = transfer.amount.replace(/,/g, '');

    resolved = resolved.split(ADDRESS_PLACEHOLDER).join(encodeURIComponent(transfer.address));
    resolved = resolved.split(NETWORK_PLACEHOLDER).join(encodeURIComponent(mappedNetwork));
    resolved = resolved.split(ASSET_PLACEHOLDER).join(encodeURIComponent(transfer.asset));
    resolved = resolved.split(AMOUNT_PLACEHOLDER).join(encodeURIComponent(amount));
  }

  return resolved;
}
