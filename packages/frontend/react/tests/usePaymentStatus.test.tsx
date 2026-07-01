import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxisProvider } from '../src/theme/FluxisProvider.js';
import { usePaymentStatus } from '../src/hooks/usePaymentStatus.js';
import { useServerTimeOffset } from '../src/hooks/useServerTimeOffset.js';

function jsonResponse(
  body: unknown,
  { ok = true, status = 200, dateHeader }: { ok?: boolean; status?: number; dateHeader?: string | null } = {},
) {
  const headers = new Headers();
  if (dateHeader !== null) {
    headers.set('date', dateHeader ?? new Date().toUTCString());
  }
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers,
    json: async () => body,
  } as Response;
}

function withProvider(children: React.ReactNode) {
  return <FluxisProvider>{children}</FluxisProvider>;
}

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('usePaymentStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches immediately on mount and polls on the default interval', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => usePaymentStatus('/status'));

    await flush();
    expect(result.current.status).toBe('pending');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await flush(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('respects a custom pollInterval', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => usePaymentStatus('/status', { pollInterval: 10000 }));

    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await flush(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await flush(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['completed', 'expired', 'failed', 'overpaid', 'underpaid'])(
    'stops polling on terminal status %s',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ status }, { dateHeader: null }));
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() => usePaymentStatus('/status'));

      await flush();
      expect(result.current.status).toBe(status);
      expect(result.current.isPolling).toBe(false);

      await flush(20000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('does not fetch while enabled is false, and resumes when toggled on', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ enabled }) => usePaymentStatus('/status', { enabled }),
      { initialProps: { enabled: false } },
    );

    await flush(10000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isPolling).toBe(false);

    rerender({ enabled: true });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cancels in-flight fetch and timers on unmount, with no post-unmount updates', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderHook(() => usePaymentStatus('/status'));
    await flush();

    unmount();

    expect(() => {
      resolveFetch?.(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    }).not.toThrow();
  });

  it('backs off on fetch error and recovers to the normal interval after success', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => usePaymentStatus('/status', { pollInterval: 1000 }));

    await flush();
    expect(result.current.error).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // backoff doubles the configured interval (1000ms -> 2000ms) after an error
    await flush(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('pending');

    // back to the normal interval after a success
    await flush(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refetch fetches immediately and resets the interval timer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => usePaymentStatus('/status', { pollInterval: 5000 }));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await flush(3000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await flush(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await flush(3000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('computes the clock-skew offset when the Date header is present', async () => {
    const serverDate = new Date(Date.now() + 30000);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ status: 'pending' }, { dateHeader: serverDate.toUTCString() }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => ({
        status: usePaymentStatus('/status'),
        offset: useServerTimeOffset(),
      }),
      { wrapper: ({ children }) => withProvider(children) },
    );

    await flush();
    expect(result.current.status.status).toBe('pending');
    expect(result.current.offset.offsetMs).toBeGreaterThan(20000);
  });

  it('keeps the offset at 0 and throws no error when the Date header is absent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => ({
        status: usePaymentStatus('/status'),
        offset: useServerTimeOffset(),
      }),
      { wrapper: ({ children }) => withProvider(children) },
    );

    await flush();
    expect(result.current.status.status).toBe('pending');
    expect(result.current.offset.offsetMs).toBe(0);
    expect(result.current.status.error).toBeNull();
  });

  it('preserves a previously computed offset when a later response lacks the Date header', async () => {
    const serverDate = new Date(Date.now() + 15000);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ status: 'pending' }, { dateHeader: serverDate.toUTCString() }),
      )
      .mockResolvedValue(jsonResponse({ status: 'pending' }, { dateHeader: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => ({
        status: usePaymentStatus('/status', { pollInterval: 1000 }),
        offset: useServerTimeOffset(),
      }),
      { wrapper: ({ children }) => withProvider(children) },
    );

    await flush();
    expect(result.current.offset.offsetMs).toBeGreaterThan(10000);
    const firstOffset = result.current.offset.offsetMs;

    await flush(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.offset.offsetMs).toBe(firstOffset);
  });
});
