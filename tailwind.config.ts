import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0f12',
        card: '#16181d',
        line: '#262a31',
        ink: '#e8eaed',
        mut: '#9aa1ab',
        acc: '#4e7dff',
        acc2: '#8b5cf6',
        ok: '#34c277',
        warn: '#f2c84b',
        hot: '#e2483d'
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 28px -8px rgba(78, 125, 255, 0.55)',
        'glow-ok': '0 0 28px -8px rgba(52, 194, 119, 0.5)',
        'glow-violet': '0 0 32px -10px rgba(139, 92, 246, 0.55)'
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(78,125,255,0.22), transparent), radial-gradient(ellipse 60% 50% at 80% 110%, rgba(139,92,246,0.16), transparent)',
        'card-sheen':
          'linear-gradient(135deg, rgba(78,125,255,0.08) 0%, transparent 40%, transparent 60%, rgba(139,92,246,0.06) 100%)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite'
      }
    }
  },
  plugins: []
};
export default config;
