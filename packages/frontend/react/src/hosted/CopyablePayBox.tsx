import { useState } from 'react';
import type { ReactNode } from 'react';
import { CheckIcon, CopyIcon } from '../components/checkout/icons.js';

interface CopyablePayBoxProps {
  label: string;
  value: string;
  display?: ReactNode;
  extra?: ReactNode;
}

export function CopyablePayBox({ label, value, display, extra }: CopyablePayBoxProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div
        style={{
          fontSize: '0.625rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--fluxis-color-muted, #64748b)',
          marginBottom: '0.3rem',
        }}
      >
        {label}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? `${label} copiado` : `Copiar ${label.toLowerCase()}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          width: '100%',
          margin: 0,
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderRadius: '0.5rem',
          padding: '0.625rem 0.75rem',
          background: 'var(--fluxis-color-bg, #ffffff)',
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          gap: extra ? '0.75rem' : 0,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            color: 'var(--fluxis-color-fg, #0f172a)',
          }}
        >
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {display ?? value}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
              color: copied
                ? 'var(--fluxis-color-primary, #2563eb)'
                : 'var(--fluxis-color-muted, #64748b)',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copiado' : null}
          </span>
        </span>
        {extra}
      </button>
    </div>
  );
}
