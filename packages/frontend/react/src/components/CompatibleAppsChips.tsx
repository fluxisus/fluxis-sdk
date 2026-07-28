import type { CSSProperties } from 'react';
import type { CompatibleApp, CompatibleAppsChipsProps } from '../types.js';
import { useCompatibleApps } from '../hooks/useCompatibleApps.js';
import { filterCompatibleApps } from '../utils/compatibleApps.js';

function AppChip({
  app,
  onClick,
}: {
  app: CompatibleApp;
  onClick?: (app: CompatibleApp) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(app) : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem 0.25rem 0.25rem',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: '999px',
        background: 'var(--fluxis-color-bg, #ffffff)',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={
        onClick
          ? (e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--fluxis-color-border, #e2e8f0)';
            }
          : undefined
      }
      onMouseLeave={
        onClick
          ? (e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--fluxis-color-bg, #ffffff)';
            }
          : undefined
      }
    >
      <img
        src={app.imageUrl}
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
        style={{ borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--fluxis-color-fg, #0f172a)',
          whiteSpace: 'nowrap',
        }}
      >
        {app.displayName}
      </span>
    </button>
  );
}

export function CompatibleAppsChips({
  apps: providedApps,
  appsUrl,
  syncRemote,
  include,
  exclude,
  onAppClick,
  className,
  style,
}: CompatibleAppsChipsProps) {
  const { apps } = useCompatibleApps({ apps: providedApps, appsUrl, syncRemote });
  const filtered = filterCompatibleApps(apps, include, exclude);

  if (filtered.length === 0) return null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {filtered.map((app) => (
        <AppChip key={app.name} app={app} onClick={onAppClick} />
      ))}
    </div>
  );
}
