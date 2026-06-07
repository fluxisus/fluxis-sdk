import type { CompatibleAppsProps } from '../types.js';
import { useCompatibleApps } from '../hooks/useCompatibleApps.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { filterCompatibleApps } from '../utils/compatibleApps.js';
import { FluxisQrCode } from './FluxisQrCode.js';
import { PayWithAppButton } from './PayWithAppButton.js';

export function CompatibleApps({
  token,
  apps: providedApps,
  appsUrl,
  syncRemote,
  include,
  exclude,
  onSelectApp,
  renderApp,
  forcePlatform,
  showDesktopAppList = true,
  className,
  style,
}: CompatibleAppsProps) {
  const detectedMobile = useIsMobile();
  const isMobile =
    forcePlatform === 'mobile'
      ? true
      : forcePlatform === 'desktop'
        ? false
        : detectedMobile;

  const { apps, loading, error } = useCompatibleApps({
    apps: providedApps,
    appsUrl,
    syncRemote,
  });

  const filteredApps = filterCompatibleApps(apps, include, exclude);

  if (loading) {
    return (
      <div
        className={className}
        style={{
          color: 'var(--fluxis-color-muted, #64748b)',
          fontSize: '0.875rem',
          ...style,
        }}
      >
        Loading compatible apps…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={className}
        role="alert"
        style={{
          color: 'var(--fluxis-color-fg, #0f172a)',
          fontSize: '0.875rem',
          ...style,
        }}
      >
        Failed to load compatible apps: {error.message}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          ...style,
        }}
      >
        {filteredApps.map((app) => {
          const defaultButton = (
            <PayWithAppButton
              key={app.name}
              app={app}
              token={token}
              onClick={onSelectApp}
            />
          );

          return renderApp ? (
            <div key={app.name}>{renderApp(app, defaultButton)}</div>
          ) : (
            defaultButton
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        ...style,
      }}
    >
      <FluxisQrCode token={token} />

      {showDesktopAppList && filteredApps.length > 0 && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--fluxis-color-muted, #64748b)',
              textAlign: 'center',
            }}
          >
            Or pay with a compatible app on your phone
          </p>
          {filteredApps.map((app) => (
            <div
              key={app.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--fluxis-color-border, #e2e8f0)',
                borderRadius: 'var(--fluxis-radius, 0.75rem)',
              }}
            >
              <img
                src={app.imageUrl}
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
                style={{
                  borderRadius: '0.5rem',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.875rem' }}>{app.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
