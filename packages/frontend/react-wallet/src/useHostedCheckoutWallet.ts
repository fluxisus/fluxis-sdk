import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CheckoutPaymentOption,
  CheckoutSession,
  ConnectedWalletBalance,
  HostedCheckoutWidgetProps,
} from '@fluxisus/react';
import {
  catalogNameForProvider,
  chainForNetwork,
  encodeTransferData,
  listenForProviders,
  toHexChainId,
  toHexQuantity,
  toTokenAmount,
  WalletConnectConnector,
  type EIP1193Provider,
  type EIP6963ProviderDetail,
  type EvmChain,
} from '@fluxisus/wallet-core';

export interface ResolvedErc20 {
  tokenAddress: string;
  decimals: number;
}

export interface UseHostedCheckoutWalletOptions {
  /** WalletConnect Cloud / Reown project id. Required to offer the "Otras wallets" pairing flow. */
  walletConnectProjectId: string;
  walletConnectLogoUrl?: string;
  appName?: string;
  appUrl?: string;
  /**
   * Resolves the ERC-20 token address + decimals for `session.manual_transfer.crypto_asset` on
   * `session.manual_transfer.network`. Typically looks this up in the same unique-asset catalog
   * passed as `uniqueAssetsUrl` to HostedCheckoutWidget. Return `undefined` to send the chain's
   * native currency instead (e.g. ETH on Base) rather than an ERC-20 transfer.
   */
  resolveErc20: (params: { cryptoAsset: string; network: string }) => Promise<ResolvedErc20 | undefined>;
  /**
   * Fetches and sorts (highest balance first) the connected wallet's balances for
   * `session.payment_options`. Called once whenever a wallet connects. This hook never queries a
   * chain for balances itself — bring your own node/provider. `@fluxisus/wallet-core`'s
   * `createPublicRpcBalanceFetcher` is a ready-made implementation over public RPCs if you don't
   * need your own. Omit it, or return `[]`, to skip the balance-driven flow and let the shopper
   * always pick from `payment_options` manually.
   */
  getWalletBalances?: (params: {
    address: string;
    paymentOptions: CheckoutPaymentOption[];
  }) => Promise<ConnectedWalletBalance[]>;
}

type WalletConnectionProps = Pick<
  HostedCheckoutWidgetProps,
  | 'installedWalletNames'
  | 'walletConnectUri'
  | 'walletConnectLogoUrl'
  | 'onSelectWalletConnect'
  | 'onPrepareWalletConnect'
  | 'onLaunchExtension'
  | 'onPayWithWallet'
  | 'isPayingWithWallet'
  | 'payWithWalletError'
  | 'connectedWallet'
  | 'onDisconnectWallet'
  | 'walletBalances'
  | 'isLoadingWalletBalances'
>;

type ConnectedWallet =
  | { kind: 'extension'; provider: EIP1193Provider; address: string; label: string }
  | { kind: 'walletconnect'; topic: string; address: string; label: string };

interface EthProviderRpcError {
  code?: number;
}

/**
 * The connection itself is otherwise only in-memory React state, so a page reload — or, in dev,
 * any Vite HMR reload of a non-component module like this file — throws it away. Real wallet
 * connectors (MetaMask, WalletConnect) reconnect silently on load; this mirrors that by persisting
 * just enough to re-derive the connection without prompting the shopper again.
 */
const STORAGE_KEY = 'fluxis-checkout:connected-wallet';

interface PersistedConnection {
  kind: 'extension' | 'walletconnect';
  /** Catalog name (e.g. "metamask") used to re-find the EIP-6963 provider. Extension only. */
  walletName?: string;
  label: string;
}

function readPersistedConnection(): PersistedConnection | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedConnection) : undefined;
  } catch {
    return undefined;
  }
}

function writePersistedConnection(value: PersistedConnection | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private browsing, quota) — the connection just won't survive a reload.
  }
}

async function switchExtensionChain(provider: EIP1193Provider, chain: EvmChain): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHexChainId(chain.chainId) }],
    });
  } catch (switchError) {
    // 4902: wallet doesn't have this chain yet — offer to add it, then retry the switch.
    if ((switchError as EthProviderRpcError)?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: toHexChainId(chain.chainId),
            chainName: chain.chainName,
            rpcUrls: chain.rpcUrls,
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: chain.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Wires @fluxisus/wallet-core's EIP-6963 + WalletConnect primitives into the exact prop shape
 * `HostedCheckoutWidget` expects. Spread the result onto the widget:
 *
 *   const wallet = useHostedCheckoutWallet(session, { walletConnectProjectId, resolveErc20 });
 *   <HostedCheckoutWidget session={session} checkoutUrl={checkoutUrl} {...wallet} />
 *
 * Every returned callback is memoized (stable identity across renders) — HostedPendingScreen and
 * DefiWalletPanel in @fluxisus/react put onPrepareWalletConnect/onSelectWalletConnect in their own
 * useEffect dependency arrays, so a callback recreated on every render re-fires those effects.
 */
export function useHostedCheckoutWallet(
  session: CheckoutSession,
  options: UseHostedCheckoutWalletOptions,
): WalletConnectionProps {
  const providersRef = useRef<Map<string, EIP6963ProviderDetail>>(new Map());
  const [installedWalletNames, setInstalledWalletNames] = useState<string[]>([]);

  const [walletConnectUri, setWalletConnectUri] = useState<string | undefined>(undefined);
  const [connected, setConnected] = useState<ConnectedWallet | undefined>(undefined);
  const [isPayingWithWallet, setIsPayingWithWallet] = useState(false);
  const [payWithWalletError, setPayWithWalletError] = useState<string | undefined>(undefined);

  const connector = useMemo(
    () =>
      new WalletConnectConnector(options.walletConnectProjectId, {
        name: options.appName ?? 'Fluxis Checkout',
        description: 'Fluxis hosted checkout',
        url: options.appUrl ?? (typeof window !== 'undefined' ? window.location.origin : ''),
        icons: [],
      }),
    [options.walletConnectProjectId, options.appName, options.appUrl],
  );

  const extensionRestoreAttemptedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = listenForProviders((detail) => {
      const catalogName = catalogNameForProvider(detail);
      if (!catalogName) return;
      providersRef.current.set(catalogName, detail);
      setInstalledWalletNames(Array.from(providersRef.current.keys()));

      // Silent reconnect: `eth_accounts` (unlike `eth_requestAccounts`) never prompts — it just
      // reports whether this site is still authorized, which is exactly what a reload needs to
      // restore the connection without asking the shopper to approve again.
      const persisted = readPersistedConnection();
      if (
        extensionRestoreAttemptedRef.current ||
        persisted?.kind !== 'extension' ||
        persisted.walletName !== catalogName
      ) {
        return;
      }
      extensionRestoreAttemptedRef.current = true;
      detail.provider
        .request({ method: 'eth_accounts' })
        .then((accounts) => {
          const address = (accounts as string[])[0];
          if (address) {
            setConnected({ kind: 'extension', provider: detail.provider, address, label: persisted.label });
          } else {
            writePersistedConnection(undefined);
          }
        })
        .catch(() => {});
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const persisted = readPersistedConnection();
    if (persisted?.kind !== 'walletconnect') return;
    // SignClient persists its own approved sessions — no need to store a topic ourselves, just
    // ask it what's still active.
    connector
      .restoreSession()
      .then((session) => {
        if (session) {
          setConnected({ kind: 'walletconnect', topic: session.topic, address: session.address, label: persisted.label });
        } else {
          writePersistedConnection(undefined);
        }
      })
      .catch(() => {});
  }, [connector]);

  const onPrepareWalletConnect = useCallback(() => {
    connector.prepare().catch(() => {
      // Best-effort warmup only — a real pairing attempt from onSelectWalletConnect will surface
      // any lasting failure (e.g. a bad projectId) through its own error path.
    });
  }, [connector]);

  const onSelectWalletConnect = useCallback(() => {
    const network = session.manual_transfer?.network;
    const chain = network ? chainForNetwork(network) : undefined;
    if (!chain) return;

    connector
      .connect(chain.chainId)
      .then(({ uri, approval }) => {
        setWalletConnectUri(uri);
        return approval();
      })
      .then(({ topic, address }) => {
        setConnected({ kind: 'walletconnect', topic, address, label: 'WalletConnect' });
        writePersistedConnection({ kind: 'walletconnect', label: 'WalletConnect' });
        setWalletConnectUri(undefined);
      })
      .catch(() => {
        // Pairing rejected/expired — clear the stale URI so the widget shows "Elegí una wallet" again.
        setWalletConnectUri(undefined);
      });
  }, [connector, session.manual_transfer?.network]);

  const onLaunchExtension = useCallback(
    (walletName: string) => {
      const detail = providersRef.current.get(walletName);
      if (!detail) return;

      // The common case connects before any asset is picked (the shopper sees a balance-sorted
      // list once connected — see DefiWalletPanel), so there's usually no network to switch to
      // yet. When a transfer is already resolved, switch now; otherwise onPayWithWallet switches
      // right before sending, once it knows which network the picked asset lives on.
      const network = session.manual_transfer?.network;
      const chain = network ? chainForNetwork(network) : undefined;

      void (async () => {
        try {
          const accounts = (await detail.provider.request({
            method: 'eth_requestAccounts',
          })) as string[];
          const address = accounts[0];
          if (!address) return;

          if (chain) {
            await switchExtensionChain(detail.provider, chain);
          }

          setConnected({
            kind: 'extension',
            provider: detail.provider,
            address,
            label: detail.info.name,
          });
          writePersistedConnection({
            kind: 'extension',
            walletName,
            label: detail.info.name,
          });
        } catch {
          // User rejected the connection/chain-switch prompt — stay disconnected, no payment attempted yet.
        }
      })();
    },
    [session.manual_transfer?.network],
  );

  const onPayWithWallet = useCallback(async () => {
    const transfer = session.manual_transfer;
    if (!transfer) {
      setPayWithWalletError('La sesión todavía no tiene una transferencia preparada.');
      return;
    }
    if (!connected) {
      setPayWithWalletError('Conectá tu wallet primero.');
      return;
    }

    const chain = chainForNetwork(transfer.network);
    if (!chain) {
      setPayWithWalletError(`Red no soportada: ${transfer.network}`);
      return;
    }

    setIsPayingWithWallet(true);
    setPayWithWalletError(undefined);
    try {
      const erc20 = await options.resolveErc20({
        cryptoAsset: transfer.crypto_asset,
        network: transfer.network,
      });

      const tx = erc20
        ? {
            to: erc20.tokenAddress,
            data: encodeTransferData(
              transfer.wallet_address,
              toTokenAmount(transfer.crypto_amount, erc20.decimals),
            ),
            value: '0x0',
          }
        : {
            to: transfer.wallet_address,
            value: toHexQuantity(toTokenAmount(transfer.crypto_amount, chain.nativeCurrency.decimals)),
          };

      if (connected.kind === 'extension') {
        // The wallet may still be on whatever chain it connected with — make sure it's on the
        // transfer's chain before asking it to sign (see onLaunchExtension for why this can't
        // happen at connect time: the asset, and so the chain, is often picked afterwards).
        await switchExtensionChain(connected.provider, chain);
        await connected.provider.request({
          method: 'eth_sendTransaction',
          params: [{ from: connected.address, ...tx }],
        });
      } else {
        await connector.sendTransaction(connected.topic, chain.chainId, {
          from: connected.address,
          ...tx,
        });
      }
    } catch (error) {
      setPayWithWalletError(
        error instanceof Error ? error.message : 'No pudimos completar el pago con tu wallet.',
      );
    } finally {
      setIsPayingWithWallet(false);
    }
    // Depend on `options.resolveErc20` specifically, not the whole `options` object: callers
    // typically pass `{ walletConnectProjectId, resolveErc20 }` as an inline object literal, which
    // is a new reference every render. Depending on the object itself would re-run this callback
    // (and, worse, the balances effect below) every render.
  }, [connected, connector, options.resolveErc20, session.manual_transfer]);

  const [walletBalances, setWalletBalances] = useState<ConnectedWalletBalance[]>([]);
  const [isLoadingWalletBalances, setIsLoadingWalletBalances] = useState(false);
  const getWalletBalances = options.getWalletBalances;

  useEffect(() => {
    if (!connected || !getWalletBalances) {
      setWalletBalances([]);
      setIsLoadingWalletBalances(false);
      return;
    }

    let cancelled = false;
    setIsLoadingWalletBalances(true);
    getWalletBalances({ address: connected.address, paymentOptions: session.payment_options ?? [] })
      .then((resolved) => {
        if (!cancelled) setWalletBalances(resolved);
      })
      .catch(() => {
        // The host's fetcher failed — fall back to the manual payment_options picker.
        if (!cancelled) setWalletBalances([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWalletBalances(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connected, getWalletBalances, session.payment_options]);

  const onDisconnectWallet = useCallback(() => {
    if (connected?.kind === 'walletconnect') {
      connector.disconnect(connected.topic).catch(() => {
        // Best-effort — the local session is forgotten below regardless.
      });
    }
    setConnected(undefined);
    setPayWithWalletError(undefined);
    writePersistedConnection(undefined);
  }, [connected, connector]);

  const connectedWallet = useMemo(
    () => (connected ? { address: connected.address, label: connected.label } : undefined),
    [connected],
  );

  return {
    installedWalletNames,
    walletConnectUri,
    walletConnectLogoUrl: options.walletConnectLogoUrl,
    onSelectWalletConnect,
    onPrepareWalletConnect,
    onLaunchExtension,
    onPayWithWallet,
    isPayingWithWallet,
    payWithWalletError,
    connectedWallet,
    onDisconnectWallet,
    walletBalances,
    isLoadingWalletBalances,
  };
}
