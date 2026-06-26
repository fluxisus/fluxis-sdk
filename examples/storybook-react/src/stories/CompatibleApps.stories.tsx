import type { Meta, StoryObj } from '@storybook/react';
import { CompatibleApps } from '@fluxisus/react';

const DEMO_TOKEN =
  'naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.IhgyMDI2LTA2LTA3VDE4OjA0OjMwLjc1NVoyGDIwMjYtMDYtMDdUMTc6MDQ6MzAuNzU1WkIPZmx1eGlzLnFyLmR5bi4xShQyMDM2LTA0LTA2VDE3OjMzOjA4WlIJZmx1eGlzLnVzWoICCpABCiVpZC1kZS1wcnVlYmEtcGFyYS1uYXNwaXAtdG9rZW4tZW4tc2RrEioweEI0REIwMmY4YzRiNTE1OWU1MzY4Q0U0NzQ5ZkQ5MzQ0YTMzMzk5OTciMW5iYXNlX3QweGYwMTY0MTM4MzRFNkQxQTE0RjNENjI4QjExRDZFZjcyNWE2YmRiREQyATFIt_KHmuozEm0KATESKjB4ZjAxNjQxMzgzNEU2RDFBMTRGM0Q2MjhCMTFENkVmNzI1YTZiZGJERBoaRXN0ZSBlcyB1biBjb2JybyBkZSBwcnVlYmEiIAoPTmFjaG8gZWNvbW1lcmNlGg0yMC0zOTY0NDUwNy040fSYvAgvch4ogiRkJZJDlVVbBZ7nmw5Muis1UvBkZ6fAP1XjvT7EjjDYHvzpw2Jm0N72bfJsN0AJJGGyHw_CBg';

const meta: Meta<typeof CompatibleApps> = {
  title: 'Components/CompatibleApps',
  component: CompatibleApps,
  args: { token: DEMO_TOKEN },
  parameters: {
    docs: {
      description: {
        component:
          'On mobile, renders "Pay with <app>" deep-link buttons. On desktop, renders the QR code with an informational list of compatible apps. Uses bundled app data by default — no network requests needed.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CompatibleApps>;

export const Desktop: Story = {
  args: { forcePlatform: 'desktop' },
};

export const Mobile: Story = {
  args: { forcePlatform: 'mobile' },
};

export const MobileFiltered: Story = {
  name: 'Mobile (Belo only)',
  args: {
    forcePlatform: 'mobile',
    include: ['belo'],
  },
};

export const DesktopNoAppList: Story = {
  name: 'Desktop (QR only)',
  args: {
    forcePlatform: 'desktop',
    showDesktopAppList: false,
  },
};
