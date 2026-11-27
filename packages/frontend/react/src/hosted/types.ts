import type { CheckoutWidgetProps } from '../types.js';

export type WalletKind = 'CEFI' | 'DEFI';

export interface WalletCatalogAppRaw {
  name: string;
  display_name: string;
  image_url: string;
  website_url: string;
  app_store_url: string | null;
  google_play_url: string | null;
  deep_link: string;
  type: WalletKind;
  /**
   * Maps session network names to the wallet's own network identifiers.
   * Required when `deep_link` contains `[NETWORK]`.
   * Example: `{ "polygon": "POLYGON" }` for Lemon.me.
   */
  network_map?: Record<string, string>;
  /**
   * Session `network:asset` combinations this wallet supports.
   * When present, the entry is hidden unless the session's `manual_transfer`
   * matches one of the listed combos. Required when `deep_link` contains any
   * of `[ADDRESS]`, `[NETWORK]`, `[ASSET]`, or `[AMOUNT]`.
   */
  supported_transfers?: string[];
}

export interface WalletCatalogApp {
  name: string;
  displayName: string;
  imageUrl: string;
  websiteUrl: string;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  deepLink: string;
  type: WalletKind;
  /** Camel-cased `network_map` from the raw catalog entry. */
  networkMap?: Record<string, string>;
  /** Camel-cased `supported_transfers` from the raw catalog entry. */
  supportedTransfers?: string[];
}

export interface ConnectedWalletBalance {
  uniqueAssetId: string;
  /** Formatted (decimals already applied), e.g. "125.40". */
  balance: string;
}

export interface HostedCheckoutWidgetProps extends CheckoutWidgetProps {
  /** Absolute URL of this checkout page, substituted into DEFI deep_link templates. */
  checkoutUrl: string;
  /** Override the CDN catalog URL (staging vs production). */
  appsUrl?: string;
  /** Override the unique-asset catalog URL (`unique_asset_ids.json`). */
  uniqueAssetsUrl?: string;
  /** WalletConnect pairing URI encoded when the shopper picks Otras wallets. */
  walletConnectUri?: string;
  walletConnectLogoUrl?: string;
  /** Catalog `name`s (e.g. `metamask`) whose browser extension is installed. */
  installedWalletNames?: string[];
  onSelectWalletConnect?: () => void;
  /** Called when the wallet list is shown so WalletConnect can init before Otras wallets. */
  onPrepareWalletConnect?: () => void;
  onLaunchExtension?: (walletName: string) => void;
  /**
   * The connected wallet's balances for `session.payment_options`, already resolved and **sorted
   * by the host** (highest balance first) — this package never fetches balances or re-sorts them,
   * same "host computes, widget renders" rationale as `onPayWithWallet`. Used only when
   * `connectedWallet` is set: the first entry that matches a `payment_options` entry is picked
   * automatically via `onSelectAsset`, skipping the picker entirely. Omit it, or pass `[]` once
   * resolved, to fall back to letting the shopper pick from `payment_options` manually.
   */
  walletBalances?: ConnectedWalletBalance[];
  /** True while the host is still fetching `walletBalances` — shows a loading state instead of
   * either the picker or an auto-selection, since an empty array is otherwise indistinguishable
   * from "no balances at all, let the shopper choose". */
  isLoadingWalletBalances?: boolean;
}
