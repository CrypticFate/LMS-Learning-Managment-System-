import type { Metadata } from 'next';

import { AuthForm } from '@/features/auth/components/auth-form';
import { DashboardHeader } from '@/features/auth/components/dashboard-header';
import { AccessDenied } from '@/features/auth/components/role-guard';
import { getCurrentUser } from '@/features/auth/session';
import { CourseManagement } from '@/features/courses/components/course-management';
import { ROLE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Admin portal | LMS',
};

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="auth-shell">
        <AuthForm mode="admin-login" />
      </main>
    );
  }

  return (
    <>
      <DashboardHeader user={user} />
      <main className="page-shell dashboard-shell">
        {user.role.name === ROLE.ADMIN ? (
          <CourseManagement eyebrow="Admin dashboard" title="All courses" returnPath="/admin" />
        ) : (
          <AccessDenied user={user} />
        )}
      </main>
    </>
  );
}
