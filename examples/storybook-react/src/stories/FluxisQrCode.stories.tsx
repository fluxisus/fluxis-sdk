import type { Meta, StoryObj } from '@storybook/react';
import { FluxisQrCode } from '@fluxisus/react';

const DEMO_TOKEN =
  'naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.IhgyMDI2LTA2LTA3VDE4OjA0OjMwLjc1NVoyGDIwMjYtMDYtMDdUMTc6MDQ6MzAuNzU1WkIPZmx1eGlzLnFyLmR5bi4xShQyMDM2LTA0LTA2VDE3OjMzOjA4WlIJZmx1eGlzLnVzWoICCpABCiVpZC1kZS1wcnVlYmEtcGFyYS1uYXNwaXAtdG9rZW4tZW4tc2RrEioweEI0REIwMmY4YzRiNTE1OWU1MzY4Q0U0NzQ5ZkQ5MzQ0YTMzMzk5OTciMW5iYXNlX3QweGYwMTY0MTM4MzRFNkQxQTE0RjNENjI4QjExRDZFZjcyNWE2YmRiREQyATFIt_KHmuozEm0KATESKjB4ZjAxNjQxMzgzNEU2RDFBMTRGM0Q2MjhCMTFENkVmNzI1YTZiZGJERBoaRXN0ZSBlcyB1biBjb2JybyBkZSBwcnVlYmEiIAoPTmFjaG8gZWNvbW1lcmNlGg0yMC0zOTY0NDUwNy040fSYvAgvch4ogiRkJZJDlVVbBZ7nmw5Muis1UvBkZ6fAP1XjvT7EjjDYHvzpw2Jm0N72bfJsN0AJJGGyHw_CBg';

const meta: Meta<typeof FluxisQrCode> = {
  title: 'Components/FluxisQrCode',
  component: FluxisQrCode,
  args: {
    token: DEMO_TOKEN,
    size: 280,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Renders a NASPIP token as a QR code with the Fluxis logo centered. Pass the token from your backend — never create it client-side.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FluxisQrCode>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 160 },
};

export const Large: Story = {
  args: { size: 400 },
};

export const CustomColors: Story = {
  name: 'Custom colors',
  args: {
    fgColor: '#7c3aed',
    bgColor: '#f5f3ff',
  },
};

export const LowErrorCorrection: Story = {
  name: 'Low error correction (L)',
  args: { level: 'L' },
};
