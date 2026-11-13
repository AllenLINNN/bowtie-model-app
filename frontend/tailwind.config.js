/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 深色模式跟隨作業系統設定（React Flow 也設為 colorMode="system"）。
  // 不要在程式裡用 `.dark` class 判斷，請用 matchMedia('(prefers-color-scheme: dark)')。
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', '"Noto Sans TC"', '"Microsoft JhengHei"', 'sans-serif'],
        mono: ['"Source Code Pro"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'menu-in': 'menu-in 140ms cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-right': 'slide-in-right 180ms cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}
