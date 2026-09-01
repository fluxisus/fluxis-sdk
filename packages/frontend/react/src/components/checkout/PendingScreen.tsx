import { useState, useEffect } from 'react';
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
import { ManualTransferContent } from './ManualTransferContent.js';
import { AssetSelectionScreen } from './AssetSelectionScreen.js';
import { EXPIRED_OVERLAY_FALLBACK_MS } from '../../utils/checkoutExpiry.js';

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
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  /** Called when the expiry overlay outlasts polling — parent should show ExpiredScreen. */
  onExpiredTimeout?: () => void;
  className?: string;
  style?: CSSProperties;
}

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

export function PendingScreen({
  session,
  onSelectAsset,
  onExpiredTimeout,
  className,
  style,
}: PendingScreenProps) {
  const isMobile = useIsMobile();
  const [expired, setExpired] = useState(false);
  const [isChangingAsset, setIsChangingAsset] = useState(false);

  useEffect(() => {
    if (!expired || !onExpiredTimeout) return;
    const id = setTimeout(onExpiredTimeout, EXPIRED_OVERLAY_FALLBACK_MS);
    return () => clearTimeout(id);
  }, [expired, onExpiredTimeout]);

  async function handleSelectAsset(assetId: string) {
    if (!onSelectAsset) return;
    await onSelectAsset(assetId);
    setIsChangingAsset(false);
  }

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
            <FluxisQrCode token={session.recipient_address} size={220} level='L' />
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

      {/* Manual transfer accordion — shows the resolved transfer details once an asset is
          picked, or the asset picker itself first (or again, if the shopper wants to change
          a previous selection via ManualTransferContent's "Cambiar" affordance). */}
      {session.manual_transfer && !isChangingAsset ? (
        <>
          <div style={divider} />
          <div style={{ padding: '0.75rem 1rem' }}>
            <ManualTransferSection activeStep={1}>
              <ManualTransferContent
                data={{
                  ...session.manual_transfer,
                  reference_amount: session.amount,
                  reference_currency: session.currency,
                }}
                // Offered only when there is something else to switch to. Any array is truthy, so
                // testing the array alone showed "Cambiar" for a single-option session, leading to
                // a picker containing just the asset already selected.
                onChangeAsset={
                  (session.payment_options?.length ?? 0) > 1
                    ? () => setIsChangingAsset(true)
                    : undefined
                }
              />
            </ManualTransferSection>
          </div>
        </>
      ) : session.status === 'selecting_asset' || (session.manual_transfer && isChangingAsset) ? (
        <>
          <div style={divider} />
          <div style={{ padding: '0.75rem 1rem' }}>
            <ManualTransferSection activeStep={-1}>
              <AssetSelectionScreen session={session} onSelectAsset={handleSelectAsset} />
            </ManualTransferSection>
          </div>
        </>
      ) : null}

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
