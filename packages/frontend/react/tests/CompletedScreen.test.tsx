import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompletedScreen } from '../src/components/checkout/StatusScreens.js';

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

  it('auto-redirects to returnUrl after 5 seconds with no interaction', async () => {
    render(<CompletedScreen returnUrl="https://example.com/success" />);

    expect(window.location.href).toBe('');

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    expect(window.location.href).toBe('https://example.com/success');
  });

  it('shows a live countdown next to the manual link', async () => {
    render(<CompletedScreen returnUrl="https://example.com/success" />);

    const link = screen.getByRole('link', { name: /volver al comercio/i });
    expect(link).toHaveTextContent('Volver al comercio (5)');

    for (let i = 0; i < 2; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    expect(link).toHaveTextContent('Volver al comercio (3)');
  });

  it('the manual link points at returnUrl immediately, independent of the countdown', () => {
    render(<CompletedScreen returnUrl="https://example.com/success" />);

    const link = screen.getByRole('link', { name: /volver al comercio/i });
    expect(link).toHaveAttribute('href', 'https://example.com/success');
  });

  it('clears the timer on unmount so no navigation happens after unmount', async () => {
    const { unmount } = render(<CompletedScreen returnUrl="https://example.com/success" />);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(window.location.href).toBe('');
  });
});
