import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefiWalletPanel } from '../src/hosted/DefiWalletPanel.js';
import type { CheckoutPaymentOption, ConnectedWalletInfo } from '../src/types.js';
import type { ConnectedWalletBalance, WalletCatalogApp } from '../src/hosted/types.js';

const connectedWallet: ConnectedWalletInfo = { address: '0xF94F34d2812388804a1E3405c67C49b3a7eD2b7C', label: 'MetaMask' };

const paymentOptions: CheckoutPaymentOption[] = [
  { unique_asset_id: 'npolygon_t0xusdc', symbol: 'USDC', network: 'polygon' },
];

const manualTransfer = {
  wallet_address: '0xabc',
  crypto_amount: '12.5',
  crypto_asset: 'USDC',
  network: 'polygon',
};

function makeCefiApp(name: string, deepLink: string): WalletCatalogApp {
  return {
    name,
    displayName: name,
    imageUrl: `https://example.com/${name}.png`,
    websiteUrl: 'https://example.com',
    appStoreUrl: null,
    googlePlayUrl: null,
    deepLink,
    type: 'CEFI',
  };
}

const beloApp = makeCefiApp('belo', 'https://api.belo.app?naspip_token=[NASPIP_TOKEN]');
const lemonApp = makeCefiApp(
  'lemon',
  'https://www.lemon.me/app/cash-out-crypto?network=[NETWORK]&address=[ADDRESS]&currency=[ASSET]&amount=[AMOUNT]&partner=fluxis',
);

function renderPanel(
  walletBalances?: ConnectedWalletBalance[],
  onPayWithWallet = vi.fn(),
  extra: Partial<Parameters<typeof DefiWalletPanel>[0]> = {},
) {
  return render(
    <DefiWalletPanel
      apps={[]}
      checkoutUrl="https://checkout.fluxis.us/session-1"
      isMobile={false}
      connectedWallet={connectedWallet}
      paymentOptions={paymentOptions}
      manualTransfer={manualTransfer}
      walletBalances={walletBalances}
      onPayWithWallet={onPayWithWallet}
      {...extra}
    />,
  );
}

describe('CefiLogoStack — NASPIP-only filtering on desktop', () => {
  function renderDesktopWithCefi(cefiApps: WalletCatalogApp[]) {
    return render(
      <DefiWalletPanel
        apps={[]}
        cefiApps={cefiApps}
        naspipToken="naspip;test"
        checkoutUrl="https://checkout.fluxis.us/session-1"
        isMobile={false}
        manualTransfer={manualTransfer}
      />,
    );
  }

  it('shows Belo in the logo stack (NASPIP-compatible)', () => {
    renderDesktopWithCefi([beloApp]);
    const stack = screen.getByTestId('cefi-compatible-apps');
    expect(stack.querySelector('img[src*="belo"]')).toBeTruthy();
  });

  it('does NOT show Lemon in the logo stack (transfer-deeplink-only, not NASPIP)', () => {
    renderDesktopWithCefi([lemonApp]);
    // Lemon is filtered out of the logo stack even when it passes transfer filtering
    expect(screen.queryByTestId('cefi-compatible-apps')).toBeNull();
  });

  it('shows Belo but not Lemon when both are present', () => {
    renderDesktopWithCefi([beloApp, lemonApp]);
    const stack = screen.getByTestId('cefi-compatible-apps');
    expect(stack.querySelector('img[src*="belo"]')).toBeTruthy();
    expect(stack.querySelector('img[src*="lemon"]')).toBeNull();
  });
});

describe('ConnectedWalletPanel (via DefiWalletPanel)', () => {
  it('enables the pay button when the balance covers the transfer amount', () => {
    renderPanel([{ uniqueAssetId: 'npolygon_t0xusdc', balance: '20.00' }]);

    const button = screen.getByRole('button', { name: /Pagar 12.5 USDC/ });
    expect(button).toBeEnabled();
    expect(screen.queryByText('Balance insuficiente')).not.toBeInTheDocument();
  });

  it('disables the pay button and shows a message when the balance is too low', () => {
    renderPanel([{ uniqueAssetId: 'npolygon_t0xusdc', balance: '5.00' }]);

    const button = screen.getByRole('button', { name: /Pagar 12.5 USDC/ });
    expect(button).toBeDisabled();
    expect(screen.getByText('Balance insuficiente')).toBeInTheDocument();
  });

  it('does not block payment when no balance data is available for the asset', () => {
    renderPanel(undefined);

    const button = screen.getByRole('button', { name: /Pagar 12.5 USDC/ });
    expect(button).toBeEnabled();
    expect(screen.queryByText('Balance insuficiente')).not.toBeInTheDocument();
  });

  it('replaces the pay button with the tx hash and an explorer link once a transaction was sent', () => {
    renderPanel(undefined, vi.fn(), {
      lastTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    });

    expect(screen.queryByRole('button', { name: /Pagar 12.5 USDC/ })).not.toBeInTheDocument();
    expect(screen.getByText('Transacción enviada')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Ver en el explorador/ });
    expect(link).toHaveAttribute(
      'href',
      'https://polygonscan.com/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    );
  });
});
