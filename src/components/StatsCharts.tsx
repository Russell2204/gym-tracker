'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { fmtDate } from '@/lib/types';

type VolumePoint = { id: number; name: string; date: string; volume: number };
type ExerciseSeries = {
  id: number;
  name: string;
  points: Array<{ date: string; maxWeight: number; e1rm: number }>;
};
type WeightPoint = { date: string; weight: number };

const AXIS = { fill: '#9aa1ab', fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  backgroundColor: '#16181d',
  border: '1px solid #262a31',
  borderRadius: 12,
  color: '#e8eaed',
  fontSize: 13
} as const;

export default function StatsCharts({
  volumeByWorkout,
  exerciseSeries,
  weightSeries
}: {
  volumeByWorkout: VolumePoint[];
  exerciseSeries: ExerciseSeries[];
  weightSeries: WeightPoint[];
}) {
  const [exerciseId, setExerciseId] = useState<number | null>(exerciseSeries[0]?.id ?? null);
  const selected = useMemo(
    () => exerciseSeries.find((e) => e.id === exerciseId) ?? null,
    [exerciseSeries, exerciseId]
  );

  const volumeData = volumeByWorkout.map((v) => ({ ...v, label: fmtDate(v.date) }));
  const selectedData = selected?.points.map((p) => ({ ...p, label: fmtDate(p.date) })) ?? [];
  const weightData = weightSeries.map((w) => ({ ...w, label: fmtDate(w.date) }));

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <h2 className="font-semibold">Тоннаж по тренировкам</h2>
        {volumeData.length < 2 ? (
          <p className="mt-3 text-sm text-mut">
            График появится после двух завершённых тренировок.
          </p>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#262a31" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#262a31' }} />
                <YAxis tick={AXIS} tickLine={false} axisLine={{ stroke: '#262a31' }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [`${value} кг`, 'Тоннаж']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.name ? `${label} · ${payload[0].payload.name}` : label
                  }
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#4e7dff"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#4e7dff' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Прогресс упражнения</h2>
          {exerciseSeries.length > 0 && (
            <select
              className="input sm:w-64"
              value={exerciseId ?? ''}
              onChange={(e) => setExerciseId(Number(e.target.value))}
            >
              {exerciseSeries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {!selected || selectedData.length < 2 ? (
          <p className="mt-3 text-sm text-mut">
            Выполни упражнение с весом на двух тренировках — и здесь появится кривая прогресса.
          </p>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#262a31" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#262a31' }} />
                <YAxis tick={AXIS} tickLine={false} axisLine={{ stroke: '#262a31' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v} кг`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  name="Лучший вес"
                  stroke="#4e7dff"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#4e7dff' }}
                />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  name="Оценка 1ПМ"
                  stroke="#f2c84b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-xs text-mut">1ПМ оценивается по формуле Эпли из лучшего подхода тренировки.</p>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold">Вес тела</h2>
        {weightData.length < 2 ? (
          <p className="mt-3 text-sm text-mut">
            Добавь хотя бы два замера веса на вкладке «Замеры», чтобы увидеть динамику.
          </p>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#262a31" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#262a31' }} />
                <YAxis tick={AXIS} tickLine={false} axisLine={{ stroke: '#262a31' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} кг`, 'Вес']} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#34c277"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#34c277' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
