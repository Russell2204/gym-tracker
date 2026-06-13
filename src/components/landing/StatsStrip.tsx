'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const FACTS: Array<{ value: number; suffix: string; label: string }> = [
  { value: 14, suffix: '', label: 'упражнений уже в базе — плюс свои без ограничений' },
  { value: 1, suffix: ' тап', label: 'от программы до начала тренировки' },
  { value: 30, suffix: ' сек', label: 'отдыха можно добавить одним нажатием' }
];

function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  // Старт всегда с 0 — детерминированно на сервере и клиенте (без расхождения гидрации).
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduced) {
      setN(to);
      return;
    }
    if (!inView) return;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduced]);

  return (
    <span ref={ref} className="num text-gradient text-4xl font-bold sm:text-5xl">
      {n}
      {suffix}
    </span>
  );
}

export default function StatsStrip() {
  return (
    <section className="border-y border-line/60 bg-card/40">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:grid-cols-3">
        {FACTS.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="text-center"
          >
            <CountUp to={f.value} suffix={f.suffix} />
            <p className="mt-2 text-sm text-mut">{f.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
