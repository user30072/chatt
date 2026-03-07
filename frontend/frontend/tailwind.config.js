/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#0084ff',
            50: '#e6f3ff',
            100: '#cce7ff',
            200: '#99cfff',
            300: '#66b7ff',
            400: '#339fff',
            500: '#0084ff',
            600: '#0069cc',
            700: '#004f99',
            800: '#003566',
            900: '#001a33',
          },
        },
        fontFamily: {
          sans: ['Roboto'],
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
    ],
  };