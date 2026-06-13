import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-mut sm:flex-row">
        <div className="font-display font-bold tracking-tight text-ink">
          IRON<span className="text-gradient">LOG</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="transition-colors hover:text-ink">Войти</Link>
          <Link href="/register" className="transition-colors hover:text-ink">Регистрация</Link>
        </div>
        <div>© {new Date().getFullYear()} IronLog</div>
      </div>
    </footer>
  );
}
