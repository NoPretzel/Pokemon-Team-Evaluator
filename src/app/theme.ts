'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  components: {
    Paper: {
      defaultProps: {
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          borderColor: 'var(--mantine-color-gray-3)',
        },
      },
    },
  },
});