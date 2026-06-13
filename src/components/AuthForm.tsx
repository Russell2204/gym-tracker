'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { loginAction, registerAction } from '@/lib/actions';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const res = isLogin
        ? await loginAction({ email, password })
        : await registerAction({ name, email, password });
      if (res?.error) setError(res.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-hero-radial px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} />
          На главную
        </Link>

        <div className="mb-8 text-center">
          <div className="font-display text-3xl font-bold tracking-tight">
            IRON<span className="text-gradient">LOG</span>
          </div>
          <p className="mt-2 text-sm text-mut">Дневник тренировок: вес, повторы, прогресс</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.21, 0.65, 0.36, 1] }}
          className="card bg-card-sheen p-6 shadow-glow"
        >
          <h1 className="mb-5 text-lg font-semibold">
            {isLogin ? 'Вход в аккаунт' : 'Регистрация'}
          </h1>

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="label" htmlFor="name">Имя</label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
                  <input
                    id="name"
                    className="input !pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Как к тебе обращаться"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
                <input
                  id="email"
                  className="input !pl-9"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Пароль</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
                <input
                  id="password"
                  className="input !pl-9"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? 'Твой пароль' : 'Минимум 6 символов'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl border border-hot/40 bg-hot/10 px-3 py-2 text-sm text-hot"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button className="btn-primary w-full" onClick={submit} disabled={pending}>
              {pending ? 'Секунду…' : isLogin ? 'Войти' : 'Создать аккаунт'}
            </button>
          </div>
        </motion.div>

        <p className="mt-4 text-center text-sm text-mut">
          {isLogin ? (
            <>Нет аккаунта?{' '}
              <Link href="/register" className="font-medium text-acc hover:underline">Зарегистрироваться</Link>
            </>
          ) : (
            <>Уже есть аккаунт?{' '}
              <Link href="/login" className="font-medium text-acc hover:underline">Войти</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
