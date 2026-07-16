import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CheckoutSession } from '../../types.js';
import { capitalizeFirst, truncateAddress } from '../../utils/checkoutFormat.js';

interface AssetSelectionScreenProps {
  session: CheckoutSession;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  className?: string;
  style?: CSSProperties;
}

// unique_asset_id format: n{network}_t{tokenAddress} — see fluxis-sdk root CLAUDE.md.
// There is no client-side symbol registry, so the token address is shown (truncated)
// rather than a resolved symbol like "USDC".
function parseAssetOption(uniqueAssetId: string): { network: string; address: string } {
  const match = uniqueAssetId.match(/^n([a-z0-9]+)_t(.+)$/i);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return { network: uniqueAssetId, address: '' };
  }
  return { network: match[1], address: match[2] };
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
        background: 'var(--fluxis-color-bg, #ffffff)',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: 'var(--fluxis-radius, 0.75rem)',
        fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
        color: 'var(--fluxis-color-fg, #0f172a)',
        boxSizing: 'border-box',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        ...style,
      }}
    >
      <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '1rem', textAlign: 'center' }}>
        Elegí cómo pagar
      </p>

      {options.map((assetId) => {
        const { network, address } = parseAssetOption(assetId);
        const isPending = pendingAssetId === assetId;
        const isDisabled = pendingAssetId !== null || !onSelectAsset;

        return (
          <button
            key={assetId}
            type="button"
            disabled={isDisabled}
            onClick={() => handleSelect(assetId)}
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
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{capitalizeFirst(network)}</span>
            {address && (
              <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--fluxis-color-muted, #64748b)' }}>
                {truncateAddress(address)}
              </span>
            )}
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
