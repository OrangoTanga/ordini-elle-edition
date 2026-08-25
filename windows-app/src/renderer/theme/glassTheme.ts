export const theme = {
  colors: {
    bg: {
      primary: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      sidebar: 'rgba(26, 26, 46, 0.95)',
      glass: 'rgba(255, 255, 255, 0.06)',
      glassHover: 'rgba(255, 255, 255, 0.10)',
      glassActive: 'rgba(255, 255, 255, 0.14)',
    },
    accent: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      danger: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.92)',
      secondary: 'rgba(255, 255, 255, 0.55)',
      muted: 'rgba(255, 255, 255, 0.35)',
    },
    border: 'rgba(255, 255, 255, 0.10)',
    borderLight: 'rgba(255, 255, 255, 0.06)',
    status: {
      pending: '#fa709a',
      approved: '#43e97b',
      rejected: '#f5576c',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  shadows: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
    glow: '0 0 20px rgba(102, 126, 234, 0.3)',
    card: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
} as const
