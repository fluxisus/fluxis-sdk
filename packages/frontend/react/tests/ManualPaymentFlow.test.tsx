import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualPaymentFlow } from '../src/hosted/ManualPaymentFlow.js';
import { clearUniqueAssetsCache } from '../src/hosted/useUniqueAssets.js';
import type { CheckoutSession } from '../src/types.js';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="pay-qr" data-value={value} />
  ),
}));

const ASSETS_URL = 'https://assets.fluxis.us/unique_asset_ids.json';

const CATALOG = [
  {
    unique_asset_id: 'npolygon_t0xusdc',
    token_symbol: 'USDC',
    network: 'polygon',
    network_name: 'Polygon PoS',
    token_address: '0xusdc',
    reference_asset: 'USD',
    reference_country: 'US',
    token_image_url: 'https://assets.fluxis.us/tokens/usdc.png',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/polygon.png',
  },
  {
    unique_asset_id: 'nbase_t0xusdc',
    token_symbol: 'USDC',
    network: 'base',
    network_name: 'Base',
    token_address: '0xusdc-base',
    reference_asset: 'USD',
    reference_country: 'US',
    token_image_url: 'https://assets.fluxis.us/tokens/usdc.png',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
  {
    unique_asset_id: 'npolygon_t0xusdt',
    token_symbol: 'USDT',
    network: 'polygon',
    network_name: 'Polygon PoS',
    token_address: '0xusdt',
    reference_asset: 'USD',
    reference_country: 'US',
    token_image_url: 'https://assets.fluxis.us/tokens/usdt.png',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/polygon.png',
  },
  {
    unique_asset_id: 'nbase_t0xwars',
    token_symbol: 'wARS',
    network: 'base',
    network_name: 'Base',
    token_address: '0xwars',
    reference_asset: 'ARS',
    reference_country: 'AR',
    token_image_url: 'https://assets.fluxis.us/tokens/wARS.svg',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
  {
    unique_asset_id: 'nbase_t0xargt',
    token_symbol: 'ARGt',
    network: 'base',
    network_name: 'Base',
    token_address: '0xargt',
    reference_asset: 'ARS',
    reference_country: 'AR',
    token_image_url: 'https://assets.fluxis.us/tokens/ARGt.svg',
    network_image_url: 'https://assets.fluxis.us/networks/framed-logos/base.png',
  },
];

const selectingSession: CheckoutSession = {
  id: 'session-1',
  amount: '100.00',
  currency: 'USD',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  status: 'selecting_asset',
  payment_options: CATALOG.map((asset) => ({
    unique_asset_id: asset.unique_asset_id,
    symbol: asset.token_symbol,
    network: asset.network,
  })),
};

const paidSession: CheckoutSession = {
  ...selectingSession,
  status: 'pending',
  manual_transfer: {
    wallet_address: '0xF94F34d2812388804a1E3405c67C49b3a7eD2b7C',
    crypto_amount: '12.5',
    crypto_asset: 'USDC',
    network: 'polygon',
  },
};

function renderFlow(
  session: CheckoutSession = selectingSession,
  extra: Partial<Parameters<typeof ManualPaymentFlow>[0]> = {},
) {
  return render(
    <ManualPaymentFlow session={session} isMobile={false} assetsUrl={ASSETS_URL} {...extra} />,
  );
}

describe('ManualPaymentFlow', () => {
  beforeEach(() => {
    clearUniqueAssetsCache();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => CATALOG,
      }),
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    clearUniqueAssetsCache();
    vi.unstubAllGlobals();
  });

  it('lists each token_symbol once, USDT/USDC first', async () => {
    renderFlow();

    expect(await screen.findByRole('button', { name: 'USDT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USDC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ARGt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'wARS' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'USDC' })).toHaveLength(1);

    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    expect(labels.indexOf('USDT')).toBeLessThan(labels.indexOf('USDC'));
    expect(labels.indexOf('USDC')).toBeLessThan(labels.indexOf('ARGt'));
  });

  it('groups by country when the switch is on', async () => {
    renderFlow();
    await screen.findByRole('button', { name: 'USDC' });

    fireEvent.click(screen.getByRole('switch', { name: 'Agrupar por país' }));

    const countryNames = screen
      .getByTestId('selectable-card-list')
      .querySelectorAll('button')
    expect([...countryNames].map((button) => button.textContent)).toEqual([
      'Argentina',
      'Estados Unidos',
    ]);
    expect(screen.queryByRole('button', { name: 'USDC' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Argentina' }));
    expect(screen.getByRole('button', { name: 'ARGt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'wARS' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'USDC' })).not.toBeInTheDocument();
  });

  it('selects a token then a network and calls onSelectAsset with the unique id', async () => {
    const onSelectAsset = vi.fn().mockResolvedValue(undefined);
    renderFlow(selectingSession, { onSelectAsset });

    fireEvent.click(await screen.findByRole('button', { name: 'USDC' }));
    expect(screen.getByText(/pagar con USDC/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Polygon PoS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Base' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Agrupar por país' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Polygon PoS' }));
    await waitFor(() => {
      expect(onSelectAsset).toHaveBeenCalledWith('npolygon_t0xusdc');
    });
  });

  it('puts the token logo in step 1 and lets the shopper go back', async () => {
    renderFlow();

    fireEvent.click(await screen.findByRole('button', { name: 'USDC' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar stablecoin' }));

    expect(screen.getByText('Elegí el token con el que vas a pagar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USDT' })).toBeInTheDocument();
  });

  async function reachPayStep(isMobile = false) {
    renderFlow(paidSession, { isMobile, onSelectAsset: vi.fn().mockResolvedValue(undefined) });
    expect(await screen.findByText('Monto a pagar')).toBeInTheDocument();
  }

  it('starts directly on the pay step when the session already has a transfer', async () => {
    renderFlow(paidSession);

    expect(await screen.findByText('Monto a pagar')).toBeInTheDocument();
    expect(screen.getByText('Stablecoin')).toBeInTheDocument();
    expect(screen.queryByText('Elegí el token con el que vas a pagar.')).not.toBeInTheDocument();
  });

  it('copies amount and address and shows the QR on desktop', async () => {
    await reachPayStep();

    expect(screen.getByText('Dirección')).toBeInTheDocument();
    expect(screen.getByTestId('pay-qr')).toHaveAttribute(
      'data-value',
      paidSession.manual_transfer!.wallet_address,
    );
    expect(screen.getByText('O escaneá este código QR')).toBeInTheDocument();
    expect(screen.getByText('para autocompletar la dirección en tu billetera')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar monto a pagar' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('12.5');
    expect(screen.getByText('Copiado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar dirección' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      paidSession.manual_transfer!.wallet_address,
    );
  });

  it('hides the address QR on mobile', async () => {
    await reachPayStep(true);

    expect(screen.queryByTestId('pay-qr')).not.toBeInTheDocument();
    expect(screen.queryByText('O escaneá este código QR')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar dirección' })).toBeInTheDocument();
  });
});
