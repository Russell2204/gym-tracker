import { ClipboardList, Timer, History, TrendingUp, Ruler, CalendarDays } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Программы и суперсеты',
    text: 'Собери программу один раз — запускай тренировку в один тап. Суперсеты A/B/C без путаницы.'
  },
  {
    icon: Timer,
    title: 'Таймер отдыха',
    text: 'Стартует сам после подхода. Тройной сигнал и вибрация — телефон можно не доставать из кармана.'
  },
  {
    icon: History,
    title: 'Сравнение с прошлым разом',
    text: 'У каждого упражнения — подходы с прошлой тренировки. Сразу видно, что пора прибавлять.'
  },
  {
    icon: TrendingUp,
    title: 'Графики прогресса и 1ПМ',
    text: 'Тоннаж по тренировкам, лучший вес и оценка одноповторного максимума по Эпли.'
  },
  {
    icon: Ruler,
    title: 'Замеры тела',
    text: 'Вес, обхваты, заметки. Динамика веса — на графике рядом с тренировочным объёмом.'
  },
  {
    icon: CalendarDays,
    title: 'Календарь',
    text: 'Планируй тренировки на неделю вперёд и смотри, как заполняется месяц.'
  }
];

export default function FeatureGrid() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <Reveal>
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Всё, что нужно у штанги. <span className="text-gradient">Без лишнего.</span>
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="card-hover h-full bg-card-sheen p-5">
                <div className="inline-flex rounded-xl bg-acc/10 p-2.5 text-acc">
                  <Icon size={22} />
                </div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mut">{f.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
