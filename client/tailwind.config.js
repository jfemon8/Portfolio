import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // P13.1 — small-phone + ultrawide tiers (merge with the defaults
      // sm/md/lg/xl/2xl; Tailwind sorts by min-width so order is correct).
      screens: {
        xs: '400px',
        '3xl': '1920px',
      },
      /**
       * P13.1 — fluid type scale. Display steps (2xl→7xl) interpolate
       * MIN@360px → MAX@1280px: headings shrink to fit phones and are
       * pixel-identical to the previous fixed Tailwind defaults at ≥1280px
       * (desktop design 100% unchanged). Body steps (xs/sm/base/lg/xl) are
       * intentionally left at the Tailwind defaults (legibility — no fluid
       * body reflow). Line-heights mirror the Tailwind defaults so ≥1280px
       * renders byte-identical.
       */
      fontSize: {
        '2xl': [
          'clamp(1.25rem, 1.152rem + 0.435vw, 1.5rem)',
          { lineHeight: '2rem' },
        ],
        '3xl': [
          'clamp(1.5rem, 1.353rem + 0.652vw, 1.875rem)',
          { lineHeight: '2.25rem' },
        ],
        '4xl': [
          'clamp(1.6875rem, 1.467rem + 0.978vw, 2.25rem)',
          { lineHeight: '2.5rem' },
        ],
        '5xl': [
          'clamp(2rem, 1.609rem + 1.739vw, 3rem)',
          { lineHeight: '1' },
        ],
        '6xl': [
          'clamp(2.375rem, 1.837rem + 2.391vw, 3.75rem)',
          { lineHeight: '1' },
        ],
        '7xl': [
          'clamp(2.75rem, 2.065rem + 3.043vw, 4.5rem)',
          { lineHeight: '1' },
        ],
      },
      colors: {
        // ---- Dark Developer / Neon palette (existing — unchanged) ----
        bg: {
          DEFAULT: '#0a0a0f',
          soft: '#0f0f17',
          card: '#13131d',
          elevated: '#1a1a24',
        },
        line: '#23232f',
        // `neon.DEFAULT` is theme-aware: light mode swaps the bright `#00ffd1`
        // for a darker teal (`--neon` var defined in index.css) so every
        // `text-neon`/`bg-neon`/`border-neon` reads cleanly on the light bg
        // instead of washing out. The accent variants (dim/violet/pink/blue)
        // stay fixed — they're brand accents used sparingly.
        neon: {
          DEFAULT: 'hsl(var(--neon) / <alpha-value>)',
          dim: '#0bbfa3',
          violet: '#a855f7',
          pink: '#ec4899',
          blue: '#38bdf8',
        },
        ink: {
          DEFAULT: 'hsl(var(--foreground) / <alpha-value>)',
          soft: 'hsl(var(--muted-foreground) / <alpha-value>)',
          dim: 'hsl(var(--muted-foreground) / 0.72)',
        },
        // ---- ShadCN/UI semantic tokens (CSS-variable driven, theme presets) ----
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(0,255,209,.15), 0 8px 40px -8px rgba(0,255,209,.35)',
        'neon-violet':
          '0 0 0 1px rgba(168,85,247,.18), 0 8px 40px -8px rgba(168,85,247,.4)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 12px 40px -16px rgba(0,0,0,.8)',
        glow: '0 0 60px -12px hsl(var(--ring) / 0.55)',
        // P13.5 — theme-aware lifted-card glow (hairline + directional drop).
        // Used by .glass-hover + GlassCard interactive.
        'neon-glow':
          '0 0 0 1px hsl(var(--primary) / 0.18), 0 28px 60px -20px hsl(var(--primary) / 0.4)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)',
        'neon-gradient':
          'linear-gradient(135deg,#00ffd1 0%,#38bdf8 45%,#a855f7 100%)',
        'radial-fade':
          'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,255,209,.12),transparent 60%)',
        // Light theme uses a slightly stronger teal so the central oval reads
        // as a subtle hue-tinted area instead of a pure-white blowout.
        'radial-fade-light':
          'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,191,163,.18),transparent 60%)',
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
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        marquee: 'marquee 30s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
