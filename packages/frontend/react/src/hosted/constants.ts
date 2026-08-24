/**
 * Wallet catalog (CEFI / DEFI) lives on the CDN, not in this package.
 *
 * Staging: https://assets.fluxis.us/sdk-assets/compatible-apps-stg.json
 * Production: https://assets.fluxis.us/sdk-assets/compatible-apps.json
 *
 * Each entry has `type: "CEFI" | "DEFI"` and a `deep_link` template. The SDK only
 * substitutes these placeholders (leave them unencoded in the JSON):
 *
 *   [NASPIP_TOKEN]        encodeURIComponent(session.recipient_address)
 *   [CHECKOUT_URL]        encodeURIComponent(checkoutUrl)
 *   [CHECKOUT_HOST_PATH]  checkoutUrl without the https:// prefix (MetaMask dapp/ links)
 *
 * The catalog origin must send Access-Control-Allow-Origin for the hosted checkout
 * origins (localhost:5173, checkout.stgfluxis.us, checkout.fluxis.us).
 */
export const WALLET_CATALOG_URL =
  'https://assets.fluxis.us/sdk-assets/compatible-apps.json';

export const WALLET_CATALOG_STG_URL =
  'https://assets.fluxis.us/sdk-assets/compatible-apps-stg.json';

/** Payable tokens + networks. Deduped by token_symbol in the hosted manual-transfer flow. */
export const UNIQUE_ASSET_IDS_URL = 'https://assets.fluxis.us/unique_asset_ids.json';
