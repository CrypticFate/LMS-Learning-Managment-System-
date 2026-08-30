import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type { BlogPost } from './types';

export async function getAdminBlogPosts(): Promise<BlogPost[]> {
  const response = await strapiFetch<{ data: BlogPost[] }>('/api/admin/blog-posts', {
    auth: true,
  });
  return response.data;
}
