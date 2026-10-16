/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Lilita One"', '"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['"Baloo 2"', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: { 700: '#0b2a6b', 800: '#0a1f52', 900: '#071640' },
        sun: { 300: '#ffe066', 400: '#ffd23f', 500: '#ffbf1a', 600: '#f59e0b' },
        coral: { 400: '#ff7b6b', 500: '#ff5d4d' },
        aqua: { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4' },
      },
    },
  },
  plugins: [],
};
