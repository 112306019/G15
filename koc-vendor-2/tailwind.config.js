/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#FAFAF8',
          50:  '#FFFFFF',
          100: '#F5F4F0',
          200: '#ECEAE4',
          300: '#D8D5CC',
        },
        ink: {
          DEFAULT: '#1C1917',
          muted:   '#6B6760',
          faint:   '#A8A5A0',
        },
        brand: {
          DEFAULT: '#D97706',
          light:   '#FCD34D',
          dark:    '#92400E',
          50:      '#FFFBEB',
          100:     '#FEF3C7',
        },
        slate: {
          dash: '#1E293B',
        },
        success: '#059669',
        danger:  '#DC2626',
        info:    '#2563EB',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        lift:  '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        fadeUp:  'fadeUp 0.4s ease both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
