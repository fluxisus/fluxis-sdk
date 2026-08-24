import type { ReactNode } from 'react';

export interface SelectableCard {
  id: string;
  label: string;
  image?: ReactNode;
}

interface SelectableCardListProps {
  items: SelectableCard[];
  onSelect: (id: string) => void;
  disabled?: boolean;
  pendingId?: string | null;
}

/** Two-column card grid. Viewport is sized so ~5 cards stay visible before scrolling. */
const LIST_MAX_HEIGHT = '17.5rem';

export function SelectableCardList({ items, onSelect, disabled, pendingId }: SelectableCardListProps) {
  return (
    <div
      data-testid="selectable-card-list"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        maxHeight: LIST_MAX_HEIGHT,
        overflowY: 'auto',
        paddingRight: '0.125rem',
      }}
    >
      {items.map((item) => {
        const isPending = pendingId === item.id;
        const isDisabled = disabled || (pendingId != null && !isPending);
        return (
          <button
            key={item.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              minHeight: '6.5rem',
              padding: '0.75rem 0.5rem',
              border: '1px solid var(--fluxis-color-border, #e2e8f0)',
              borderRadius: '0.75rem',
              background: 'var(--fluxis-color-bg, #ffffff)',
              cursor: isDisabled ? 'default' : 'pointer',
              opacity: isDisabled && !isPending ? 0.5 : 1,
              font: 'inherit',
              color: 'var(--fluxis-color-fg, #0f172a)',
            }}
          >
            {item.image}
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CardLogo({ src }: { src: string; alt?: string }) {
  if (!src) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          background: 'var(--fluxis-color-border, #e2e8f0)',
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
  );
}
