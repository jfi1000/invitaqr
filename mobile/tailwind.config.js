/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#f7f6fb',
        ink: '#1a1528',
        card: '#ffffff',
        line: '#e6e2f2',
        blush: '#f7e4e8',
        indigo: '#4334d6',
        'indigo-deep': '#3a2adb',
        mist: '#f4f1f8',
        rose: '#f6b7c6',
        inkwell: '#2a2348',
        mute: '#6b6b6b',
      },
    },
  },
  plugins: [],
}
