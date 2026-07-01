import type { Meta, StoryObj } from '@storybook/react';
import { CompatibleAppsMarquee } from '@fluxisus/react';

const meta: Meta<typeof CompatibleAppsMarquee> = {
  title: 'Components/CompatibleAppsMarquee',
  component: CompatibleAppsMarquee,
  args: {
    width: '100%',
    height: 56,
    speed: 24,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal auto-scrolling showcase of compatible app logos. Pauses on hover. Uses bundled app data — no network requests needed.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CompatibleAppsMarquee>;

export const Default: Story = {};

export const Slow: Story = {
  args: { speed: 60 },
};

export const Fast: Story = {
  args: { speed: 10 },
};

export const NoAppNames: Story = {
  name: 'Without app names',
  args: { showAppName: false },
};

export const Tall: Story = {
  args: { height: 80 },
};
