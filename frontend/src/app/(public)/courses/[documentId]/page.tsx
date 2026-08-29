import { enrollInCourseAction } from '@/features/courses/actions';
import { getCourse } from '@/features/courses/queries';
import { getCurrentUser } from '@/features/auth/session';
import { ROLE } from '@/lib/constants';

type CoursePageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { documentId } = await params;
  const query = await searchParams;
  const [course, user] = await Promise.all([getCourse(documentId), getCurrentUser()]);

  return (
    <main className="page-shell">
      <p className="eyebrow">Course</p>
      <h1>{course.title}</h1>
      <p className="lead">{course.description || 'No description provided.'}</p>
      {query.notice === 'already-enrolled' && (
        <p className="notice">You are already enrolled in this course.</p>
      )}
      {user?.role.name === ROLE.STUDENT && (
        <form action={enrollInCourseAction.bind(null, documentId)}>
          <button type="submit">Enroll in course</button>
        </form>
      )}
    </main>
  );
}
