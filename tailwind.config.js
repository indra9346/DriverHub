/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#08233F',
          navyDark: '#051626',
          navyLight: '#0B2947',
          blue: '#173E68',
          blueLight: '#245987',
          blueAccent: '#0066CC',
          amber: '#F5A800',
          amberLight: '#FFB51B',
          amberDark: '#D97706',
          surface: '#EEF3F8',
          bg: '#F5F8FB',
          emerald: '#10B981',
          danger: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(8, 35, 63, 0.05), 0 1px 2px -1px rgba(8, 35, 63, 0.05)',
        'card': '0 4px 16px -2px rgba(8, 35, 63, 0.06), 0 2px 6px -2px rgba(8, 35, 63, 0.04)',
        'elevated': '0 12px 30px -4px rgba(8, 35, 63, 0.10), 0 4px 12px -2px rgba(8, 35, 63, 0.05)',
        'modal': '0 20px 40px -8px rgba(8, 35, 63, 0.18)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
