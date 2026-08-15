import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompletedScreen } from '../src/components/checkout/StatusScreens.js';
import type { CheckoutSession } from '../src/types.js';

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

    it('does not show a return-to-merchant or receipt link', () => {
      render(
        <CompletedScreen
          returnUrl="https://example.com/success"
          session={aSession({ receipt_link: 'https://checkout.fluxis.us/checkout/receipt/abc' })}
        />,
      );

      expect(screen.queryByRole('link', { name: /volver al comercio/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /ver recibo/i })).not.toBeInTheDocument();
    });

    it('clears the timer on unmount so no navigation happens after unmount', async () => {
      const { unmount } = render(<CompletedScreen returnUrl="https://example.com/success" />);

      unmount();
      await advanceSeconds(13);

      expect(window.location.href).toBe('');
    });
  });

  describe('without a return URL', () => {
    it('never navigates away', async () => {
      render(<CompletedScreen session={aSession()} />);

      await advanceSeconds(20);

      expect(window.location.href).toBe('');
    });

    it('treats an empty string the same as an absent return URL', async () => {
      render(<CompletedScreen returnUrl="" session={aSession()} />);

      await advanceSeconds(20);

      expect(window.location.href).toBe('');
    });
  });

  describe('completed content', () => {
    it('shows the success headline and receipt-email prompt, not payment details', () => {
      render(
        <CompletedScreen
          session={aSession({
            tx_hash: '0xabc',
            manual_transfer: {
              wallet_address: '0xabc',
              crypto_amount: '120.004',
              crypto_asset: 'USDC',
              network: 'polygon',
            },
          })}
        />,
      );

      expect(screen.getByText('¡Pago completado!')).toBeInTheDocument();
      expect(screen.getByText('Enviaremos tu recibo a tu email')).toBeInTheDocument();
      expect(screen.queryByText('Monto')).not.toBeInTheDocument();
      expect(screen.queryByText('Pagado')).not.toBeInTheDocument();
      expect(screen.queryByText('Red')).not.toBeInTheDocument();
      expect(screen.queryByText('Transacción')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /ir a fluxis/i })).not.toBeInTheDocument();
    });
  });

  describe('receipt email form', () => {
    it('does not show Enviar until the email is valid', () => {
      render(<CompletedScreen session={aSession()} />);

      const input = screen.getByPlaceholderText('tu@email.com');
      expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'not-an-email' } });
      fireEvent.blur(input);

      expect(screen.getByText('Ingresá un email válido')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
    });

    it('shows Enviar after a valid email and turns it into Enviado on click', () => {
      render(<CompletedScreen session={aSession()} />);

      fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
        target: { value: 'shopper@example.com' },
      });

      const send = screen.getByRole('button', { name: 'Enviar' });
      expect(send).toBeEnabled();

      fireEvent.click(send);

      expect(screen.getByRole('button', { name: 'Enviado' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
    });
  });
});
