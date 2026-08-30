import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { renderForRoles } from '@/features/auth/components/role-guard';
import { ROLE } from '@/lib/constants';

export default function StudentDashboardPage() {
  return renderForRoles([ROLE.STUDENT], () => (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <Badge variant="secondary">Student dashboard</Badge>
          <h1>My learning</h1>
          <p>Continue your enrolled courses, track progress, and review quiz history.</p>
        </div>
        <Link className={buttonVariants()} href="/student/my-courses">My Courses</Link>
      </section>

      <section className="learning-quick-grid section-gap">
        <Card className="learning-action-card">
          <CardHeader>
            <Badge variant="outline">Courses</Badge>
            <CardTitle>Pick up where you left off</CardTitle>
            <CardDescription>Open your enrolled course list and resume the next lesson.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: 'outline' })} href="/student/my-courses">Open courses</Link>
          </CardContent>
        </Card>
        <Card className="learning-action-card">
          <CardHeader>
            <Badge variant="outline">Results</Badge>
            <CardTitle>Review quiz attempts</CardTitle>
            <CardDescription>See every submission, score, and course link in one table.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: 'outline' })} href="/student/results">View results</Link>
          </CardContent>
        </Card>
        <Card className="learning-action-card">
          <CardHeader>
            <Badge variant="outline">Practice</Badge>
            <CardTitle>Work through DSA problems</CardTitle>
            <CardDescription>Open curated 450 DSA problems and track a separate practice progress bar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: 'outline' })} href="/student/problem-sets">Open problem set</Link>
          </CardContent>
        </Card>
      </section>
    </div>
  ));
}
