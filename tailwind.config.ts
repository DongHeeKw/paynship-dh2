import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-google-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        gemini: {
          bg: '#ffffff',
          sidebar: '#f0f4f9',
          input: '#f0f4f9',
          blue: '#1a73e8',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'blink': 'blink 1s step-end infinite',
        // Thinking indicator animations
        'dot-bounce': 'dotBounce 1.4s ease-in-out infinite',
        'dot-bounce-delay-1': 'dotBounce 1.4s ease-in-out 0.2s infinite',
        'dot-bounce-delay-2': 'dotBounce 1.4s ease-in-out 0.4s infinite',
        'progress-fill': 'progressFill 0.5s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        // Thinking indicator keyframes
        dotBounce: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
