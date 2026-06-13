'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ruler, Save, Trash2 } from 'lucide-react';
import { addMeasurementAction, deleteMeasurementAction } from '@/lib/actions';
import { Measurement, fmtDate, todayLocalISO } from '@/lib/types';

const FIELDS: Array<{ key: keyof Omit<Measurement, 'id' | 'date' | 'notes'>; label: string }> = [
  { key: 'weight', label: 'Вес, кг' },
  { key: 'neck', label: 'Шея' },
  { key: 'shoulders', label: 'Плечи' },
  { key: 'chest', label: 'Грудь' },
  { key: 'waist', label: 'Талия' },
  { key: 'hips', label: 'Ягодицы' },
  { key: 'biceps', label: 'Бицепс' },
  { key: 'forearm', label: 'Предплечье' },
  { key: 'thigh', label: 'Бедро' },
  { key: 'calf', label: 'Икра' }
];

export default function MeasurementsClient({ measurements }: { measurements: Measurement[] }) {
  const router = useRouter();
  const [date, setDate] = useState(todayLocalISO());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setError(null);
    setPending(true);
    const parsed: Record<string, number | null> = {};
    for (const f of FIELDS) {
      const raw = (values[f.key] ?? '').replace(',', '.').trim();
      parsed[f.key] = raw === '' ? null : parseFloat(raw);
      if (raw !== '' && !Number.isFinite(parsed[f.key])) {
        setPending(false);
        return setError(`Проверь поле «${f.label}» — там не число`);
      }
    }
    const res = await addMeasurementAction({ date, values: parsed, notes });
    setPending(false);
    if (res?.error) return setError(res.error);
    setValues({});
    setNotes('');
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm('Удалить замер?')) return;
    await deleteMeasurementAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Ruler size={20} className="text-acc" />
        Замеры тела
      </h1>

      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="mdate">Дата</label>
          <input
            id="mdate"
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                className="input num"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="—"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="mnotes">Заметки</label>
          <input
            id="mnotes"
            className="input"
            placeholder="Самочувствие, условия замера (необязательно)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-hot">{error}</p>}

        <button className="btn-primary w-full" onClick={save} disabled={pending}>
          <Save size={16} />
          {pending ? 'Сохраняю…' : 'Сохранить замер'}
        </button>
        <p className="text-xs text-mut">Обхваты — в сантиметрах. Заполняй только то, что мерил: пустые поля не сохраняются.</p>
      </div>

      {measurements.length === 0 ? (
        <div className="card p-6 text-center text-sm text-mut">
          Замеров пока нет. Для рекомпозиции мерь себя раз в 1–2 недели утром натощак — так динамика будет честной.
        </div>
      ) : (
        <div className="space-y-3">
          {measurements.map((m, i) => {
            const prev = measurements[i + 1];
            const weightDelta =
              m.weight != null && prev?.weight != null ? m.weight - prev.weight : null;
            const filled = FIELDS.filter((f) => m[f.key] != null);
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{fmtDate(m.date, true)}</div>
                  <button
                    className="text-mut transition-colors hover:text-hot"
                    onClick={() => remove(m.id)}
                    aria-label="Удалить замер"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="num mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  {filled.map((f) => (
                    <div key={f.key} className="flex justify-between gap-2 border-b border-line/60 py-1">
                      <span className="font-sans text-mut">{f.label}</span>
                      <span>
                        {m[f.key]}
                        {f.key === 'weight' && weightDelta != null && weightDelta !== 0 && (
                          <span className={'ml-1.5 text-xs font-semibold ' + (weightDelta < 0 ? 'text-ok' : 'text-warn')}>
                            {weightDelta > 0 ? '+' : ''}
                            {Math.round(weightDelta * 10) / 10}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {m.notes && <p className="mt-2 text-sm text-mut">{m.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
