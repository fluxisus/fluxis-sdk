import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpiredScreen } from '../src/components/checkout/StatusScreens.js';
import { CheckoutWidget } from '../src/components/CheckoutWidget.js';
import type { CheckoutSession } from '../src/types.js';

const expiredSession: CheckoutSession = {
  id: 'session-expired',
  amount: '100.00',
  currency: 'ARS',
  expires_at: new Date(Date.now() - 60_000).toISOString(),
  status: 'expired',
  return_url: 'https://example.com/order/1',
};

describe('ExpiredScreen', () => {
  it('calls the injected onRetry instead of reloading the page', () => {
    const onRetry = vi.fn();
    const reload = vi.fn();
    // The previous implementation hardcoded window.location.reload(), which re-read the same
    // expired request and appeared to do nothing. Assert we never fall back to that.
    const original = window.location;
    Reflect.deleteProperty(window, 'location');
    (window as unknown as { location: { reload: () => void } }).location = { reload };

    render(<ExpiredScreen onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();

    (window as unknown as { location: Location }).location = original;
  });

  it('hides the retry button when the caller cannot recover', () => {
    render(<ExpiredScreen />);

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.getByText(/Pedí uno nuevo al comercio/)).toBeInTheDocument();
  });

  it('offers a return link when there is no retry but a return_url exists', () => {
    render(<ExpiredScreen returnUrl="https://example.com/order/1" />);

    const link = screen.getByRole('link', { name: 'Volver al comercio' });
    expect(link).toHaveAttribute('href', 'https://example.com/order/1');
  });

  it('disables the button while a retry is in flight', () => {
    render(<ExpiredScreen onRetry={vi.fn()} isRetrying />);

    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();
  });
});

describe('CheckoutWidget expired wiring', () => {
  it('passes onRetryExpired through to the expired screen', () => {
    const onRetryExpired = vi.fn();

    render(<CheckoutWidget session={expiredSession} onRetryExpired={onRetryExpired} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetryExpired).toHaveBeenCalledTimes(1);
  });

  it('renders no retry button when the host supplies no handler', () => {
    render(<CheckoutWidget session={expiredSession} />);

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    // return_url is present on the session, so the shopper still gets a way out.
    expect(screen.getByRole('link', { name: 'Volver al comercio' })).toBeInTheDocument();
  });
});
