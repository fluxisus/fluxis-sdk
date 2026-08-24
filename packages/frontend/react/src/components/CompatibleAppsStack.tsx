import { useState, useEffect, useRef, type CSSProperties } from 'react';
import type { CompatibleApp, CompatibleAppsStackProps } from '../types.js';
import { useCompatibleApps } from '../hooks/useCompatibleApps.js';
import { filterCompatibleApps } from '../utils/compatibleApps.js';

const VISIBLE_COUNT = 4;

export function CompatibleAppsPopover({
  apps,
  onClose,
  align = 'center',
}: {
  apps: CompatibleApp[];
  onClose?: () => void;
  align?: 'center' | 'end';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onClose) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose?.();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const endAligned = align === 'end';

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: endAligned ? 'auto' : '50%',
        right: endAligned ? 0 : 'auto',
        transform: endAligned ? undefined : 'translateX(-50%)',
        background: 'var(--fluxis-color-bg, #ffffff)',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: '0.75rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        padding: '0.875rem 1rem',
        minWidth: '15.5rem',
        maxWidth: '18rem',
        zIndex: 100,
      }}
    >
      {/* arrow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-5px',
          left: endAligned ? 'auto' : '50%',
          right: endAligned ? '12px' : 'auto',
          transform: endAligned ? 'rotate(45deg)' : 'translateX(-50%) rotate(45deg)',
          width: '8px',
          height: '8px',
          background: 'var(--fluxis-color-bg, #ffffff)',
          border: '1px solid var(--fluxis-color-border, #e2e8f0)',
          borderBottom: 'none',
          borderRight: 'none',
        }}
      />
      <p
        style={{
          margin: '0 0 0.625rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--fluxis-color-muted, #64748b)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        Billeteras compatibles
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {apps.map((app) => (
          <div
            key={app.name}
            style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
          >
            <img
              src={app.imageUrl}
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              style={{ borderRadius: '6px', objectFit: 'contain', flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--fluxis-color-fg, #0f172a)',
                fontWeight: 500,
              }}
            >
              {app.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompatibleAppsStack({
  apps: providedApps,
  appsUrl,
  syncRemote,
  include,
  exclude,
  className,
  style,
}: CompatibleAppsStackProps) {
  const [open, setOpen] = useState(false);
  const { apps } = useCompatibleApps({ apps: providedApps, appsUrl, syncRemote });
  const filtered = filterCompatibleApps(apps, include, exclude);

  if (filtered.length === 0) return null;

  const visible = filtered.slice(0, VISIBLE_COUNT);
  const overflow = filtered.length - VISIBLE_COUNT;

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    position: 'relative',
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {/* overlapping logo stack */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {visible.map((app, i) => (
          <img
            key={app.name}
            src={app.imageUrl}
            alt={app.displayName}
            width={28}
            height={28}
            style={{
              borderRadius: '8px',
              objectFit: 'contain',
              border: '2px solid var(--fluxis-color-bg, #ffffff)',
              marginLeft: i === 0 ? 0 : '-8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              background: '#fff',
              flexShrink: 0,
            }}
          />
        ))}
        {overflow > 0 && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              border: '2px solid var(--fluxis-color-bg, #ffffff)',
              background: 'var(--fluxis-color-border, #e2e8f0)',
              marginLeft: '-8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--fluxis-color-muted, #64748b)',
              flexShrink: 0,
            }}
          >
            +{overflow}
          </div>
        )}
      </div>

      {/* info trigger */}
      <button
        type="button"
        aria-label="Ver wallets compatibles"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '1.5px solid var(--fluxis-color-border, #e2e8f0)',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--fluxis-color-muted, #64748b)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          fontFamily: 'inherit',
          lineHeight: 1,
          flexShrink: 0,
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--fluxis-color-primary, #6366f1)';
          el.style.color = 'var(--fluxis-color-primary, #6366f1)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--fluxis-color-border, #e2e8f0)';
          el.style.color = 'var(--fluxis-color-muted, #64748b)';
        }}
      >
        i
      </button>

      {open && <CompatibleAppsPopover apps={filtered} onClose={() => setOpen(false)} />}
    </div>
  );
}
