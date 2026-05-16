/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark Developer / Neon palette
        bg: {
          DEFAULT: '#0a0a0f',
          soft: '#0f0f17',
          card: '#13131d',
          elevated: '#1a1a24',
        },
        line: '#23232f',
        neon: {
          DEFAULT: '#00ffd1', // primary cyan
          dim: '#0bbfa3',
          violet: '#a855f7',
          pink: '#ec4899',
          blue: '#38bdf8',
        },
        ink: {
          DEFAULT: '#e7e7ee',
          soft: '#a1a1b5',
          dim: '#6b6b7d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(0,255,209,.15), 0 8px 40px -8px rgba(0,255,209,.35)',
        'neon-violet': '0 0 0 1px rgba(168,85,247,.18), 0 8px 40px -8px rgba(168,85,247,.4)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 12px 40px -16px rgba(0,0,0,.8)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)',
        'neon-gradient': 'linear-gradient(135deg,#00ffd1 0%,#38bdf8 45%,#a855f7 100%)',
        'radial-fade': 'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,255,209,.12),transparent 60%)',
      },
      backgroundSize: { grid: '40px 40px' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-slow': {
          '0%,100%': { opacity: 0.4 },
          '50%': { opacity: 1 },
        },
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'gradient-x': {
          '0%,100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      animation: {
        'fade-up': 'fade-up .6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        marquee: 'marquee 30s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
      },
    },
  },
  plugins: [],
};
