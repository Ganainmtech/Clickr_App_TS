// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cyber-blue': '#00ffff',
        'cyber-purple': '#9b4dff',
        'cyber-pink': '#ff00ff',
        'cyber-black': '#1c1c1c',
      },
      fontFamily: {
        cyber: ['"Orbitron"', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff, 0 0 40px #ff00ff',
      },
      textShadow: {
        neon: '0 0 5px #ffffff, 0 0 10px #ffffff, 0 0 15px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff, 0 0 40px #ff00ff',
      },
    },
  },
  daisyui: {
    themes: ['lofi'],
    logs: false,
  },
  plugins: [require('daisyui')],
}
