import { RoleGuard } from '@/features/auth/components/role-guard';
import { ROLE } from '@/lib/constants';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={[ROLE.INSTRUCTOR]}>{children}</RoleGuard>;
}
