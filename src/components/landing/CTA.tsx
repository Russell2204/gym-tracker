import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

export default function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-4">
      <Reveal>
        <div className="card relative overflow-hidden bg-hero-radial p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Следующая тренировка — <span className="text-gradient">уже с IronLog</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-mut">
            Регистрация за минуту. Стартовая программа «Фуллбади» уже внутри — останется только добавить вес на гриф.
          </p>
          <div className="mt-7 flex justify-center">
            <Link href="/register" className="btn-primary !px-7 !py-3 text-base">
              Начать бесплатно
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
