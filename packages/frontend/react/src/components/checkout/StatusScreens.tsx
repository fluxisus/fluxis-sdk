import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CheckoutSession } from '../../types.js';

const AUTO_REDIRECT_SECONDS = 12;
const FLUXIS_GREEN = '#00d086';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SPIN_KEYFRAMES = `@keyframes fluxis-checkout-spin { to { transform: rotate(360deg); } }`;

const mutedText: CSSProperties = {
  margin: 0,
  color: 'var(--fluxis-color-muted, #64748b)',
  textAlign: 'center',
  fontSize: '0.875rem',
};

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function ConfirmingScreen({
  className,
  style,
}: {
  session?: CheckoutSession;
  className?: string;
  style?: CSSProperties;
}) {
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
      <p style={mutedText}>Ya detectamos tu pago, espera un momento por favor</p>
    </div>
  );
}

/**
 * `returnUrl` is optional because core-api omits `return_url` entirely for a point of sale with
 * no configured one — payment links in particular have no merchant page to go back to. When it
 * is present the screen still auto-redirects after AUTO_REDIRECT_SECONDS; the countdown is no
 * longer shown because the completed UI now collects an email for the receipt.
 */
export function CompletedScreen({
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

  return (
    <div className={className} style={style}>
      <div
        aria-hidden="true"
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          background: 'rgba(0, 208, 134, 0.12)',
          color: FLUXIS_GREEN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
        }}
      >
        ✓
      </div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>¡Pago completado!</p>
      <ReceiptEmailForm />
    </div>
  );
}

function ReceiptEmailForm() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const valid = isValidEmail(email);
  const showError = touched && email.trim().length > 0 && !valid;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '20rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '0.75rem',
      }}
    >
      <p style={mutedText}>Enviaremos tu recibo a tu email</p>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tu@email.com"
        value={email}
        disabled={sent}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? 'fluxis-receipt-email-error' : undefined}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '0.75rem 0.875rem',
          border: `1px solid ${showError ? '#dc2626' : 'var(--fluxis-color-border, #e2e8f0)'}`,
          borderRadius: 'var(--fluxis-radius, 0.75rem)',
          background: 'var(--fluxis-color-bg, #ffffff)',
          color: 'var(--fluxis-color-fg, #0f172a)',
          font: 'inherit',
          fontSize: '0.875rem',
        }}
      />
      {showError ? (
        <p
          id="fluxis-receipt-email-error"
          style={{ margin: 0, fontSize: '0.75rem', color: '#dc2626', textAlign: 'center' }}
        >
          Ingresá un email válido
        </p>
      ) : null}
      {sent ? (
        <button
          type="button"
          disabled
          style={{
            alignSelf: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            background: 'var(--fluxis-color-bg, #ffffff)',
            color: 'var(--fluxis-color-muted, #64748b)',
            font: 'inherit',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'default',
          }}
        >
          Enviado
        </button>
      ) : valid ? (
        <button
          type="button"
          onClick={() => setSent(true)}
          style={{
            alignSelf: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: 'var(--fluxis-radius, 0.75rem)',
            background: FLUXIS_GREEN,
            color: '#ffffff',
            font: 'inherit',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Enviar
        </button>
      ) : null}
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
