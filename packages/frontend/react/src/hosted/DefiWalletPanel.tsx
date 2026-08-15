import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { CompatibleAppsPopover } from '../components/CompatibleAppsStack.js';
import { FluxisQrCode } from '../components/FluxisQrCode.js';
import { FLUXIS_MARK_LOGO } from '../utils/logo.js';
import { DeeplinkQrCode } from './DeeplinkQrCode.js';
import { toCompatibleApp } from './normalizeWalletCatalog.js';
import { resolveWalletLink } from './resolveWalletLink.js';
import type { WalletCatalogApp } from './types.js';

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
