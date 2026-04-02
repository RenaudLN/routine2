import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Inter, sans-serif',
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
        shadow: 'sm',
      },
      styles: {
        root: {
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--mantine-shadow-md)',
          },
        },
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
