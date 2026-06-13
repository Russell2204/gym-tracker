'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Уважение к prefers-reduced-motion для всего лендинга.
 * reducedMotion="user" применяется framer-motion на этапе анимации (после монтирования),
 * поэтому серверный и клиентский рендер совпадают — расхождения гидрации нет.
 */
export default function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
