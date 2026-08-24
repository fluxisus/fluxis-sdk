import { describe, expect, it } from 'vitest';
import {
  compareTokenSymbols,
  networksForSymbol,
  parseUniqueAssets,
  resolvePayableAssets,
  tokensByCountry,
  uniqueTokens,
} from '../src/hosted/uniqueAssets.js';

const RAW = [
  {
    unique_asset_id: 'nbase_t0xusdc',
    token_symbol: 'USDC',
    network: 'base',
    network_name: 'Base',
    token_address: '0xusdc',
    reference_asset: 'USD',
    reference_country: 'US',
    token_image_url: 'https://assets.fluxis.us/tokens/usdc.png',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
  {
    unique_asset_id: 'npolygon_t0xusdc',
    token_symbol: 'USDC',
    network: 'polygon',
    network_name: 'Polygon PoS',
    token_address: '0xusdc-poly',
    reference_asset: 'USD',
    reference_country: 'US',
    token_image_url: 'https://assets.fluxis.us/tokens/usdc.png',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/polygon.png',
  },
  {
    unique_asset_id: 'npolygon_t0xusdt',
    token_symbol: 'USDT',
    network: 'polygon',
    network_name: 'Polygon PoS',
    token_address: '0xusdt',
    reference_asset: 'USD',
    reference_country: 'US',
    token_image_url: 'https://assets.fluxis.us/tokens/usdt.png',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/polygon.png',
  },
  {
    unique_asset_id: 'nbase_t0xwars',
    token_symbol: 'wARS',
    network: 'base',
    network_name: 'Base',
    token_address: '0xwars',
    reference_asset: 'ARS',
    reference_country: 'AR',
    token_image_url: 'https://assets.fluxis.us/tokens/wARS.svg',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
  {
    unique_asset_id: 'nbase_t0xargt',
    token_symbol: 'ARGt',
    network: 'base',
    network_name: 'Base',
    token_address: '0xargt',
    reference_asset: 'ARS',
    reference_country: 'AR',
    token_image_url: 'https://assets.fluxis.us/tokens/ARGt.svg',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
  {
    unique_asset_id: 'nbase_t0xwbrl',
    token_symbol: 'wBRL',
    network: 'base',
    network_name: 'Base',
    token_address: '0xwbrl',
    reference_asset: 'BRL',
    reference_country: 'BR',
    token_image_url: 'https://assets.fluxis.us/tokens/wBRL.svg',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
];

describe('uniqueAssets', () => {
  const assets = parseUniqueAssets(RAW);

  it('drops entries missing the identity fields', () => {
    expect(parseUniqueAssets([{ token_symbol: 'USDC' }])).toEqual([]);
    expect(parseUniqueAssets({})).toEqual([]);
  });

  it('dedupes by token_symbol and puts USDT/USDC first', () => {
    const tokens = uniqueTokens(assets);
    expect(tokens.map((token) => token.symbol)).toEqual(['USDT', 'USDC', 'ARGt', 'wARS', 'wBRL']);
    expect(tokens.find((token) => token.symbol === 'USDC')?.assets).toHaveLength(2);
  });

  it('sorts remaining symbols alphabetically after the USD stables', () => {
    expect(compareTokenSymbols('wBRL', 'ARGt')).toBeGreaterThan(0);
    expect(compareTokenSymbols('USDT', 'wARS')).toBeLessThan(0);
    expect(compareTokenSymbols('USDT', 'USDC')).toBeLessThan(0);
  });

  it('groups unique tokens by reference_country', () => {
    const countries = tokensByCountry(uniqueTokens(assets));
    expect(countries.map((country) => country.code)).toEqual(['AR', 'US', 'BR']);
    expect(countries.find((country) => country.code === 'AR')?.tokens.map((t) => t.symbol)).toEqual([
      'ARGt',
      'wARS',
    ]);
    expect(countries.find((country) => country.code === 'US')?.tokens.map((t) => t.symbol)).toEqual([
      'USDT',
      'USDC',
    ]);
  });

  it('lists each network once for a selected symbol', () => {
    const networks = networksForSymbol(assets, 'USDC');
    expect(networks.map((item) => item.network)).toEqual(['base', 'polygon']);
    expect(networks.find((item) => item.network === 'polygon')?.asset.unique_asset_id).toBe(
      'npolygon_t0xusdc',
    );
  });

  it('intersects the catalog with session payment_options', () => {
    const payable = resolvePayableAssets(assets, [
      { unique_asset_id: 'npolygon_t0xusdc', symbol: 'USDC', network: 'polygon' },
    ]);
    expect(payable).toHaveLength(1);
    expect(payable[0]?.token_image_url).toContain('usdc.png');
  });

  it('synthesizes a row when the catalog is missing an option', () => {
    const payable = resolvePayableAssets([], [
      { unique_asset_id: 'npolygon_t0xusdc', symbol: 'USDC', network: 'polygon' },
    ]);
    expect(payable).toEqual([
      expect.objectContaining({
        unique_asset_id: 'npolygon_t0xusdc',
        token_symbol: 'USDC',
        network: 'polygon',
        network_name: 'Polygon',
      }),
    ]);
  });
});
