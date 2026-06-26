export const TERMINAL_PAYMENT_STATUSES = new Set([
  'completed',
  'expired',
  'failed',
  'overpaid',
  'underpaid',
]);

export function isTerminalPaymentStatus(status: string | null): boolean {
  return status !== null && TERMINAL_PAYMENT_STATUSES.has(status);
}

export function extractPaymentStatus(json: unknown): string | null {
  if (
    typeof json === 'object' &&
    json !== null &&
    'status' in json &&
    typeof (json as { status: unknown }).status === 'string'
  ) {
    return (json as { status: string }).status;
  }
  return null;
}
