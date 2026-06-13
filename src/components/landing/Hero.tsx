'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, Dumbbell } from 'lucide-react';

function HeroFallback() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 bg-hero-radial" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Dumbbell size={140} strokeWidth={1} className="text-acc/40" />
      </div>
    </div>
  );
}

// three.js грузится отдельным чанком только на лендинге.
const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false, loading: () => <HeroFallback /> });

export default function Hero() {
  // При prefers-reduced-motion Canvas не монтируем вовсе.
  const [show3D, setShow3D] = useState(false);
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setShow3D(true);
  }, []);

  return (
    <section className="relative overflow-hidden bg-hero-radial">
      <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 pb-16 pt-14 sm:pt-20 lg:grid-cols-2">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.21, 0.65, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-acc/30 bg-acc/10 px-3 py-1 text-xs font-medium text-acc">
              <Dumbbell size={13} />
              Дневник тренировок
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Каждый подход — <span className="text-gradient">в зачёт</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-mut">
              Программы и суперсеты, таймер отдыха со звуком, сравнение с прошлой тренировкой
              и графики прогресса. Всё, что нужно у штанги, — без лишнего.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary !px-6 !py-3 text-base">
                Начать бесплатно
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn-ghost !px-6 !py-3 text-base">
                У меня есть аккаунт
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="relative h-[300px] sm:h-[380px] lg:h-[440px]">
          {show3D ? <Hero3D /> : <HeroFallback />}
        </div>
      </div>
    </section>
  );
}
