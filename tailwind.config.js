/** @type {import('tailwindcss').Config} */
module.exports = {
   
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Kita definisikan warna di sini agar bisa dipakai di _layout.tsx
      colors: {
        'light-bg': '#FFFFFF',      // Warna dasar light mode
        'dark-bg': '#0f172a',       // Warna dasar dark mode (slate-900)
        'light-header': '#EFF6FF', // Warna header (blue-50)
        'dark-header': '#1e293b',  // Warna header (slate-800)
      },
    },
  },
  plugins: [],
};