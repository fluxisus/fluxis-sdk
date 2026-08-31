import SignClient from '@walletconnect/sign-client';
import type SignClientType from '@walletconnect/sign-client';
import { eip155CaipChainId } from './chains.js';

export interface WalletConnectPairing {
  /** Pairing URI — render as a QR / pass as `walletConnectUri` to HostedCheckoutWidget. */
  uri: string;
  /** Resolves once the wallet approves the pairing. Await it, then use `client.request(...)`. */
  approval: () => Promise<{ topic: string; address: string }>;
}

/**
 * Thin wrapper over @walletconnect/sign-client — the one real external dependency in this
 * package. Everything here is a passthrough; no chain-specific business logic beyond scoping the
 * session to the single EVM chain the current checkout needs.
 */
export class WalletConnectConnector {
  private clientPromise: Promise<SignClientType> | undefined;

  constructor(
    private readonly projectId: string,
    private readonly metadata: { name: string; description: string; url: string; icons: string[] },
  ) {}

  /** Lazily creates the SignClient. Safe to call more than once — reuses the same instance. */
  private async getClient(): Promise<SignClientType> {
    if (!this.clientPromise) {
      this.clientPromise = SignClient.init({ projectId: this.projectId, metadata: this.metadata });
    }
    return this.clientPromise;
  }

  /** Call this early (e.g. from onPrepareWalletConnect) to warm up the client before pairing. */
  async prepare(): Promise<void> {
    await this.getClient();
  }

  /** Starts a new pairing scoped to a single EVM chain. Call from onSelectWalletConnect. */
  async connect(chainId: number): Promise<WalletConnectPairing> {
    const client = await this.getClient();
    const caipChainId = eip155CaipChainId(chainId);

    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        eip155: {
          methods: ['eth_sendTransaction', 'personal_sign', 'wallet_switchEthereumChain'],
          chains: [caipChainId],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    if (!uri) {
      throw new Error('WalletConnect did not return a pairing URI');
    }

    return {
      uri,
      approval: async () => {
        const session = await approval();
        const account = session.namespaces.eip155?.accounts?.[0];
        if (!account) throw new Error('WalletConnect session approved without an eip155 account');
        // CAIP-10 account id looks like "eip155:137:0xabc..." — the address is the last segment.
        const address = account.split(':').pop()!;
        return { topic: session.topic, address };
      },
    };
  }

  async sendTransaction(
    topic: string,
    chainId: number,
    tx: { from: string; to: string; data?: string; value?: string },
  ): Promise<string> {
    const client = await this.getClient();
    const result = await client.request({
      topic,
      chainId: eip155CaipChainId(chainId),
      request: { method: 'eth_sendTransaction', params: [tx] },
    });
    return result as string;
  }

  async disconnect(topic: string): Promise<void> {
    const client = await this.getClient();
    await client.disconnect({
      topic,
      reason: { code: 6000, message: 'User disconnected' },
    });
  }

  /**
   * Restores an already-approved session from SignClient's own storage (it persists sessions
   * itself — no separate persistence needed here), so a page reload doesn't force the shopper to
   * re-pair. Returns the most recent active session, if any.
   */
  async restoreSession(): Promise<{ topic: string; address: string } | undefined> {
    const client = await this.getClient();
    const sessions = client.session.getAll();
    const session = sessions[sessions.length - 1];
    if (!session) return undefined;
    const account = session.namespaces.eip155?.accounts?.[0];
    if (!account) return undefined;
    return { topic: session.topic, address: account.split(':').pop()! };
  }
}
