import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CheckoutSession } from '../../types.js';
import { capitalizeFirst } from '../../utils/checkoutFormat.js';

interface AssetSelectionScreenProps {
  session: CheckoutSession;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  className?: string;
  style?: CSSProperties;
}

export function AssetSelectionScreen({ session, onSelectAsset, className, style }: AssetSelectionScreenProps) {
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const options = session.payment_options ?? [];

  async function handleSelect(assetId: string) {
    if (pendingAssetId || !onSelectAsset) return;

    setError(false);
    setPendingAssetId(assetId);
    try {
      await onSelectAsset(assetId);
    } catch {
      setError(true);
    } finally {
      setPendingAssetId(null);
    }
  }

  return (
    <div
      className={className}
      style={{
        fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
        color: 'var(--fluxis-color-fg, #0f172a)',
        boxSizing: 'border-box',
        padding: '0.875rem 1rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        ...style,
      }}
    >
      {options.map((option) => {
        const isPending = pendingAssetId === option.unique_asset_id;
        const isDisabled = pendingAssetId !== null || !onSelectAsset;

        return (
          <button
            key={option.unique_asset_id}
            type="button"
            disabled={isDisabled}
            onClick={() => handleSelect(option.unique_asset_id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              border: '1px solid var(--fluxis-color-border, #e2e8f0)',
              borderRadius: 'var(--fluxis-radius, 0.75rem)',
              background: 'none',
              cursor: isDisabled ? 'default' : 'pointer',
              opacity: pendingAssetId !== null && !isPending ? 0.5 : 1,
              font: 'inherit',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{option.symbol}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--fluxis-color-muted, #64748b)' }}>
              {capitalizeFirst(option.network)}
            </span>
            {isPending && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--fluxis-color-muted, #64748b)' }}>…</span>
            )}
          </button>
        );
      })}

      {error && (
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.8125rem',
            color: '#dc2626',
            textAlign: 'center',
          }}
        >
          No pudimos procesar tu selección. Intentá de nuevo.
        </p>
      )}
    </div>
  );
}
