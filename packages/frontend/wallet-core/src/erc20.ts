/**
 * Hand-rolled ABI encoding for a single call — `transfer(address,uint256)` — so this package
 * doesn't need viem/ethers just to build one calldata string. `0xa9059cbb` is the well-known
 * 4-byte selector for `transfer(address,uint256)` (keccak256 of the signature, first 4 bytes);
 * it's the same on every EVM chain and every ERC-20 token, so it's safe to hardcode rather than
 * compute at runtime.
 */
const TRANSFER_SELECTOR = 'a9059cbb';

/** 4-byte selector for `balanceOf(address)` — same rationale as `TRANSFER_SELECTOR` above. */
const BALANCE_OF_SELECTOR = '70a08231';

function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}

function padLeft(hex: string, length: number): string {
  return hex.padStart(length, '0');
}

/**
 * Converts a decimal-string amount (e.g. "10.50", as carried on `ManualTransferData.crypto_amount`)
 * into the token's smallest unit, using plain BigInt integer math throughout so a large amount or
 * an unusual `decimals` value never loses precision the way `Number` parsing would.
 */
export function toTokenAmount(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart = '0', fractionPart = ''] = unsigned.split('.');
  const fraction = fractionPart.slice(0, decimals).padEnd(decimals, '0');
  const digits = `${wholePart}${fraction}` || '0';
  const value = BigInt(digits);
  return negative ? -value : value;
}

/** Encodes `transfer(address to, uint256 amount)` calldata for an ERC-20 `eth_sendTransaction`. */
export function encodeTransferData(to: string, amount: bigint): string {
  if (amount < 0n) throw new Error('encodeTransferData: amount must not be negative');
  const addressWord = padLeft(stripHexPrefix(to).toLowerCase(), 64);
  const amountWord = padLeft(amount.toString(16), 64);
  return `0x${TRANSFER_SELECTOR}${addressWord}${amountWord}`;
}

export function toHexQuantity(amount: bigint): string {
  return `0x${amount.toString(16)}`;
}

/** Encodes `balanceOf(address owner)` calldata for an `eth_call`. */
export function encodeBalanceOfCall(owner: string): string {
  const addressWord = padLeft(stripHexPrefix(owner).toLowerCase(), 64);
  return `0x${BALANCE_OF_SELECTOR}${addressWord}`;
}

/**
 * Inverse of `toTokenAmount`: formats a smallest-unit balance back into a decimal string, trimming
 * trailing fraction zeros (and the decimal point itself when the result is a whole number).
 */
export function fromTokenAmount(amount: bigint, decimals: number): string {
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount).toString().padStart(decimals + 1, '0');
  const wholePart = digits.slice(0, digits.length - decimals) || '0';
  const fractionPart = decimals > 0 ? digits.slice(digits.length - decimals) : '';
  const trimmedFraction = fractionPart.replace(/0+$/, '');
  const formatted = trimmedFraction ? `${wholePart}.${trimmedFraction}` : wholePart;
  return negative ? `-${formatted}` : formatted;
}
