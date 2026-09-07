import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutSession } from '@fluxisus/react';
import { EVM_CHAINS } from '@fluxisus/wallet-core';
import { useHostedCheckoutWallet } from '../src/useHostedCheckoutWallet.js';

const connectMock = vi.fn();
const restoreSessionMock = vi.fn();
const prepareMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@fluxisus/wallet-core', async () => {
  const actual = await vi.importActual<typeof import('@fluxisus/wallet-core')>(
    '@fluxisus/wallet-core',
  );
  return {
    ...actual,
    listenForProviders: () => () => {},
    catalogNameForProvider: () => undefined,
    chainForNetwork: () => ({
      chainId: 137,
      chainName: 'Polygon',
      rpcUrls: ['https://polygon-rpc.com'],
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorerUrls: ['https://polygonscan.com'],
    }),
    WalletConnectConnector: vi.fn().mockImplementation((projectId, metadata) => ({
      projectId,
      metadata,
      prepare: prepareMock,
      connect: connectMock,
      restoreSession: restoreSessionMock,
      disconnect: vi.fn(),
    })),
  };
});

const session: CheckoutSession = {
  id: 'session-1',
  amount: '10.00',
  currency: 'USD',
  status: 'confirming',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  manual_transfer: {
    wallet_address: '0xabc',
    crypto_amount: '10.00',
    crypto_asset: 'USDC',
    network: 'polygon',
  },
};

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useHostedCheckoutWallet', () => {
  beforeEach(() => {
    connectMock.mockReset();
    restoreSessionMock.mockReset().mockResolvedValue(undefined);
    prepareMock.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    // No auto-cleanup is wired into this project's vitest config, so an unmounted hook's
    // visibilitychange listener would otherwise outlive its test and fire on the next one.
    cleanup();
    setVisibility('visible');
  });

  it('constructs the WalletConnectConnector with a redirect.universal pointing at appUrl', async () => {
    const { WalletConnectConnector } = await import('@fluxisus/wallet-core');
    renderHook(() =>
      useHostedCheckoutWallet(session, {
        walletConnectProjectId: 'proj-1',
        appUrl: 'https://checkout.stgfluxis.us/checkout/pay/abc',
        resolveErc20: vi.fn(),
      }),
    );

    expect(WalletConnectConnector).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        redirect: { universal: 'https://checkout.stgfluxis.us/checkout/pay/abc' },
      }),
    );
  });

  it('requests a session covering every supported EVM chain, even before manual_transfer is resolved', async () => {
    connectMock.mockResolvedValue({ uri: 'wc:abc123', approval: () => new Promise(() => {}) });
    const sessionWithoutTransfer: CheckoutSession = {
      ...session,
      manual_transfer: undefined,
    };

    const { result } = renderHook(() =>
      useHostedCheckoutWallet(sessionWithoutTransfer, {
        walletConnectProjectId: 'proj-1',
        resolveErc20: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.onSelectWalletConnect?.();
      await Promise.resolve();
    });

    expect(connectMock).toHaveBeenCalledWith(Object.values(EVM_CHAINS).map((chain) => chain.chainId));
  });

  it('recovers the connection via restoreSession when the tab regains focus mid-pairing', async () => {
    let resolveApproval: (value: { topic: string; address: string }) => void = () => {};
    connectMock.mockResolvedValue({
      uri: 'wc:abc123',
      approval: () => new Promise((resolve) => { resolveApproval = resolve; }),
    });
    restoreSessionMock.mockResolvedValue({ topic: 'topic-1', address: '0xdef' });

    const { result } = renderHook(() =>
      useHostedCheckoutWallet(session, {
        walletConnectProjectId: 'proj-1',
        resolveErc20: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.onSelectWalletConnect?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.walletConnectUri).toBe('wc:abc123'));
    expect(result.current.connectedWallet).toBeUndefined();

    // Simulate the shopper backgrounding the tab (approval() never resolves — relay throttled)
    // and coming back: restoreSession should pick up the session SignClient already has.
    await act(async () => {
      setVisibility('visible');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(restoreSessionMock).toHaveBeenCalled();
      expect(result.current.connectedWallet).toEqual({ address: '0xdef', label: 'WalletConnect' });
    });

    void resolveApproval;
  });
});
