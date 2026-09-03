import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { CheckoutSession } from '../types.js';
import { AddressFormat } from '../components/checkout/AddressFormat.js';
import { InfoIcon } from '../components/checkout/icons.js';
import { explorerTokenUrl } from '../utils/blockExplorer.js';
import { AssetPicker, instructionStyle } from './AssetPicker.js';
import { CopyablePayBox } from './CopyablePayBox.js';
import { findAsset } from './uniqueAssets.js';
import { useUniqueAssets } from './useUniqueAssets.js';

interface ManualPaymentFlowProps {
  session: CheckoutSession;
  isMobile: boolean;
  assetsUrl?: string;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
}

function TokenAddressInfo({ tokenAddress, network }: { tokenAddress: string; network: string }) {
  const [open, setOpen] = useState(false);
  const explorerUrl = explorerTokenUrl(network, tokenAddress);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label="Ver dirección del contrato"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        <InfoIcon />
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            background: 'var(--fluxis-color-bg, #ffffff)',
            border: '1px solid var(--fluxis-color-border, #e2e8f0)',
            borderRadius: '0.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            padding: '0.625rem 0.75rem',
            minWidth: '14rem',
            zIndex: 100,
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--fluxis-color-muted, #64748b)',
              marginBottom: '0.3rem',
            }}
          >
            Dirección del contrato
          </span>
          <span style={{ fontSize: '0.8125rem' }}>
            <AddressFormat address={tokenAddress} />
          </span>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                marginTop: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--fluxis-color-primary, #2563eb)',
                textDecoration: 'none',
              }}
            >
              Ver en el explorador ↗
            </a>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * The "transfer manually" flow: picks a token+network (via `AssetPicker`), then shows the
 * copy/paste amount + address + QR instructions once the host resolves `manual_transfer`. Never
 * knows about connected wallets — that's `DefiWalletPanel`'s job.
 */
export function ManualPaymentFlow({ session, isMobile, assetsUrl, onSelectAsset }: ManualPaymentFlowProps) {
  const transfer = session.manual_transfer;
  const { assets } = useUniqueAssets({ assetsUrl });
  const asset = transfer ? findAsset(assets, transfer.crypto_asset, transfer.network) : undefined;

  return (
    <AssetPicker
      assetsUrl={assetsUrl}
      paymentOptions={session.payment_options}
      manualTransfer={transfer}
      onSelectAsset={onSelectAsset}
      renderPay={() =>
        transfer ? (
          <>
            <p style={instructionStyle()}>Transfiere este importe a esta dirección</p>
            <CopyablePayBox
              label="Moneda"
              value={transfer.crypto_asset}
              display={`${transfer.crypto_asset} · ${asset?.network_name ?? transfer.network}`}
              labelExtra={
                asset?.token_address ? (
                  <TokenAddressInfo tokenAddress={asset.token_address} network={asset.network} />
                ) : undefined
              }
            />
            <CopyablePayBox label="Monto a pagar" value={transfer.crypto_amount} />
            <CopyablePayBox
              label="Dirección"
              value={transfer.wallet_address}
              display={<AddressFormat address={transfer.wallet_address} />}
              extra={
                isMobile ? undefined : (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <QRCodeSVG
                      value={transfer.wallet_address}
                      size={88}
                      fgColor="#19323a"
                      bgColor="#ffffff"
                      level="M"
                    />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
                          color: 'var(--fluxis-color-fg, #0f172a)',
                          lineHeight: 1.3,
                        }}
                      >
                        O escaneá este código QR
                      </span>
                      <span
                        style={{
                          display: 'block',
                          marginTop: '0.2rem',
                          fontSize: '0.8125rem',
                          fontWeight: 400,
                          fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
                          color: 'var(--fluxis-color-muted, #64748b)',
                          lineHeight: 1.35,
                        }}
                      >
                        para autocompletar la dirección en tu billetera
                      </span>
                    </span>
                  </span>
                )
              }
            />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--fluxis-color-muted, #64748b)' }}>
            Preparando tu pago…
          </p>
        )
      }
    />
  );
}
