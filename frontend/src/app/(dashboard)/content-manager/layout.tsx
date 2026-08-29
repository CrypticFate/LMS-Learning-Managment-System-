import { RoleGuard } from '@/features/auth/components/role-guard';
import { ROLE } from '@/lib/constants';

export default function ContentManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={[ROLE.CONTENT_MANAGER]}>{children}</RoleGuard>;
}
