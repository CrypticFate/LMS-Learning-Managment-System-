import { redirect } from 'next/navigation';

import { DashboardHeader } from '@/features/auth/components/dashboard-header';
import { getCurrentUser } from '@/features/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <>
      <DashboardHeader user={user} />
      <main className="page-shell dashboard-shell">{children}</main>
    </>
  );
}
