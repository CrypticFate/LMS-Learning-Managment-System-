import Link from 'next/link';

import { getPublishedBlogPosts } from '@/features/blog/queries';

function excerpt(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > 180 ? `${collapsed.slice(0, 177)}…` : collapsed;
}

function publishedDate(value?: string | null): string {
  if (!value) return 'Recently published';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="page-shell">
      <p className="eyebrow">Learning journal</p>
      <h1>Published articles</h1>
      <p className="lead">Ideas, practical guides, and updates from our content team.</p>

      {posts.length === 0 ? (
        <p className="empty-state section-gap">No articles have been published yet.</p>
      ) : (
        <section className="blog-card-grid section-gap" aria-label="Published articles">
          {posts.map((post) => (
            <article className="blog-card" key={post.documentId}>
              {post.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="blog-card-cover" src={post.coverImageUrl} />
              )}
              <div className="blog-card-content">
                <p className="eyebrow">
                  {post.author?.username ?? 'LMS team'} · {publishedDate(post.publishedAt)}
                </p>
                <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                <p>{excerpt(post.body)}</p>
                <Link href={`/blog/${post.slug}`}>Read article</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
