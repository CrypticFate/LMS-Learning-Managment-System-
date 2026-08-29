import Link from 'next/link';

import { getCurrentUser } from '@/features/auth/session';
import { DASHBOARD_ROUTE_BY_ROLE } from '@/lib/constants';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="page-shell hero">
      <p className="eyebrow">Learn with a clear path</p>
      <h1>Courses, progress, and feedback in one focused workspace.</h1>
      <p className="lead">
        This LMS is the shared home for students, instructors, content managers,
        and administrators.
      </p>
      <div className="button-row">
        {user ? (
          <>
            <Link className="button primary" href={DASHBOARD_ROUTE_BY_ROLE[user.role.name]}>
              Open dashboard
            </Link>
            <Link className="button secondary" href="/courses">
              Browse courses
            </Link>
          </>
        ) : (
          <>
            <Link className="button primary" href="/courses">
              Browse courses
            </Link>
            <Link className="button secondary" href="/register">
              Create an account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
