import { Badge } from '@/components/ui/badge';
import { BlogManagement } from '@/features/blog/components/blog-management';

export default function AdminBlogPage() {
  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <Badge variant="secondary">Admin dashboard</Badge>
          <h1>Blog management</h1>
          <p>Create drafts and manage every author&apos;s posts across the platform.</p>
        </div>
      </section>
      <BlogManagement />
    </div>
  );
}
