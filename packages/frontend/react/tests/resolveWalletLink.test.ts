import { describe, expect, it } from 'vitest';
import { checkoutHostPath, resolveWalletLink } from '../src/hosted/resolveWalletLink.js';

const TOKEN = 'naspip;token+special';
const CHECKOUT = 'https://checkout.stgfluxis.us/checkout/pay/abc';

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

describe('resolveWalletLink', () => {
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
