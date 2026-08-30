import { redirect } from 'next/navigation';

import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
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
    <div className="admin-layout-shell">
      <AdminSidebar user={user} />
      <main className="admin-layout-main dashboard-shell">{children}</main>
    </div>
  );
}
