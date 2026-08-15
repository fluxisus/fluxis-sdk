import { QRCodeSVG } from 'qrcode.react';
import type { CSSProperties } from 'react';

const DEFAULT_SIZE = 220;
const LOGO_SIZE_RATIO = 0.214;
const DEFAULT_FG_COLOR = '#19323a';
const DEFAULT_BG_COLOR = '#ffffff';

export interface DeeplinkQrCodeProps {
  value: string;
  size?: number;
  logo?: string;
  logoSize?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
  style?: CSSProperties;
}

/** QR for an arbitrary URL (DEFI wallet deeplinks). Does not validate NASPIP. */
export function DeeplinkQrCode({
  value,
  size = DEFAULT_SIZE,
  logo,
  logoSize,
  fgColor = DEFAULT_FG_COLOR,
  bgColor = DEFAULT_BG_COLOR,
  className,
  style,
}: DeeplinkQrCodeProps) {
  const resolvedLogoSize = logoSize ?? Math.round(size * LOGO_SIZE_RATIO);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        backgroundColor: bgColor,
        borderRadius: 'var(--fluxis-radius, 0.75rem)',
        padding: '0.5rem',
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          fgColor={fgColor}
          bgColor={bgColor}
          style={{ display: 'block' }}
        />
        {logo ? (
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
              borderRadius: '0.375rem',
              background: bgColor,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
