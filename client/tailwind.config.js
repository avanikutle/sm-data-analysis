/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#161b22',
          100: '#0d1117',
          200: '#161b22',
          300: '#21262d',
          400: '#30363d',
        },
        profit: '#3fb950',
        loss: '#f85149',
        accent: '#58a6ff',
        muted: '#8b949e',
        primary: '#e6edf3',
      },
    },
  },
  plugins: [],
};
