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
