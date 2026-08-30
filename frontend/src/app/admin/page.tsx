import Link from 'next/link';

import { getAdminStats } from '@/features/admin/queries';
import { ROLE } from '@/lib/constants';

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  return (
    <>
      <p className="eyebrow">Admin dashboard</p>
      <h1>Platform overview</h1>
      <p className="lead">
        Monitor platform activity and manage every user and content area.
      </p>

      <section className="admin-stat-grid section-gap" aria-label="Platform statistics">
        <Link className="admin-stat-card" href="/admin/users">
          <span>Total users</span>
          <strong>{stats.totalUsers}</strong>
        </Link>
        <Link className="admin-stat-card" href="/admin/courses">
          <span>Total courses</span>
          <strong>{stats.totalCourses}</strong>
        </Link>
        <div className="admin-stat-card">
          <span>Total enrollments</span>
          <strong>{stats.totalEnrollments}</strong>
        </div>
        <Link className="admin-stat-card" href="/admin/blog">
          <span>Blog posts</span>
          <strong>{stats.totalBlogPosts}</strong>
        </Link>
      </section>

      <section className="panel stack section-gap">
        <div className="section-heading">
          <h2>Users by role</h2>
          <Link href="/admin/users">Manage users</Link>
        </div>
        <div className="role-stat-grid">
          {Object.values(ROLE).map((role) => (
            <div key={role}>
              <strong>{stats.usersByRole[role] ?? 0}</strong>
              <span>{role}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
