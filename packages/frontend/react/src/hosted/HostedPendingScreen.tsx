import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CheckoutSession, ConnectedWalletInfo } from '../types.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { CountdownTimer } from '../components/CountdownTimer.js';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge.js';
import { ManualTransferSection } from '../components/checkout/ManualTransferSection.js';
import { EXPIRED_OVERLAY_FALLBACK_MS } from '../utils/checkoutExpiry.js';
import { useWalletCatalog } from './useWalletCatalog.js';
import { DefiWalletPanel } from './DefiWalletPanel.js';
import { ManualPaymentFlow } from './ManualPaymentFlow.js';
import type { ConnectedWalletBalance } from './types.js';

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
        padding: '0.3rem 0',
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

const hairline: CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--fluxis-color-border, #e2e8f0)',
};

function OrDivider() {
  return (
    <div
      data-testid="section-or-divider"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        margin: '0 1.5rem',
      }}
    >
      <span style={hairline} />
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--fluxis-color-muted, #64748b)',
          lineHeight: 1,
        }}
      >
        o
      </span>
      <span style={hairline} />
    </div>
  );
}

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

interface HostedPendingScreenProps {
  session: CheckoutSession;
  checkoutUrl: string;
  appsUrl?: string;
  uniqueAssetsUrl?: string;
  walletConnectUri?: string;
  walletConnectLogoUrl?: string;
  installedWalletNames?: string[];
  onSelectWalletConnect?: () => void;
  onPrepareWalletConnect?: () => void;
  onLaunchExtension?: (walletName: string) => void;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  onPayWithWallet?: () => void | Promise<void>;
  isPayingWithWallet?: boolean;
  payWithWalletError?: string;
  lastTxHash?: string;
  connectedWallet?: ConnectedWalletInfo;
  onDisconnectWallet?: () => void;
  /** The connected wallet's balances, already resolved and sorted by the host. */
  walletBalances?: ConnectedWalletBalance[];
  isLoadingWalletBalances?: boolean;
  onExpiredTimeout?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function HostedPendingScreen({
  session,
  checkoutUrl,
  appsUrl,
  uniqueAssetsUrl,
  walletConnectUri,
  walletConnectLogoUrl,
  installedWalletNames,
  onSelectWalletConnect,
  onPrepareWalletConnect,
  onLaunchExtension,
  onSelectAsset,
  onPayWithWallet,
  isPayingWithWallet,
  payWithWalletError,
  lastTxHash,
  connectedWallet,
  onDisconnectWallet,
  walletBalances,
  isLoadingWalletBalances,
  onExpiredTimeout,
  className,
  style,
}: HostedPendingScreenProps) {
  const isMobile = useIsMobile();
  const [expired, setExpired] = useState(false);
  const { cefi, defi, loading, error } = useWalletCatalog({ appsUrl });

  useEffect(() => {
    if (!expired || !onExpiredTimeout) return;
    const id = setTimeout(onExpiredTimeout, EXPIRED_OVERLAY_FALLBACK_MS);
    return () => clearTimeout(id);
  }, [expired, onExpiredTimeout]);

  useEffect(() => {
    if (session.recipient_address) onPrepareWalletConnect?.();
  }, [session.recipient_address, onPrepareWalletConnect]);

  const showManualFlow = !connectedWallet?.address &&
    (Boolean(session.manual_transfer) ||
    session.status === 'selecting_asset' ||
    (session.payment_options?.length ?? 0) > 0) ;

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
      <div style={{ ...divider, marginTop: '1rem' }} />

      <div style={{ padding: '0.25rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '0.3rem 0',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)', flexShrink: 0 }}>
            Expira en
          </span>
          <CountdownTimer
            expiresAt={session.expires_at}
            onExpire={() => setExpired(true)}
            style={{ fontSize: '0.875rem' }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.3rem 0',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)', flexShrink: 0 }}>
            Estado
          </span>
          <PaymentStatusBadge status={session.status} />
        </div>
        {session.external_id ? (
          <DetailRow label="Referencia" value={session.external_id} mono muted />
        ) : null}
        <DetailRow label="Identificador" value={session.id} mono muted />
      </div>

      <div style={divider} />

      {!session.recipient_address ? (
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
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.5rem 1.5rem 1rem',
            gap: '1rem',
          }}
        >
          {loading ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)' }}>
              Cargando wallets…
            </p>
          ) : error && cefi.length === 0 && defi.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--fluxis-color-muted, #64748b)' }}>
              No pudimos cargar las wallets. {error.message}
            </p>
          ) : (
            <DefiWalletPanel
              apps={defi}
              cefiApps={cefi}
              naspipToken={session.recipient_address}
              checkoutUrl={checkoutUrl}
              isMobile={isMobile}
              walletConnectUri={walletConnectUri}
              walletConnectLogoUrl={walletConnectLogoUrl}
              installedWalletNames={installedWalletNames}
              onSelectWalletConnect={onSelectWalletConnect}
              onLaunchExtension={onLaunchExtension}
              connectedWallet={connectedWallet}
              onDisconnectWallet={onDisconnectWallet}
              paymentOptions={session.payment_options}
              assetsUrl={uniqueAssetsUrl}
              walletBalances={walletBalances}
              isLoadingWalletBalances={isLoadingWalletBalances}
              manualTransfer={session.manual_transfer}
              onSelectAsset={onSelectAsset}
              onPayWithWallet={onPayWithWallet}
              isPayingWithWallet={isPayingWithWallet}
              payWithWalletError={payWithWalletError}
              lastTxHash={lastTxHash}
            />
          )}
        </div>
      )}

      {showManualFlow ? (
        <>
          <OrDivider />
          <div style={{ padding: '0.75rem 1rem 1.5rem' }}>
            <ManualTransferSection activeStep={session.manual_transfer ? 2 : 0} hideStepper>
              <ManualPaymentFlow
                session={session}
                isMobile={isMobile}
                assetsUrl={uniqueAssetsUrl}
                onSelectAsset={onSelectAsset}
              />
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
