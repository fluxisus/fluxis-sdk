import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetSelectionScreen } from '../src/components/checkout/AssetSelectionScreen.js';
import { CheckoutWidget } from '../src/components/CheckoutWidget.js';
import type { CheckoutSession } from '../src/types.js';

const baseSession: CheckoutSession = {
  id: 'session-1',
  amount: '100.00',
  currency: 'USD',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  status: 'selecting_asset',
  return_url: 'https://example.com/success',
  payment_options: ['npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'nbase_t0xf016413834E6D1A14F3D628B11D6Ef725a6bdbDD'],
};

describe('AssetSelectionScreen', () => {
  it('renders all payment_options', () => {
    render(<AssetSelectionScreen session={baseSession} onSelectAsset={vi.fn()} />);

    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
  });

  it('calls onSelectAsset with the clicked option', async () => {
    const onSelectAsset = vi.fn().mockResolvedValue(undefined);

    render(<AssetSelectionScreen session={baseSession} onSelectAsset={onSelectAsset} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Polygon'));
    });

    expect(onSelectAsset).toHaveBeenCalledWith('npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
  });

  it('shows an error message when the selection callback rejects', async () => {
    const onSelectAsset = vi.fn().mockRejectedValue(new Error('network error'));

    render(<AssetSelectionScreen session={baseSession} onSelectAsset={onSelectAsset} />);

    fireEvent.click(screen.getByText('Polygon'));

    await waitFor(() => {
      expect(screen.getByText(/no pudimos procesar/i)).toBeInTheDocument();
    });
  });

  it('renders without throwing when onSelectAsset is not supplied', () => {
    expect(() => render(<AssetSelectionScreen session={baseSession} />)).not.toThrow();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
  });

  it('CheckoutWidget dispatches to AssetSelectionScreen for selecting_asset sessions', () => {
    render(<CheckoutWidget session={baseSession} onSelectAsset={vi.fn()} />);

    expect(screen.getByText('Elegí cómo pagar')).toBeInTheDocument();
  });
});
