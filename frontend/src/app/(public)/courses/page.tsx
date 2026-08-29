import Link from 'next/link';

import { enrollInCourseAction } from '@/features/courses/actions';
import { getCourses } from '@/features/courses/queries';
import { getCurrentUser } from '@/features/auth/session';
import { ROLE } from '@/lib/constants';

export default async function CoursesPage() {
  const [courses, user] = await Promise.all([getCourses(), getCurrentUser()]);
  const isStudent = user?.role.name === ROLE.STUDENT;

  return (
    <main className="page-shell">
      <p className="eyebrow">Available courses</p>
      <h1>Explore available courses</h1>
      <div className="card-grid section-gap">
        {courses.length === 0 && <p className="empty-state">No courses are available yet.</p>}
        {courses.map((course) => (
          <article className="course-card" key={course.documentId}>
            {/* Course covers may use any URL supplied by an authorized content owner. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {course.coverImageUrl && <img src={course.coverImageUrl} alt="" />}
            <h2>{course.title}</h2>
            <p className="muted">{course.description || 'No description provided.'}</p>
            <div className="button-row">
              <Link className="button secondary" href={`/courses/${course.documentId}`}>View details</Link>
              {isStudent && (
                <form action={enrollInCourseAction.bind(null, course.documentId)}>
                  <button type="submit">Enroll</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
