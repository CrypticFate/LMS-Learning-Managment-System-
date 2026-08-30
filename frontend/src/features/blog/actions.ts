'use server';

import { revalidatePath } from 'next/cache';

import { strapiFetch } from '@/lib/strapi';

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function blogData(formData: FormData) {
  const title = text(formData, 'title');
  const content = text(formData, 'content');
  if (!title) throw new Error('Blog title is required.');
  if (!content) throw new Error('Blog content is required.');
  return {
    title,
    excerpt: text(formData, 'excerpt') || null,
    content,
  };
}

function revalidateBlog(): void {
  revalidatePath('/admin');
  revalidatePath('/admin/blog');
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

export async function publishBlogPostAction(documentId: string): Promise<void> {
  await strapiFetch(
    `/api/blog-posts/${encodeURIComponent(documentId)}/publish`,
    { auth: true, method: 'POST', body: JSON.stringify({}) },
  );
  revalidateBlog();
}

export async function unpublishBlogPostAction(documentId: string): Promise<void> {
  await strapiFetch(
    `/api/blog-posts/${encodeURIComponent(documentId)}/unpublish`,
    { auth: true, method: 'POST', body: JSON.stringify({}) },
  );
  revalidateBlog();
}
