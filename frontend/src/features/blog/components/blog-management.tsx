import {
  createBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  updateBlogPostAction,
} from '../actions';
import { getAdminBlogPosts } from '../queries';

export async function BlogManagement() {
  const posts = await getAdminBlogPosts();

  return (
    <>
      <section className="panel stack">
        <h2>Create a draft</h2>
        <form action={createBlogPostAction} className="content-form">
          <label>Title<input name="title" required /></label>
          <label>Excerpt<textarea name="excerpt" rows={2} /></label>
          <label>Content<textarea name="content" rows={8} required /></label>
          <button type="submit">Create draft</button>
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
                <span className={post.isPublished ? 'status-badge published' : 'status-badge'}>
                  {post.isPublished ? 'Published' : 'Draft'}
                </span>
                <h2 className="admin-blog-title">{post.title}</h2>
                <p className="muted">
                  {post.author?.username ? `Author: ${post.author.username}` : 'Unknown author'}
                </p>
              </div>
              <div className="button-row admin-content-actions">
                <form action={(post.isPublished
                  ? unpublishBlogPostAction
                  : publishBlogPostAction
                ).bind(null, post.documentId)}>
                  <button className="secondary-button" type="submit">
                    {post.isPublished ? 'Unpublish' : 'Publish'}
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
                <label>Excerpt<textarea defaultValue={post.excerpt ?? ''} name="excerpt" rows={2} /></label>
                <label>Content<textarea defaultValue={post.content} name="content" rows={8} required /></label>
                <button type="submit">Save post</button>
              </form>
            </details>
          </article>
        ))}
      </section>
    </>
  );
}
