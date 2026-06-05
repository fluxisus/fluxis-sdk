import { describe, expect, it } from 'vitest';
import { NaspipResource } from '../src/resources/naspip.js';

describe('NaspipResource.isValidTokenFormat', () => {
  // Create a minimal mock client
  const mockClient = {} as Parameters<typeof NaspipResource extends new (c: infer C) => unknown ? never : never>[0];
  const naspip = new NaspipResource(mockClient as never);

  it('returns true for valid PASETO v4 token prefix', () => {
    expect(naspip.isValidTokenFormat('v4.local.abc123xyz')).toBe(true);
    expect(naspip.isValidTokenFormat('v4.local.Gx1TZT3STnhzZ-0o')).toBe(true);
  });

  it('returns false for invalid formats', () => {
    expect(naspip.isValidTokenFormat('v3.local.abc')).toBe(false);
    expect(naspip.isValidTokenFormat('not-a-token')).toBe(false);
    expect(naspip.isValidTokenFormat('')).toBe(false);
  });
});
