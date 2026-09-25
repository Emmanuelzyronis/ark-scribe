import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ark-bg': '#052E16',
        'ark-surface': '#0A3D1F',
        'ark-surface-elevated': '#0F4D28',
        'ark-border': '#166534',
        'ark-primary': '#22C55E',
        'ark-primary-hover': '#16A34A',
        'ark-primary-muted': '#14532D',
        'ark-accent': '#A3E635',
        'ark-accent-hover': '#84CC16',
        'ark-accent-muted': '#365314',
        'ark-text-primary': '#F0FDF4',
        'ark-text-secondary': '#BBF7D0',
        'ark-text-muted': '#4ADE80',
        'ark-text-disabled': '#166534',
        'ark-error': '#EF4444',
        'ark-error-muted': '#450A0A',
        'ark-warning': '#F59E0B',
        'ark-warning-muted': '#451A03',
        'ark-info': '#3B82F6',
        'ark-info-muted': '#1E1B4B',
        'ark-success': '#22C55E',
        'ark-recording': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'heading-1': ['2.25rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'heading-2': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.01em' }],
        'label': ['0.6875rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        'pill': '9999px',
        'card': '12px',
        'input': '8px',
        'badge': '6px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.08)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.2)',
        'primary-glow': '0 0 20px rgba(34,197,94,0.35)',
        'accent-glow': '0 0 20px rgba(163,230,53,0.3)',
        'recording-pulse': '0 0 0 4px rgba(239,68,68,0.25)',
      },
      animation: {
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'pulse-recording': 'pulse 1.2s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'note-appear': 'noteAppear 300ms ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        noteAppear: { from: { transform: 'translateX(12px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
}

export default config
