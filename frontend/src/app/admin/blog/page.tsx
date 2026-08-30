import { BlogManagement } from '@/features/blog/components/blog-management';

export default function AdminBlogPage() {
  return (
    <>
      <p className="eyebrow">Admin dashboard</p>
      <h1>Blog management</h1>
      <p className="lead">
        Create drafts and manage every author&apos;s posts across the platform.
      </p>
      <div className="section-gap">
        <BlogManagement />
      </div>
    </>
  );
}
