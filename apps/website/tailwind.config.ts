import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        muted: 'var(--tailwind-muted-flat)',
        'muted-foreground': 'var(--color-muted-foreground)',
        primary: 'rgb(var(--accent-emerald-rgb) / <alpha-value>)',
        deep: 'var(--bg-deep-darker)',
        surface: 'var(--bg-surface)',
        'card-bg': 'var(--bg-subtle)',
        'glass-border': 'var(--border-glass)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        brandSecondary: {
          DEFAULT: 'rgb(var(--accent-secondary-rgb) / <alpha-value>)',
          glow: 'rgb(var(--accent-secondary-rgb) / 0.18)',
          light: 'rgb(var(--accent-secondary-light-rgb) / <alpha-value>)',
        },
        blue: {
          DEFAULT: '#3B82F6',
        },
        brandPrimary: {
          DEFAULT: 'rgb(var(--accent-emerald-rgb) / <alpha-value>)',
          glow: 'rgb(var(--accent-emerald-rgb) / 0.22)',
        },
      },
      spacing: {
        'spacing-1': '4px',
        'spacing-2': '8px',
        'spacing-3': '12px',
        'spacing-4': '16px',
        'spacing-5': '20px',
        'spacing-6': '24px',
        'spacing-8': '32px',
      },
      fontFamily: {
        sans: ['var(--font-site-body)', 'system-ui', 'sans-serif'],
        headline: ['var(--font-site-headline)', 'system-ui', 'sans-serif'],
        hand: ['var(--font-site-small)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-site-mono)', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-secondary':
          'linear-gradient(135deg, rgb(var(--accent-secondary-rgb)), rgb(var(--accent-secondary-mid-rgb)))',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        grain: 'grain 8s steps(10) infinite',
        'marquee-logos': 'marquee-logos 40s linear infinite',
      },
      keyframes: {
        'marquee-logos': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, 35%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
