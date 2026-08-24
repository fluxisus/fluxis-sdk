import { useState, useEffect, useRef } from 'react';
import type { CountdownTimerProps } from '../types.js';
import { useServerTimeOffset } from '../hooks/useServerTimeOffset.js';

function getRemainingSecs(expiresAt: string, offsetMs: number): number {
  const expiryMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryMs)) return 0;
  return Math.max(0, Math.floor((expiryMs - (Date.now() + offsetMs)) / 1000));
}

export function CountdownTimer({ expiresAt, onExpire, className, style }: CountdownTimerProps) {
  const { offsetMs } = useServerTimeOffset();
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const firedRef = useRef(false);

  const [remaining, setRemaining] = useState(() => getRemainingSecs(expiresAt, offsetMs));

  useEffect(() => {
    firedRef.current = false;

    const tick = () => {
      const secs = getRemainingSecs(expiresAt, offsetMs);
      setRemaining(secs);
      if (secs === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, offsetMs]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const color =
    remaining <= 60
      ? '#ef4444'
      : remaining <= 120
        ? '#f59e0b'
        : 'var(--fluxis-color-fg, #0f172a)';

  return (
    <span
      className={className}
      style={{
        color,
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        fontSize: '1.125rem',
        fontWeight: 500,
        transition: 'color 0.3s',
        ...style,
      }}
    >
      {mm}:{ss}
    </span>
  );
}
