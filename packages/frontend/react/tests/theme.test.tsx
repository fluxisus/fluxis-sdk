import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FluxisProvider } from '../src/theme/FluxisProvider.js';
import { useFluxisTheme } from '../src/theme/useFluxisTheme.js';

function ThemeProbe() {
  const theme = useFluxisTheme();
  return <span data-testid="primary">{theme.colorPrimary}</span>;
}

describe('FluxisProvider', () => {
  it('merges partial theme and exposes it via context', () => {
    render(
      <FluxisProvider theme={{ colorPrimary: '#ff00aa' }}>
        <ThemeProbe />
      </FluxisProvider>,
    );

    expect(screen.getByTestId('primary')).toHaveTextContent('#ff00aa');
  });

  it('injects CSS variables on the wrapper', () => {
    const { container } = render(
      <FluxisProvider theme={{ qrFg: '#111111', qrBg: '#eeeeee' }}>
        <div>child</div>
      </FluxisProvider>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue('--fluxis-qr-fg')).toBe('#111111');
    expect(wrapper.style.getPropertyValue('--fluxis-qr-bg')).toBe('#eeeeee');
  });
});
