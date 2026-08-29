'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { StrapiError, strapiFetch } from '@/lib/strapi';

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function required(formData: FormData, field: string): string {
  const value = text(formData, field);
  if (!value) throw new Error(`${field} is required.`);
  return value;
}

function courseData(formData: FormData) {
  return {
    title: required(formData, 'title'),
    description: text(formData, 'description'),
    coverImageUrl: text(formData, 'coverImageUrl') || null,
  };
}

function lessonData(formData: FormData) {
  const rawOrder = text(formData, 'order');
  const order = Number.parseInt(rawOrder || '0', 10);
  if (!Number.isInteger(order) || order < 0) {
    throw new Error('Lesson order must be a non-negative integer.');
  }
  const content = text(formData, 'content');
  const videoUrl = text(formData, 'videoUrl');
  if (!content && !videoUrl) throw new Error('A lesson needs text or a video URL.');

  return {
    title: required(formData, 'title'),
    content: content || null,
    videoUrl: videoUrl || null,
    order,
  };
}

export async function createCourseAction(
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch('/api/courses', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({ data: courseData(formData) }),
  });
  revalidatePath(returnPath);
  revalidatePath('/courses');
}

export async function updateCourseAction(
  documentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/courses/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: courseData(formData) }),
  });
  revalidatePath(returnPath);
  revalidatePath(`/courses/${documentId}`);
  revalidatePath('/courses');
}

export async function deleteCourseAction(
  documentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(`/api/courses/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidatePath(returnPath);
  revalidatePath('/courses');
}

export async function createLessonAction(
  courseDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch('/api/lessons', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({
      data: { ...lessonData(formData), course: courseDocumentId },
    }),
  });
  revalidatePath(returnPath);
  revalidatePath(`/student/courses/${courseDocumentId}`);
  revalidatePath('/student/my-courses');
}

export async function updateLessonAction(
  lessonDocumentId: string,
  courseDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/lessons/${encodeURIComponent(lessonDocumentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: lessonData(formData) }),
  });
  revalidatePath(returnPath);
  revalidatePath(`/student/courses/${courseDocumentId}`);
  revalidatePath('/student/my-courses');
}

export async function deleteLessonAction(
  lessonDocumentId: string,
  courseDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(`/api/lessons/${encodeURIComponent(lessonDocumentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidatePath(returnPath);
  revalidatePath(`/student/courses/${courseDocumentId}`);
  revalidatePath('/student/my-courses');
}

export async function enrollInCourseAction(
  courseDocumentId: string,
): Promise<void> {
  let duplicate = false;
  try {
    await strapiFetch('/api/enrollments', {
      auth: true,
      method: 'POST',
      body: JSON.stringify({ data: { course: courseDocumentId } }),
    });
  } catch (error) {
    if (error instanceof StrapiError && error.status === 409) {
      duplicate = true;
    } else {
      throw error;
    }
  }

  revalidatePath('/student/my-courses');
  if (duplicate) redirect(`/courses/${courseDocumentId}?notice=already-enrolled`);
  redirect('/student/my-courses');
}
