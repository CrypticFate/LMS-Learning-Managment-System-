import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminStats } from '@/features/admin/queries';
import { ROLE } from '@/lib/constants';

const statLinks = [
  ['Total users', 'Manage user accounts and platform roles.', '/admin/users', 'totalUsers'],
  ['Total courses', 'Review course structure, modules, lessons, and quizzes.', '/admin/courses', 'totalCourses'],
  ['Total enrollments', 'Track learning activity across courses.', null, 'totalEnrollments'],
  ['Blog posts', 'Manage public articles and publishing state.', '/admin/blog', 'totalBlogPosts'],
] as const;

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <Badge variant="secondary">Admin dashboard</Badge>
          <h1>Platform overview</h1>
          <p>Monitor platform activity and jump into the areas that need attention.</p>
        </div>
        <Link className={buttonVariants({ variant: 'outline' })} href="/">
          View public site
        </Link>
      </section>

      <section className="admin-stat-grid section-gap" aria-label="Platform statistics">
        {statLinks.map(([label, description, href, key]) => {
          const value = stats[key];
          const content = (
            <>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{description}</small>
            </>
          );

          return href ? (
            <Link className="admin-stat-card" href={href} key={label}>
              {content}
            </Link>
          ) : (
            <div className="admin-stat-card" key={label}>
              {content}
            </div>
          );
        })}
      </section>

      <Card className="section-gap admin-card">
        <CardHeader className="admin-card-header">
          <div>
            <CardTitle>Users by role</CardTitle>
            <CardDescription>Current distribution across operational permissions.</CardDescription>
          </div>
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href="/admin/users">
            Manage users
          </Link>
        </CardHeader>
        <CardContent>
          <div className="role-stat-grid">
            {Object.values(ROLE).map((role) => (
              <div key={role}>
                <strong>{stats.usersByRole[role] ?? 0}</strong>
                <span>{role}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
