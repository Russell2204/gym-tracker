import { Quote } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

// Плейсхолдеры: заменить на реальные отзывы, когда появятся.
const QUOTES = [
  {
    text: 'Перестал таскать блокнот в зал. Вижу прошлые веса прямо у штанги — и каждый раз знаю, что прибавлять.',
    name: 'Дмитрий',
    detail: 'тренируется 3 раза в неделю'
  },
  {
    text: 'Таймер отдыха с вибрацией — то, чего не хватало. Телефон в кармане, сигнал прозвенел — пошёл делать подход.',
    name: 'Анна',
    detail: 'пауэрлифтинг, 2 года'
  },
  {
    text: 'График 1ПМ наглядно показал застой в жиме. Поменял программу — кривая снова пошла вверх.',
    name: 'Сергей',
    detail: 'фуллбади по воскресеньям'
  }
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <Reveal>
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Что говорят в зале</h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {QUOTES.map((q, i) => (
          <Reveal key={q.name} delay={i * 0.08}>
            <figure className="card h-full p-5">
              <Quote size={18} className="text-acc/60" />
              <blockquote className="mt-3 text-sm leading-relaxed">{q.text}</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold">{q.name}</span>
                <span className="text-mut"> · {q.detail}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
