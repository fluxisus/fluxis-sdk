import type { Meta, StoryObj } from '@storybook/react';
import { AmountDisplay } from '@fluxisus/react';

const meta: Meta<typeof AmountDisplay> = {
  title: 'Checkout/AmountDisplay',
  component: AmountDisplay,
  parameters: {
    docs: {
      description: {
        component:
          'Formats and renders a payment amount with its currency code. Uses `Intl.NumberFormat` with the currency narrow symbol.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AmountDisplay>;

export const USD: Story = {
  args: { amount: '10.00', currency: 'USD' },
};

export const ARS: Story = {
  args: { amount: '1234.99', currency: 'ARS' },
};

export const LargeAmount: Story = {
  name: 'Large amount (USD)',
  args: { amount: '9999.00', currency: 'USD' },
};
