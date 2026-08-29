type CoursePageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { documentId } = await params;

  return (
    <main className="page-shell">
      <p className="eyebrow">Course</p>
      <h1>Course details</h1>
      <p className="muted">Strapi document: {documentId}</p>
    </main>
  );
}
