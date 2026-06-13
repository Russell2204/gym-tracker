import type { Metadata, Viewport } from 'next';
import { Inter, Chakra_Petch } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap'
});

// Chakra Petch без кириллицы — используется только для лого и цифр.
const chakra = Chakra_Petch({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: 'IronLog — дневник тренировок',
    template: '%s · IronLog'
  },
  description:
    'Дневник тренировок: программы и суперсеты, таймер отдыха, сравнение с прошлым разом, замеры тела и графики прогресса.',
  openGraph: {
    title: 'IronLog — дневник тренировок',
    description: 'Каждый подход — в зачёт. Программы, суперсеты, таймер отдыха и графики прогресса.',
    type: 'website',
    locale: 'ru_RU'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e0f12'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${chakra.variable}`}>
      <body>{children}</body>
    </html>
  );
}
