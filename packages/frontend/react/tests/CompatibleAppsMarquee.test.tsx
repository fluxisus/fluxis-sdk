import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompatibleAppsMarquee } from '../src/components/CompatibleAppsMarquee.js';
import { getBundledCompatibleApps } from '../src/hooks/useCompatibleApps.js';

describe('CompatibleAppsMarquee', () => {
  it('renders a horizontal scrolling track with repeated app logos', () => {
    const { container } = render(
      <CompatibleAppsMarquee
        width={420}
        height={56}
        apps={getBundledCompatibleApps()}
      />,
    );

    expect(container.querySelector('[data-fluxis-marquee]')).toBeTruthy();
    expect(container.querySelector('[data-fluxis-marquee-track]')).toBeTruthy();
    expect(screen.getAllByText('Belo App').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Metamask').length).toBeGreaterThan(1);
  });

  it('applies custom width and height', () => {
    const { container } = render(
      <CompatibleAppsMarquee
        width={500}
        height={72}
        apps={getBundledCompatibleApps()}
      />,
    );

    const marquee = container.querySelector('[data-fluxis-marquee]') as HTMLElement;
    expect(marquee.style.width).toBe('500px');
    expect(marquee.style.height).toBe('72px');
  });

  it('pauses on hover and resumes when hover ends', () => {
    const { container } = render(
      <CompatibleAppsMarquee apps={getBundledCompatibleApps()} />,
    );

    const marquee = container.querySelector('[data-fluxis-marquee]') as HTMLElement;
    const track = container.querySelector(
      '[data-fluxis-marquee-track]',
    ) as HTMLElement;

    expect(track.style.animationPlayState).toBe('running');

    fireEvent.mouseEnter(marquee);
    expect(track.style.animationPlayState).toBe('paused');

    fireEvent.mouseLeave(marquee);
    expect(track.style.animationPlayState).toBe('running');
  });

  it('does not render per-app card borders', () => {
    const { container } = render(
      <CompatibleAppsMarquee apps={getBundledCompatibleApps()} />,
    );

    const firstItem = container.querySelector(
      '[data-fluxis-marquee-track] > div',
    ) as HTMLElement;

    expect(firstItem.style.border).toBe('');
  });
});
