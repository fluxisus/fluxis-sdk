/**
 * Fakes the wallet/WalletConnect side of a real host integration. `@fluxisus/react` makes no
 * network or chain calls of its own (see packages/frontend/CLAUDE.md) — a real host would drive
 * these from an actual wallet connection; here we just delay and optionally fail, so the widget's
 * loading/error states can be exercised without a browser wallet.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type EventLogger = (label: string, detail?: string) => void;

export function simulateSelectAsset(
  assetId: string,
  delayMs: number,
  forceError: boolean,
  log: EventLogger,
): Promise<void> {
  log('onSelectAsset', assetId);
  return delay(delayMs).then(() => {
    if (forceError) {
      log('onSelectAsset failed', assetId);
      throw new Error('simulated onSelectAsset failure');
    }
    log('onSelectAsset resolved', assetId);
  });
}

export function simulatePayWithWallet(
  delayMs: number,
  forceError: boolean,
  log: EventLogger,
): Promise<string | undefined> {
  log('onPayWithWallet');
  return delay(delayMs).then(() => {
    if (forceError) {
      const message = 'La wallet rechazó la transacción';
      log('onPayWithWallet failed', message);
      return message;
    }
    log('onPayWithWallet resolved');
    return undefined;
  });
}

export function simulateRetryExpired(delayMs: number, log: EventLogger): Promise<void> {
  log('onRetryExpired');
  return delay(delayMs).then(() => {
    log('onRetryExpired resolved');
  });
}
