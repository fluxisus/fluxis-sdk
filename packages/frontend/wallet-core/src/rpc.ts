import { encodeBalanceOfCall } from './erc20.js';

/**
 * Raw JSON-RPC over `fetch` against a chain's public RPC endpoint — deliberately NOT routed through
 * the connected wallet's EIP-1193 provider. A provider only answers for whatever chain the wallet is
 * currently switched to, so checking balances across several candidate networks (as
 * `useHostedCheckoutWallet` does for `session.payment_options`) would otherwise mean repeatedly
 * prompting the wallet to switch networks just to read a balance. Public RPC calls need no wallet
 * interaction and can run in parallel.
 */
async function jsonRpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: string; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? `RPC error calling ${method}`);
  if (typeof body.result !== 'string') throw new Error(`RPC call ${method} returned no result`);
  return body.result;
}

export async function fetchNativeBalance(rpcUrl: string, address: string): Promise<bigint> {
  const result = await jsonRpcCall(rpcUrl, 'eth_getBalance', [address, 'latest']);
  return BigInt(result);
}

export async function fetchErc20Balance(
  rpcUrl: string,
  tokenAddress: string,
  ownerAddress: string,
): Promise<bigint> {
  const result = await jsonRpcCall(rpcUrl, 'eth_call', [
    { to: tokenAddress, data: encodeBalanceOfCall(ownerAddress) },
    'latest',
  ]);
  return BigInt(result);
}
