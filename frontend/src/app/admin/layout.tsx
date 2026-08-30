import { redirect } from 'next/navigation';

import { DashboardHeader } from '@/features/auth/components/dashboard-header';
import { getCurrentUser } from '@/features/auth/session';
import { DASHBOARD_ROUTE_BY_ROLE, ROLE } from '@/lib/constants';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role.name !== ROLE.ADMIN) {
    redirect(DASHBOARD_ROUTE_BY_ROLE[user.role.name]);
  }

  return (
    <>
      <DashboardHeader user={user} />
      <main className="page-shell dashboard-shell">{children}</main>
    </>
  );
}
