// Components
export { FluxisQrCode } from './components/FluxisQrCode.js';
export { CompatibleApps } from './components/CompatibleApps.js';
export { CompatibleAppsMarquee } from './components/CompatibleAppsMarquee.js';
export { PayWithAppButton } from './components/PayWithAppButton.js';
export { FluxisProvider } from './theme/FluxisProvider.js';

// Hooks
export { useFluxisTheme } from './theme/useFluxisTheme.js';
export {
  useCompatibleApps,
  clearCompatibleAppsCache,
  getBundledCompatibleApps,
} from './hooks/useCompatibleApps.js';
export { useIsMobile } from './hooks/useIsMobile.js';
export { usePaymentStatus } from './hooks/usePaymentStatus.js';

// Theme
export { defaultTheme, mergeTheme, themeToCssVariables } from './theme/theme.js';

// Utils
export { isValidNaspipToken, buildDeepLink } from './utils/naspip.js';
export {
  DEFAULT_FLUXIS_LOGO,
  FLUXIS_LOGO_SVG,
  QR_EXCAVATION_MASK,
} from './utils/logo.js';
export {
  NASPIP_TOKEN_PREFIX,
  COMPATIBLE_APPS_URL,
} from './utils/constants.js';
export { svgToDataUri } from './utils/svgToDataUri.js';
export { normalizeCompatibleApp, filterCompatibleApps } from './utils/compatibleApps.js';

// Types
export type {
  CompatibleApp,
  CompatibleAppRaw,
  FluxisTheme,
  PartialFluxisTheme,
  FluxisProviderProps,
  FluxisQrCodeProps,
  PayWithAppButtonProps,
  CompatibleAppsProps,
  CompatibleAppsMarqueeProps,
  CompatibleAppsRemoteOptions,
  QrErrorCorrectionLevel,
} from './types.js';
export type {
  UsePaymentStatusOptions,
  UsePaymentStatusResult,
} from './hooks/usePaymentStatus.js';
