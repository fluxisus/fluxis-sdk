import { Fragment } from 'react';

interface StepIndicatorProps {
  steps: string[];
  activeStep: number;
}

const DONE_COLOR = '#10b981';
const PENDING_COLOR = 'var(--fluxis-color-border, #e2e8f0)';

export function StepIndicator({ steps, activeStep }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
      {steps.map((step, i) => (
        <Fragment key={step}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '1.625rem',
                height: '1.625rem',
                borderRadius: '50%',
                background: i <= activeStep ? DONE_COLOR : PENDING_COLOR,
                color: i <= activeStep ? '#fff' : 'var(--fluxis-color-muted, #64748b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                color:
                  i <= activeStep
                    ? 'var(--fluxis-color-fg, #0f172a)'
                    : 'var(--fluxis-color-muted, #64748b)',
                whiteSpace: 'nowrap',
              }}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: '2px',
                background: i < activeStep ? DONE_COLOR : PENDING_COLOR,
                marginTop: '0.8125rem',
                marginLeft: '0.25rem',
                marginRight: '0.25rem',
              }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
