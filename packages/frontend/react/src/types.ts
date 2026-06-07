import type { CSSProperties, ReactNode } from 'react';

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
