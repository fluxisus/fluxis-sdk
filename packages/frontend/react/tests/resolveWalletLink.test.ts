import { describe, expect, it } from 'vitest';
import {
  checkoutHostPath,
  hasTransferPlaceholders,
  resolveWalletLink,
} from '../src/hosted/resolveWalletLink.js';

const TOKEN = 'naspip;token+special';
const CHECKOUT = 'https://checkout.stgfluxis.us/checkout/pay/abc';

const TRANSFER = {
  address: '0x65d31D030b91f2cA3660a50F31041FE5F410C3ab',
  network: 'polygon',
  asset: 'USDT',
  amount: '59.371585',
  networkMap: { polygon: 'POLYGON' },
};

describe('checkoutHostPath', () => {
  it('strips https://', () => {
    expect(checkoutHostPath(CHECKOUT)).toBe('checkout.stgfluxis.us/checkout/pay/abc');
  });

  it('strips http://', () => {
    expect(checkoutHostPath('http://localhost:5173/checkout/pay/abc')).toBe(
      'localhost:5173/checkout/pay/abc',
    );
  });
});

describe('hasTransferPlaceholders', () => {
  it('returns true when the template uses [ADDRESS]', () => {
    expect(hasTransferPlaceholders('https://example.com?addr=[ADDRESS]')).toBe(true);
  });

  it('returns true for [NETWORK], [ASSET], [AMOUNT]', () => {
    expect(hasTransferPlaceholders('[NETWORK]')).toBe(true);
    expect(hasTransferPlaceholders('[ASSET]')).toBe(true);
    expect(hasTransferPlaceholders('[AMOUNT]')).toBe(true);
  });

  it('returns false for legacy NASPIP / checkout-URL templates', () => {
    expect(hasTransferPlaceholders('[NASPIP_TOKEN]')).toBe(false);
    expect(hasTransferPlaceholders('[CHECKOUT_URL]')).toBe(false);
    expect(hasTransferPlaceholders('[CHECKOUT_HOST_PATH]')).toBe(false);
  });

  it('returns false for a plain URL', () => {
    expect(hasTransferPlaceholders('https://example.com/pay')).toBe(false);
  });
});

describe('resolveWalletLink — legacy placeholders', () => {
  it('encodes the NASPIP token for CEFI templates', () => {
    const template =
      'https://api.belo.app/dynamic-link?route=qri-scanner&naspip_token=[NASPIP_TOKEN]';
    expect(resolveWalletLink(template, { naspipToken: TOKEN })).toBe(
      'https://api.belo.app/dynamic-link?route=qri-scanner&naspip_token=naspip%3Btoken%2Bspecial',
    );
  });

  it('encodes CHECKOUT_URL for Trust/Phantom/Base templates', () => {
    const template = 'https://link.trustwallet.com/open_url?url=[CHECKOUT_URL]';
    expect(resolveWalletLink(template, { checkoutUrl: CHECKOUT })).toBe(
      `https://link.trustwallet.com/open_url?url=${encodeURIComponent(CHECKOUT)}`,
    );
  });

  it('substitutes CHECKOUT_HOST_PATH without encoding for MetaMask dapp links', () => {
    const template = 'https://metamask.app.link/dapp/[CHECKOUT_HOST_PATH]';
    expect(resolveWalletLink(template, { checkoutUrl: CHECKOUT })).toBe(
      'https://metamask.app.link/dapp/checkout.stgfluxis.us/checkout/pay/abc',
    );
  });
});

describe('resolveWalletLink — session-field placeholders', () => {
  const LEMON_TEMPLATE =
    'https://www.lemon.me/app/cash-out-crypto?network=[NETWORK]&address=[ADDRESS]&currency=[ASSET]&amount=[AMOUNT]&partner=fluxis';

  it('builds the Lemon URL from a polygon:USDT transfer', () => {
    expect(resolveWalletLink(LEMON_TEMPLATE, { transfer: TRANSFER })).toBe(
      'https://www.lemon.me/app/cash-out-crypto?network=POLYGON&address=0x65d31D030b91f2cA3660a50F31041FE5F410C3ab&currency=USDT&amount=59.371585&partner=fluxis',
    );
  });

  it('applies the networkMap to translate "polygon" to "POLYGON"', () => {
    const url = resolveWalletLink(LEMON_TEMPLATE, { transfer: TRANSFER });
    expect(url).toContain('network=POLYGON');
  });

  it('falls back to the raw network name when networkMap has no entry', () => {
    const url = resolveWalletLink(LEMON_TEMPLATE, {
      transfer: { ...TRANSFER, network: 'base', networkMap: {} },
    });
    expect(url).toContain('network=base');
  });

  it('falls back to the raw network name when networkMap is omitted', () => {
    const { networkMap: _, ...noMap } = TRANSFER;
    const url = resolveWalletLink(LEMON_TEMPLATE, { transfer: noMap });
    expect(url).toContain('network=polygon');
  });

  it('strips comma thousands separators from the amount', () => {
    const url = resolveWalletLink(LEMON_TEMPLATE, {
      transfer: { ...TRANSFER, amount: '1,234.56' },
    });
    expect(url).toContain('amount=1234.56');
  });

  it('leaves the template unchanged when no transfer is provided', () => {
    const url = resolveWalletLink(LEMON_TEMPLATE, {});
    expect(url).toBe(LEMON_TEMPLATE);
  });

  it('percent-encodes address characters that need escaping', () => {
    const url = resolveWalletLink(LEMON_TEMPLATE, {
      transfer: { ...TRANSFER, address: '0xAbc + def' },
    });
    // encodeURIComponent encodes space as %20 (not +)
    expect(url).toContain('address=0xAbc%20%2B%20def');
  });

  it('can combine legacy and session-field placeholders in one call', () => {
    const hybrid = '[NASPIP_TOKEN]?addr=[ADDRESS]';
    const url = resolveWalletLink(hybrid, {
      naspipToken: 'tok',
      transfer: { ...TRANSFER },
    });
    expect(url).toBe(
      `tok?addr=${encodeURIComponent(TRANSFER.address)}`,
    );
  });
});
