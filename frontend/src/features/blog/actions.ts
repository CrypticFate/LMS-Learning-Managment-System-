'use server';

import { revalidatePath } from 'next/cache';

import { strapiFetch } from '@/lib/strapi';
import type { BlogPostStatus } from './types';

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function blogData(formData: FormData) {
  const title = text(formData, 'title');
  const body = text(formData, 'body');
  const coverImageUrl = text(formData, 'coverImageUrl');
  const requestedStatus = text(formData, 'status');
  if (!title) throw new Error('Blog title is required.');
  if (!body) throw new Error('Blog body is required.');
  if (coverImageUrl) {
    try {
      const parsed = new URL(coverImageUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      throw new Error('Cover image URL must use http or https.');
    }
  }
  const status: BlogPostStatus = requestedStatus === 'published'
    ? 'published'
    : 'draft';
  return {
    title,
    body,
    coverImageUrl: coverImageUrl || null,
    status,
  };
}

function revalidateBlog(): void {
  revalidatePath('/admin');
  revalidatePath('/admin/blog');
  revalidatePath('/content-manager/blog');
  revalidatePath('/blog');
}

export async function createBlogPostAction(formData: FormData): Promise<void> {
  await strapiFetch('/api/blog-posts', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({ data: blogData(formData) }),
  });
  revalidateBlog();
}

export async function updateBlogPostAction(
  documentId: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/blog-posts/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: blogData(formData) }),
  });
  revalidateBlog();
}

export async function deleteBlogPostAction(documentId: string): Promise<void> {
  await strapiFetch(`/api/blog-posts/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidateBlog();
}

export async function toggleBlogPostStatusAction(
  documentId: string,
  nextStatus: BlogPostStatus,
): Promise<void> {
  await strapiFetch(`/api/blog-posts/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: { status: nextStatus } }),
  });
  revalidateBlog();
}
