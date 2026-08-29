import Link from 'next/link';

import { renderForRoles } from '@/features/auth/components/role-guard';
import { ROLE } from '@/lib/constants';

export default function StudentDashboardPage() {
  return renderForRoles([ROLE.STUDENT], () => (
    <>
      <p className="eyebrow">Student dashboard</p>
      <h1>My learning</h1>
      <p className="lead">Continue one of your enrolled courses.</p>
      <div className="button-row">
        <Link className="button primary" href="/student/my-courses">My Courses</Link>
      </div>
    </>
  ));
}
