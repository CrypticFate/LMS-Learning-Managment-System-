import Link from 'next/link';

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
      <>
        <p className="eyebrow">Student dashboard</p>
        <h1>My Courses</h1>
        <p className="lead">Only courses you enrolled in appear here.</p>
        <div className="card-grid section-gap">
          {availableEnrollments.length === 0 && (
            <div className="empty-state">
              You have not enrolled in a course yet.
            </div>
          )}
          {availableEnrollments.map(({ documentId, course, enrolledAt }) => {
            const progress = progressByCourse.get(course.documentId) ?? {
              completed: 0,
              totalLessons: 0,
              percent: 0,
            };
            return <article className="course-card" key={documentId}>
              <p className="eyebrow">Enrolled {new Date(enrolledAt).toLocaleDateString()}</p>
              <h2>{course.title}</h2>
              <p className="muted">{course.description || 'No description provided.'}</p>
              <div className="mini-progress">
                <div>
                  <span>{progress.completed} of {progress.totalLessons} lessons</span>
                  <strong>{progress.percent}%</strong>
                </div>
                <progress max={100} value={progress.percent}>{progress.percent}%</progress>
              </div>
              <Link className="button primary" href={`/student/courses/${course.documentId}`}>
                Open course
              </Link>
            </article>;
          })}
        </div>
      </>
    );
  });
}
