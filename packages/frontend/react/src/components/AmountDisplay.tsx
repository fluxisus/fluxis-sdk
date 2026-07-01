import type { AmountDisplayProps } from '../types.js';

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(num);
    return `${formatted} ${currency}`;
  } catch {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `${formatted} ${currency}`;
  }
}

export function AmountDisplay({ amount, currency, className }: AmountDisplayProps) {
  return (
    <div
      className={className}
      style={{
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        color: 'var(--fluxis-color-fg, #0f172a)',
      }}
    >
      {formatAmount(amount, currency)}
    </div>
  );
}
