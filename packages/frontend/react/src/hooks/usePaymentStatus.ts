import { useCallback } from 'react';
import { usePollingFetch } from './internal/usePollingFetch.js';
import { useServerTimeOffset } from './useServerTimeOffset.js';
import { extractPaymentStatus, isTerminalPaymentStatus } from '../utils/paymentStatus.js';

export interface UsePaymentStatusOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export interface UsePaymentStatusResult {
  status: string | null;
  data: unknown;
  error: Error | null;
  isPolling: boolean;
  refetch: () => void;
}

/**
 * Polls a merchant-supplied backend route for payment status. Never calls
 * the Fluxis API directly and accepts no credentials — the merchant backend
 * is responsible for proxying `pointOfSale.getPaymentRequest()`.
 */
export function usePaymentStatus(
  statusUrl: string,
  options: UsePaymentStatusOptions = {},
): UsePaymentStatusResult {
  const { setOffsetMs } = useServerTimeOffset();

  const fetchStatus = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetch(statusUrl, { signal });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch payment status (${response.status} ${response.statusText})`,
        );
      }
      const json = await response.json();
      return { response, json };
    },
    [statusUrl],
  );

  const applyServerDateHeader = useCallback(
    (response: Response) => {
      const dateHeader = response.headers.get('date');
      if (!dateHeader) {
        return;
      }
      const parsed = Date.parse(dateHeader);
      if (Number.isNaN(parsed)) {
        return;
      }
      setOffsetMs(parsed - Date.now());
    },
    [setOffsetMs],
  );

  const isTerminal = useCallback(
    (json: unknown) => isTerminalPaymentStatus(extractPaymentStatus(json)),
    [],
  );

  const { data, error, isPolling, refetch } = usePollingFetch(fetchStatus, {
    pollInterval: options.pollInterval,
    enabled: options.enabled,
    onResponse: applyServerDateHeader,
    isTerminal,
  });

  return {
    status: extractPaymentStatus(data),
    data,
    error,
    isPolling,
    refetch,
  };
}
