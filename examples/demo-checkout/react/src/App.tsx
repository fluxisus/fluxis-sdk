import { useCallback, useMemo, useState } from 'react';
import type { CheckoutSession } from '@fluxisus/react';
import { FluxisProvider, HostedCheckoutWidget } from '@fluxisus/react';
import { useHostedCheckoutWallet } from '@fluxisus/react-wallet';
import { createPublicRpcBalanceFetcher } from '@fluxisus/wallet-core';
import { createErc20Resolver } from './assetCatalog.js';
import { buildSession, MAP_ASSET, SINGLE_ASSET_ID } from './mockSession.js';
import {
  simulatePayWithWallet,
  simulateRetryExpired,
  simulateSelectAsset,
  type EventLogger,
} from './walletSimulation.js';

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '';

const KNOWN_WALLET_NAMES = ['metamask', 'rabby', 'trust', 'coinbase_wallet'];

// Proxied through vite.config.ts's /cdn-assets route — the CDN doesn't send
// Access-Control-Allow-Origin for this dev origin, so a direct fetch to
// https://assets.fluxis.us gets CORS-blocked by the browser.
const APPS_URL = '/cdn-assets/sdk-assets/compatible-apps-stg.json';
const UNIQUE_ASSETS_URL = '/cdn-assets/unique_asset_ids.json';

interface LogEntry {
  id: number;
  time: string;
  label: string;
  detail?: string;
}

export function App() {
  const [status, setStatus] = useState<CheckoutSession['status']>('pending');
  const [amount, setAmount] = useState('10.00');
  const [currency, setCurrency] = useState('USD');
  const [withManualTransfer, setWithManualTransfer] = useState(false);
  const [singleAssetOnly, setSingleAssetOnly] = useState(false);

  const [session, setSession] = useState<CheckoutSession>(() =>
    buildSession({ status: 'pending', amount: "10", currency: "ARS" }),
  );

  const [installedWalletNames, setInstalledWalletNames] = useState<string[]>(['metamask']);
  const [walletConnectUri, setWalletConnectUri] = useState(
    'wc:demo-pairing-topic@2?relay-protocol=irn&symKey=demofakesymkey00000000000000000000000000000000',
  );
  const [walletConnectLogoUrl, setWalletConnectLogoUrl] = useState('/wallets/walletconnect.png');

  const [allowRetry, setAllowRetry] = useState(true);
  const [allowPayWithWallet, setAllowPayWithWallet] = useState(true);

  const [delayMs, setDelayMs] = useState(800);
  const [forceSelectAssetError, setForceSelectAssetError] = useState(false);
  const [forcePayWithWalletError, setForcePayWithWalletError] = useState(false);

  const [isPaying, setIsPaying] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [payError, setPayError] = useState<string | undefined>(undefined);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>(undefined);

  const [primaryColor, setPrimaryColor] = useState('#2563eb');

  const [events, setEvents] = useState<LogEntry[]>([]);

  const [useRealWallet, setUseRealWallet] = useState(false);
  const resolveErc20 = useMemo(() => createErc20Resolver(UNIQUE_ASSETS_URL), []);
  // The hook never fetches balances itself — this is the "bring your own node" seam. Swap this
  // for a function hitting your own RPC/provider; the public-RPC default is just a convenience.
  const getWalletBalances = useMemo(() => createPublicRpcBalanceFetcher(resolveErc20), [resolveErc20]);
  const realWallet = useHostedCheckoutWallet(session, {
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
    resolveErc20,
    getWalletBalances,
  });

  // Stable identity: HostedPendingScreen's onPrepareWalletConnect effect depends on this
  // callback's reference, so a function recreated every render would re-fire the effect,
  // which logs an event, which re-renders App, which recreates the function — infinite loop.
  const log = useCallback<EventLogger>((label, detail) => {
    setEvents((prev) =>
      [
        {
          id: new Date().valueOf(),
          time: new Date().toLocaleTimeString(),
          label,
          detail,
        },
        ...prev,
      ].slice(0, 30),
    );
  }, []);

  function applyStatusChange(next: CheckoutSession['status']) {
    setStatus(next);
    setSession((prev) => ({ ...prev, status: next }));
  }

  function applyAmountChange(nextAmount: string, nextCurrency: string) {
    setAmount(nextAmount);
    setCurrency(nextCurrency);
    setSession((prev) => ({ ...prev, amount: nextAmount, currency: nextCurrency }));
  }

  function restartSession(overrides: { withManualTransfer?: boolean; singleAssetOnly?: boolean } = {}) {
    const nextWithManualTransfer = overrides.withManualTransfer ?? withManualTransfer;
    const nextSingleAssetOnly = overrides.singleAssetOnly ?? singleAssetOnly;
    setPayError(undefined);
    setLastTxHash(undefined);
    setSession(
      buildSession({
        status,
        amount,
        currency,
        withManualTransfer: nextWithManualTransfer,
        singleAssetOnly: nextSingleAssetOnly,
      }),
    );
  }

  function toggleWithManualTransfer(next: boolean) {
    setWithManualTransfer(next);
    restartSession({ withManualTransfer: next });
  }

  function toggleSingleAssetOnly(next: boolean) {
    setSingleAssetOnly(next);
    restartSession({ singleAssetOnly: next });
  }

  function toggleInstalledWallet(name: string, checked: boolean) {
    setInstalledWalletNames((prev) =>
      checked ? [...prev, name] : prev.filter((item) => item !== name),
    );
  }

  async function handleSelectAsset(assetId: string) {
    setLastTxHash(undefined);
    await simulateSelectAsset(assetId, delayMs, forceSelectAssetError, log);
    const { network, symbol } = MAP_ASSET[assetId] ?? { network: 'base', symbol: 'USDC' };
    setSession((prev) => ({
      ...prev,
      manual_transfer: {
        wallet_address: '0xB4DB02f8c4b5159e5368CE4749fD9344a333997',
        crypto_amount: prev.amount,
        crypto_asset: symbol,
        network,
        reference_amount: prev.amount,
        reference_currency: prev.currency,
      },
    }));
  }

  async function handlePayWithWallet() {
    setIsPaying(true);
    setPayError(undefined);
    setLastTxHash(undefined);
    const { error, txHash } = await simulatePayWithWallet(delayMs, forcePayWithWalletError, log);
    setPayError(error);
    setLastTxHash(txHash);
    setIsPaying(false);
  }

  // Memoized for the same reason as `log` above: onSelectWalletConnect and
  // onPrepareWalletConnect each sit in a hosted-package useEffect dependency array.
  const handleSelectWalletConnect = useCallback(() => log('onSelectWalletConnect'), [log]);
  const handlePrepareWalletConnect = useCallback(() => log('onPrepareWalletConnect'), [log]);
  const handleLaunchExtension = useCallback(
    (walletName: string) => log('onLaunchExtension', walletName),
    [log],
  );

  async function handleRetryExpired() {
    setIsRetrying(true);
    await simulateRetryExpired(delayMs, log);
    setIsRetrying(false);
    setStatus('pending');
    restartSession();
  }

  console.log(session);
  console.log(realWallet.walletBalances);
  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Temporary playground</p>
          <h1>Fluxis Hosted Checkout</h1>
          <p className="subtitle">
            Build a <code>CheckoutSession</code> by hand and drive every prop
            <code>HostedCheckoutWidget</code> needs from a real host — no backend required.
          </p>
        </div>
      </header>

      <div className="layout">
        <aside className="panel controls">
          <h2>Session</h2>

          <label className="field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => applyStatusChange(event.target.value as CheckoutSession['status'])}
            >
              <option value="pending">pending</option>
              <option value="selecting_asset">selecting_asset</option>
              <option value="confirming">confirming</option>
              <option value="completed">completed</option>
              <option value="expired">expired</option>
            </select>
          </label>

          <div className="two-col">
            <label className="field">
              <span>Amount</span>
              <input
                value={amount}
                onChange={(event) => applyAmountChange(event.target.value, currency)}
              />
            </label>
            <label className="field">
              <span>Currency</span>
              <input
                value={currency}
                onChange={(event) => applyAmountChange(amount, event.target.value)}
              />
            </label>
          </div>

          <label className="field inline">
            <input
              type="checkbox"
              checked={withManualTransfer}
              onChange={(event) => toggleWithManualTransfer(event.target.checked)}
            />
            <span>Session already has manual_transfer (starts on the pay step)</span>
          </label>

          <label className="field inline">
            <input
              type="checkbox"
              checked={singleAssetOnly}
              onChange={(event) => toggleSingleAssetOnly(event.target.checked)}
            />
            <span>
              Only one asset available (<code>{SINGLE_ASSET_ID}</code>)
            </span>
          </label>

          <button type="button" onClick={() => restartSession()} className="primary-button">
            Restart session (new id, remounts the widget)
          </button>

          <h2 style={{ marginTop: '1.5rem' }}>Wallet integration</h2>

          <label className="field inline">
            <input
              type="checkbox"
              checked={useRealWallet}
              onChange={(event) => setUseRealWallet(event.target.checked)}
            />
            <span>
              Use real wallet (@fluxisus/react-wallet) instead of the fake simulation below
            </span>
          </label>
          {useRealWallet && !WALLETCONNECT_PROJECT_ID && (
            <p className="marquee-hint" style={{ color: '#dc2626' }}>
              Set VITE_WALLETCONNECT_PROJECT_ID in .env.local (copy .env.example) to test "Otras
              wallets" pairing — extension connect/pay still works without it.
            </p>
          )}

          <label className="field inline">
            <input
              type="checkbox"
              checked={allowRetry}
              onChange={(event) => setAllowRetry(event.target.checked)}
            />
            <span>Pass onRetryExpired</span>
          </label>

          <label className="field inline">
            <input
              type="checkbox"
              checked={allowPayWithWallet}
              onChange={(event) => setAllowPayWithWallet(event.target.checked)}
            />
            <span>Pass onPayWithWallet</span>
          </label>

          <label className="field" style={{ opacity: useRealWallet ? 0.5 : 1 }}>
            <span>
              Installed wallet extensions{useRealWallet ? ' (auto-detected via EIP-6963 below)' : ''}
            </span>
            <div className="checkbox-grid">
              {KNOWN_WALLET_NAMES.map((name) => (
                <label className="field inline" key={name}>
                  <input
                    type="checkbox"
                    disabled={useRealWallet}
                    checked={
                      useRealWallet
                        ? realWallet.installedWalletNames?.includes(name)
                        : installedWalletNames.includes(name)
                    }
                    onChange={(event) => toggleInstalledWallet(name, event.target.checked)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            {useRealWallet && (
              <span className="marquee-hint">
                Detected: {realWallet.installedWalletNames?.join(', ') || '(none yet — is a wallet extension installed?)'}
              </span>
            )}
          </label>

          <label className="field" style={{ opacity: useRealWallet ? 0.5 : 1 }}>
            <span>WalletConnect URI{useRealWallet ? ' (driven by the real pairing below)' : ''}</span>
            <textarea
              value={useRealWallet ? (realWallet.walletConnectUri ?? '') : walletConnectUri}
              onChange={(event) => setWalletConnectUri(event.target.value)}
              readOnly={useRealWallet}
              rows={2}
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span>WalletConnect logo URL</span>
            <input
              value={walletConnectLogoUrl}
              onChange={(event) => setWalletConnectLogoUrl(event.target.value)}
            />
          </label>

          <h2 style={{ marginTop: '1.5rem' }}>Simulation</h2>

          <label className="field">
            <span>Handler delay (ms)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={delayMs}
              onChange={(event) => setDelayMs(Number(event.target.value))}
            />
          </label>

          <label className="field inline">
            <input
              type="checkbox"
              checked={forceSelectAssetError}
              onChange={(event) => setForceSelectAssetError(event.target.checked)}
            />
            <span>Force onSelectAsset error</span>
          </label>

          <label className="field inline">
            <input
              type="checkbox"
              checked={forcePayWithWalletError}
              onChange={(event) => setForcePayWithWalletError(event.target.checked)}
            />
            <span>Force onPayWithWallet error</span>
          </label>

          <label className="field">
            <span>Theme primary color</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
            />
          </label>
        </aside>

        <main className="panel preview">
          <h2>Preview</h2>

          <FluxisProvider theme={{ colorPrimary: primaryColor }}>
            <HostedCheckoutWidget
              key={session.id}
              session={session}
              checkoutUrl={typeof window !== 'undefined' ? window.location.href : ''}
              appsUrl={APPS_URL}
              uniqueAssetsUrl={UNIQUE_ASSETS_URL}
              walletConnectUri={useRealWallet ? realWallet.walletConnectUri : walletConnectUri}
              walletConnectLogoUrl={
                useRealWallet ? realWallet.walletConnectLogoUrl : walletConnectLogoUrl || undefined
              }
              installedWalletNames={
                useRealWallet ? realWallet.installedWalletNames : installedWalletNames
              }
              onSelectWalletConnect={
                useRealWallet ? realWallet.onSelectWalletConnect : handleSelectWalletConnect
              }
              onPrepareWalletConnect={
                useRealWallet ? realWallet.onPrepareWalletConnect : handlePrepareWalletConnect
              }
              onLaunchExtension={useRealWallet ? realWallet.onLaunchExtension : handleLaunchExtension}
              onSelectAsset={handleSelectAsset}
              onRetryExpired={allowRetry ? handleRetryExpired : undefined}
              isRetryingExpired={isRetrying}
              onPayWithWallet={
                allowPayWithWallet
                  ? useRealWallet
                    ? realWallet.onPayWithWallet
                    : handlePayWithWallet
                  : undefined
              }
              isPayingWithWallet={useRealWallet ? realWallet.isPayingWithWallet : isPaying}
              payWithWalletError={useRealWallet ? realWallet.payWithWalletError : payError}
              lastTxHash={useRealWallet ? realWallet.lastTxHash : lastTxHash}
              connectedWallet={useRealWallet ? realWallet.connectedWallet : undefined}
              onDisconnectWallet={useRealWallet ? realWallet.onDisconnectWallet : undefined}
              walletBalances={useRealWallet ? realWallet.walletBalances : undefined}
              isLoadingWalletBalances={useRealWallet ? realWallet.isLoadingWalletBalances : false}
              style={{ width: '100%',border: "none",
                borderRadius: 0,
                boxShadow: "none", }}
            />
          </FluxisProvider>

          <section className="event-log">
            <h3>Event log</h3>
            {events.length === 0 ? (
              <p className="marquee-hint">Interact with the widget to see callbacks fire here.</p>
            ) : (
              <ul>
                {events.map((entry) => (
                  <li key={entry.id}>
                    <span className="event-time">{entry.time}</span>
                    <span className="event-label">{entry.label}</span>
                    {entry.detail && <span className="event-detail">{entry.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>

      <style>{`
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.25rem 3rem;
        }

        .header {
          margin-bottom: 1.5rem;
        }

        .eyebrow {
          margin: 0 0 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        h1 {
          margin: 0;
          font-size: 2rem;
        }

        .subtitle {
          margin: 0.5rem 0 0;
          color: #475569;
          max-width: 42rem;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(280px, 340px) 1fr;
          gap: 1rem;
          align-items: start;
        }

        .panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1.25rem;
          min-width: 0;
        }

        h2 {
          margin: 0 0 1rem;
          font-size: 1.125rem;
        }

        h3 {
          margin: 0 0 0.75rem;
          font-size: 0.95rem;
          color: #334155;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .field textarea,
        .field select,
        .field input:not([type='checkbox']):not([type='color']) {
          font: inherit;
          font-weight: 400;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          resize: vertical;
        }

        .field input[type='color'] {
          width: 100%;
          height: 2.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.125rem;
          background: #fff;
          cursor: pointer;
        }

        .field.inline {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          font-weight: 400;
        }

        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.375rem;
        }

        .primary-button {
          width: 100%;
          border: none;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          background: #0f172a;
          color: #fff;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          margin: 0.25rem 0 0.5rem;
        }

        .marquee-hint {
          margin: 0 0 0.75rem;
          font-size: 0.8125rem;
          color: #64748b;
        }

        .event-log {
          margin-top: 2rem;
          padding-top: 1.25rem;
          border-top: 1px solid #e2e8f0;
        }

        .event-log ul {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 260px;
          overflow-y: auto;
          font-size: 0.8125rem;
        }

        .event-log li {
          display: flex;
          gap: 0.5rem;
          padding: 0.375rem 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .event-time {
          color: #94a3b8;
          font-variant-numeric: tabular-nums;
        }

        .event-label {
          font-weight: 600;
          color: #0f172a;
        }

        .event-detail {
          color: #64748b;
          word-break: break-all;
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
