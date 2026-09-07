import fluxisLogo from '../assets/fluxis-logo.svg';
import fluxisLogoTrazoBlanco from '../assets/fluxis-logo-trazo-blanco.svg';
import { svgToDataUri } from './svgToDataUri.js';

/** Raw SVG string for consumers that want to render or host the logo themselves. */
export const FLUXIS_LOGO_SVG = fluxisLogoTrazoBlanco;

/** Square Fluxis mark for list rows (not the QR overlay). */
export const FLUXIS_MARK_LOGO = svgToDataUri(fluxisLogo);

/**
 * Default Fluxis logo as a data URI.
 * Rendered as an absolutely positioned image above the QR code.
 */
export const DEFAULT_FLUXIS_LOGO = svgToDataUri(fluxisLogoTrazoBlanco);

/**
 * White square used by qrcode.react only to clear modules behind the overlaid logo.
 * The actual Fluxis logo remains a normal image above the QR SVG.
 */
export const QR_EXCAVATION_MASK = svgToDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/></svg>',
);

/**
 * Fallback WalletConnect mark for the "Otras wallets" QR overlay when the host doesn't supply its
 * own `walletConnectLogoUrl` — same blue badge/"WC" text already used as `OtherWalletsIcon`'s
 * fallback in the desktop wallet list, just as a data URI so it can be passed as a QR logo.
 */
export const DEFAULT_WALLETCONNECT_LOGO = svgToDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#3B99FC"/><text x="16" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#ffffff">WC</text></svg>',
);
