'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { logoutAction } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';
import { DASHBOARD_ROUTE_BY_ROLE, ROLE } from '@/lib/constants';
import { cn } from '@/lib/utils';

const navItems = {
  [ROLE.ADMIN]: [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/courses', label: 'Courses' },
    { href: '/admin/blog', label: 'Blog' },
    { href: '/admin/problem-sets', label: 'Problem Sets' },
  ],
  [ROLE.CONTENT_MANAGER]: [
    { href: '/content-manager', label: 'Content library' },
    { href: '/content-manager/blog', label: 'Blog' },
    { href: '/content-manager/problem-sets', label: 'Problem Sets' },
  ],
  [ROLE.INSTRUCTOR]: [
    { href: '/instructor', label: 'My Courses' },
    { href: '/instructor/problem-sets', label: 'Problem Sets' },
  ],
  [ROLE.STUDENT]: [
    { href: '/student', label: 'Overview' },
    { href: '/student/my-courses', label: 'My Courses' },
    { href: '/student/problem-sets', label: 'Problem Set' },
    { href: '/student/results', label: 'Results' },
  ],
};

const profileRoutes = {
  [ROLE.ADMIN]: '/admin',
  [ROLE.CONTENT_MANAGER]: '/content-manager/profile',
  [ROLE.INSTRUCTOR]: '/instructor/profile',
  [ROLE.STUDENT]: '/student/profile',
};

function isActive(pathname: string, href: string) {
  if (href === '/student' || href === '/instructor' || href === '/content-manager') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const dashboardRoute = DASHBOARD_ROUTE_BY_ROLE[user.role.name];

  return (
    <aside className="dashboard-sidebar">
      <Link className="brand" href={dashboardRoute}>
        <span className="brand-mark">CPS</span>
        <span>CPS Academy</span>
      </Link>

      <nav aria-label="Dashboard navigation" className="dashboard-sidebar-nav">
        {navItems[user.role.name].map((item) => (
          <Link
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className={cn(isActive(pathname, item.href) && 'active')}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="dashboard-sidebar-footer">
        <Link className="dashboard-sidebar-user dashboard-sidebar-user-link" href={profileRoutes[user.role.name]}>
          <span aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.username}</strong>
            <small>{user.role.name}</small>
          </div>
        </Link>
        <form action={logoutAction}>
          <button className={buttonVariants({ variant: 'outline', className: 'w-full' })} type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
