import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FluxisQrCode } from '../src/components/FluxisQrCode.js';
import { FluxisProvider } from '../src/theme/FluxisProvider.js';

const VALID_TOKEN = 'naspip;fluxis.us;test-token';

describe('FluxisQrCode integration', () => {
  it('renders a real QR svg', () => {
    const { container } = render(<FluxisQrCode token={VALID_TOKEN} size={240} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('240');
    expect(svg?.getAttribute('height')).toBe('240');
  });

  it('renders with theme colors from FluxisProvider', () => {
    const { container } = render(
      <FluxisProvider theme={{ qrFg: '#112233', qrBg: '#ffffff' }}>
        <FluxisQrCode token={VALID_TOKEN} size={200} />
      </FluxisProvider>,
    );

    expect(container.querySelector('svg')).toBeTruthy();
  });
});
