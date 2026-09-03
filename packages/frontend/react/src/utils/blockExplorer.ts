const EXPLORER_BASE_URLS: Record<string, string> = {
  arbitrum: "https://arbiscan.io",
  avalanche: "https://snowscan.xyz",
  base: "https://basescan.org",
  bep20: "https://bscscan.com",
  erc20: "https://etherscan.io",
  polygon: "https://polygonscan.com",
};

export function explorerTokenUrl(
  network: string,
  tokenAddress: string,
): string | undefined {
  const base = EXPLORER_BASE_URLS[network];
  return base ? `${base}/token/${tokenAddress}` : undefined;
}

export function explorerTxUrl(network: string, txHash: string): string | undefined {
  const base = EXPLORER_BASE_URLS[network];
  return base ? `${base}/tx/${txHash}` : undefined;
}
