import fluxisLogoTrazoBlanco from '../assets/fluxis-logo-trazo-blanco.svg';
import { svgToDataUri } from './svgToDataUri.js';

/** Raw SVG string for consumers that want to render or host the logo themselves. */
export const FLUXIS_LOGO_SVG = fluxisLogoTrazoBlanco;

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
