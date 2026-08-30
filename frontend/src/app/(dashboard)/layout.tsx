import { redirect } from 'next/navigation';

import { DashboardSidebar } from '@/features/auth/components/dashboard-sidebar';
import { getCurrentUser } from '@/features/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="dashboard-layout-shell">
      <DashboardSidebar user={user} />
      <main className="dashboard-layout-main dashboard-shell">{children}</main>
    </div>
  );
}
