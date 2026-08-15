import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostedCheckoutWidget } from '../src/hosted/HostedCheckoutWidget.js';
import { clearWalletCatalogCache } from '../src/hosted/useWalletCatalog.js';
import { FluxisProvider } from '../src/theme/FluxisProvider.js';
import type { CheckoutSession } from '../src/types.js';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} />
  ),
}));

const VALID_TOKEN = 'naspip;fluxis.us;test-token';
const CHECKOUT_URL = 'https://checkout.stgfluxis.us/checkout/pay/abc';
const APPS_URL = 'https://assets.fluxis.us/sdk-assets/compatible-apps-stg.json';

const CATALOG = [
  {
    name: 'belo',
    display_name: 'Belo App',
    image_url: 'https://assets.fluxis.us/apps/belo.svg',
    website_url: 'https://belo.app',
    app_store_url: null,
    google_play_url: null,
    deep_link: 'https://api.belo.app/dynamic-link?naspip_token=[NASPIP_TOKEN]',
    type: 'CEFI',
  },
  {
    name: 'metamask',
    display_name: 'Metamask',
    image_url: 'https://assets.fluxis.us/apps/metamask.png',
    website_url: 'https://metamask.io',
    app_store_url: null,
    google_play_url: null,
    deep_link: 'https://metamask.app.link/dapp/[CHECKOUT_HOST_PATH]',
    type: 'DEFI',
  },
  {
    name: 'trustwallet',
    display_name: 'Trust Wallet',
    image_url: 'https://assets.fluxis.us/apps/trustwallet.png',
    website_url: 'https://trustwallet.com',
    app_store_url: null,
    google_play_url: null,
    deep_link: 'https://link.trustwallet.com/open_url?url=[CHECKOUT_URL]',
    type: 'DEFI',
  },
];

const pendingSession: CheckoutSession = {
  id: 'session-1',
  amount: '100.00',
  currency: 'USD',
  recipient_address: VALID_TOKEN,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  status: 'pending',
};

function renderHosted(session: CheckoutSession = pendingSession) {
  return render(
    <FluxisProvider>
      <HostedCheckoutWidget session={session} checkoutUrl={CHECKOUT_URL} appsUrl={APPS_URL} />
    </FluxisProvider>,
  );
}

describe('HostedCheckoutWidget', () => {
  beforeEach(() => {
    clearWalletCatalogCache();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const href = String(url);
        if (href.includes('unique_asset_ids')) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.resolve({ ok: true, json: async () => CATALOG });
      }),
    );
  });

  afterEach(() => {
    clearWalletCatalogCache();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows Fluxis first with the CEFI NASPIP QR by default on desktop', async () => {
    renderHosted();

    expect(screen.queryByRole('tab', { name: 'Billeteras Fluxis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Wallet cripto' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Fluxis' })).toBeInTheDocument();
    expect(screen.getByText('Metamask')).toBeInTheDocument();
    expect(screen.getByText('Trust Wallet')).toBeInTheDocument();
    expect(screen.getByText('Otras wallets')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', VALID_TOKEN);
    });
    expect(screen.getByText('Escaneá con tu app compatible con Fluxis')).toBeInTheDocument();
  });

  it('lists CEFI app names when hovering the stacked logos on the Fluxis row', async () => {
    renderHosted();

    await screen.findByRole('button', { name: 'Fluxis' });
    expect(screen.queryByText('Billeteras compatibles')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('cefi-compatible-apps'));
    expect(screen.getByText('Billeteras compatibles')).toBeInTheDocument();
    expect(screen.getByText('Belo App')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('cefi-compatible-apps'));
    expect(screen.queryByText('Billeteras compatibles')).not.toBeInTheDocument();
  });

  it('encodes the selected wallet deeplink in the QR', async () => {
    renderHosted();

    fireEvent.click(await screen.findByRole('button', { name: 'Metamask' }));

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toHaveAttribute(
        'data-value',
        'https://metamask.app.link/dapp/checkout.stgfluxis.us/checkout/pay/abc',
      );
    });
    expect(screen.getByText('Escaneá con la cámara para abrir Metamask')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Trust Wallet' }));

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toHaveAttribute(
        'data-value',
        `https://link.trustwallet.com/open_url?url=${encodeURIComponent(CHECKOUT_URL)}`,
      );
    });
  });

  it('shows a WalletConnect QR when Otras wallets is selected', async () => {
    const onSelectWalletConnect = vi.fn();
    render(
      <FluxisProvider>
        <HostedCheckoutWidget
          session={pendingSession}
          checkoutUrl={CHECKOUT_URL}
          appsUrl={APPS_URL}
          walletConnectUri="wc:abc123"
          onSelectWalletConnect={onSelectWalletConnect}
        />
      </FluxisProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Otras wallets/ }));

    expect(onSelectWalletConnect).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', 'wc:abc123');
    });
    expect(screen.getByText('Escaneá con WalletConnect')).toBeInTheDocument();
  });

  it('offers Abrir when the selected wallet extension is installed', async () => {
    const onLaunchExtension = vi.fn();
    render(
      <FluxisProvider>
        <HostedCheckoutWidget
          session={pendingSession}
          checkoutUrl={CHECKOUT_URL}
          appsUrl={APPS_URL}
          installedWalletNames={['metamask']}
          onLaunchExtension={onLaunchExtension}
        />
      </FluxisProvider>,
    );

    expect(await screen.findByText('Instalada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Metamask' }));

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Metamask' }));
    expect(onLaunchExtension).toHaveBeenCalledWith('metamask');
  });

  it('keeps the Abrir slot in the layout when the extension is not installed', async () => {
    renderHosted();
    expect(await screen.findByTestId('launch-extension-slot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abrir / })).not.toBeInTheDocument();
  });

  it('always shows Transferencia manual under the wallet list', async () => {
    renderHosted({
      ...pendingSession,
      manual_transfer: {
        wallet_address: '0xabc',
        crypto_amount: '1',
        crypto_asset: 'USDC',
        network: 'polygon',
      },
    });

    expect(await screen.findByRole('button', { name: 'Fluxis' })).toBeInTheDocument();
    expect(screen.getByText('Transferencia manual')).toBeInTheDocument();
    expect(screen.getByTestId('section-or-divider')).toHaveTextContent('o');

    const details = screen.getByText('Identificador');
    const wallets = screen.getByText('Elegí con qué pagar');
    const manual = screen.getByText('Transferencia manual');
    expect(details.compareDocumentPosition(wallets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wallets.compareDocumentPosition(manual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('labels the session id as Identificador and omits Referencia without external_id', async () => {
    renderHosted();

    expect(await screen.findByText('Identificador')).toBeInTheDocument();
    expect(screen.getByText(pendingSession.id)).toBeInTheDocument();
    expect(screen.queryByText('Referencia')).not.toBeInTheDocument();
    expect(screen.getByText('Pendiente de pago')).toBeInTheDocument();
  });

  it('shows Referencia with the external_id when the session has one', async () => {
    renderHosted({ ...pendingSession, external_id: 'ORDER-123' });

    expect(await screen.findByText('Identificador')).toBeInTheDocument();
    expect(screen.getByText('Referencia')).toBeInTheDocument();
    expect(screen.getByText('ORDER-123')).toBeInTheDocument();
  });

  it('opens a CEFI deeplink from the mobile grid instead of a QR', async () => {
    const assign = vi.fn();
    vi.stubGlobal('innerWidth', 375);
    Object.defineProperty(window, 'location', {
      value: { assign, href: CHECKOUT_URL },
      writable: true,
    });

    renderHosted();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const belo = await screen.findByRole('button', { name: 'Belo App' });
    const metamask = screen.getByRole('button', { name: 'Metamask' });
    expect(belo.compareDocumentPosition(metamask) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Otras wallets/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Pagar con Belo App')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();

    fireEvent.click(belo);
    expect(assign).toHaveBeenCalledWith(
      `https://api.belo.app/dynamic-link?naspip_token=${encodeURIComponent(VALID_TOKEN)}`,
    );
  });

  it('opens a DEFI deeplink from the mobile grid instead of showing a QR', async () => {
    const assign = vi.fn();
    vi.stubGlobal('innerWidth', 375);
    Object.defineProperty(window, 'location', {
      value: { assign, href: CHECKOUT_URL },
      writable: true,
    });

    renderHosted();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Metamask' }));

    expect(assign).toHaveBeenCalledWith(
      'https://metamask.app.link/dapp/checkout.stgfluxis.us/checkout/pay/abc',
    );
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('centers the last mobile row when two wallets remain', async () => {
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          ...CATALOG,
          {
            name: 'phantom',
            display_name: 'Phantom',
            image_url: 'https://assets.fluxis.us/apps/phantom.png',
            website_url: 'https://phantom.app',
            app_store_url: null,
            google_play_url: null,
            deep_link: 'https://phantom.app/ul/browse/[CHECKOUT_URL]',
            type: 'DEFI',
          },
          {
            name: 'base',
            display_name: 'Base App',
            image_url: 'https://assets.fluxis.us/apps/base.png',
            website_url: 'https://base.org',
            app_store_url: null,
            google_play_url: null,
            deep_link: 'https://go.cb-w.com/dapp?cb_url=[CHECKOUT_URL]',
            type: 'DEFI',
          },
        ],
      }),
    );

    renderHosted();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const belo = await screen.findByRole('button', { name: 'Belo App' });
    expect(belo.parentElement).toHaveStyle({ justifyContent: 'center' });
  });
});
