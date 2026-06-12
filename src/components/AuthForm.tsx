'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl font-bold tracking-tight">
            IRON<span className="text-acc">LOG</span>
          </div>
          <p className="mt-2 text-sm text-mut">Дневник тренировок: вес, повторы, прогресс</p>
        </div>

        <div className="card p-6">
          <h1 className="mb-5 text-lg font-semibold">
            {isLogin ? 'Вход в аккаунт' : 'Регистрация'}
          </h1>

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="label" htmlFor="name">Имя</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к тебе обращаться"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Пароль</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? 'Твой пароль' : 'Минимум 6 символов'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-hot/40 bg-hot/10 px-3 py-2 text-sm text-hot">
                {error}
              </p>
            )}

            <button className="btn-primary w-full" onClick={submit} disabled={pending}>
              {pending ? 'Секунду…' : isLogin ? 'Войти' : 'Создать аккаунт'}
            </button>
          </div>
        </div>

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
