/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#f6f1e8',
        ink: '#1c1915',
        card: '#fffaf3',
        line: '#e4d8c4',
      },
    },
  },
  plugins: [],
};
