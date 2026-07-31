import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckoutWidget } from '../src/components/CheckoutWidget.js';
import type { CheckoutSession } from '../src/types.js';

const USDC_POLYGON = 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDT_POLYGON = 'npolygon_t0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

const resolvedSession = (
  paymentOptions: CheckoutSession['payment_options'],
): CheckoutSession => ({
  id: 'session-1',
  amount: '100.00',
  currency: 'ARS',
  expires_at: new Date(Date.now() + 900_000).toISOString(),
  status: 'pending',
  return_url: 'https://example.com/success',
  manual_transfer: {
    wallet_address: '0xF94F34d2812388804a1E3405c67C49b3a7eD2b7C',
    crypto_amount: '0.06',
    crypto_asset: 'USDC',
    network: 'polygon',
  },
  payment_options: paymentOptions,
});

/**
 * The transfer details live in a collapsed accordion, so every assertion here has to open it
 * first — otherwise the negative cases pass whether or not the button would have rendered.
 */
function renderExpanded(paymentOptions: CheckoutSession['payment_options']) {
  render(<CheckoutWidget session={resolvedSession(paymentOptions)} />);
  fireEvent.click(screen.getByText('Transferencia manual'));
}

describe('change-asset affordance', () => {
  it('offers "Cambiar" when there is another asset to switch to', () => {
    renderExpanded([
      { unique_asset_id: USDC_POLYGON, symbol: 'USDC', network: 'polygon' },
      { unique_asset_id: USDT_POLYGON, symbol: 'USDT', network: 'polygon' },
    ]);

    expect(screen.getByRole('button', { name: 'Cambiar' })).toBeInTheDocument();
  });

  // core-api now returns the option list even when a point of sale allows just one asset, so the
  // widget has to decide for itself whether a change is possible.
  it('hides it when the only option is the one already selected', () => {
    renderExpanded([{ unique_asset_id: USDC_POLYGON, symbol: 'USDC', network: 'polygon' }]);

    expect(screen.queryByRole('button', { name: 'Cambiar' })).not.toBeInTheDocument();
  });

  it('hides it when the session carries no options at all', () => {
    renderExpanded(undefined);

    expect(screen.queryByRole('button', { name: 'Cambiar' })).not.toBeInTheDocument();
  });
});
