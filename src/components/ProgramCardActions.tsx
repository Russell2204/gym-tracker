'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Pencil, Trash2 } from 'lucide-react';
import { deleteProgramAction, startProgramNowAction } from '@/lib/actions';

export default function ProgramCardActions({ programId }: { programId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    await startProgramNowAction(programId);
  }

  async function remove() {
    if (!confirm('Удалить программу? История тренировок останется.')) return;
    setPending(true);
    await deleteProgramAction(programId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button className="btn-primary !px-3 !py-1.5 text-sm" onClick={start} disabled={pending}>
        <Play size={14} />
        Начать
      </button>
      <Link href={`/programs/${programId}`} className="btn-ghost h-9 w-9 !p-0" aria-label="Изменить программу">
        <Pencil size={15} />
      </Link>
      <button
        className="btn-ghost h-9 w-9 !p-0 text-mut hover:border-hot/50 hover:text-hot"
        onClick={remove}
        disabled={pending}
        aria-label="Удалить программу"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
