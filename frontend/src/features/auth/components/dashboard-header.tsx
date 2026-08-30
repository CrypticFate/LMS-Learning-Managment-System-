import Link from 'next/link';

import { logoutAction } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';
import { DASHBOARD_ROUTE_BY_ROLE, ROLE } from '@/lib/constants';

export function DashboardHeader({ user }: { user: CurrentUser }) {
  const dashboardRoute = DASHBOARD_ROUTE_BY_ROLE[user.role.name];
  const dashboardLabel = {
    [ROLE.ADMIN]: 'Overview',
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
        {user.role.name === ROLE.ADMIN ? (
          <>
            <Link href="/admin">Overview</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/courses">Courses</Link>
            <Link href="/admin/blog">Blog</Link>
          </>
        ) : (
          <>
            <Link href={dashboardRoute}>{dashboardLabel}</Link>
            {user.role.name === ROLE.CONTENT_MANAGER && (
              <Link href="/content-manager/blog">Blog</Link>
            )}
          </>
        )}
        {user.role.name === ROLE.STUDENT && (
          <>
            <Link href="/student/my-courses">My Courses</Link>
            <Link href="/student/results">Results</Link>
          </>
        )}
        <span>{user.username} · {user.role.name}</span>
        <form action={logoutAction}>
          <button className="link-button" type="submit">Sign out</button>
        </form>
      </nav>
    </header>
  );
}
