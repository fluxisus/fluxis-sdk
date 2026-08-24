import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfirmingScreen } from '../src/components/checkout/StatusScreens.js';
import type { CheckoutSession } from '../src/types.js';

const session: CheckoutSession = {
  id: 'e6c1a2b4-0000-4000-8000-000000000001',
  amount: '120.00',
  currency: 'USD',
  expires_at: '2026-08-06T12:00:00Z',
  status: 'confirming',
  tx_hash: '0x7a3f9c1e5b2d8a4f6c0e9b3d7a1f5c8e2b6d4a9f3c7e1b5d8a2f6c0e4b9d3a7f',
  manual_transfer: {
    wallet_address: '0xabc',
    crypto_amount: '120.004',
    crypto_asset: 'USDC',
    network: 'polygon',
  },
};

describe('ConfirmingScreen', () => {
  it('shows the spinner and wait copy, without explorer or payment details', () => {
    render(<ConfirmingScreen session={session} />);

    expect(screen.getByRole('status', { name: 'Confirmando pago' })).toBeInTheDocument();
    expect(screen.getByText('Ya detectamos tu pago, espera un momento por favor')).toBeInTheDocument();
    expect(screen.queryByText(/pago detectado, confirmando/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver en blockchain/i })).not.toBeInTheDocument();
  });
});
