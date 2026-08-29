type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  return (
    <main className="page-shell">
      <p className="eyebrow">Article</p>
      <h1>{slug.replaceAll('-', ' ')}</h1>
      <p className="muted">Published article content will be connected in Plan 06.</p>
    </main>
  );
}
