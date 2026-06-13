'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  CalendarDays,
  ClipboardList,
  History,
  TrendingUp,
  Ruler,
  Dumbbell,
  LogOut
} from 'lucide-react';
import { logoutAction } from '@/lib/actions';

const LINKS = [
  { href: '/dashboard', label: 'Главная', icon: Home },
  { href: '/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/programs', label: 'Программы', icon: ClipboardList },
  { href: '/workouts', label: 'История', icon: History },
  { href: '/stats', label: 'Статистика', icon: TrendingUp },
  { href: '/measurements', label: 'Замеры', icon: Ruler },
  { href: '/exercises', label: 'Упражнения', icon: Dumbbell }
];

// Главные вкладки нижнего таб-бара на мобильных.
const TABS = LINKS.slice(0, 5);
const EXTRA = LINKS.slice(5);

export default function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  // На экране тренировки внизу живёт панель таймера — табы прячем.
  const hideTabs = /^\/workouts\/\d+/.test(pathname);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-3">
          <Link href="/dashboard" className="font-display text-lg font-bold tracking-tight">
            IRON<span className="text-gradient">LOG</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-mut sm:inline">{userName}</span>
            <form action={logoutAction}>
              <button className="flex items-center gap-1.5 text-sm text-mut transition-colors hover:text-ink">
                <LogOut size={15} />
                Выйти
              </button>
            </form>
          </div>
        </div>

        {/* десктоп: полная навигация с иконками */}
        <nav className="mx-auto hidden max-w-3xl px-4 md:block">
          <div className="flex gap-1 py-2">
            {LINKS.map((l) => {
              const active = isActive(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    'relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (active ? 'text-acc' : 'text-mut hover:text-ink')
                  }
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-acc/15"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon size={15} className="relative" />
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* мобайл: второстепенные разделы компактной строкой */}
        <nav className="mx-auto max-w-3xl overflow-x-auto px-4 md:hidden">
          <div className="flex gap-1 py-2">
            {EXTRA.map((l) => {
              const active = isActive(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (active ? 'bg-acc/15 text-acc' : 'text-mut hover:text-ink')
                  }
                >
                  <Icon size={14} />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* мобайл: нижний таб-бар */}
      {!hideTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-3xl items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
            {TABS.map((l) => {
              const active = isActive(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ' +
                    (active ? 'text-acc' : 'text-mut')
                  }
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
