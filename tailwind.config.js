/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        'space-mono': ['SpaceMono'],
        'cabin': ['Cabin']
      }
    },
  },
  plugins: [],
}