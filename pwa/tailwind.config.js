/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Noto Serif JP"', 'ui-serif', 'serif'],
      },
      colors: {
        accent: '#C13D2B',
        'accent-ink': '#A8341F',
        'accent-wash': '#FBF1ED',
        'accent-wash-border': '#F0DDD4',
        'accent-wash-text': '#7A4A3D',
        canvas: '#F4F0E7',
        sidebar: '#EFE9DB',
        surface: '#FFFFFF',
        'surface-sunken': '#F6F2E8',
        'row-hover': '#FBF8F1',
        'chip-bg': '#F1ECE0',
        'chip-bg-alt': '#E5DCC9',
        ink: '#2B2722',
        'ink-title': '#26221D',
        'ink-2': '#5A5345',
        'ink-3': '#A79E8E',
        'ink-mono': '#8A8173',
        'ink-mono-faint': '#B0A68F',
        'icon-default': '#B6AB94',
        hairline: '#E6DECE',
        'hairline-warm': '#E2D9C6',
        'hairline-faint': '#EDE7DA',
        'sync-green': '#5B9A6B',
      },
    },
  },
  plugins: [],
}
