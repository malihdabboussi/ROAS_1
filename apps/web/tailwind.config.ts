import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    './node_modules/@ferrucc-io/emoji-picker/dist/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
        ring: 'var(--ring)',
        success: 'rgb(var(--color-success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--color-warning-rgb) / <alpha-value>)',
        destructive: 'rgb(var(--color-destructive-rgb) / <alpha-value>)',
      },
      spacing: {
        'spacing-0': 'var(--spacing-0)',
        'spacing-1': 'var(--spacing-1)',
        'spacing-1-5': 'var(--spacing-1-5)',
        'spacing-2': 'var(--spacing-2)',
        'spacing-2-5': 'var(--spacing-2-5)',
        'spacing-3': 'var(--spacing-3)',
        'spacing-4': 'var(--spacing-4)',
        'spacing-5': 'var(--spacing-5)',
        'spacing-6': 'var(--spacing-6)',
        'spacing-8': 'var(--spacing-8)',
        'spacing-10': 'var(--spacing-10)',
        'spacing-12': 'var(--spacing-12)',
        'spacing-16': 'var(--spacing-16)',
      },
      borderRadius: {
        'spacing-1': 'var(--spacing-1)',
        'spacing-2': 'var(--spacing-2)',
        'spacing-3': 'var(--spacing-3)',
        'spacing-4': 'var(--spacing-4)',
      },
      fontSize: {
        'body-1': ['var(--text-base)', { lineHeight: '1.5' }],
        'body-2': ['var(--text-body-2)', { lineHeight: '1.5' }],
        'body-3': ['var(--text-md)', { lineHeight: '1.5' }],
        'body-4': ['var(--text-sm)', { lineHeight: '1.5' }],
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-futura)'],
      },
    },
  },
  plugins: [],
}

export default config
