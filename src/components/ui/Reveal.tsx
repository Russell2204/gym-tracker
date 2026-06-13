'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Обёртка для секций серверных страниц: плавное появление при прокрутке.
 * Всегда рендерит motion.div (без ветвления по reduced-motion — иначе расходится гидрация).
 * Уважение к prefers-reduced-motion обеспечивает <MotionConfig reducedMotion="user"> выше по дереву.
 */
export default function Reveal({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.65, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
