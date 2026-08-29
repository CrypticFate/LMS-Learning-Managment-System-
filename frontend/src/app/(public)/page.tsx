import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell hero">
      <p className="eyebrow">Learn with a clear path</p>
      <h1>Courses, progress, and feedback in one focused workspace.</h1>
      <p className="lead">
        This LMS is the shared home for students, instructors, content managers,
        and administrators.
      </p>
      <div className="button-row">
        <Link className="button primary" href="/courses">
          Browse courses
        </Link>
        <Link className="button secondary" href="/register">
          Create an account
        </Link>
      </div>
    </main>
  );
}
