import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: "'Atkinson-Hyperlegible', Inter, sans-serif",
  headings: {
    fontFamily: "'Atkinson-Hyperlegible', Inter, sans-serif",
    fontWeight: '700',
  },
  radius: {
    xs: rem(4),
    sm: rem(8),
    md: rem(12),
    lg: rem(16),
    xl: rem(24),
  },
  components: {
    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
        fw: 600,
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
