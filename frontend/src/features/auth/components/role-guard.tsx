import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser } from '@/features/auth/session';
import type { CurrentUser } from '@/features/auth/types';
import { DASHBOARD_ROUTE_BY_ROLE, type RoleName } from '@/lib/constants';

export function AccessDenied({ user }: { user: CurrentUser }) {
  return (
    <section className="panel stack access-denied" role="alert">
      <p className="eyebrow">Access denied</p>
      <h1>This section is not available for your role.</h1>
      <p className="lead">
        You are still signed in as {user.username} ({user.role.name}). Your session has not
        changed.
      </p>
      <div className="button-row">
        <Link className="button primary" href={DASHBOARD_ROUTE_BY_ROLE[user.role.name]}>
          Return to my dashboard
        </Link>
      </div>
    </section>
  );
}

export async function renderForRoles(
  allowedRoles: readonly RoleName[],
  render: () => React.ReactNode | Promise<React.ReactNode>,
) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (!allowedRoles.includes(user.role.name)) {
    return <AccessDenied user={user} />;
  }

  return render();
}
