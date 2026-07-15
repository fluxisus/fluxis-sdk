import { QRCodeSVG } from 'qrcode.react';
import type { ManualTransferData } from '../../types.js';
import { capitalizeFirst, formatFiatAmount } from '../../utils/checkoutFormat.js';
import { StepIndicator } from './StepIndicator.js';
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
}

export function ManualTransferContent({ data }: ManualTransferContentProps) {
  const networkName = capitalizeFirst(data.network);
  const networkColor = NETWORK_COLORS[data.network.toLowerCase()] ?? '#64748b';
  const assetColor = ASSET_COLORS[data.crypto_asset.toUpperCase()] ?? '#64748b';

  return (
    <div style={{ padding: '0.875rem 1rem 1rem' }}>
      <StepIndicator steps={['Token', 'Red', 'Pagar']} activeStep={2} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
        <TokenPill symbol={data.crypto_asset} color={assetColor} />
        <span style={{ fontSize: '0.8125rem', color: 'var(--fluxis-color-muted, #64748b)' }}>en</span>
        <TokenPill symbol={networkName} color={networkColor} />
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
