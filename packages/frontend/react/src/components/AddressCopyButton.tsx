import { useState } from 'react';
import type { AddressCopyButtonProps } from '../types.js';

function truncate(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function AddressCopyButton({ address, className }: AddressCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable in non-secure context or on permission denial
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : 'Copy address to clipboard'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        background: 'var(--fluxis-color-bg, #ffffff)',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: 'var(--fluxis-radius, 0.75rem)',
        cursor: 'pointer',
        font: 'inherit',
        color: 'var(--fluxis-color-fg, #0f172a)',
        fontSize: '0.875rem',
        fontFamily: 'monospace',
      }}
    >
      <span>{truncate(address)}</span>
      {copied ? (
        <span
          style={{
            color: 'var(--fluxis-color-primary, #2563eb)',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
          }}
        >
          Copied!
        </span>
      ) : (
        <CopyIcon />
      )}
    </button>
  );
}
