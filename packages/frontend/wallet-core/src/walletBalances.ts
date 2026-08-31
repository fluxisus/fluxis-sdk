import { chainForNetwork } from './chains.js';
import { fromTokenAmount } from './erc20.js';
import { fetchErc20Balance, fetchNativeBalance } from './rpc.js';

/** Structurally matches `CheckoutPaymentOption` from `@fluxisus/react` without depending on it. */
export interface WalletBalancePaymentOption {
  unique_asset_id: string;
  symbol: string;
  network: string;
}

export interface WalletBalanceResult {
  uniqueAssetId: string;
  /** Formatted (decimals already applied), e.g. "125.40". */
  balance: string;
}

export interface ResolveErc20Fn {
  (params: { cryptoAsset: string; network: string }): Promise<
    { tokenAddress: string; decimals: number } | undefined
  >;
}

/**
 * Builds a `getWalletBalances` function that queries each payment option's chain via its default
 * *public* RPC endpoint (`chains.ts`'s `rpcUrls[0]`). This is a convenience default, not the only
 * option — pass your own `getWalletBalances` to `useHostedCheckoutWallet` instead if you run your
 * own node or a paid RPC provider; nothing about the wallet-connection flow depends on this one.
 */
export function createPublicRpcBalanceFetcher(resolveErc20: ResolveErc20Fn) {
  return async function getWalletBalances({
    address,
    paymentOptions,
  }: {
    address: string;
    paymentOptions: WalletBalancePaymentOption[];
  }): Promise<WalletBalanceResult[]> {
    const entries = await Promise.all(
      paymentOptions.map(async (option): Promise<WalletBalanceResult | undefined> => {
        const chain = chainForNetwork(option.network);
        if (!chain) return undefined;
        const rpcUrl = chain.rpcUrls[0];
        if (!rpcUrl) return undefined;
        try {
          const erc20 = await resolveErc20({ cryptoAsset: option.symbol, network: option.network });
          const raw = erc20
            ? await fetchErc20Balance(rpcUrl, erc20.tokenAddress, address)
            : await fetchNativeBalance(rpcUrl, address);
          const decimals = erc20 ? erc20.decimals : chain.nativeCurrency.decimals;
          return { uniqueAssetId: option.unique_asset_id, balance: fromTokenAmount(raw, decimals) };
        } catch {
          // One option's balance failing to load shouldn't hide the others.
          return undefined;
        }
      }),
    );

    const resolved = entries.filter((entry): entry is WalletBalanceResult => entry !== undefined);
    resolved.sort((a, b) => Number.parseFloat(b.balance) - Number.parseFloat(a.balance));
    return resolved;
  };
}
