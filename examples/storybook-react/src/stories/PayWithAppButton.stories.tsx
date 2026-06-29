import type { Meta, StoryObj } from '@storybook/react';
import type { CompatibleApp } from '@fluxisus/react';
import { PayWithAppButton } from '@fluxisus/react';

const DEMO_TOKEN =
  'naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.IhgyMDI2LTA2LTA3VDE4OjA0OjMwLjc1NVoyGDIwMjYtMDYtMDdUMTc6MDQ6MzAuNzU1WkIPZmx1eGlzLnFyLmR5bi4xShQyMDM2LTA0LTA2VDE3OjMzOjA4WlIJZmx1eGlzLnVzWoICCpABCiVpZC1kZS1wcnVlYmEtcGFyYS1uYXNwaXAtdG9rZW4tZW4tc2RrEioweEI0REIwMmY4YzRiNTE1OWU1MzY4Q0U0NzQ5ZkQ5MzQ0YTMzMzk5OTciMW5iYXNlX3QweGYwMTY0MTM4MzRFNkQxQTE0RjNENjI4QjExRDZFZjcyNWE2YmRiREQyATFIt_KHmuozEm0KATESKjB4ZjAxNjQxMzgzNEU2RDFBMTRGM0Q2MjhCMTFENkVmNzI1YTZiZGJERBoaRXN0ZSBlcyB1biBjb2JybyBkZSBwcnVlYmEiIAoPTmFjaG8gZWNvbW1lcmNlGg0yMC0zOTY0NDUwNy040fSYvAgvch4ogiRkJZJDlVVbBZ7nmw5Muis1UvBkZ6fAP1XjvT7EjjDYHvzpw2Jm0N72bfJsN0AJJGGyHw_CBg';

const BELO: CompatibleApp = {
  name: 'belo',
  displayName: 'Belo App',
  imageUrl: 'https://assets.fluxis.us/apps/belo.svg',
  websiteUrl: 'https://belo.app',
  appStoreUrl: 'https://apps.apple.com/bo/app/belo-tu-pasaporte-financiero/id1575614708',
  googlePlayUrl: 'https://play.google.com/store/apps/details?id=com.belo.android',
  deepLink: 'https://api.belo.app/dynamic-link?route=qri-scanner&naspip_token=[NASPIP_TOKEN]',
};

const METAMASK: CompatibleApp = {
  name: 'metamask',
  displayName: 'Metamask',
  imageUrl: 'https://assets.fluxis.us/apps/metamask.png',
  websiteUrl: 'https://metamask.io',
  appStoreUrl: null,
  googlePlayUrl: null,
  deepLink: 'https://metamask.app.link/dapp/dapp.fluxis.us/pay?token=[NASPIP_TOKEN]',
};

const meta: Meta<typeof PayWithAppButton> = {
  title: 'Components/PayWithAppButton',
  component: PayWithAppButton,
  args: {
    app: BELO,
    token: DEMO_TOKEN,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Single "Pay with <app>" button with app icon and deep link. Clicking navigates to the wallet app. Use `CompatibleApps` to render all available apps automatically.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PayWithAppButton>;

export const Belo: Story = {};

export const Metamask: Story = {
  args: { app: METAMASK },
};
