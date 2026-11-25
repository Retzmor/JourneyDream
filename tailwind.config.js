/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        night: {
          950: '#06071a',
          900: '#0a0c24',
          800: '#10133a',
          700: '#191d4f',
          600: '#252a68',
        },
        dream: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b7cf6',
          600: '#7466e8',
        },
        aurora: {
          300: '#99f6e4',
          400: '#5eead4',
        },
        nebula: {
          300: '#f5d0fe',
          400: '#e879f9',
        },
      },
      boxShadow: {
        glow: '0 0 32px -4px rgba(139,124,246,0.55)',
        card: '0 8px 30px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        twinkle: {
          '0%,100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        toast: {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        twinkle: 'twinkle 6s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        rise: 'rise 0.45s ease-out both',
        toast: 'toast 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
