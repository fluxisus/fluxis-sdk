import { QRCodeSVG } from 'qrcode.react';
import type { ManualTransferData } from '../../types.js';
import { capitalizeFirst, formatFiatAmount } from '../../utils/checkoutFormat.js';
import { CopyField } from './CopyField.js';
import { AddressFormat } from './AddressFormat.js';

const NETWORK_COLORS: Record<string, string> = {
  polygon: '#7b3fe4',
  base: '#0052ff',
  ethereum: '#627eea',
  arbitrum: '#2d374b',
  optimism: '#ff0420',
};

const ASSET_COLORS: Record<string, string> = {
  USDT: '#26a17b',
  USDC: '#2775ca',
  MATIC: '#8247e5',
  ETH: '#627eea',
  DAI: '#f5ac37',
};

function TokenPill({ symbol, color }: { symbol: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'var(--fluxis-color-fg, #0f172a)',
        background: 'var(--fluxis-color-bg, #ffffff)',
      }}
    >
      <span
        style={{
          width: '0.875rem',
          height: '0.875rem',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {symbol}
    </span>
  );
}

interface ManualTransferContentProps {
  data: ManualTransferData;
  onChangeAsset?: () => void;
  /**
   * Sends the transfer from a connected browser wallet. Injected rather than performed here: this
   * package makes no network or chain calls of its own (see `onSelectAsset`), and only the host
   * knows whether a wallet is connected and on the right chain. Omit it and the manual
   * instructions below stand alone, exactly as before.
   */
  onPayWithWallet?: () => void | Promise<void>;
  isPayingWithWallet?: boolean;
  payWithWalletError?: string;
}

export function ManualTransferContent({
  data,
  onChangeAsset,
  onPayWithWallet,
  isPayingWithWallet,
  payWithWalletError,
}: ManualTransferContentProps) {
  const networkName = capitalizeFirst(data.network);
  const networkColor = NETWORK_COLORS[data.network.toLowerCase()] ?? '#64748b';
  const assetColor = ASSET_COLORS[data.crypto_asset.toUpperCase()] ?? '#64748b';

  return (
    <div style={{ padding: '0.875rem 1rem 0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '0.75rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TokenPill symbol={data.crypto_asset} color={assetColor} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--fluxis-color-muted, #64748b)' }}>en</span>
          <TokenPill symbol={networkName} color={networkColor} />
        </div>
        {onChangeAsset && (
          <button
            type="button"
            onClick={onChangeAsset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(37, 99, 235, 0.08)',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.375rem 0.75rem',
              font: 'inherit',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--fluxis-color-primary, #2563eb)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Cambiar
          </button>
        )}
      </div>

      {(() => {
        const rate = data.reference_amount && data.reference_currency
          ? parseFloat(data.reference_amount) / parseFloat(data.crypto_amount)
          : NaN;
        return Number.isFinite(rate) ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '0.25rem 0 0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--fluxis-color-muted, #64748b)',
            }}
          >
            <span>Tipo de cambio</span>
            <span style={{ fontWeight: 500, color: 'var(--fluxis-color-fg, #0f172a)' }}>
              1 {data.crypto_asset} = {formatFiatAmount(rate.toFixed(2), data.reference_currency!)}
            </span>
          </div>
        ) : null;
      })()}

      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--fluxis-color-fg, #0f172a)',
        }}
      >
        Transfiere este importe a esta dirección
      </p>

      <CopyField label="Importe" value={data.crypto_amount} />
      <CopyField
        label="Dirección"
        value={data.wallet_address}
        display={<AddressFormat address={data.wallet_address} />}
      />

      {onPayWithWallet && (
        <>
          <button
            type="button"
            onClick={() => onPayWithWallet()}
            disabled={isPayingWithWallet}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              marginTop: '0.875rem',
              padding: '0.75rem 1rem',
              background: 'var(--fluxis-color-fg, #0f172a)',
              color: 'var(--fluxis-color-bg, #ffffff)',
              border: 'none',
              borderRadius: 'var(--fluxis-radius, 0.75rem)',
              cursor: isPayingWithWallet ? 'default' : 'pointer',
              opacity: isPayingWithWallet ? 0.6 : 1,
              font: 'inherit',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {isPayingWithWallet ? 'Confirmá en tu wallet…' : 'Pagar con mi wallet'}
          </button>

          {payWithWalletError && (
            <p
              style={{
                margin: '0.5rem 0 0',
                fontSize: '0.8125rem',
                color: 'var(--fluxis-color-danger, #dc2626)',
                textAlign: 'center',
              }}
            >
              {payWithWalletError}
            </p>
          )}
        </>
      )}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          marginTop: '0.875rem',
          padding: '0.75rem',
          background: 'var(--fluxis-button-bg, #f8fafc)',
          borderRadius: '0.625rem',
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        }}
      >
        <div style={{ flexShrink: 0, borderRadius: '0.375rem', overflow: 'hidden' }}>
          <QRCodeSVG value={data.wallet_address} size={100} fgColor="#19323a" bgColor="#ffffff" level="M" />
        </div>
        <div>
          <p
            style={{
              margin: '0 0 0.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--fluxis-color-fg, #0f172a)',
            }}
          >
            O escaneá este código QR
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: 'var(--fluxis-color-muted, #64748b)',
              lineHeight: 1.4,
            }}
          >
            para autocompletar la dirección en tu billetera
          </p>
        </div>
      </div>
    </div>
  );
}
