import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompatibleApps } from '../src/components/CompatibleApps.js';
import { clearCompatibleAppsCache } from '../src/hooks/useCompatibleApps.js';
import type { CompatibleApp } from '../src/types.js';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} />
  ),
}));

const VALID_TOKEN = 'naspip;fluxis.us;test-token';

const mockApps: CompatibleApp[] = [
  {
    name: 'belo',
    displayName: 'Belo App',
    imageUrl: 'https://assets.fluxis.us/apps/belo.svg',
    websiteUrl: 'https://belo.app',
    appStoreUrl: null,
    googlePlayUrl: null,
    deepLink: 'https://api.belo.app/pay?token=[NASPIP_TOKEN]',
  },
  {
    name: 'metamask',
    displayName: 'Metamask',
    imageUrl: 'https://assets.fluxis.us/apps/metamask.png',
    websiteUrl: 'https://metamask.io',
    appStoreUrl: null,
    googlePlayUrl: null,
    deepLink: 'https://metamask.app.link/pay?token=[NASPIP_TOKEN]',
  },
];

describe('CompatibleApps', () => {
  beforeEach(() => {
    clearCompatibleAppsCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearCompatibleAppsCache();
  });

  it('renders pay buttons on mobile', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { assign },
      writable: true,
    });

    render(
      <CompatibleApps token={VALID_TOKEN} apps={mockApps} forcePlatform="mobile" />,
    );

    expect(screen.getByRole('button', { name: /Pay with Belo App/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay with Metamask/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pay with Belo App/i }));
    expect(assign).toHaveBeenCalledWith(
      `https://api.belo.app/pay?token=${encodeURIComponent(VALID_TOKEN)}`,
    );
  });

  it('renders QR fallback on desktop', () => {
    render(
      <CompatibleApps token={VALID_TOKEN} apps={mockApps} forcePlatform="desktop" />,
    );

    expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', VALID_TOKEN);
    expect(screen.getByText('Belo App')).toBeInTheDocument();
    expect(screen.getByText('Metamask')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pay with/i })).not.toBeInTheDocument();
  });

  it('filters apps with include', () => {
    render(
      <CompatibleApps
        token={VALID_TOKEN}
        apps={mockApps}
        include={['belo']}
        forcePlatform="mobile"
      />,
    );

    expect(screen.getByRole('button', { name: /Pay with Belo App/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pay with Metamask/i })).not.toBeInTheDocument();
  });

  it('does not fetch remote apps by default', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    render(<CompatibleApps token={VALID_TOKEN} forcePlatform="mobile" />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to bundled apps when remote fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(
      <CompatibleApps
        token={VALID_TOKEN}
        forcePlatform="mobile"
        syncRemote
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay with Belo App/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('fetches apps from remote URL when apps prop is omitted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: 'belo',
          display_name: 'Belo App',
          image_url: 'https://assets.fluxis.us/apps/belo.svg',
          website_url: 'https://belo.app',
          app_store_url: null,
          google_play_url: null,
          deep_link: 'https://api.belo.app/pay?token=[NASPIP_TOKEN]',
        },
      ],
    } as Response);

    render(
      <CompatibleApps
        token={VALID_TOKEN}
        forcePlatform="mobile"
        appsUrl="https://example.com/apps.json"
        syncRemote
      />,
    );

    expect(screen.getByText(/Loading compatible apps/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay with Belo App/i })).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/apps.json');
  });
});
