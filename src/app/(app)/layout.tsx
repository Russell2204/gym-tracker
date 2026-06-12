import { requireUser } from '@/lib/auth';
import Nav from '@/components/Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <Nav userName={user.name} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5">{children}</main>
    </div>
  );
}
