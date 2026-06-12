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
        ok: '#34c277',
        warn: '#f2c84b',
        hot: '#e2483d'
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
export default config;
