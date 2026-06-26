import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { usePaymentStatus } from '@fluxisus/react';

interface PaymentStatusDemoProps {
  pollInterval?: number;
}

function PaymentStatusDemo({ pollInterval = 3000 }: PaymentStatusDemoProps) {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const statusUrl = simulateFailure
    ? '/api/payment-status/demo?fail=1'
    : '/api/payment-status/demo';

  const { status, data, error, isPolling, refetch } = usePaymentStatus(statusUrl, {
    pollInterval,
    enabled,
  });

  return (
    <div style={{ fontFamily: 'inherit', maxWidth: 480 }}>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr',
          gap: '0.375rem 0.75rem',
          margin: '0 0 1rem',
          fontSize: '0.875rem',
        }}
      >
        <dt style={{ fontWeight: 600, color: '#334155' }}>status</dt>
        <dd style={{ margin: 0 }}>{status ?? '(none yet)'}</dd>
        <dt style={{ fontWeight: 600, color: '#334155' }}>isPolling</dt>
        <dd style={{ margin: 0 }}>{String(isPolling)}</dd>
        <dt style={{ fontWeight: 600, color: '#334155' }}>error</dt>
        <dd style={{ margin: 0 }}>{error ? error.message : '(none)'}</dd>
        <dt style={{ fontWeight: 600, color: '#334155' }}>data</dt>
        <dd style={{ margin: 0, wordBreak: 'break-all' }}>
          {data ? JSON.stringify(data) : '(none)'}
        </dd>
      </dl>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => fetch('/api/payment-status/demo?reset=1').then(refetch)}
        >
          Reset demo + refetch
        </button>
        <button type="button" style={buttonStyle} onClick={refetch}>
          Refetch now
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          enabled
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />
          simulate backend error
        </label>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#64748b' }}>
        Open DevTools → Network and filter on "payment-status" to watch requests fire and stop.
        Status advances: pending (0–6 s) → processing (6–12 s) → completed (12 s+).
      </p>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: '#fff',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: '0.875rem',
};

const meta: Meta<typeof PaymentStatusDemo> = {
  title: 'Hooks/usePaymentStatus',
  component: PaymentStatusDemo,
  parameters: {
    docs: {
      description: {
        component: `
Polls **your own backend route** for live payment status. Never calls the Fluxis API directly.

\`\`\`tsx
const { status, data, error, isPolling, refetch } = usePaymentStatus(
  '/api/payment-status/:id',
  { pollInterval: 5000 },
);
\`\`\`

The demo below polls a mock dev-server route that simulates a payment progressing through
\`pending\` → \`processing\` → \`completed\` on a 12-second timeline. Polling stops automatically
on any terminal status (\`completed\`, \`expired\`, \`failed\`, \`overpaid\`, \`underpaid\`).
Click "Reset demo + refetch" to restart the simulation.
        `.trim(),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentStatusDemo>;

export const Default: Story = {};

export const FastPolling: Story = {
  name: 'Fast polling (1 s)',
  args: { pollInterval: 1000 },
};

export const SlowPolling: Story = {
  name: 'Slow polling (10 s)',
  args: { pollInterval: 10000 },
};
