import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getPrograms } from '@/lib/queries';
import ProgramCardActions from '@/components/ProgramCardActions';

export default async function ProgramsPage() {
  const user = await requireUser();
  const programs = getPrograms(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Программы</h1>
        <Link href="/programs/new" className="btn-primary">+ Создать</Link>
      </div>

      {programs.length === 0 && (
        <div className="card p-6 text-center text-sm text-mut">
          Программ пока нет. Создай первую — и сможешь запускать тренировки в один тап.
        </div>
      )}

      <div className="space-y-3">
        {programs.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{p.name}</div>
                {p.description && <p className="mt-1 text-sm text-mut">{p.description}</p>}
              </div>
              <ProgramCardActions programId={p.id} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.items.map((it) => (
                <span
                  key={it.id}
                  className="rounded-lg border border-line px-2 py-1 text-xs text-mut"
                >
                  {it.exercise_name} · {it.target_sets}×{it.target_reps}
                  {it.superset_group != null && <span className="ml-1 text-warn">⇄</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
