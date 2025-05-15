/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}","./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        'space-mono': ['SpaceMono'],
        'cabin': ['Cabin'],
        'cabin-medium': ['Cabin-Medium'],
        'cabin-semibold': ['Cabin-SemiBold'],
        'cabin-bold': ['Cabin-Bold']
      },
      colors: {
        'primary': '#5DD6FF',
        'secondary': '#9EAEB4',
        'tertiary': '#576D75',
        'dark': '#0F2026',
        'darker': '#031116'
      }
    },
  },
  plugins: [],
}