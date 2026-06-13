import { Check, Plus, Timer } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

/** CSS-мок экрана тренировки в рамке телефона — без скриншотов и ассетов. */
export default function ShowcasePhone() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Экран тренировки, который <span className="text-gradient">не мешает тренироваться</span>
            </h2>
            <ul className="mt-6 space-y-4 text-mut">
              <li className="flex gap-3">
                <Check size={20} className="mt-0.5 shrink-0 text-ok" />
                <span>Вес и повторы подставляются из прошлого подхода — фиксируй результат в два тапа.</span>
              </li>
              <li className="flex gap-3">
                <Check size={20} className="mt-0.5 shrink-0 text-ok" />
                <span>Таймер отдыха всегда на виду внизу экрана: +30 секунд или пропустить — одним нажатием.</span>
              </li>
              <li className="flex gap-3">
                <Check size={20} className="mt-0.5 shrink-0 text-ok" />
                <span>В суперсете отдых стартует после последнего движения связки — как и должно быть.</span>
              </li>
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto w-[290px]">
            <div className="rounded-[2.4rem] border border-line bg-card p-2.5 shadow-glow-violet">
              <div className="space-y-3 rounded-[1.9rem] bg-bg p-4 pb-6">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-acc">
                  <span className="h-1.5 w-1.5 rounded-full bg-acc" />
                  Тренировка идёт
                </div>
                <div className="text-sm font-semibold">Фуллбади · воскресенье</div>

                <div className="rounded-xl border border-line bg-card p-3">
                  <div className="text-xs font-medium">Приседания со штангой</div>
                  <div className="mt-0.5 text-[10px] text-mut">Цель: 4×6 · отдых 4:00</div>
                  <div className="num mt-2 flex gap-1 text-[11px]">
                    <span className="rounded-md border border-acc/30 bg-acc/5 px-1.5 py-0.5">1. 100×6</span>
                    <span className="rounded-md border border-acc/30 bg-acc/5 px-1.5 py-0.5">2. 100×6</span>
                    <span className="rounded-md border border-acc/30 bg-acc/5 px-1.5 py-0.5">3. 102,5×6</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="h-7 flex-1 rounded-lg border border-line bg-bg px-2 text-[10px] leading-7 text-mut">102,5</div>
                    <div className="h-7 flex-1 rounded-lg border border-line bg-bg px-2 text-[10px] leading-7 text-mut">6</div>
                    <div className="flex h-7 items-center gap-1 rounded-lg bg-gradient-to-r from-acc to-acc2 px-2.5 text-[10px] font-semibold text-white">
                      <Plus size={11} />
                      Подход 4
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-warn/40 bg-card p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-warn">Суперсет A</div>
                  <div className="mt-1 text-xs font-medium">Сгибания рук со штангой</div>
                  <div className="mt-0.5 text-[10px] text-mut">3×10 · без отдыха внутри связки</div>
                </div>

                <div className="rounded-xl border border-line bg-card/95 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-acc">
                        <Timer size={10} />
                        Отдых
                      </div>
                      <div className="num text-xl font-bold">2:47</div>
                    </div>
                    <div className="rounded-lg border border-line px-2 py-1 text-[10px] text-mut">+30 c</div>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full w-2/3 bg-acc" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
