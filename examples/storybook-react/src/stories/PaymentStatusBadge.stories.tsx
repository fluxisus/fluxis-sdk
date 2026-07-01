import type { Meta, StoryObj } from '@storybook/react';
import { PaymentStatusBadge } from '@fluxisus/react';

const meta: Meta<typeof PaymentStatusBadge> = {
  title: 'Checkout/PaymentStatusBadge',
  component: PaymentStatusBadge,
  parameters: {
    docs: {
      description: {
        component:
          'Colored pill badge reflecting a `CheckoutSession` status. Works without `FluxisProvider`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentStatusBadge>;

export const Pending: Story = {
  args: { status: 'pending' },
};

export const Confirming: Story = {
  args: { status: 'confirming' },
};

export const Completed: Story = {
  args: { status: 'completed' },
};

export const Expired: Story = {
  args: { status: 'expired' },
};

export const AllStatuses: Story = {
  name: 'All statuses',
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <PaymentStatusBadge status="pending" />
      <PaymentStatusBadge status="confirming" />
      <PaymentStatusBadge status="completed" />
      <PaymentStatusBadge status="expired" />
    </div>
  ),
};
