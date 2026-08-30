type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();

  const publishedAt = post.publishedAt
    ? new Intl.DateTimeFormat('en', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(post.publishedAt))
    : 'Recently published';

  return (
    <main className="page-shell blog-article-shell">
      <p className="eyebrow">Article</p>
      <h1>{post.title}</h1>
      <p className="blog-byline">
        By {post.author?.username ?? 'LMS team'} · {publishedAt}
      </p>
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="blog-article-cover" src={post.coverImageUrl} />
      )}
      <article className="panel blog-article-body">
        {post.body.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </article>
    </main>
  );
}
import { notFound } from 'next/navigation';

import { getPublishedBlogPost } from '@/features/blog/queries';
