/**
 * EIP-6963 "Multi Injected Provider Discovery" — the standard way to enumerate every wallet
 * extension injected into the page (replaces the old single `window.ethereum` guess, which broke
 * as soon as a user had more than one extension installed). See https://eips.ethereum.org/EIPS/eip-6963.
 */
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  /** Reverse-DNS id, e.g. "io.metamask" — stable across a wallet's releases, unlike `name`. */
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP6963AnnounceProviderEvent extends Event {
  detail: EIP6963ProviderDetail;
}

/**
 * Maps a provider's `rdns` to the `name` used by the Fluxis wallet catalog
 * (https://assets.fluxis.us/sdk-assets/compatible-apps.json), so `installedWalletNames` lines up
 * with `installedWalletNames.includes(catalogApp.name)` in DefiWalletPanel. Extend this table as
 * the catalog grows — an unmapped rdns is simply not reported as "installed".
 */
export const RDNS_TO_CATALOG_NAME: Record<string, string> = {
  'io.metamask': 'metamask',
  'io.rabby': 'rabby',
  'com.trustwallet.app': 'trust',
  'com.coinbase.wallet': 'coinbase_wallet',
};

/**
 * Listens for EIP-6963 announcements and reports every discovered provider. Fires the discovery
 * request event immediately (providers that already loaded will (re-)announce in response) and
 * keeps listening for late announcements (extensions can inject after page load).
 *
 * Returns an unsubscribe function — call it on unmount to avoid updating state after teardown.
 */
export function listenForProviders(
  onProvider: (detail: EIP6963ProviderDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleAnnounce = (event: Event) => {
    onProvider((event as EIP6963AnnounceProviderEvent).detail);
  };

  window.addEventListener('eip6963:announceProvider', handleAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  return () => window.removeEventListener('eip6963:announceProvider', handleAnnounce);
}

export function catalogNameForProvider(detail: EIP6963ProviderDetail): string | undefined {
  return RDNS_TO_CATALOG_NAME[detail.info.rdns];
}
