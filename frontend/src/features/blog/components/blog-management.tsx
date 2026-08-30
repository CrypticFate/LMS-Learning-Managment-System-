import Link from 'next/link';

import {
  createBlogPostAction,
  deleteBlogPostAction,
  toggleBlogPostStatusAction,
  updateBlogPostAction,
} from '../actions';
import { getManageableBlogPosts } from '../queries';

export async function BlogManagement() {
  const posts = await getManageableBlogPosts();

  return (
    <>
      <section className="panel stack">
        <h2>Write a post</h2>
        <form action={createBlogPostAction} className="content-form">
          <label>Title<input name="title" required /></label>
          <label>Cover image URL<input name="coverImageUrl" type="url" /></label>
          <label>Body<textarea name="body" rows={10} required /></label>
          <label>
            Initial status
            <select defaultValue="draft" name="status">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <button type="submit">Create post</button>
        </form>
      </section>

      <section className="stack section-gap">
        <div className="section-heading">
          <h2>All blog posts</h2>
          <span className="count-badge">{posts.length}</span>
        </div>
        {posts.length === 0 && <p className="empty-state">No blog posts yet.</p>}
        {posts.map((post) => (
          <article className="panel stack" key={post.documentId}>
            <div className="section-heading">
              <div>
                <span className={post.status === 'published' ? 'status-badge published' : 'status-badge'}>
                  {post.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <h2 className="admin-blog-title">{post.title}</h2>
                <p className="muted">
                  {post.author?.username ? `Author: ${post.author.username}` : 'Unknown author'}
                </p>
                {post.status === 'published' && (
                  <Link href={`/blog/${post.slug}`}>View public post</Link>
                )}
              </div>
              <div className="button-row admin-content-actions">
                <form action={toggleBlogPostStatusAction.bind(
                  null,
                  post.documentId,
                  post.status === 'published' ? 'draft' : 'published',
                )}>
                  <button className="secondary-button" type="submit">
                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </form>
                <form action={deleteBlogPostAction.bind(null, post.documentId)}>
                  <button className="danger-button" type="submit">Delete</button>
                </form>
              </div>
            </div>

            <details>
              <summary>Edit post</summary>
              <form
                action={updateBlogPostAction.bind(null, post.documentId)}
                className="content-form compact-form"
              >
                <label>Title<input defaultValue={post.title} name="title" required /></label>
                <label>Cover image URL<input defaultValue={post.coverImageUrl ?? ''} name="coverImageUrl" type="url" /></label>
                <label>Body<textarea defaultValue={post.body} name="body" rows={10} required /></label>
                <input name="status" type="hidden" value={post.status} />
                <button type="submit">Save post</button>
              </form>
            </details>
          </article>
        ))}
      </section>
    </>
  );
}
