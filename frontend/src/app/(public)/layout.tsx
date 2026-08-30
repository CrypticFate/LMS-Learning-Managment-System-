import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { logoutAction } from '@/features/auth/actions';
import { getCurrentUser } from '@/features/auth/session';
import { DASHBOARD_ROUTE_BY_ROLE, ROLE } from '@/lib/constants';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">CPS</span>
          <span>CPS Academy</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/courses">Courses</Link>
          <Link href="/blog">Blog</Link>
          {user ? (
            <>
              {user.role.name === ROLE.STUDENT && (
                <Link href="/student/my-courses">My Courses</Link>
              )}
              <Link href={DASHBOARD_ROUTE_BY_ROLE[user.role.name]}>Dashboard</Link>
              <form action={logoutAction}>
                <button className="link-button" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href="/login">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      {children}
    </>
  );
}
