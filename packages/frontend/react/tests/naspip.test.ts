import { describe, expect, it } from 'vitest';
import { buildDeepLink, isValidNaspipToken } from '../src/utils/naspip.js';

describe('isValidNaspipToken', () => {
  it('returns true for valid NASPIP tokens', () => {
    expect(isValidNaspipToken('naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.abc')).toBe(
      true,
    );
  });

  it('returns false for legacy v4.local tokens', () => {
    expect(isValidNaspipToken('v4.local.abc123')).toBe(false);
  });

  it('returns false for invalid tokens', () => {
    expect(isValidNaspipToken('invalid')).toBe(false);
    expect(isValidNaspipToken('')).toBe(false);
  });
});

describe('buildDeepLink', () => {
  it('replaces NASPIP_TOKEN placeholder with encoded token', () => {
    const token = 'naspip;token+special';
    const deepLink =
      'https://api.belo.app/dynamic-link?route=qri-scanner&naspip_token=[NASPIP_TOKEN]';

    expect(buildDeepLink(deepLink, token)).toBe(
      'https://api.belo.app/dynamic-link?route=qri-scanner&naspip_token=naspip%3Btoken%2Bspecial',
    );
  });
});
