import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/session';
import type { RoleName } from '@/lib/constants';

type RoleGuardProps = {
  allowedRoles: readonly RoleName[];
  children: React.ReactNode;
};

export async function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (!allowedRoles.includes(user.role.name)) redirect('/');

  return children;
}
