export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#12262D', mist: '#EDF0F2', line: '#D5DCE1', brand: '#1F6F78',
        ok: '#2E7D5B', warn: '#A86B00', bad: '#B3261E',
      },
    },
  },
  plugins: [],
}
