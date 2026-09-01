import { describe, expect, it } from 'vitest';
import {
  encodeBalanceOfCall,
  encodeTransferData,
  fromTokenAmount,
  toHexQuantity,
  toTokenAmount,
} from '../src/erc20.js';

describe('toTokenAmount', () => {
  it('converts a whole-number amount', () => {
    expect(toTokenAmount('10', 6)).toBe(10_000_000n);
  });

  it('converts a fractional amount without floating-point drift', () => {
    expect(toTokenAmount('10.5', 6)).toBe(10_500_000n);
  });

  it('truncates fraction digits beyond the token decimals', () => {
    expect(toTokenAmount('1.123456789', 6)).toBe(1_123_456n);
  });

  it('handles 18-decimal amounts', () => {
    expect(toTokenAmount('1', 18)).toBe(1_000_000_000_000_000_000n);
  });
});

describe('encodeTransferData', () => {
  it('encodes the transfer(address,uint256) selector and padded args', () => {
    const data = encodeTransferData('0xB4DB02f8c4b5159e5368CE4749fD9344a333997', 10_000_000n);
    expect(data).toMatch(/^0xa9059cbb/);
    expect(data).toHaveLength(2 + 8 + 64 + 64);
  });

  it('rejects a negative amount', () => {
    expect(() => encodeTransferData('0xB4DB02f8c4b5159e5368CE4749fD9344a333997', -1n)).toThrow();
  });
});

describe('toHexQuantity', () => {
  it('renders a 0x-prefixed hex quantity', () => {
    expect(toHexQuantity(255n)).toBe('0xff');
  });
});

describe('encodeBalanceOfCall', () => {
  it('encodes the balanceOf(address) selector and padded arg', () => {
    const data = encodeBalanceOfCall('0xB4DB02f8c4b5159e5368CE4749fD9344a333997');
    expect(data).toMatch(/^0x70a08231/);
    expect(data).toHaveLength(2 + 8 + 64);
  });
});

describe('fromTokenAmount', () => {
  it('is the inverse of toTokenAmount for a fractional amount', () => {
    expect(fromTokenAmount(10_500_000n, 6)).toBe('10.5');
  });

  it('formats a whole-number amount with no trailing decimal point', () => {
    expect(fromTokenAmount(10_000_000n, 6)).toBe('10');
  });

  it('handles a balance smaller than one whole unit', () => {
    expect(fromTokenAmount(500n, 6)).toBe('0.0005');
  });

  it('handles zero', () => {
    expect(fromTokenAmount(0n, 6)).toBe('0');
  });
});
