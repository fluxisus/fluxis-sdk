import type { CSSProperties } from 'react';
import type { CheckoutWidgetProps } from '../types.js';
import { PendingScreen } from './checkout/PendingScreen.js';
import {
  ConfirmingScreen,
  CompletedScreen,
  ExpiredScreen,
} from './checkout/StatusScreens.js';

const centeredCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1.5rem',
  padding: '2rem',
  background: 'var(--fluxis-color-bg, #ffffff)',
  border: '1px solid var(--fluxis-color-border, #e2e8f0)',
  borderRadius: 'var(--fluxis-radius, 0.75rem)',
  fontFamily: 'var(--fluxis-font-family, system-ui, -apple-system, sans-serif)',
  color: 'var(--fluxis-color-fg, #0f172a)',
  boxSizing: 'border-box',
};

export function CheckoutWidget({ session, className, style }: CheckoutWidgetProps) {
  const mergedStyle = { ...centeredCard, ...style };

  if (session.status === 'confirming') {
    return <ConfirmingScreen session={session} className={className} style={mergedStyle} />;
  }

  if (session.status === 'completed') {
    return <CompletedScreen session={session} returnUrl={session.return_url} className={className} style={mergedStyle} />;
  }

  if (session.status === 'expired') {
    return <ExpiredScreen className={className} style={mergedStyle} />;
  }

  return <PendingScreen session={session} className={className} style={style} />;
}
