import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { PendingScreen } from '../src/components/checkout/PendingScreen.js';
import { EXPIRED_OVERLAY_FALLBACK_MS } from '../src/utils/checkoutExpiry.js';
import type { CheckoutSession } from '../src/types.js';

const pendingSession: CheckoutSession = {
  id: 'session-pending',
  amount: '100.00',
  currency: 'ARS',
  expires_at: new Date(Date.now() + 120_000).toISOString(),
  status: 'pending',
  recipient_address: 'v4.local.test-token',
};

describe('PendingScreen expiry fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onExpiredTimeout after the overlay outlasts polling', () => {
    const onExpiredTimeout = vi.fn();

    render(
      <PendingScreen session={pendingSession} onExpiredTimeout={onExpiredTimeout} />,
    );

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(screen.getByText('Actualizando…')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(EXPIRED_OVERLAY_FALLBACK_MS);
    });

    expect(onExpiredTimeout).toHaveBeenCalledTimes(1);
  });
});
