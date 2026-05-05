/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Code Pro"', '"Noto Sans TC"', 'sans-serif'],
        mono: ['"Source Code Pro"', 'monospace'],
      }
    },
  },
  plugins: [],
}