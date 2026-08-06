import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { CheckoutSession } from '../../types.js';

const AUTO_REDIRECT_SECONDS = 12;

/**
 * Offered when the merchant configured no return URL, so the shopper still has somewhere to go
 * from the completed screen. Only ever a link — never a destination the screen navigates to on
 * its own, because nobody asked to be sent here.
 */
const FLUXIS_HOME_URL = 'https://fluxis.us/';

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

const mutedText: CSSProperties = {
  margin: 0,
  color: 'var(--fluxis-color-muted, #64748b)',
  textAlign: 'center',
  fontSize: '0.875rem',
};

const buttonBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  borderRadius: 'var(--fluxis-radius, 0.75rem)',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
};

const primaryButton: CSSProperties = {
  ...buttonBase,
  background: 'var(--fluxis-color-primary, #2563eb)',
  color: '#ffffff',
};

const secondaryButton: CSSProperties = {
  ...buttonBase,
  background: 'none',
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  color: 'var(--fluxis-color-fg, #0f172a)',
};

const monospace: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.75rem',
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '0.375rem 0',
      }}
    >
      <span style={{ color: 'var(--fluxis-color-muted, #64748b)', fontSize: '0.75rem', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.8125rem', textAlign: 'right', wordBreak: 'break-all', minWidth: 0 }}>
        {children}
      </span>
    </div>
  );
}

const EXPLORER_BASE: Record<string, string> = {
  polygon: 'https://polygonscan.com/tx/',
  base: 'https://basescan.org/tx/',
  ethereum: 'https://etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  optimism: 'https://optimistic.etherscan.io/tx/',
  avalanche: 'https://snowtrace.io/tx/',
};

function getExplorerUrl(session: CheckoutSession, txHash: string): string | null {
  const network = session.manual_transfer?.network;
  const base = network ? EXPLORER_BASE[network] : null;
  return base ? base + txHash : null;
}

export function ConfirmingScreen({
  session,
  className,
  style,
}: {
  session?: CheckoutSession;
  className?: string;
  style?: CSSProperties;
}) {
  const explorerUrl = session?.tx_hash ? getExplorerUrl(session, session.tx_hash) : null;

  return (
    <div className={className} style={style}>
      <style>{SPIN_KEYFRAMES}</style>
      <div
        role="status"
        aria-label="Confirmando pago"
        style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          border: '3px solid var(--fluxis-color-border, #e2e8f0)',
          borderTopColor: 'var(--fluxis-color-primary, #2563eb)',
          animation: 'fluxis-checkout-spin 0.8s linear infinite',
        }}
      />
      <p style={mutedText}>Pago detectado, confirmando en la red…</p>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--fluxis-color-muted, #64748b)',
            textDecoration: 'underline',
            display: 'block',
            textAlign: 'center',
            marginTop: '0.5rem',
          }}
        >
          Ver en blockchain →
        </a>
      )}
    </div>
  );
}

/**
 * `returnUrl` is optional because core-api omits `return_url` entirely for a point of sale with
 * no configured one — payment links in particular have no merchant page to go back to. Its
 * absence is meaningful: it means stay here. Without a destination there is no countdown, no
 * "Volver al comercio" link, and the receipt becomes the screen's primary action instead.
 */
export function CompletedScreen({
  session,
  returnUrl,
  className,
  style,
}: {
  session?: CheckoutSession;
  returnUrl?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const hasReturnUrl = typeof returnUrl === 'string' && returnUrl.length > 0;
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

  useEffect(() => {
    if (!hasReturnUrl) return;
    if (secondsLeft <= 0) {
      window.location.href = returnUrl;
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [hasReturnUrl, secondsLeft, returnUrl]);

  const explorerUrl = session?.tx_hash ? getExplorerUrl(session, session.tx_hash) : null;
  const transfer = session?.manual_transfer;

  return (
    <div className={className} style={style}>
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
      <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>¡Pago completado!</p>

      {/*
        What was paid, shown here rather than only behind the receipt link: the link may be
        absent, and this is also where the transaction hash stops disappearing on the
        confirming → completed transition.
      */}
      {session && (
        <div
          style={{
            width: '100%',
            borderTop: '1px solid var(--fluxis-color-border, #e2e8f0)',
            borderBottom: '1px solid var(--fluxis-color-border, #e2e8f0)',
            padding: '0.25rem 0',
            margin: '0.25rem 0',
          }}
        >
          <DetailRow label="Monto">
            {session.amount} {session.currency}
          </DetailRow>

          {transfer && (
            <>
              <DetailRow label="Pagado">
                {transfer.crypto_amount} {transfer.crypto_asset}
              </DetailRow>
              <DetailRow label="Red">{transfer.network}</DetailRow>
            </>
          )}

          {session.tx_hash && (
            <DetailRow label="Transacción">
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...monospace, color: 'var(--fluxis-color-primary, #2563eb)' }}
                >
                  {session.tx_hash}
                </a>
              ) : (
                <span style={monospace}>{session.tx_hash}</span>
              )}
            </DetailRow>
          )}
        </div>
      )}

      {hasReturnUrl && (
        <a href={returnUrl} style={primaryButton}>
          Volver al comercio ({secondsLeft})
        </a>
      )}

      {session?.receipt_link && (
        <a
          href={session.receipt_link}
          target="_blank"
          rel="noopener noreferrer"
          style={hasReturnUrl ? secondaryButton : primaryButton}
        >
          Ver recibo
        </a>
      )}

      {/*
        No merchant to return to. The shopper keeps the completed screen — and with it the receipt
        — for as long as they want, and this is an offer rather than a countdown.
      */}
      {!hasReturnUrl && (
        <a href={FLUXIS_HOME_URL} style={session?.receipt_link ? secondaryButton : primaryButton}>
          Ir a Fluxis
        </a>
      )}
    </div>
  );
}

/**
 * `onRetry` is injected rather than defaulting to a page reload. Reloading only re-reads the same
 * expired payment request, so the shopper sees the identical screen and nothing appears to happen.
 * Whether a retry is even possible depends on how the session was addressed: a payment link can
 * open a fresh request from its code, while a session addressed by payment-request id cannot —
 * only the merchant can create a new one. Callers that cannot recover omit the prop and the button
 * is not rendered, instead of offering an action that silently does nothing.
 */
export function ExpiredScreen({
  onRetry,
  isRetrying,
  returnUrl,
  className,
  style,
}: {
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  returnUrl?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
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
      <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>Pago vencido</p>
      <p style={mutedText}>
        {onRetry
          ? 'Este pedido de pago ha expirado.'
          : 'Este pedido de pago ha expirado. Pedí uno nuevo al comercio.'}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          disabled={isRetrying}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: '1px solid var(--fluxis-color-border, #e2e8f0)',
            color: 'var(--fluxis-color-fg, #0f172a)',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            cursor: isRetrying ? 'default' : 'pointer',
            opacity: isRetrying ? 0.6 : 1,
            font: 'inherit',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          {isRetrying ? 'Generando…' : 'Reintentar'}
        </button>
      )}

      {!onRetry && returnUrl && (
        <a
          href={returnUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            border: '1px solid var(--fluxis-color-border, #e2e8f0)',
            color: 'var(--fluxis-color-fg, #0f172a)',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            font: 'inherit',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          Volver al comercio
        </a>
      )}
    </div>
  );
}
