import type { PayWithAppButtonProps } from '../types.js';
import { buildDeepLink } from '../utils/naspip.js';

export function PayWithAppButton({
  app,
  token,
  className,
  style,
  onClick,
}: PayWithAppButtonProps) {
  const deepLink = buildDeepLink(app.deepLink, token);

  const handleClick = () => {
    onClick?.(app, deepLink);
    window.location.assign(deepLink);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        width: '100%',
        padding: '0.75rem 1rem',
        border: '1px solid var(--fluxis-color-border, #e2e8f0)',
        borderRadius: 'var(--fluxis-radius, 0.75rem)',
        backgroundColor: 'var(--fluxis-button-bg, #ffffff)',
        color: 'var(--fluxis-button-fg, #0f172a)',
        fontFamily: 'inherit',
        fontSize: '1rem',
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
        ...style,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor =
          'var(--fluxis-button-hover-bg, #f8fafc)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor =
          'var(--fluxis-button-bg, #ffffff)';
      }}
    >
      <img
        src={app.imageUrl}
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        style={{
          borderRadius: '0.5rem',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      <span>Pay with {app.displayName}</span>
    </button>
  );
}
