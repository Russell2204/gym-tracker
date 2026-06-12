import { requireUser } from '@/lib/auth';
import { getStats } from '@/lib/queries';
import { fmtKg } from '@/lib/types';
import StatsCharts from '@/components/StatsCharts';

export default async function StatsPage() {
  const user = await requireUser();
  const stats = getStats(user.id);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Статистика</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-mut">Всего тренировок</div>
          <div className="num mt-1 text-3xl font-bold">{stats.totals.workouts}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-mut">В этом месяце</div>
          <div className="num mt-1 text-3xl font-bold">{stats.monthCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-mut">Общий тоннаж</div>
          <div className="num mt-1 text-3xl font-bold">
            {fmtKg(stats.totals.volume)} <span className="text-base font-medium text-mut">кг</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-mut">Тоннаж за 7 дней</div>
          <div className="num mt-1 text-3xl font-bold">
            {fmtKg(stats.weekVolume)} <span className="text-base font-medium text-mut">кг</span>
          </div>
        </div>
      </div>

      <StatsCharts
        volumeByWorkout={stats.volumeByWorkout}
        exerciseSeries={stats.exerciseSeries}
        weightSeries={stats.weightSeries}
      />
    </div>
  );
}
