import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { FluxisQrCodeProps } from '../types.js';
import { useFluxisTheme } from '../theme/useFluxisTheme.js';
import { DEFAULT_FLUXIS_LOGO } from '../utils/logo.js';
import { isValidNaspipToken } from '../utils/naspip.js';

const DEFAULT_SIZE = 280;
const LOGO_SIZE_RATIO = 0.214;
const DEFAULT_FG_COLOR = '#19323a';
const DEFAULT_BG_COLOR = '#ffffff';

export function FluxisQrCode({
  token,
  size = DEFAULT_SIZE,
  level = 'M',
  logo = DEFAULT_FLUXIS_LOGO,
  logoSize,
  fgColor,
  bgColor,
  marginSize = 0,
  className,
  style,
  onInvalidToken,
}: FluxisQrCodeProps) {
  const theme = useFluxisTheme();
  const resolvedLogoSize = logoSize ?? Math.round(size * LOGO_SIZE_RATIO);
  const resolvedFgColor = fgColor ?? theme.qrFg ?? DEFAULT_FG_COLOR;
  const resolvedBgColor = bgColor ?? theme.qrBg ?? DEFAULT_BG_COLOR;

  useEffect(() => {
    if (!isValidNaspipToken(token)) {
      onInvalidToken?.(token);
    }
  }, [token, onInvalidToken]);

  if (!isValidNaspipToken(token)) {
    return (
      <div
        className={className}
        role="alert"
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: resolvedBgColor,
          color: resolvedFgColor,
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderRadius: 'var(--fluxis-radius, 0.75rem)',
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          ...style,
        }}
      >
        Invalid NASPIP token
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        backgroundColor: resolvedBgColor,
        borderRadius: 'var(--fluxis-radius, 0.75rem)',
        padding: '0.5rem',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        <QRCodeSVG
          value={token}
          size={size}
          level={level}
          marginSize={marginSize}
          fgColor={resolvedFgColor}
          bgColor={resolvedBgColor}
          style={{ display: 'block' }}
        />
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          width={resolvedLogoSize}
          height={resolvedLogoSize}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: resolvedLogoSize,
            height: resolvedLogoSize,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
