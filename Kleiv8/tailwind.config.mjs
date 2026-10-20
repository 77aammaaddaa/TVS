/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}', './public/**/*.html'],
  theme: {
    extend: {
      colors: {
        kleiv: {
          pine: '#213A23',
          jade: '#2C795D',
          paper: '#FCFCFC',
          ink: '#18181B',
          mist: '#F4F6F4',
          gold: '#D4AF75',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        soft: '0 20px 60px rgba(33, 58, 35, 0.10)',
      },
    },
  },
  plugins: [],
};
