import { useState } from 'react';
import type { ReactNode } from 'react';
import { CopyIcon, CheckIcon } from './icons.js';

interface CopyFieldProps {
  label: string;
  value: string;
  display?: ReactNode;
}

export function CopyField({ label, value, display }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderRadius: '0.5rem',
          padding: '0.5rem 0.625rem',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
          color: 'var(--fluxis-color-fg, #0f172a)',
          gap: '0.5rem',
          background: 'var(--fluxis-color-bg, #ffffff)',
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
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copiado' : `Copiar ${label.toLowerCase()}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: copied
              ? 'var(--fluxis-color-primary, #2563eb)'
              : 'var(--fluxis-color-muted, #64748b)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}
