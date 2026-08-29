import Link from 'next/link';

import { logoutAction } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';
import { DASHBOARD_ROUTE_BY_ROLE, ROLE } from '@/lib/constants';

export function DashboardHeader({ user }: { user: CurrentUser }) {
  const dashboardRoute = DASHBOARD_ROUTE_BY_ROLE[user.role.name];
  const dashboardLabel = {
    [ROLE.ADMIN]: 'Course management',
    [ROLE.CONTENT_MANAGER]: 'Content library',
    [ROLE.INSTRUCTOR]: 'My Courses',
    [ROLE.STUDENT]: 'Overview',
  }[user.role.name];

  return (
    <header className="site-header dashboard-header">
      <Link className="brand" href={dashboardRoute}>
        LMS
      </Link>
      <nav aria-label="Dashboard navigation">
        <Link href={dashboardRoute}>{dashboardLabel}</Link>
        {user.role.name === ROLE.STUDENT && (
          <Link href="/student/my-courses">My Courses</Link>
        )}
        <span>{user.username} · {user.role.name}</span>
        <form action={logoutAction}>
          <button className="link-button" type="submit">Sign out</button>
        </form>
      </nav>
    </header>
  );
}
