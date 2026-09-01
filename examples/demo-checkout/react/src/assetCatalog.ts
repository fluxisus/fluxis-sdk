import { parseUniqueAssets } from '@fluxisus/react';
import type { ResolvedErc20 } from '@fluxisus/react-wallet';

/**
 * Resolves token_address/decimals for `useHostedCheckoutWallet`'s `resolveErc20` option by
 * fetching the same unique-asset catalog passed as `uniqueAssetsUrl` to HostedCheckoutWidget.
 * Cached per catalog URL — the catalog rarely changes and every asset selection would otherwise
 * re-fetch it.
 */
export function createErc20Resolver(catalogUrl: string) {
  let catalog: Promise<ReturnType<typeof parseUniqueAssets>> | undefined;

  return async ({
    cryptoAsset,
    network,
  }: {
    cryptoAsset: string;
    network: string;
  }): Promise<ResolvedErc20 | undefined> => {
    if (!catalog) {
      catalog = fetch(catalogUrl)
        .then((response) => response.json())
        .then(parseUniqueAssets)
        .catch(() => []);
    }
    const assets = await catalog;
    const match = assets.find(
      (asset) => asset.token_symbol === cryptoAsset && asset.network === network,
    );
    if (!match?.token_address) return undefined;
    return { tokenAddress: match.token_address, decimals: match.decimals };
  };
}
