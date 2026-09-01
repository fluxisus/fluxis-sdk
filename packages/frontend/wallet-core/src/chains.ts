/**
 * EVM-only v1. Keys match the `network` strings already used by `CheckoutSession.manual_transfer.network`
 * and by the unique-asset catalog (`unique_asset_ids.json`) — see packages/frontend/react/src/hosted/uniqueAssets.ts.
 * Extend this table (and, on the catalog side, the CDN JSON) before adding a new chain.
 */
export interface EvmChain {
  network: string;
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls?: string[];
}

export const EVM_CHAINS: Record<string, EvmChain> = {
  arbitrum: {
    network: 'arbitrum',
    chainId: 42161,
    chainName: 'Arbitrum One',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  base: {
    network: 'base',
    chainId: 8453,
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://basescan.org'],
  },
  polygon: {
    network: 'polygon',
    chainId: 137,
    chainName: 'Polygon',
    rpcUrls: ['https://polygon-rpc.com'],
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    blockExplorerUrls: ['https://polygonscan.com'],
  },
};

export function chainForNetwork(network: string): EvmChain | undefined {
  return EVM_CHAINS[network];
}

export function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

export function eip155CaipChainId(chainId: number): string {
  return `eip155:${chainId}`;
}
