import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          OpenCourse
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/courses">Courses</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      {children}
    </>
  );
}
