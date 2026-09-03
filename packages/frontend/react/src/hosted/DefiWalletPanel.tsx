import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CompatibleAppsPopover } from '../components/CompatibleAppsStack.js';
import { FluxisQrCode } from '../components/FluxisQrCode.js';
import { capitalizeFirst, truncateAddress } from '../utils/checkoutFormat.js';
import { explorerTxUrl } from '../utils/blockExplorer.js';
import { FLUXIS_MARK_LOGO } from '../utils/logo.js';
import type { CheckoutPaymentOption, ConnectedWalletInfo, ManualTransferData } from '../types.js';
import { AssetPicker } from './AssetPicker.js';
import { DeeplinkQrCode } from './DeeplinkQrCode.js';
import { toCompatibleApp } from './normalizeWalletCatalog.js';
import { resolveWalletLink } from './resolveWalletLink.js';
import type { ConnectedWalletBalance, WalletCatalogApp } from './types.js';

export const OTHER_WALLETS_ID = 'other-wallets';
export const FLUXIS_OPTION_ID = 'fluxis';

export interface DefiWalletPanelProps {
  apps: WalletCatalogApp[];
  /** CEFI catalog entries — stacked logos on the Fluxis row. */
  cefiApps?: WalletCatalogApp[];
  naspipToken?: string;
  checkoutUrl: string;
  isMobile: boolean;
  /** WalletConnect pairing URI shown when "Otras wallets" is selected. */
  walletConnectUri?: string;
  walletConnectLogoUrl?: string;
  /** Catalog `name`s whose browser extension is installed. */
  installedWalletNames?: string[];
  onSelectWalletConnect?: () => void;
  onLaunchExtension?: (walletName: string) => void;
  /** The wallet the host has connected, if any — replaces the picker below with a pay flow. */
  connectedWallet?: ConnectedWalletInfo;
  onDisconnectWallet?: () => void;
  /** `session.payment_options` — the fallback picker once a wallet is connected but no balances
   * (or an empty list) came in. */
  paymentOptions?: CheckoutPaymentOption[];
  /** Passed through to the fallback `AssetPicker` (same catalog `ManualPaymentFlow` uses). */
  assetsUrl?: string;
  /**
   * The connected wallet's balances, already resolved and **sorted by the host** (highest first).
   * The first entry that matches a `paymentOptions` entry is picked automatically via
   * `onSelectAsset` — no picker shown. Omit it, or pass `[]` once resolved, to fall back to letting
   * the shopper choose from `paymentOptions` manually.
   */
  walletBalances?: ConnectedWalletBalance[];
  /** True while the host is still fetching `walletBalances` — shows a loading state. */
  isLoadingWalletBalances?: boolean;
  /** `session.manual_transfer` — once resolved, the connected-wallet view shows a "Pagar" button. */
  manualTransfer?: ManualTransferData;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  onPayWithWallet?: () => void | Promise<void>;
  isPayingWithWallet?: boolean;
  payWithWalletError?: string;
  /** Hash of the just-sent transaction — replaces the "Pagar" button with a pending-confirmation
   * state while the host's own flow is still moving `session.status` to `confirming`. */
  lastTxHash?: string;
}

export function DefiWalletPanel({
  apps,
  cefiApps = [],
  naspipToken,
  checkoutUrl,
  isMobile,
  walletConnectUri,
  walletConnectLogoUrl,
  installedWalletNames = [],
  onSelectWalletConnect,
  onLaunchExtension,
  connectedWallet,
  onDisconnectWallet,
  paymentOptions,
  assetsUrl,
  walletBalances,
  isLoadingWalletBalances,
  manualTransfer,
  onSelectAsset,
  onPayWithWallet,
  isPayingWithWallet,
  payWithWalletError,
  lastTxHash,
}: DefiWalletPanelProps) {
  const hasFluxis = Boolean(naspipToken);
  const [selectedName, setSelectedName] = useState(
    hasFluxis ? FLUXIS_OPTION_ID : apps[0]?.name,
  );
  const selected = apps.find((app) => app.name === selectedName);
  const fluxisSelected = selectedName === FLUXIS_OPTION_ID;
  const otherSelected = selectedName === OTHER_WALLETS_ID;

  useEffect(() => {
    if (otherSelected) onSelectWalletConnect?.();
  }, [otherSelected, onSelectWalletConnect]);

  // A connected wallet turns this panel into a pay flow instead of a picker — extension/WalletConnect
  // discovery only applies on desktop today, so mobile keeps the deep-link grid below untouched.
  if (connectedWallet && !isMobile) {
    return (
      <ConnectedWalletPanel
        connectedWallet={connectedWallet}
        onDisconnectWallet={onDisconnectWallet}
        paymentOptions={paymentOptions}
        assetsUrl={assetsUrl}
        walletBalances={walletBalances}
        isLoadingWalletBalances={isLoadingWalletBalances}
        manualTransfer={manualTransfer}
        onSelectAsset={onSelectAsset}
        onPayWithWallet={onPayWithWallet}
        isPayingWithWallet={isPayingWithWallet}
        payWithWalletError={payWithWalletError}
        lastTxHash={lastTxHash}
      />
    );
  }

  if (!hasFluxis && apps.length === 0) return null;

  if (isMobile) {
    const mobileApps = [...(hasFluxis ? cefiApps : []), ...apps];
    if (mobileApps.length === 0) return null;

    return (
      <div style={{ width: '100%' }}>
        <p style={{ ...legendStyle, fontWeight: 600, color: 'var(--fluxis-color-fg, #0f172a)' }}>
          Elegí con qué pagar
        </p>
        <WalletGrid
          apps={mobileApps}
          onSelect={(app) => {
            const href =
              app.type === 'CEFI'
                ? resolveWalletLink(app.deepLink, { naspipToken })
                : resolveWalletLink(app.deepLink, { checkoutUrl });
            window.location.assign(href);
          }}
        />
      </div>
    );
  }

  const deeplink = selected
    ? resolveWalletLink(selected.deepLink, { checkoutUrl })
    : undefined;
  const qrValue = otherSelected ? walletConnectUri : deeplink;
  const qrLogo = otherSelected ? walletConnectLogoUrl : selected?.imageUrl;
  const qrLabel = fluxisSelected
    ? 'Escaneá con tu app compatible con Fluxis'
    : otherSelected
      ? 'Escaneá con WalletConnect'
      : selected
        ? `Escaneá con la cámara para abrir ${selected.displayName}`
        : undefined;
  const canLaunch =
    !fluxisSelected &&
    !otherSelected &&
    Boolean(selected) &&
    installedWalletNames.includes(selected!.name) &&
    Boolean(onLaunchExtension);

  return (
    <div style={{ width: '100%' }}>
      <p style={{ ...legendStyle, fontWeight: 600, color: 'var(--fluxis-color-fg, #0f172a)' }}>
        Elegí con qué pagar
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '1rem',
          width: '100%',
        }}
      >
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            borderRight: '1px solid var(--fluxis-color-border, #e2e8f0)',
            paddingRight: '0.75rem',
          }}
        >
          {hasFluxis ? (
            <WalletListButton
              selected={fluxisSelected}
              onClick={() => setSelectedName(FLUXIS_OPTION_ID)}
              icon={
                <img src={FLUXIS_MARK_LOGO} alt="" width={28} height={28} style={iconImg} />
              }
              trailing={<CefiLogoStack apps={cefiApps} />}
              label="Fluxis"
            />
          ) : null}
          {apps.map((app) => (
            <WalletListButton
              key={app.name}
              selected={app.name === selectedName}
              onClick={() => setSelectedName(app.name)}
              icon={<img src={app.imageUrl} alt="" width={28} height={28} style={iconImg} />}
              label={app.displayName}
              installed={installedWalletNames.includes(app.name)}
            />
          ))}
          <WalletListButton
            selected={otherSelected}
            onClick={() => setSelectedName(OTHER_WALLETS_ID)}
            icon={<OtherWalletsIcon src={walletConnectLogoUrl} />}
            label="Otras wallets"
            subtitle="Vía WalletConnect"
          />
        </div>

        <div
          style={{
            flex: '0 0 auto',
            width: '11.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {fluxisSelected && naspipToken ? (
            <div style={qrFrame}>
              <FluxisQrCode token={naspipToken} size={160} level="L" />
            </div>
          ) : qrValue ? (
            <div style={qrFrame}>
              <DeeplinkQrCode value={qrValue} logo={qrLogo} size={160} />
            </div>
          ) : (
            <p style={{ ...legendStyle, margin: '2rem 0', textAlign: 'center' }}>
              {otherSelected ? 'Generando código…' : 'Elegí una wallet'}
            </p>
          )}
          {qrLabel ? (
            <p style={{ ...legendStyle, margin: '0.75rem 0 0', textAlign: 'center' }}>{qrLabel}</p>
          ) : null}
          <div
            data-testid="launch-extension-slot"
            style={{
              visibility: canLaunch ? 'visible' : 'hidden',
              pointerEvents: canLaunch ? 'auto' : 'none',
              width: '100%',
            }}
            aria-hidden={!canLaunch}
          >
            <OrDivider />
            <button
              type="button"
              onClick={() => selected && onLaunchExtension?.(selected.name)}
              style={launchButtonStyle}
            >
              Abrir {selected?.displayName}
              <ExternalLinkIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConnectedWalletPanelProps {
  connectedWallet: ConnectedWalletInfo;
  onDisconnectWallet?: () => void;
  paymentOptions?: CheckoutPaymentOption[];
  assetsUrl?: string;
  walletBalances?: ConnectedWalletBalance[];
  isLoadingWalletBalances?: boolean;
  manualTransfer?: ManualTransferData;
  onSelectAsset?: (assetId: string) => void | Promise<void>;
  onPayWithWallet?: () => void | Promise<void>;
  isPayingWithWallet?: boolean;
  payWithWalletError?: string;
  lastTxHash?: string;
}

const CONNECTED_SPIN_KEYFRAMES = `@keyframes fluxis-connected-wallet-spin { to { transform: rotate(360deg); } }`;

/** Deterministic pick from the wallet's label, so the same wallet always gets the same color. */
const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];

function avatarColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function avatarInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}

function WalletAvatar({ label }: { label?: string }) {
  const text = label || 'Wallet';
  return (
    <span style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }}>
      <span
        aria-hidden="true"
        style={{
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: '0.625rem',
          background: avatarColor(text),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {avatarInitials(text)}
      </span>
      <span
        aria-hidden="true"
        title="Conectada"
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: '0.625rem',
          height: '0.625rem',
          borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid var(--fluxis-color-bg, #ffffff)',
        }}
      />
    </span>
  );
}

function LoadingRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0' }}>
      <style>{CONNECTED_SPIN_KEYFRAMES}</style>
      <span
        role="status"
        aria-label={text}
        style={{
          width: '1rem',
          height: '1rem',
          flexShrink: 0,
          borderRadius: '50%',
          border: '2px solid var(--fluxis-color-border, #e2e8f0)',
          borderTopColor: 'var(--fluxis-color-primary, #2563eb)',
          animation: 'fluxis-connected-wallet-spin 0.8s linear infinite',
        }}
      />
      <p style={{ ...legendStyle, margin: 0 }}>{text}</p>
    </div>
  );
}

/**
 * Shown in place of the "Pagar" button once `onPayWithWallet` has sent a transaction — the host
 * hasn't moved `session.status` to `confirming` yet (that's the merchant backend detecting the tx,
 * which takes a moment), so this bridges the gap: the shopper sees the transfer went out and can
 * already track it, without a stale "Pagar" button that would just resend the payment.
 */
function TxSentCard({ txHash, network }: { txHash: string; network: string }) {
  const explorerUrl = explorerTxUrl(network, txHash);

  return (
    <div style={txSentCardStyle}>
      <style>{CONNECTED_SPIN_KEYFRAMES}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <span
          role="status"
          aria-label="Confirmando transacción"
          style={{
            width: '1.25rem',
            height: '1.25rem',
            flexShrink: 0,
            borderRadius: '50%',
            border: '2.5px solid var(--fluxis-color-border, #e2e8f0)',
            borderTopColor: 'var(--fluxis-color-primary, #2563eb)',
            animation: 'fluxis-connected-wallet-spin 0.8s linear infinite',
          }}
        />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--fluxis-color-fg, #0f172a)',
            }}
          >
            Transacción enviada
          </p>
          <p
            style={{
              margin: '0.125rem 0 0',
              fontSize: '0.75rem',
              color: 'var(--fluxis-color-muted, #64748b)',
            }}
          >
            Esperando confirmación en la red, puede tardar unos minutos…
          </p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--fluxis-color-border, #e2e8f0)',
        }}
      >
        <span
          style={{
            fontSize: '0.8125rem',
            fontFamily: 'monospace',
            color: 'var(--fluxis-color-fg, #0f172a)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {truncateAddress(txHash, 6)}
        </span>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--fluxis-color-primary, #2563eb)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ver en el explorador ↗
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Replaces the app/QR picker once the host reports a connected wallet: shows the connected
 * address, then either
 *  - a "Pagar" button once the host resolves `manualTransfer`,
 *  - a loading row while `walletBalances` is still being fetched,
 *  - an automatic selection when there's nothing to actually choose — either the first
 *    `walletBalances` entry that matches a `paymentOptions` entry (already sorted by the host), or,
 *    lacking that, a single `paymentOptions` entry with no alternatives — or
 *  - the same token → network picker `ManualPaymentFlow` uses (via `AssetPicker`) when there's
 *    more than one payable option and no balance match to decide for the shopper.
 */
function ConnectedWalletPanel({
  connectedWallet,
  onDisconnectWallet,
  paymentOptions = [],
  assetsUrl,
  walletBalances,
  isLoadingWalletBalances,
  manualTransfer,
  onSelectAsset,
  onPayWithWallet,
  isPayingWithWallet,
  payWithWalletError,
  lastTxHash,
}: ConnectedWalletPanelProps) {
  const [error, setError] = useState(false);
  const autoSelectedIdRef = useRef<string | null>(null);

  const matchedBalance = walletBalances?.find((balance) =>
    paymentOptions.some((option) => option.unique_asset_id === balance.uniqueAssetId),
  );
  // Nothing to actually choose with exactly one payable option — same reasoning as the balance
  // match below, just without a balance to go on.
  const singleOption = paymentOptions?.[0];
  const autoSelectId = matchedBalance?.uniqueAssetId ?? singleOption?.unique_asset_id;
  
  // Only block payment when we actually have a balance to compare against — no data means we
  // can't tell, so don't assume insufficiency.
  const insufficientBalance = Boolean(
    manualTransfer &&
    matchedBalance &&
      Number.parseFloat(matchedBalance.balance ?? -1) <= Number.parseFloat(manualTransfer.crypto_amount),
  );

  useEffect(() => {
    if (manualTransfer || !autoSelectId || !onSelectAsset) return;
    if (autoSelectedIdRef.current === autoSelectId) return;
    autoSelectedIdRef.current = autoSelectId;

    setError(false);
    Promise.resolve(onSelectAsset(autoSelectId)).catch(() => setError(true));
  }, [manualTransfer, autoSelectId, onSelectAsset]);

  return (
    <div style={{ width: '100%' }}>
      <div style={connectedWalletCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
          <WalletAvatar label={connectedWallet.label} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'monospace',
                color: 'var(--fluxis-color-fg, #0f172a)',
                lineHeight: 1.3,
              }}
            >
              {truncateAddress(connectedWallet.address)}
            </div>
            {connectedWallet.label && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--fluxis-color-muted, #64748b)',
                  marginTop: '0.0625rem',
                }}
              >
                {connectedWallet.label}
              </div>
            )}
          </div>
        </div>
        {onDisconnectWallet && (
          <button type="button" onClick={onDisconnectWallet} style={disconnectButtonStyle}>
            Desconectar
          </button>
        )}
      </div>

      {manualTransfer && lastTxHash ? (
        <TxSentCard txHash={lastTxHash} network={manualTransfer.network} />
      ) : manualTransfer ? (
        <>
          <button
            type="button"
            onClick={() => onPayWithWallet?.()}
            disabled={isPayingWithWallet || insufficientBalance}
            style={payButtonStyle(isPayingWithWallet || insufficientBalance)}
          >
            {isPayingWithWallet
              ? 'Confirmá en tu wallet…'
              : `Pagar ${manualTransfer.crypto_amount} ${manualTransfer.crypto_asset} · ${capitalizeFirst(manualTransfer.network)}`}
          </button>
          {insufficientBalance && <p style={connectedErrorStyle}>Balance insuficiente</p>}
          {payWithWalletError && <p style={connectedErrorStyle}>{payWithWalletError}</p>}
        </>
      ) : isLoadingWalletBalances ? (
        <LoadingRow text="Buscando tus saldos…" />
      ) : autoSelectId ? (
        <LoadingRow text="Preparando tu pago…" />
      ) : paymentOptions.length > 1 ? (
        <AssetPicker
          assetsUrl={assetsUrl}
          paymentOptions={paymentOptions}
          onSelectAsset={onSelectAsset}
          renderPay={() => <LoadingRow text="Preparando tu pago…" />}
        />
      ) : (
        <p style={legendStyle}>Preparando tu pago…</p>
      )}

      {error && <p style={connectedErrorStyle}>No pudimos procesar tu selección. Intentá de nuevo.</p>}
    </div>
  );
}

function CefiLogoStack({ apps }: { apps: WalletCatalogApp[] }) {
  const [open, setOpen] = useState(false);
  const shown = apps.filter((app) => app.imageUrl).slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <span
      data-testid="cefi-compatible-apps"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        position: 'relative',
        cursor: 'default',
        padding: '0.25rem 0',
      }}
    >
      {shown.map((app, i) => (
        <img
          key={app.name}
          src={app.imageUrl}
          alt=""
          width={20}
          height={20}
          style={{
            borderRadius: '999px',
            objectFit: 'cover',
            border: '2px solid var(--fluxis-color-bg, #ffffff)',
            marginLeft: i === 0 ? 0 : -8,
            zIndex: shown.length - i,
            background: '#fff',
            flexShrink: 0,
          }}
        />
      ))}
      {open ? (
        <>
          <span
            aria-hidden="true"
            style={{ position: 'absolute', top: '100%', right: 0, width: 288, height: 12 }}
          />
          <CompatibleAppsPopover apps={apps.map(toCompatibleApp)} align="end" />
        </>
      ) : null}
    </span>
  );
}

function WalletListButton({
  selected,
  onClick,
  icon,
  trailing,
  label,
  subtitle,
  installed,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  trailing?: ReactNode;
  label: string;
  subtitle?: string;
  installed?: boolean;
}) {
  return (
    <div style={{ ...listButtonStyle(selected), position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          flex: 1,
          minWidth: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {icon}
        <span style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
          <span style={nameStyle}>{label}</span>
          {subtitle ? (
            <span style={subtitleStyle} aria-hidden="true">
              {subtitle}
            </span>
          ) : null}
        </span>
        {installed ? <span style={installedStyle} aria-hidden="true">Instalada</span> : null}
      </button>
      {trailing}
    </div>
  );
}

function WalletGrid({
  apps,
  selectedName,
  onSelect,
}: {
  apps: WalletCatalogApp[];
  selectedName?: string;
  onSelect: (app: WalletCatalogApp) => void;
}) {
  const centerLastRow = apps.length % 3 === 2;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: centerLastRow ? 'center' : 'flex-start',
        gap: '0.5rem',
        background: 'var(--fluxis-color-border, #e2e8f0)',
        borderRadius: '0.75rem',
        padding: '0.75rem',
      }}
    >
      {apps.map((app) => {
        const selected = app.name === selectedName;
        return (
          <button
            key={app.name}
            type="button"
            onClick={() => onSelect(app)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.375rem',
              flex: '0 0 calc((100% - 1rem) / 3)',
              boxSizing: 'border-box',
              padding: '0.625rem 0.25rem',
              border: selected
                ? '1.5px solid var(--fluxis-color-primary, #2563eb)'
                : '1.5px solid transparent',
              borderRadius: '0.625rem',
              background: 'var(--fluxis-color-bg, #ffffff)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <img src={app.imageUrl} alt="" width={40} height={40} style={iconImg} />
            <span style={{ ...nameStyle, fontSize: '0.6875rem', textAlign: 'center' }}>
              {app.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OtherWalletsIcon({ src }: { src?: string }) {
  if (src) {
    return <img src={src} alt="" width={28} height={28} style={iconImg} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: '0.4rem',
        background: '#3B99FC',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 700,
      }}
    >
      WC
    </span>
  );
}

function OrDivider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        margin: '0.75rem 0',
      }}
    >
      <span style={hairline} />
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--fluxis-color-muted, #64748b)' }}>
        O
      </span>
      <span style={hairline} />
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 5h5v5M19 5l-9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const legendStyle: CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '0.8125rem',
  color: 'var(--fluxis-color-muted, #64748b)',
};

const connectedWalletCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.625rem 0.75rem',
  marginBottom: '0.875rem',
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  borderRadius: '0.875rem',
  background: 'var(--fluxis-color-bg, #ffffff)',
};

const disconnectButtonStyle: CSSProperties = {
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  background: 'none',
  padding: '0.375rem 0.75rem',
  borderRadius: '9999px',
  font: 'inherit',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--fluxis-color-primary, #2563eb)',
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

function payButtonStyle(disabled?: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--fluxis-color-fg, #0f172a)',
    color: 'var(--fluxis-color-bg, #ffffff)',
    border: 'none',
    borderRadius: 'var(--fluxis-radius, 0.75rem)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    font: 'inherit',
    fontWeight: 600,
    fontSize: '0.875rem',
  };
}

const txSentCardStyle: CSSProperties = {
  padding: '0.875rem 1rem',
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  borderRadius: 'var(--fluxis-radius, 0.75rem)',
  background: 'var(--fluxis-color-bg, #ffffff)',
};

const connectedErrorStyle: CSSProperties = {
  margin: '0.5rem 0 0',
  fontSize: '0.8125rem',
  color: 'var(--fluxis-color-danger, #dc2626)',
  textAlign: 'center',
};

const iconImg: CSSProperties = {
  borderRadius: '0.4rem',
  objectFit: 'contain',
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--fluxis-color-fg, #0f172a)',
  lineHeight: 1.2,
};

const subtitleStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  color: 'var(--fluxis-color-muted, #64748b)',
  marginTop: '0.125rem',
};

const installedStyle: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: 'var(--fluxis-color-primary, #2563eb)',
  flexShrink: 0,
};

const qrFrame: CSSProperties = {
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  borderRadius: '0.75rem',
  padding: '0.5rem',
  background: 'var(--fluxis-color-bg, #ffffff)',
  display: 'inline-flex',
};

const hairline: CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--fluxis-color-border, #e2e8f0)',
};

const launchButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1px solid var(--fluxis-color-primary, #2563eb)',
  borderRadius: '0.65rem',
  background: 'var(--fluxis-color-bg, #ffffff)',
  color: 'var(--fluxis-color-primary, #2563eb)',
  fontFamily: 'inherit',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
};

function listButtonStyle(selected: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    width: '100%',
    padding: '0.5rem 0.6rem',
    border: 'none',
    borderRadius: '0.5rem',
    background: selected ? 'var(--fluxis-color-border, #e2e8f0)' : 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
  };
}
