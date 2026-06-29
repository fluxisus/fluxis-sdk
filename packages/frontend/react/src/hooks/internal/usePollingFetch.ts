import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 60000;
const BACKOFF_MULTIPLIER = 2;

export interface UsePollingFetchOptions<T> {
  pollInterval?: number;
  enabled?: boolean;
  isTerminal?: (data: T) => boolean;
  onResponse?: (response: Response) => void;
}

export interface UsePollingFetchResult<T> {
  data: T | null;
  error: Error | null;
  isPolling: boolean;
  refetch: () => void;
}

/**
 * Generic interval/backoff/refetch engine for polling a fetch-based source.
 * Has no knowledge of payment semantics — `isTerminal` decides when to stop.
 */
export function usePollingFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<{ response: Response; json: T }>,
  {
    pollInterval = DEFAULT_POLL_INTERVAL_MS,
    enabled = true,
    isTerminal,
    onResponse,
  }: UsePollingFetchOptions<T> = {},
): UsePollingFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const backoffRef = useRef(pollInterval);
  const unmountedRef = useRef(false);
  const runRef = useRef<() => Promise<void>>(async () => {});

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (delay: number) => {
      clearScheduled();
      if (unmountedRef.current) {
        return;
      }
      timeoutRef.current = setTimeout(() => {
        void runRef.current();
      }, delay);
    },
    [clearScheduled],
  );

  const run = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsPolling(true);

    try {
      const { response, json } = await fetcher(controller.signal);
      if (unmountedRef.current) {
        return;
      }

      onResponse?.(response);

      setData(json);
      setError(null);
      backoffRef.current = pollInterval;

      const terminal = isTerminal?.(json) ?? false;
      if (terminal || !enabled) {
        setIsPolling(false);
        return;
      }
      scheduleNext(backoffRef.current);
    } catch (err) {
      if (unmountedRef.current || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }

      setError(err instanceof Error ? err : new Error('Polling fetch failed'));
      backoffRef.current = Math.min(backoffRef.current * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);

      if (enabled) {
        scheduleNext(backoffRef.current);
      } else {
        setIsPolling(false);
      }
    }
  }, [fetcher, enabled, pollInterval, isTerminal, onResponse, scheduleNext]);

  runRef.current = run;

  const refetch = useCallback(() => {
    clearScheduled();
    void run();
  }, [clearScheduled, run]);

  useEffect(() => {
    unmountedRef.current = false;
    backoffRef.current = pollInterval;

    if (!enabled) {
      setIsPolling(false);
      return;
    }

    void run();

    return () => {
      unmountedRef.current = true;
      clearScheduled();
      controllerRef.current?.abort();
    };
  }, [run, enabled, pollInterval, clearScheduled]);

  return { data, error, isPolling, refetch };
}
