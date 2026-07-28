export function formatFiatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  try {
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(num);
    return `${formatted} ${currency}`;
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatExpiryTime(expiresAt: string): string {
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return expiresAt;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncateAddress(address: string, chars = 4): string {
  const prefixLength = 2 + chars; // e.g. "0x" + chars
  if (address.length <= prefixLength + chars) return address;
  return `${address.slice(0, prefixLength)}…${address.slice(-chars)}`;
}
