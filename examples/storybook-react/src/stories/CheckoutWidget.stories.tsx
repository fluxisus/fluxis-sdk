import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutWidget } from '@fluxisus/react';
import type { CheckoutSession } from '@fluxisus/react';

const DEMO_TOKEN =
  'naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.IhgyMDI2LTA2LTA3VDE4OjA0OjMwLjc1NVoyGDIwMjYtMDYtMDdUMTc6MDQ6MzAuNzU1WkIPZmx1eGlzLnFyLmR5bi4xShQyMDM2LTA0LTA2VDE3OjMzOjA4WlIJZmx1eGlzLnVzWoICCpABCiVpZC1kZS1wcnVlYmEtcGFyYS1uYXNwaXAtdG9rZW4tZW4tc2RrEioweEI0REIwMmY4YzRiNTE1OWU1MzY4Q0U0NzQ5ZkQ5MzQ0YTMzMzk5OTciMW5iYXNlX3QweGYwMTY0MTM4MzRFNkQxQTE0RjNENjI4QjExRDZFZjcyNWE2YmRiREQyATFIt_KHmuozEm0KATESKjB4ZjAxNjQxMzgzNEU2RDFBMTRGM0Q2MjhCMTFENkVmNzI1YTZiZGJERBoaRXN0ZSBlcyB1biBjb2JybyBkZSBwcnVlYmEiIAoPTmFjaG8gZWNvbW1lcmNlGg0yMC0zOTY0NDUwNy040fSYvAgvch4ogiRkJZJDlVVbBZ7nmw5Muis1UvBkZ6fAP1XjvT7EjjDYHvzpw2Jm0N72bfJsN0AJJGGyHw_CBg';

const BASE_SESSION: CheckoutSession = {
  id: 'cso_demo_123456',
  amount: '10.00',
  currency: 'USD',
  recipient_address: DEMO_TOKEN,
  expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  status: 'pending',
  return_url: 'https://example.com/order/123/success',
};

const meta: Meta<typeof CheckoutWidget> = {
  title: 'Checkout/CheckoutWidget',
  component: CheckoutWidget,
  parameters: {
    docs: {
      description: {
        component: `
Composed, status-aware checkout widget. Purely presentational — accepts a \`CheckoutSession\` prop
and renders the appropriate layout. The host app owns polling and passes updated session data.

**Desktop:** QR code + wallet app buttons + address copy.
**Mobile:** Wallet deep-link buttons + address copy.
        `.trim(),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckoutWidget>;

export const Pending: Story = {
  args: {
    session: { ...BASE_SESSION, status: 'pending' },
  },
};

export const PendingMobile: Story = {
  name: 'Pending — mobile viewport',
  args: {
    session: { ...BASE_SESSION, status: 'pending' },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const Confirming: Story = {
  args: {
    session: { ...BASE_SESSION, status: 'confirming' },
  },
};

export const Completed: Story = {
  args: {
    session: { ...BASE_SESSION, status: 'completed' },
  },
};

export const Expired: Story = {
  args: {
    session: { ...BASE_SESSION, status: 'expired' },
  },
};

export const ARSAmount: Story = {
  name: 'Pending — ARS amount',
  args: {
    session: { ...BASE_SESSION, amount: '1234.99', currency: 'ARS', status: 'pending' },
  },
};
