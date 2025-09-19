/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telegram: {
          blue: '#0088cc',
          bg: '#ffffff',
          secondary: '#f1f1f2',
          text: '#000000',
          hint: '#999999',
          link: '#0088cc',
          button: '#0088cc',
          'button-text': '#ffffff',
          destructive: '#ff3b30',
        },
      },
    },
  },
  plugins: [],
};