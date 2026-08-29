import { RoleGuard } from '@/features/auth/components/role-guard';
import { ROLE } from '@/lib/constants';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={[ROLE.ADMIN]}>{children}</RoleGuard>;
}
