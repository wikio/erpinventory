/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.{js,ts}', './src/**/*.{js,ts,tsx}'],
  darkMode: ['selector', '.theme-dark'],
  theme: {
    extend: {
      colors: {
        'sari-blue': '#009CC5',
        'sari-blue-dark': '#007D9E',
        'sari-lime': '#C6DA34',
        'sari-lime-dark': '#9BB024',
        'sari-amber': '#EBB51A',
        'sari-amber-dark': '#C69512',
        'sari-dark-bg': '#030712',
        'sari-dark-card': '#0F172A',
      },
    },
  },
  plugins: [],
};
