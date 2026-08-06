import type { CSSProperties, ReactNode } from 'react';

export interface ManualTransferData {
  wallet_address: string;
  crypto_amount: string;
  crypto_asset: string;
  network: string;
  reference_amount?: string;
  reference_currency?: string;
}

export interface CheckoutPaymentOption {
  unique_asset_id: string;
  symbol: string;
  network: string;
}

export interface CheckoutSession {
  id: string;
  amount: string;
  currency: string;
  recipient_address?: string;
  expires_at: string;
  status: 'pending' | 'selecting_asset' | 'confirming' | 'completed' | 'expired';
  /** Omitted entirely when the point of sale has no configured return URL. */
  return_url?: string;
  manual_transfer?: ManualTransferData;
  tx_hash?: string;
  receipt_link?: string;
  payment_options?: CheckoutPaymentOption[];
}

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface CompatibleApp {
  name: string;
  displayName: string;
  imageUrl: string;
  websiteUrl: string;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  deepLink: string;
}

export interface CompatibleAppRaw {
  name: string;
  display_name: string;
  image_url: string;
  website_url: string;
  app_store_url: string | null;
  google_play_url: string | null;
  deep_link: string;
}

export interface FluxisTheme {
  colorBg: string;
  colorFg: string;
  colorPrimary: string;
  colorBorder: string;
  colorMuted: string;
  radius: string;
  fontFamily: string;
  qrFg: string;
  qrBg: string;
  buttonBg: string;
  buttonFg: string;
  buttonHoverBg: string;
}

export type PartialFluxisTheme = Partial<FluxisTheme>;

export interface FluxisProviderProps {
  children: ReactNode;
  theme?: PartialFluxisTheme;
  className?: string;
  style?: CSSProperties;
}

export interface FluxisQrCodeProps {
  token: string;
  size?: number;
  level?: QrErrorCorrectionLevel;
  logo?: string;
  logoSize?: number;
  fgColor?: string;
  bgColor?: string;
  marginSize?: number;
  className?: string;
  style?: CSSProperties;
  onInvalidToken?: (token: string) => void;
}

export interface PayWithAppButtonProps {
  app: CompatibleApp;
  token: string;
  className?: string;
  style?: CSSProperties;
  onClick?: (app: CompatibleApp, deepLink: string) => void;
}

export interface CompatibleAppsProps extends CompatibleAppsRemoteOptions {
  token: string;
  include?: string[];
  exclude?: string[];
  onSelectApp?: (app: CompatibleApp, deepLink: string) => void;
  renderApp?: (app: CompatibleApp, defaultButton: ReactNode) => ReactNode;
  forcePlatform?: 'mobile' | 'desktop';
  showDesktopAppList?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface CompatibleAppsRemoteOptions {
  apps?: CompatibleApp[];
  appsUrl?: string;
  /** Attempt a remote refresh from `appsUrl`. Off by default (CDN has no CORS). */
  syncRemote?: boolean;
}

export interface CheckoutWidgetProps {
  session: CheckoutSession;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  /**
   * Starts a fresh payment attempt from the expired screen. Omit it when the caller cannot
   * recover — a session addressed by payment-request id has nothing to retry, since only the
   * merchant can create a new request — and the retry button is hidden rather than offering an
   * action that does nothing.
   */
  onRetryExpired?: () => void | Promise<void>;
  isRetryingExpired?: boolean;
  /**
   * Sends the transfer from a connected browser wallet, shown alongside the manual instructions.
   * Injected because this package makes no network or chain calls of its own, and only the host
   * knows whether a wallet is connected and on the right chain. Omit it and the checkout stays
   * manual-transfer only.
   */
  onPayWithWallet?: () => void | Promise<void>;
  isPayingWithWallet?: boolean;
  payWithWalletError?: string;
  className?: string;
  style?: CSSProperties;
}

export interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export interface AddressCopyButtonProps {
  address: string;
  className?: string;
}

export interface PaymentStatusBadgeProps {
  status: CheckoutSession['status'];
  className?: string;
}

export interface AmountDisplayProps {
  amount: string;
  currency: string;
  className?: string;
}

export interface CompatibleAppsChipsProps extends CompatibleAppsRemoteOptions {
  include?: string[];
  exclude?: string[];
  onAppClick?: (app: CompatibleApp) => void;
  className?: string;
  style?: CSSProperties;
}

export interface CompatibleAppsStackProps extends CompatibleAppsRemoteOptions {
  include?: string[];
  exclude?: string[];
  className?: string;
  style?: CSSProperties;
}

export interface CompatibleAppsMarqueeProps extends CompatibleAppsRemoteOptions {
  width?: number | string;
  height?: number;
  include?: string[];
  exclude?: string[];
  speed?: number;
  gap?: number;
  showAppName?: boolean;
  onAppClick?: (app: CompatibleApp) => void;
  className?: string;
  style?: CSSProperties;
}
