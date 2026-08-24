import { Fragment } from 'react';

export interface StepIndicatorItem {
  label: string;
  logoUrl?: string;
  onClick?: () => void;
}

interface StepIndicatorProps {
  steps: Array<string | StepIndicatorItem>;
  activeStep: number;
}

const DONE_COLOR = '#10b981';
const PENDING_COLOR = 'var(--fluxis-color-border, #e2e8f0)';

function normalize(step: string | StepIndicatorItem): StepIndicatorItem {
  return typeof step === 'string' ? { label: step } : step;
}

export function StepIndicator({ steps, activeStep }: StepIndicatorProps) {
  const items = steps.map(normalize);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
      {items.map((item, i) => {
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        const filled = isActive || isDone;
        const clickable = Boolean(item.onClick && item.logoUrl);
        const circle = (
          <div
            style={{
              width: '1.75rem',
              height: '1.75rem',
              borderRadius: '50%',
              background: item.logoUrl
                ? 'var(--fluxis-color-bg, #ffffff)'
                : filled
                  ? DONE_COLOR
                  : PENDING_COLOR,
              color: filled ? '#fff' : 'var(--fluxis-color-muted, #64748b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              overflow: 'hidden',
              boxShadow: item.logoUrl
                ? `0 0 0 2px ${isActive ? DONE_COLOR : isDone ? DONE_COLOR : PENDING_COLOR}`
                : undefined,
            }}
          >
            {item.logoUrl ? (
              <img
                src={item.logoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              i + 1
            )}
          </div>
        );

        return (
          <Fragment key={item.label}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                flexShrink: 0,
              }}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  aria-label={`Cambiar ${item.label.toLowerCase()}`}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    lineHeight: 0,
                  }}
                >
                  {circle}
                </button>
              ) : (
                circle
              )}
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color:
                    filled
                      ? 'var(--fluxis-color-fg, #0f172a)'
                      : 'var(--fluxis-color-muted, #64748b)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  background: i < activeStep ? DONE_COLOR : PENDING_COLOR,
                  marginTop: '0.875rem',
                  marginLeft: '0.25rem',
                  marginRight: '0.25rem',
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
