import { FluxisQrCode } from '../components/FluxisQrCode.js';
import { CompatibleAppsStack } from '../components/CompatibleAppsStack.js';
import { InfoIcon } from '../components/checkout/icons.js';
import { resolveWalletLink } from './resolveWalletLink.js';
import { toCompatibleApp } from './normalizeWalletCatalog.js';
import type { WalletCatalogApp } from './types.js';

export function CefiPaymentPanel({
  apps,
  naspipToken,
  isMobile,
}: {
  apps: WalletCatalogApp[];
  naspipToken: string;
  isMobile: boolean;
}) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--fluxis-color-fg, #0f172a)',
            textAlign: 'center',
          }}
        >
          Elegí tu wallet para pagar
        </p>
        {apps.map((app) => {
          const href = resolveWalletLink(app.deepLink, { naspipToken });
          return (
            <button
              key={app.name}
              type="button"
              onClick={() => window.location.assign(href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--fluxis-color-border, #e2e8f0)',
                borderRadius: 'var(--fluxis-radius, 0.75rem)',
                backgroundColor: 'var(--fluxis-button-bg, #ffffff)',
                color: 'var(--fluxis-button-fg, #0f172a)',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <img
                src={app.imageUrl}
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                style={{ borderRadius: '0.5rem', objectFit: 'contain', flexShrink: 0 }}
              />
              <span>Pagar con {app.displayName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderRadius: '0.75rem',
          padding: '0.875rem',
          background: 'var(--fluxis-color-bg, #ffffff)',
          display: 'inline-flex',
        }}
      >
        <FluxisQrCode token={naspipToken} size={220} level="L" />
      </div>
      <p
        style={{
          margin: '0.875rem 0 0.75rem',
          fontSize: '0.875rem',
          color: 'var(--fluxis-color-muted, #64748b)',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Escaneá con tu app compatible con Fluxis
        <InfoIcon />
      </p>
      <CompatibleAppsStack apps={apps.map(toCompatibleApp)} style={{ marginTop: '0.25rem' }} />
    </div>
  );
}
