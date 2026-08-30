'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { logoutAction } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/blog', label: 'Blog' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <Link className="brand" href="/admin">
        <span className="brand-mark">CPS</span>
        <span>CPS Academy</span>
      </Link>

      <nav aria-label="Admin navigation" className="admin-sidebar-nav">
        {adminNavItems.map((item) => (
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

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-user">
          <span aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.username}</strong>
            <small>{user.role.name}</small>
          </div>
        </div>
        <form action={logoutAction}>
          <button className={buttonVariants({ variant: 'outline', className: 'w-full' })} type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
