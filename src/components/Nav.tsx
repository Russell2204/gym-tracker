'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

const LINKS = [
  { href: '/dashboard', label: 'Главная' },
  { href: '/calendar', label: 'Календарь' },
  { href: '/programs', label: 'Программы' },
  { href: '/workouts', label: 'История' },
  { href: '/stats', label: 'Статистика' },
  { href: '/measurements', label: 'Замеры' },
  { href: '/exercises', label: 'Упражнения' }
];

export default function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-3">
        <Link href="/dashboard" className="font-display text-lg font-bold tracking-tight">
          IRON<span className="text-acc">LOG</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-mut sm:inline">{userName}</span>
          <form action={logoutAction}>
            <button className="text-sm text-mut transition-colors hover:text-ink">Выйти</button>
          </form>
        </div>
      </div>
      <nav className="mx-auto max-w-3xl overflow-x-auto px-4">
        <div className="flex gap-1 py-2">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
                  (active ? 'bg-acc/15 text-acc' : 'text-mut hover:text-ink')
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
