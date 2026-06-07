import { useId, useState } from 'react';
import type { CompatibleApp, CompatibleAppsMarqueeProps } from '../types.js';
import { useCompatibleApps } from '../hooks/useCompatibleApps.js';
import { filterCompatibleApps } from '../utils/compatibleApps.js';

const DEFAULT_WIDTH = '100%';
const DEFAULT_HEIGHT = 56;
const DEFAULT_SPEED = 24;
const DEFAULT_GAP = 12;
const MIN_SEQUENCE_ITEMS = 12;

function MarqueeItem({
  app,
  height,
  showAppName,
  onAppClick,
}: {
  app: CompatibleApp;
  height: number;
  showAppName: boolean;
  onAppClick?: (app: CompatibleApp) => void;
}) {
  const logoSize = Math.max(24, Math.round(height * 0.5));

  return (
    <div
      role={onAppClick ? 'button' : undefined}
      tabIndex={onAppClick ? 0 : undefined}
      onClick={onAppClick ? () => onAppClick(app) : undefined}
      onKeyDown={
        onAppClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onAppClick(app);
              }
            }
          : undefined
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        height: '100%',
        padding: '0 0.375rem',
        flexShrink: 0,
        cursor: onAppClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      <img
        src={app.imageUrl}
        alt=""
        aria-hidden="true"
        width={logoSize}
        height={logoSize}
        style={{
          width: logoSize,
          height: logoSize,
          borderRadius: '0.5rem',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      {showAppName && (
        <span
          style={{
            fontSize: '0.875rem',
            color: 'var(--fluxis-color-fg, #0f172a)',
            fontWeight: 500,
          }}
        >
          {app.displayName}
        </span>
      )}
    </div>
  );
}

export function CompatibleAppsMarquee({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  apps: providedApps,
  appsUrl,
  syncRemote,
  include,
  exclude,
  speed = DEFAULT_SPEED,
  gap = DEFAULT_GAP,
  showAppName = true,
  onAppClick,
  className,
  style,
}: CompatibleAppsMarqueeProps) {
  const reactId = useId();
  const [isPaused, setIsPaused] = useState(false);
  const animationName = `fluxis-marquee-${reactId.replace(/:/g, '')}`;

  const { apps, loading } = useCompatibleApps({
    apps: providedApps,
    appsUrl,
    syncRemote,
  });

  const filteredApps = filterCompatibleApps(apps, include, exclude);
  const sequenceCopies =
    filteredApps.length > 0
      ? Math.max(2, Math.ceil(MIN_SEQUENCE_ITEMS / filteredApps.length))
      : 0;
  const sequenceApps = Array.from({ length: sequenceCopies }).flatMap(
    () => filteredApps,
  );
  const marqueeApps = [...sequenceApps, ...sequenceApps];

  if (loading && filteredApps.length === 0) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fluxis-color-muted, #64748b)',
          fontSize: '0.875rem',
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderRadius: 'var(--fluxis-radius, 0.75rem)',
          ...style,
        }}
      >
        Loading compatible apps…
      </div>
    );
  }

  if (filteredApps.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes ${animationName} {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        [data-fluxis-marquee]:hover [data-fluxis-marquee-track] {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className={className}
        data-fluxis-marquee=""
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          width,
          height,
          overflow: 'hidden',
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderRadius: 'var(--fluxis-radius, 0.75rem)',
          backgroundColor: 'var(--fluxis-color-bg, #ffffff)',
          position: 'relative',
          ...style,
        }}
      >
        <div
          data-fluxis-marquee-track=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            width: 'max-content',
            height: '100%',
            gap,
            padding: `0 ${gap}px`,
            animation: `${animationName} ${speed}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {marqueeApps.map((app, index) => (
            <MarqueeItem
              key={`${app.name}-${index}`}
              app={app}
              height={height}
              showAppName={showAppName}
              onAppClick={onAppClick}
            />
          ))}
        </div>
      </div>
    </>
  );
}
