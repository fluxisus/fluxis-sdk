import type { CSSProperties } from 'react';
import type { FluxisTheme, PartialFluxisTheme } from '../types.js';

export const defaultTheme: FluxisTheme = {
  colorBg: '#ffffff',
  colorFg: '#0f172a',
  colorPrimary: '#2563eb',
  colorBorder: '#e2e8f0',
  colorMuted: '#64748b',
  radius: '0.75rem',
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  qrFg: '#19323a',
  qrBg: '#ffffff',
  buttonBg: '#ffffff',
  buttonFg: '#0f172a',
  buttonHoverBg: '#f8fafc',
};

export function mergeTheme(theme?: PartialFluxisTheme): FluxisTheme {
  return {
    ...defaultTheme,
    ...theme,
  };
}

const themeToCssVarMap: Record<keyof FluxisTheme, string> = {
  colorBg: '--fluxis-color-bg',
  colorFg: '--fluxis-color-fg',
  colorPrimary: '--fluxis-color-primary',
  colorBorder: '--fluxis-color-border',
  colorMuted: '--fluxis-color-muted',
  radius: '--fluxis-radius',
  fontFamily: '--fluxis-font-family',
  qrFg: '--fluxis-qr-fg',
  qrBg: '--fluxis-qr-bg',
  buttonBg: '--fluxis-button-bg',
  buttonFg: '--fluxis-button-fg',
  buttonHoverBg: '--fluxis-button-hover-bg',
};

export function themeToCssVariables(theme: FluxisTheme): CSSProperties {
  const vars: Record<string, string> = {};

  for (const key of Object.keys(themeToCssVarMap) as Array<keyof FluxisTheme>) {
    vars[themeToCssVarMap[key]] = theme[key];
  }

  return vars as CSSProperties;
}

export function getCssVar(
  name: string,
  fallback: string,
  element?: HTMLElement | null,
): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const target = element ?? document.documentElement;
  const value = getComputedStyle(target).getPropertyValue(name).trim();
  return value || fallback;
}
