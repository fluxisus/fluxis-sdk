import type { Meta, StoryObj } from '@storybook/react';
import { AddressCopyButton } from '@fluxisus/react';

const DEMO_ADDRESS = '0xB4DB02f8c4b5159e5368CE4749fD9344a333999';

const meta: Meta<typeof AddressCopyButton> = {
  title: 'Checkout/AddressCopyButton',
  component: AddressCopyButton,
  args: { address: DEMO_ADDRESS },
  parameters: {
    docs: {
      description: {
        component: `
Displays a truncated address (first 8 … last 6 chars) with a clipboard copy button.
After clicking, shows a "Copied!" label for 2 seconds then reverts.
Uses \`navigator.clipboard\` with graceful fallback for insecure contexts.
        `.trim(),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AddressCopyButton>;

export const Default: Story = {};

export const ShortAddress: Story = {
  name: 'Short address (not truncated)',
  args: { address: '0xABCD1234' },
};
