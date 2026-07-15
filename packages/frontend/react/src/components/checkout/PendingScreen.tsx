import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CheckoutSession } from '../../types.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { FluxisQrCode } from '../FluxisQrCode.js';
import { CompatibleApps } from '../CompatibleApps.js';
import { CompatibleAppsStack } from '../CompatibleAppsStack.js';
import { formatFiatAmount } from '../../utils/checkoutFormat.js';
import { CountdownTimer } from '../CountdownTimer.js';
import { PaymentStatusBadge } from '../PaymentStatusBadge.js';
import { InfoIcon } from './icons.js';
import { ManualTransferSection } from './ManualTransferSection.js';

interface DetailRowProps {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  muted?: boolean;
}

function DetailRow({ label, value, bold, mono, muted }: DetailRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0.625rem 0',
        gap: '1rem',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: bold ? 600 : 400,
          color: muted
            ? 'var(--fluxis-color-muted, #64748b)'
            : 'var(--fluxis-color-fg, #0f172a)',
          fontFamily: mono ? 'monospace' : 'inherit',
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          maxWidth: '60%',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const divider: CSSProperties = {
  height: '1px',
  background: 'var(--fluxis-color-border, #e2e8f0)',
  margin: '0 1.5rem',
};

interface PendingScreenProps {
  session: CheckoutSession;
  className?: string;
  style?: CSSProperties;
}

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

export function PendingScreen({ session, className, style }: PendingScreenProps) {
  const isMobile = useIsMobile();
  const [expired, setExpired] = useState(false);

  return (
    <div
      className={className}
      style={{
        background: 'var(--fluxis-color-bg, #ffffff)',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: 'var(--fluxis-radius, 0.75rem)',
        fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
        color: 'var(--fluxis-color-fg, #0f172a)',
        boxSizing: 'border-box',
        position: 'relative',
        ...style,
      }}
    >
      {!session.recipient_address ? (
        /* Vault not yet assigned — spinner while shopper selects an asset */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem 1.5rem',
          }}
        >
          <style>{SPIN_KEYFRAMES}</style>
          <div
            role="status"
            aria-label="Preparando pago"
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              border: '3px solid var(--fluxis-color-border, #e2e8f0)',
              borderTopColor: 'var(--fluxis-color-primary, #2563eb)',
              animation: 'fluxis-checkout-spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--fluxis-color-muted, #64748b)',
              textAlign: 'center',
            }}
          >
            Preparando tu pago…
          </p>
        </div>
      ) : isMobile ? (
        /* Mobile: deep-link buttons to open the NASPIP token in a compatible wallet */
        <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
          <p
            style={{
              margin: '0 0 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--fluxis-color-fg, #0f172a)',
              textAlign: 'center',
            }}
          >
            Elegí tu wallet para pagar
          </p>
          <CompatibleApps token={session.recipient_address} />
        </div>
      ) : (
        /* Desktop: NASPIP QR + partner marquee */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.5rem 1.5rem 1rem',
          }}
        >
          <div
            style={{
              border: '1px solid var(--fluxis-color-border, #e2e8f0)',
              borderRadius: '0.75rem',
              padding: '0.875rem',
              background: 'var(--fluxis-color-bg, #ffffff)',
              display: 'inline-flex',
            }}
          >
            <FluxisQrCode token={session.recipient_address} size={220} />
          </div>
          <p
            style={{
              margin: '0.875rem 0 0.75rem',
              fontSize: '0.875rem',
              color: 'var(--fluxis-color-muted, #64748b)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Escaneá con tu wallet compatible con Fluxis
            <InfoIcon />
          </p>
          <CompatibleAppsStack style={{ marginTop: '0.25rem' }} />
        </div>
      )}

      <div style={divider} />

      {/* Detail rows */}
      <div style={{ padding: '0.25rem 1.5rem' }}>
        <DetailRow
          label="Monto"
          value={formatFiatAmount(session.amount, session.currency)}
          bold
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '0.625rem 0',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)', flexShrink: 0 }}>
            Expira en
          </span>
          <CountdownTimer expiresAt={session.expires_at} onExpire={() => setExpired(true)} />
        </div>
        <DetailRow label="Referencia" value={session.id} mono muted />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.625rem 0',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)', flexShrink: 0 }}>
            Estado
          </span>
          <PaymentStatusBadge status={session.status} />
        </div>
      </div>

      {/* Manual transfer accordion (only when decoded payment data is available) */}
      {session.manual_transfer && (
        <>
          <div style={divider} />
          <div style={{ padding: '0.75rem 1rem 0' }}>
            <ManualTransferSection data={{
              ...session.manual_transfer,
              reference_amount: session.amount,
              reference_currency: session.currency,
            }} />
          </div>
        </>
      )}

      {/* Footer */}
      <p
        style={{
          margin: '0.75rem 0 0',
          padding: '0.875rem 1.5rem',
          borderTop: '1px solid var(--fluxis-color-border, #e2e8f0)',
          fontSize: '0.8125rem',
          color: 'var(--fluxis-color-muted, #64748b)',
          textAlign: 'center',
        }}
      >
        Esta pantalla se actualiza automáticamente al cambiar el estado del pago.
      </p>

      {expired && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--fluxis-color-fg, #0f172a)' }}>
            Este pago ha expirado
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)' }}>
            Actualizando…
          </p>
        </div>
      )}
    </div>
  );
}
