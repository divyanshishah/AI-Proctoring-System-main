/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
        surface:   { DEFAULT: '#1e293b', dark: '#0f172a', card: '#1e293b', border: '#334155' },
        success:   '#22c55e',
        warning:   '#f59e0b',
        danger:    '#ef4444',
        critical:  '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
        'bounce-in':  'bounceIn 0.5s ease-out',
      },
      keyframes: {
        slideIn:  { from: { transform: 'translateX(100%)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        fadeIn:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        bounceIn: { '0%': { transform: 'scale(0.8)', opacity: '0' }, '70%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
