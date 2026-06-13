import Link from 'next/link';

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          IRON<span className="text-gradient">LOG</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost !px-4 !py-2 text-sm">
            Войти
          </Link>
          <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
            Начать
          </Link>
        </div>
      </div>
    </header>
  );
}
