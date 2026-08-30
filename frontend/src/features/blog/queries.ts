import 'server-only';

import { StrapiError, strapiFetch } from '@/lib/strapi';
import type { BlogPost, PublicBlogPost } from './types';

export async function getManageableBlogPosts(): Promise<BlogPost[]> {
  const response = await strapiFetch<{ data: BlogPost[] }>('/api/blog-posts/mine', {
    auth: true,
  });
  return response.data;
}

export async function getPublishedBlogPosts(): Promise<PublicBlogPost[]> {
  const response = await strapiFetch<{ data: PublicBlogPost[] }>('/api/blog-posts');
  return response.data;
}

export async function getPublishedBlogPost(
  slug: string,
): Promise<PublicBlogPost | null> {
  try {
    const response = await strapiFetch<{ data: PublicBlogPost }>(
      `/api/blog-posts/${encodeURIComponent(slug)}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}
