import type { CSSProperties } from 'react';
import type { CheckoutSession } from '../../types.js';

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

const mutedText: CSSProperties = {
  margin: 0,
  color: 'var(--fluxis-color-muted, #64748b)',
  textAlign: 'center',
  fontSize: '0.875rem',
};

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

export function CompletedScreen({
  session,
  returnUrl,
  className,
  style,
}: {
  session?: CheckoutSession;
  returnUrl: string;
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
      <a
        href={returnUrl}
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
        Volver al comercio
      </a>
      {session?.receipt_link && (
        <a
          href={session.receipt_link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: '1px solid var(--fluxis-color-border, #e2e8f0)',
            color: 'var(--fluxis-color-fg, #0f172a)',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Ver recibo
        </a>
      )}
    </div>
  );
}

export function ExpiredScreen({ className, style }: { className?: string; style?: CSSProperties }) {
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
      <p style={mutedText}>Este pedido de pago ha expirado.</p>
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
        Reintentar
      </button>
    </div>
  );
}
