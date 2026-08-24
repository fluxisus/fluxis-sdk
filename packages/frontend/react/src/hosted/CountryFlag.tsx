interface CountryFlagProps {
  country: string;
  size?: number;
}

/**
 * Renders an ISO 3166-1 alpha-2 flag via `flag-icons` classes. The host should import
 * `flag-icons/css/flag-icons.min.css`; the background-image fallback keeps the mark visible
 * when that CSS is not loaded (SDK tests, isolated renders).
 */
export function CountryFlag({ country, size = 28 }: CountryFlagProps) {
  const iso = country.toLowerCase();
  if (!iso || iso === 'xx') {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size * 0.75,
          borderRadius: 3,
          background: 'var(--fluxis-color-border, #e2e8f0)',
          display: 'inline-block',
        }}
      />
    );
  }

  return (
    <span
      className={`fi fi-${iso}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size * 0.75,
        borderRadius: 3,
        display: 'inline-block',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url(https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/${iso}.svg)`,
        boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.08)',
      }}
    />
  );
}
