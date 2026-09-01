import { QRCodeSVG } from 'qrcode.react';
import type { CheckoutSession } from '../types.js';
import { AddressFormat } from '../components/checkout/AddressFormat.js';
import { AssetPicker, instructionStyle } from './AssetPicker.js';
import { CopyablePayBox } from './CopyablePayBox.js';

interface ManualPaymentFlowProps {
  session: CheckoutSession;
  isMobile: boolean;
  assetsUrl?: string;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
}

/**
 * The "transfer manually" flow: picks a token+network (via `AssetPicker`), then shows the
 * copy/paste amount + address + QR instructions once the host resolves `manual_transfer`. Never
 * knows about connected wallets — that's `DefiWalletPanel`'s job.
 */
export function ManualPaymentFlow({ session, isMobile, assetsUrl, onSelectAsset }: ManualPaymentFlowProps) {
  const transfer = session.manual_transfer;

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
