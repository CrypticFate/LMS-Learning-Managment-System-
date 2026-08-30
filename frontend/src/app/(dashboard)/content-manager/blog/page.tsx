import { renderForRoles } from '@/features/auth/components/role-guard';
import { BlogManagement } from '@/features/blog/components/blog-management';
import { ROLE } from '@/lib/constants';

export default function ContentManagerBlogPage() {
  return renderForRoles([ROLE.CONTENT_MANAGER], () => (
    <>
      <p className="eyebrow">Content manager dashboard</p>
      <h1>My blog posts</h1>
      <p className="lead">
        Write drafts, publish articles, and manage the posts you created.
      </p>
      <div className="section-gap">
        <BlogManagement />
      </div>
    </>
  ));
}
