import type { CSSProperties } from 'react';
import type { CheckoutWidgetProps } from '../types.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { FluxisQrCode } from './FluxisQrCode.js';
import { CompatibleApps } from './CompatibleApps.js';
import { AmountDisplay } from './AmountDisplay.js';
import { CountdownTimer } from './CountdownTimer.js';
import { AddressCopyButton } from './AddressCopyButton.js';

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

const baseContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1.5rem',
  padding: '2rem',
  background: 'var(--fluxis-color-bg, #ffffff)',
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  borderRadius: 'var(--fluxis-radius, 0.75rem)',
  fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
  color: 'var(--fluxis-color-fg, #0f172a)',
  boxSizing: 'border-box',
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: 'var(--fluxis-color-muted, #64748b)',
  textAlign: 'center',
  fontSize: '0.875rem',
};

export function CheckoutWidget({ session, className, style }: CheckoutWidgetProps) {
  const isMobile = useIsMobile();
  const containerStyle: CSSProperties = { ...baseContainerStyle, ...style };

  if (session.status === 'confirming') {
    return (
      <div className={className} style={containerStyle}>
        <style>{SPIN_KEYFRAMES}</style>
        <div
          role="status"
          aria-label="Confirming payment"
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            border: '3px solid var(--fluxis-color-border, #e2e8f0)',
            borderTopColor: 'var(--fluxis-color-primary, #2563eb)',
            animation: 'fluxis-checkout-spin 0.8s linear infinite',
          }}
        />
        <p style={mutedTextStyle}>Payment detected, confirming on-chain…</p>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className={className} style={containerStyle}>
        <div
          aria-hidden="true"
          style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            background: 'rgba(22, 163, 74, 0.1)',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
          }}
        >
          ✓
        </div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>Payment complete!</p>
        <a
          href={session.return_url}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            background: 'var(--fluxis-color-primary, #2563eb)',
            color: '#ffffff',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Return to merchant
        </a>
      </div>
    );
  }

  if (session.status === 'expired') {
    return (
      <div className={className} style={containerStyle}>
        <div
          aria-hidden="true"
          style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            background: 'rgba(100, 116, 139, 0.1)',
            color: 'var(--fluxis-color-muted, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
          }}
        >
          ⏱
        </div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>Payment expired</p>
        <p style={mutedTextStyle}>This payment request has expired.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: '1px solid var(--fluxis-color-border, #e2e8f0)',
            color: 'var(--fluxis-color-fg, #0f172a)',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Start over
        </button>
      </div>
    );
  }

  // pending — desktop: QR + app buttons (no embedded QR from CompatibleApps)
  //            mobile: app deep-link buttons only
  return (
    <div className={className} style={containerStyle}>
      <AmountDisplay amount={session.amount} currency={session.currency} />
      <CountdownTimer expiresAt={session.expires_at} />
      {isMobile ? (
        <CompatibleApps token={session.recipient_address} />
      ) : (
        <>
          <FluxisQrCode token={session.recipient_address} />
          <CompatibleApps token={session.recipient_address} forcePlatform="mobile" />
        </>
      )}
      <AddressCopyButton address={session.recipient_address} />
    </div>
  );
}
