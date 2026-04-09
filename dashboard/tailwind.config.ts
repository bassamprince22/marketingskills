import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Fadaa (فضاء = Space) design system
        space: {
          void:    '#0A0E1A',   // deep space black
          navy:    '#0F1629',   // dark navy
          card:    '#131B2E',   // card background
          border:  '#1E2D4A',   // subtle border
          blue:    '#4F8EF7',   // electric blue — primary actions
          purple:  '#7C3AED',   // cosmic purple — manager accent
          cyan:    '#06B6D4',   // cyan — won/positive
          amber:   '#F59E0B',   // amber — negotiation/warning
          red:     '#EF4444',   // red — lost/danger
          text:    '#E2E8F0',   // light grey text
          muted:   '#64748B',   // subdued text
          glow:    '#4F8EF726', // blue glow (transparent)
        },
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(135deg, #0A0E1A 0%, #0F1629 50%, #0A0E1A 100%)',
        'card-gradient':  'linear-gradient(135deg, #131B2E 0%, #0F1629 100%)',
        'blue-glow':      'radial-gradient(ellipse at center, #4F8EF720 0%, transparent 70%)',
        'cosmic-gradient':'linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)',
      },
      boxShadow: {
        'glow-blue':   '0 0 20px rgba(79,142,247,0.2), 0 0 40px rgba(79,142,247,0.1)',
        'glow-purple': '0 0 20px rgba(124,58,237,0.2), 0 0 40px rgba(124,58,237,0.1)',
        'glow-cyan':   '0 0 20px rgba(6,182,212,0.2)',
        'card-space':  '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'twinkle':      'twinkle 3s ease-in-out infinite',
        'twinkle-slow': 'twinkle 5s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'count-up':     'countUp 0.8s ease-out forwards',
        'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(79,142,247,0.15)' },
          '50%':      { boxShadow: '0 0 25px rgba(79,142,247,0.35)' },
        },
      },
      fontFamily: {
        space: ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
