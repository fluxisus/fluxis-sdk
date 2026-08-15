export type WalletMethod = 'CEFI' | 'DEFI';

export function WalletMethodTabs({
  value,
  onChange,
}: {
  value: WalletMethod;
  onChange: (next: WalletMethod) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Método de pago"
      style={{
        display: 'flex',
        gap: '0.375rem',
        padding: '0.25rem',
        background: 'var(--fluxis-color-border, #e2e8f0)',
        borderRadius: '0.75rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <TabButton
        selected={value === 'CEFI'}
        onClick={() => onChange('CEFI')}
        label="Billeteras Fluxis"
      />
      <TabButton
        selected={value === 'DEFI'}
        onClick={() => onChange('DEFI')}
        label="Wallet cripto"
      />
    </div>
  );
}

function TabButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      style={{
        flex: 1,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.8125rem',
        fontWeight: 600,
        padding: '0.5rem 0.75rem',
        borderRadius: '0.6rem',
        background: selected ? 'var(--fluxis-color-bg, #ffffff)' : 'transparent',
        color: selected
          ? 'var(--fluxis-color-fg, #0f172a)'
          : 'var(--fluxis-color-muted, #64748b)',
        boxShadow: selected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {label}
    </button>
  );
}
