import type { Preview } from '@storybook/react';
import { FluxisProvider } from '@fluxisus/react';

const preview: Preview = {
  decorators: [
    (Story) => (
      <FluxisProvider theme={{ colorPrimary: '#2563eb' }}>
        <div style={{ padding: '1.5rem' }}>
          <Story />
        </div>
      </FluxisProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(bg|color|fg)$/i,
      },
    },
  },
};

export default preview;
