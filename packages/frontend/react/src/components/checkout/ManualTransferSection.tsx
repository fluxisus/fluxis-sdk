import { useState } from 'react';
import type { ReactNode } from 'react';
import { WalletTransferIcon, ChevronIcon } from './icons.js';
import { StepIndicator } from './StepIndicator.js';

interface ManualTransferSectionProps {
  /** Last completed step index (0-based) into ['Token', 'Red', 'Pagar'] — -1 while an asset
   * still needs to be picked (nothing done yet), 1 once resolved (Token+Red done via the
   * single asset pick; 'Pagar' is the current, not-yet-done step). */
  activeStep: number;
  children: ReactNode;
}

export function ManualTransferSection({ activeStep, children }: ManualTransferSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.5rem',
            background: 'rgba(37, 99, 235, 0.08)',
            color: 'var(--fluxis-color-primary, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WalletTransferIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Transferencia manual</div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--fluxis-color-muted, #64748b)',
              marginTop: '0.125rem',
            }}
          >
            Si tu billetera no es compatible con Fluxis
          </div>
        </div>
        <span style={{ color: 'var(--fluxis-color-muted, #64748b)', flexShrink: 0 }}>
          <ChevronIcon up={open} />
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--fluxis-color-border, #e2e8f0)' }}>
          <div style={{ padding: '0.875rem 1rem 0' }}>
            <StepIndicator steps={['Token', 'Red', 'Pagar']} activeStep={activeStep} />
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
