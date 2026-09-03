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

function fakeTxHash(): string {
  const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export interface SimulatedPayResult {
  error?: string;
  txHash?: string;
}

export function simulatePayWithWallet(
  delayMs: number,
  forceError: boolean,
  log: EventLogger,
): Promise<SimulatedPayResult> {
  log('onPayWithWallet');
  return delay(delayMs).then(() => {
    if (forceError) {
      const message = 'La wallet rechazó la transacción';
      log('onPayWithWallet failed', message);
      return { error: message };
    }
    const txHash = fakeTxHash();
    log('onPayWithWallet resolved', txHash);
    return { txHash };
  });
}

export function simulateRetryExpired(delayMs: number, log: EventLogger): Promise<void> {
  log('onRetryExpired');
  return delay(delayMs).then(() => {
    log('onRetryExpired resolved');
  });
}
