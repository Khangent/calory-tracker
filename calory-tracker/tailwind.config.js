/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f14',
        surface: '#0f141b',
        card: '#151c26',
        'card-hover': '#1b2430',
        border: '#1f2a37',
        muted: '#7d8b9c',
        ink: '#e6edf3',
        brand: {
          DEFAULT: '#22c55e',
          soft: '#4ade80',
        },
        amber: {
          DEFAULT: '#fbbf24',
        },
        protein: '#38bdf8',
        carbs: '#fbbf24',
        fat: '#f472b6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,197,94,0.15), 0 8px 30px -10px rgba(34,197,94,0.25)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 10px 30px -15px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
