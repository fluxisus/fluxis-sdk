import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  ConfirmingScreen,
  CompletedScreen,
  ExpiredScreen,
} from '../components/checkout/StatusScreens.js';
import { useServerTimeOffset } from '../hooks/useServerTimeOffset.js';
import { isCheckoutSessionPastExpiry } from '../utils/checkoutExpiry.js';
import { HostedPendingScreen } from './HostedPendingScreen.js';
import type { HostedCheckoutWidgetProps } from './types.js';

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

export function HostedCheckoutWidget({
  session,
  checkoutUrl,
  appsUrl,
  uniqueAssetsUrl,
  walletConnectUri,
  walletConnectLogoUrl,
  installedWalletNames,
  onSelectWalletConnect,
  onPrepareWalletConnect,
  onLaunchExtension,
  onSelectAsset,
  onRetryExpired,
  isRetryingExpired,
  onPayWithWallet,
  isPayingWithWallet,
  payWithWalletError,
  className,
  style,
}: HostedCheckoutWidgetProps) {
  const mergedStyle = { ...centeredCard, ...style };
  const { offsetMs } = useServerTimeOffset();
  const [forceExpired, setForceExpired] = useState(() =>
    isCheckoutSessionPastExpiry(session.expires_at, offsetMs),
  );

  useEffect(() => {
    if (isCheckoutSessionPastExpiry(session.expires_at, offsetMs)) {
      setForceExpired(true);
    }
  }, [session.expires_at, offsetMs]);

  if (session.status === 'confirming') {
    return <ConfirmingScreen session={session} className={className} style={mergedStyle} />;
  }

  if (session.status === 'completed') {
    return (
      <CompletedScreen
        session={session}
        returnUrl={session.return_url}
        className={className}
        style={mergedStyle}
      />
    );
  }

  if (session.status === 'expired' || forceExpired) {
    return (
      <ExpiredScreen
        onRetry={onRetryExpired}
        isRetrying={isRetryingExpired}
        returnUrl={session.return_url}
        className={className}
        style={mergedStyle}
      />
    );
  }

  return (
    <HostedPendingScreen
      session={session}
      checkoutUrl={checkoutUrl}
      appsUrl={appsUrl}
      uniqueAssetsUrl={uniqueAssetsUrl}
      walletConnectUri={walletConnectUri}
      walletConnectLogoUrl={walletConnectLogoUrl}
      installedWalletNames={installedWalletNames}
      onSelectWalletConnect={onSelectWalletConnect}
      onPrepareWalletConnect={onPrepareWalletConnect}
      onLaunchExtension={onLaunchExtension}
      onSelectAsset={onSelectAsset}
      onPayWithWallet={onPayWithWallet}
      isPayingWithWallet={isPayingWithWallet}
      payWithWalletError={payWithWalletError}
      onExpiredTimeout={() => setForceExpired(true)}
      className={className}
      style={style}
    />
  );
}
