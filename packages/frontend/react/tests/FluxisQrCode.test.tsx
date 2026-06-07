import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FluxisQrCode } from '../src/components/FluxisQrCode.js';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({
    value,
    fgColor,
    bgColor,
    size,
  }: {
    value: string;
    fgColor: string;
    bgColor: string;
    size: number;
  }) => (
    <svg
      data-testid="qr-code"
      data-value={value}
      data-fg={fgColor}
      data-bg={bgColor}
      width={size}
      height={size}
    />
  ),
}));

const VALID_TOKEN = 'naspip;fluxis.us;test-token';

describe('FluxisQrCode', () => {
  it('renders QR code with centered logo image overlay', () => {
    const { container } = render(<FluxisQrCode token={VALID_TOKEN} />);

    const qr = screen.getByTestId('qr-code');
    expect(qr).toHaveAttribute('data-value', VALID_TOKEN);

    const logo = container.querySelector('img[aria-hidden="true"]');
    expect(logo).toBeTruthy();
    expect(logo?.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    expect(logo?.getAttribute('width')).toBe('60');
  });

  it('shows fallback for invalid token', () => {
    const onInvalidToken = vi.fn();
    render(
      <FluxisQrCode token="invalid" onInvalidToken={onInvalidToken} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid NASPIP token');
    expect(onInvalidToken).toHaveBeenCalledWith('invalid');
  });

  it('applies color overrides via props', () => {
    render(
      <FluxisQrCode
        token={VALID_TOKEN}
        fgColor="#ff0000"
        bgColor="#00ff00"
      />,
    );

    const qr = screen.getByTestId('qr-code');
    expect(qr).toHaveAttribute('data-fg', '#ff0000');
    expect(qr).toHaveAttribute('data-bg', '#00ff00');
  });
});
