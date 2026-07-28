import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetSelectionScreen } from '../src/components/checkout/AssetSelectionScreen.js';
import { CheckoutWidget } from '../src/components/CheckoutWidget.js';
import type { CheckoutSession } from '../src/types.js';

// Two options on the *same* network with different symbols — mirrors the real bug found
// live (USDT + USDC, both Polygon), which the old string-array payment_options shape
// couldn't distinguish (both rendered as "Polygon").
const baseSession: CheckoutSession = {
  id: 'session-1',
  amount: '100.00',
  currency: 'USD',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  status: 'selecting_asset',
  return_url: 'https://example.com/success',
  payment_options: [
    { unique_asset_id: 'npolygon_t0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', network: 'polygon' },
    { unique_asset_id: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', network: 'polygon' },
  ],
};

describe('AssetSelectionScreen', () => {
  it('renders all payment_options, distinguished by symbol', () => {
    render(<AssetSelectionScreen session={baseSession} onSelectAsset={vi.fn()} />);

    expect(screen.getByText('USDT')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getAllByText('Polygon')).toHaveLength(2);
  });

  it('calls onSelectAsset with the clicked option', async () => {
    const onSelectAsset = vi.fn().mockResolvedValue(undefined);

    render(<AssetSelectionScreen session={baseSession} onSelectAsset={onSelectAsset} />);

    await act(async () => {
      fireEvent.click(screen.getByText('USDT'));
    });

    expect(onSelectAsset).toHaveBeenCalledWith('npolygon_t0xc2132D05D31c914a87C6611C10748AEb04B58e8F');
  });

  it('shows an error message when the selection callback rejects', async () => {
    const onSelectAsset = vi.fn().mockRejectedValue(new Error('network error'));

    render(<AssetSelectionScreen session={baseSession} onSelectAsset={onSelectAsset} />);

    fireEvent.click(screen.getByText('USDT'));

    await waitFor(() => {
      expect(screen.getByText(/no pudimos procesar/i)).toBeInTheDocument();
    });
  });

  it('renders without throwing when onSelectAsset is not supplied', () => {
    expect(() => render(<AssetSelectionScreen session={baseSession} />)).not.toThrow();
    expect(screen.getByText('USDT')).toBeInTheDocument();
  });

  it('CheckoutWidget shows the asset picker inside the manual-transfer accordion for selecting_asset sessions, not as a standalone screen', async () => {
    render(<CheckoutWidget session={baseSession} onSelectAsset={vi.fn()} />);

    // No vault assigned yet (no recipient_address in this fixture) — PendingScreen shows its
    // spinner, not the picker, at the top level.
    expect(screen.queryByText('USDT')).not.toBeInTheDocument();

    // The picker is reachable by expanding "Transferencia manual".
    await act(async () => {
      fireEvent.click(screen.getByText('Transferencia manual'));
    });

    expect(screen.getByText('USDT')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
  });

  it('CheckoutWidget lets the shopper change a previously resolved asset via ManualTransferContent\'s "Cambiar" link', async () => {
    const onSelectAsset = vi.fn().mockResolvedValue(undefined);
    const resolvedSession: CheckoutSession = {
      ...baseSession,
      status: 'pending',
      recipient_address: 'naspip;fake-token',
      manual_transfer: {
        wallet_address: '0xabc',
        crypto_amount: '100',
        crypto_asset: 'USDT',
        network: 'polygon',
      },
    };

    render(<CheckoutWidget session={resolvedSession} onSelectAsset={onSelectAsset} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Transferencia manual'));
    });

    // Resolved: shows transfer content, not the picker.
    expect(screen.getByText('Cambiar')).toBeInTheDocument();
    expect(screen.queryByText('USDC')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Cambiar'));
    });

    // Picker reappears with the full option list, including the currently active asset.
    expect(screen.getByText('USDT')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('USDC'));
    });

    expect(onSelectAsset).toHaveBeenCalledWith('npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
  });
});
