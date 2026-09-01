import { describe, expect, it } from 'vitest';
import { chainForNetwork, eip155CaipChainId, toHexChainId } from '../src/chains.js';

describe('chainForNetwork', () => {
  it('resolves known networks used by manual_transfer.network / unique_asset_ids.json', () => {
    expect(chainForNetwork('polygon')?.chainId).toBe(137);
    expect(chainForNetwork('base')?.chainId).toBe(8453);
    expect(chainForNetwork('arbitrum')?.chainId).toBe(42161);
  });

  it('returns undefined for an unmapped network', () => {
    expect(chainForNetwork('solana')).toBeUndefined();
  });
});

describe('toHexChainId / eip155CaipChainId', () => {
  it('formats chain ids consistently', () => {
    expect(toHexChainId(137)).toBe('0x89');
    expect(eip155CaipChainId(137)).toBe('eip155:137');
  });
});
