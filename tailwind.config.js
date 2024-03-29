module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
  ],
  theme: {
    colors: {
      black: 'rgba(0, 0, 0, 0.8)',
      blackLight: 'rgba(0, 0, 0, 0.6)',
      warning: '#ff6666',
      grey: '#7e888b',
      light: 'rgba(0, 0, 0, 0.1)',
      warningLight: '#ff666508'
    },
    extend: {}
  },
  variants: {},
  plugins: []
}
