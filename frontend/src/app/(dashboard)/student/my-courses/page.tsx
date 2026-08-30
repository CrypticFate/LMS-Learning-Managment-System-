import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { renderForRoles } from '@/features/auth/components/role-guard';
import { getMyEnrollments } from '@/features/courses/queries';
import { getMyProgress } from '@/features/progress/queries';
import { ROLE } from '@/lib/constants';

export default function MyCoursesPage() {
  return renderForRoles([ROLE.STUDENT], async () => {
    const [enrollments, progressSummaries] = await Promise.all([
      getMyEnrollments(),
      getMyProgress(),
    ]);
    const progressByCourse = new Map(
      progressSummaries.map((progress) => [progress.courseDocumentId, progress]),
    );
    const availableEnrollments = enrollments.filter(
      (enrollment): enrollment is typeof enrollment & { course: NonNullable<typeof enrollment.course> } =>
        enrollment.course !== null,
    );

    return (
      <div className="learning-page">
        <section className="learning-hero">
          <div>
            <Badge variant="secondary">Student dashboard</Badge>
            <h1>My Courses</h1>
            <p>Only courses you enrolled in appear here.</p>
          </div>
          <div className="admin-hero-count">
            <strong>{availableEnrollments.length}</strong>
            <span>Enrolled</span>
          </div>
        </section>

        <div className="learning-course-grid section-gap">
          {availableEnrollments.length === 0 && (
            <Card className="learning-empty-card">
              <CardHeader>
                <CardTitle>No enrolled courses yet</CardTitle>
                <CardDescription>Browse available courses and enroll to start learning.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link className={buttonVariants()} href="/courses">Browse courses</Link>
              </CardContent>
            </Card>
          )}
          {availableEnrollments.map(({ documentId, course, enrolledAt }) => {
            const progress = progressByCourse.get(course.documentId) ?? {
              completed: 0,
              totalLessons: 0,
              percent: 0,
            };
            return (
              <Card className="learning-course-card" key={documentId}>
                <CardHeader>
                  <Badge variant="outline">Enrolled {new Date(enrolledAt).toLocaleDateString()}</Badge>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>{course.description || 'No description provided.'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mini-progress">
                    <div>
                      <span>{progress.completed} of {progress.totalLessons} lessons</span>
                      <strong>{progress.percent}%</strong>
                    </div>
                    <progress max={100} value={progress.percent}>{progress.percent}%</progress>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link className={buttonVariants()} href={`/student/courses/${course.documentId}`}>
                    Open course
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    );
  });
}
