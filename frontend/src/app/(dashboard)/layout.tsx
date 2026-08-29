import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <main className="page-shell dashboard-shell">{children}</main>;
}
