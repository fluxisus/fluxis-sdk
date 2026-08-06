import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompletedScreen } from '../src/components/checkout/StatusScreens.js';
import type { CheckoutSession } from '../src/types.js';

const TX_HASH = '0x7a3f9c1e5b2d8a4f6c0e9b3d7a1f5c8e2b6d4a9f3c7e1b5d8a2f6c0e4b9d3a7f';

function aSession(overrides: Partial<CheckoutSession> = {}): CheckoutSession {
  return {
    id: 'e6c1a2b4-0000-4000-8000-000000000001',
    amount: '120.00',
    currency: 'USD',
    expires_at: '2026-08-06T12:00:00Z',
    status: 'completed',
    ...overrides,
  };
}

async function advanceSeconds(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
  }
}

describe('CompletedScreen', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom's window.location.href setter throws "Not implemented: navigation" —
    // replace it with a plain assignable object for these tests.
    Reflect.deleteProperty(window, 'location');
    (window as unknown as { location: { href: string } }).location = { href: '' };
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as unknown as { location: Location }).location = originalLocation;
  });

  describe('with a return URL', () => {
    it('auto-redirects to returnUrl after 12 seconds with no interaction', async () => {
      render(<CompletedScreen returnUrl="https://example.com/success" />);

      expect(window.location.href).toBe('');

      await advanceSeconds(12);

      expect(window.location.href).toBe('https://example.com/success');
    });

    it('shows a live countdown next to the manual link', async () => {
      render(<CompletedScreen returnUrl="https://example.com/success" />);

      const link = screen.getByRole('link', { name: /volver al comercio/i });
      expect(link).toHaveTextContent('Volver al comercio (12)');

      await advanceSeconds(2);

      expect(link).toHaveTextContent('Volver al comercio (10)');
    });

    it('the manual link points at returnUrl immediately, independent of the countdown', () => {
      render(<CompletedScreen returnUrl="https://example.com/success" />);

      const link = screen.getByRole('link', { name: /volver al comercio/i });
      expect(link).toHaveAttribute('href', 'https://example.com/success');
    });

    it('clears the timer on unmount so no navigation happens after unmount', async () => {
      const { unmount } = render(<CompletedScreen returnUrl="https://example.com/success" />);

      unmount();
      await advanceSeconds(13);

      expect(window.location.href).toBe('');
    });

    it('renders the receipt link alongside the return link', () => {
      render(
        <CompletedScreen
          returnUrl="https://example.com/success"
          session={aSession({ receipt_link: 'https://checkout.fluxis.us/checkout/receipt/abc' })}
        />,
      );

      expect(screen.getByRole('link', { name: /volver al comercio/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ver recibo' })).toHaveAttribute(
        'href',
        'https://checkout.fluxis.us/checkout/receipt/abc',
      );
    });
  });

  describe('without a return URL', () => {
    it('never navigates away and renders no return link', async () => {
      render(<CompletedScreen session={aSession()} />);

      await advanceSeconds(20);

      expect(window.location.href).toBe('');
      expect(screen.queryByRole('link', { name: /volver al comercio/i })).not.toBeInTheDocument();
    });

    it('treats an empty string the same as an absent return URL', async () => {
      render(<CompletedScreen returnUrl="" session={aSession()} />);

      await advanceSeconds(20);

      expect(window.location.href).toBe('');
      expect(screen.queryByRole('link', { name: /volver al comercio/i })).not.toBeInTheDocument();
    });

    it('offers the receipt and a Fluxis link, and nothing else', () => {
      render(
        <CompletedScreen
          session={aSession({ receipt_link: 'https://checkout.fluxis.us/checkout/receipt/abc' })}
        />,
      );

      const receipt = screen.getByRole('link', { name: 'Ver recibo' });
      expect(receipt).toHaveAttribute('target', '_blank');
      expect(receipt).toHaveAttribute('rel', 'noopener noreferrer');
      expect(screen.getByRole('link', { name: 'Ir a Fluxis' })).toHaveAttribute(
        'href',
        'https://fluxis.us/',
      );
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    // The point of the whole branch: an offer, not a destination the screen takes them to.
    it('does not navigate to the Fluxis link on its own', async () => {
      render(<CompletedScreen session={aSession()} />);

      await advanceSeconds(20);

      expect(window.location.href).toBe('');
      expect(screen.getByRole('link', { name: 'Ir a Fluxis' })).toBeInTheDocument();
    });

    it('renders no receipt link when the session carries none', () => {
      render(<CompletedScreen session={aSession()} />);

      expect(screen.queryByRole('link', { name: 'Ver recibo' })).not.toBeInTheDocument();
    });
  });

  describe('inline receipt detail', () => {
    it('renders the amount and currency', () => {
      render(<CompletedScreen session={aSession()} />);

      expect(screen.getByText('Monto').parentElement).toHaveTextContent('120.00 USD');
    });

    it('renders the crypto amount, asset and network when manual_transfer is present', () => {
      render(
        <CompletedScreen
          session={aSession({
            manual_transfer: {
              wallet_address: '0xabc',
              crypto_amount: '120.004',
              crypto_asset: 'USDC',
              network: 'polygon',
            },
          })}
        />,
      );

      expect(screen.getByText('Pagado').parentElement).toHaveTextContent('120.004 USDC');
      expect(screen.getByText('Red').parentElement).toHaveTextContent('polygon');
    });

    it('still renders amount and currency when manual_transfer is absent', () => {
      render(<CompletedScreen session={aSession()} />);

      expect(screen.getByText('Monto').parentElement).toHaveTextContent('120.00 USD');
      expect(screen.queryByText('Pagado')).not.toBeInTheDocument();
      expect(screen.queryByText('Red')).not.toBeInTheDocument();
    });

    it('links the transaction hash to the block explorer on a known network', () => {
      render(
        <CompletedScreen
          session={aSession({
            tx_hash: TX_HASH,
            manual_transfer: {
              wallet_address: '0xabc',
              crypto_amount: '120.004',
              crypto_asset: 'USDC',
              network: 'polygon',
            },
          })}
        />,
      );

      expect(screen.getByRole('link', { name: TX_HASH })).toHaveAttribute(
        'href',
        `https://polygonscan.com/tx/${TX_HASH}`,
      );
    });

    it('renders the transaction hash as plain text on an unknown network', () => {
      render(
        <CompletedScreen
          session={aSession({
            tx_hash: TX_HASH,
            manual_transfer: {
              wallet_address: '0xabc',
              crypto_amount: '5.00',
              crypto_asset: 'USDC',
              network: 'solana',
            },
          })}
        />,
      );

      expect(screen.getByText(TX_HASH)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: TX_HASH })).not.toBeInTheDocument();
    });

    it('renders no transaction row when the session has no tx_hash', () => {
      render(<CompletedScreen session={aSession()} />);

      expect(screen.queryByText('Transacción')).not.toBeInTheDocument();
    });

    it('renders no detail block at all when no session is provided', () => {
      render(<CompletedScreen returnUrl="https://example.com/success" />);

      expect(screen.queryByText('Monto')).not.toBeInTheDocument();
      expect(screen.getByText('¡Pago completado!')).toBeInTheDocument();
    });
  });
});
