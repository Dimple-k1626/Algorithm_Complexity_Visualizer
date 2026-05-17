/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0a0f',
          card: '#16161e',
          accent: '#00ff9d',
          secondary: '#ff0055',
          text: '#a9b1d6',
          border: '#27273a'
        }
      }
    },
  },
  plugins: [],
}
