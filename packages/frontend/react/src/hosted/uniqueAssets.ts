import type { CheckoutPaymentOption, ManualTransferData } from '../types.js';
import { capitalizeFirst } from '../utils/checkoutFormat.js';

export interface UniqueAsset {
  unique_asset_id: string;
  token_symbol: string;
  network: string;
  network_name: string;
  token_address: string;
  reference_asset: string;
  reference_country: string;
  decimals: number;
  payment_decimals: number;
  token_image_url: string;
  network_image_url: string;
}

export interface UniqueToken {
  symbol: string;
  imageUrl: string;
  referenceCountry: string;
  referenceAsset: string;
  assets: UniqueAsset[];
}

export interface UniqueCountry {
  code: string;
  name: string;
  tokens: UniqueToken[];
}

export interface UniqueNetwork {
  network: string;
  networkName: string;
  imageUrl: string;
  asset: UniqueAsset;
}

const PRIORITY_SYMBOLS = ['USDT', 'USDC'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function parseUniqueAssets(raw: unknown): UniqueAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const unique_asset_id = readString(entry.unique_asset_id);
    const token_symbol = readString(entry.token_symbol);
    const network = readString(entry.network);
    if (!unique_asset_id || !token_symbol || !network) return [];
    return [
      {
        unique_asset_id,
        token_symbol,
        network,
        network_name: readString(entry.network_name) || capitalizeFirst(network),
        token_address: readString(entry.token_address),
        reference_asset: readString(entry.reference_asset),
        reference_country: readString(entry.reference_country).toUpperCase(),
        decimals: readNumber(entry.decimals),
        payment_decimals: readNumber(entry.payment_decimals),
        token_image_url: readString(entry.token_image_url),
        network_image_url: readString(entry.network_image_url),
      },
    ];
  });
}

export function compareTokenSymbols(a: string, b: string): number {
  const ai = PRIORITY_SYMBOLS.indexOf(a.toUpperCase());
  const bi = PRIORITY_SYMBOLS.indexOf(b.toUpperCase());
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

export function uniqueTokens(assets: UniqueAsset[]): UniqueToken[] {
  const bySymbol = new Map<string, UniqueToken>();
  for (const asset of assets) {
    const key = asset.token_symbol;
    const existing = bySymbol.get(key);
    if (existing) {
      existing.assets.push(asset);
      continue;
    }
    bySymbol.set(key, {
      symbol: asset.token_symbol,
      imageUrl: asset.token_image_url,
      referenceCountry: asset.reference_country,
      referenceAsset: asset.reference_asset,
      assets: [asset],
    });
  }
  return [...bySymbol.values()].sort((a, b) => compareTokenSymbols(a.symbol, b.symbol));
}

export function countryDisplayName(code: string, locale = 'es'): string {
  if (!code) return 'Otros';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

const PRIORITY_COUNTRIES = ['AR', 'US'];

export function tokensByCountry(tokens: UniqueToken[]): UniqueCountry[] {
  const byCode = new Map<string, UniqueToken[]>();
  for (const token of tokens) {
    const code = token.referenceCountry || 'XX';
    const list = byCode.get(code);
    if (list) list.push(token);
    else byCode.set(code, [token]);
  }
  return [...byCode.entries()]
    .map(([code, countryTokens]) => ({
      code,
      name: countryDisplayName(code),
      tokens: countryTokens,
    }))
    .sort((a, b) => {
      const ai = PRIORITY_COUNTRIES.indexOf(a.code);
      const bi = PRIORITY_COUNTRIES.indexOf(b.code);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
}

export function networksForSymbol(assets: UniqueAsset[], symbol: string): UniqueNetwork[] {
  const matches = assets.filter((asset) => asset.token_symbol === symbol);
  const byNetwork = new Map<string, UniqueNetwork>();
  for (const asset of matches) {
    if (byNetwork.has(asset.network)) continue;
    byNetwork.set(asset.network, {
      network: asset.network,
      networkName: asset.network_name,
      imageUrl: asset.network_image_url,
      asset,
    });
  }
  return [...byNetwork.values()].sort((a, b) =>
    a.networkName.localeCompare(b.networkName, 'es', { sensitivity: 'base' }),
  );
}

export function findAsset(
  assets: UniqueAsset[],
  symbol: string,
  network: string,
): UniqueAsset | undefined {
  return assets.find((asset) => asset.token_symbol === symbol && asset.network === network);
}

function synthesizeOption(option: CheckoutPaymentOption): UniqueAsset {
  return {
    unique_asset_id: option.unique_asset_id,
    token_symbol: option.symbol,
    network: option.network,
    network_name: capitalizeFirst(option.network),
    token_address: '',
    reference_asset: '',
    reference_country: '',
    decimals: 0,
    payment_decimals: 0,
    token_image_url: '',
    network_image_url: '',
  };
}

function synthesizeTransfer(transfer: ManualTransferData): UniqueAsset {
  return {
    unique_asset_id: '',
    token_symbol: transfer.crypto_asset,
    network: transfer.network,
    network_name: capitalizeFirst(transfer.network),
    token_address: '',
    reference_asset: transfer.reference_currency ?? '',
    reference_country: '',
    decimals: 0,
    payment_decimals: 0,
    token_image_url: '',
    network_image_url: '',
  };
}

/**
 * Prefer the CDN catalog, intersected with the session's payable options when the API sent them.
 * Falls back to synthesizing rows from `payment_options` / `manual_transfer` so the picker still
 * works if the catalog request fails.
 */
export function resolvePayableAssets(
  catalog: UniqueAsset[],
  paymentOptions?: CheckoutPaymentOption[],
  transfer?: ManualTransferData,
): UniqueAsset[] {
  if (paymentOptions?.length) {
    const byId = new Map(catalog.map((asset) => [asset.unique_asset_id, asset]));
    return paymentOptions.map((option) => byId.get(option.unique_asset_id) ?? synthesizeOption(option));
  }
  if (catalog.length) return catalog;
  if (transfer) return [synthesizeTransfer(transfer)];
  return [];
}
