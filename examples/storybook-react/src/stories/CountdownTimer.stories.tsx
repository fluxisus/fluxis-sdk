import type { Meta, StoryObj } from '@storybook/react';
import { CountdownTimer } from '@fluxisus/react';

const meta: Meta<typeof CountdownTimer> = {
  title: 'Checkout/CountdownTimer',
  component: CountdownTimer,
  parameters: {
    docs: {
      description: {
        component: `
Live countdown to an ISO expiry timestamp. Corrects for server clock-skew via
\`useServerTimeOffset\` (requires \`FluxisProvider\` ancestor; defaults to wall-clock time without one).

Color transitions: normal → amber at < 2 min → red at < 60 s.
Fires \`onExpire\` once when the counter reaches \`00:00\`.
        `.trim(),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CountdownTimer>;

export const Normal: Story = {
  name: 'Normal (10 min remaining)',
  args: {
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  },
};

export const Urgent: Story = {
  name: 'Urgent (< 60 s)',
  args: {
    expiresAt: new Date(Date.now() + 45 * 1000).toISOString(),
  },
};

export const Expired: Story = {
  name: 'Expired (00:00)',
  args: {
    expiresAt: new Date(Date.now() - 5000).toISOString(),
  },
};
