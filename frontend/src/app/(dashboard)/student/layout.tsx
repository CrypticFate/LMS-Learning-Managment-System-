import { RoleGuard } from '@/features/auth/components/role-guard';
import { ROLE } from '@/lib/constants';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={[ROLE.STUDENT]}>{children}</RoleGuard>;
}
