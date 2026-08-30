'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { StrapiError, strapiFetch } from '@/lib/strapi';

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalVideoUrl(formData: FormData): string | null {
  const raw = text(formData, 'videoUrl');
  if (!raw) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error('Video URL must be a valid http(s) URL.');
  }
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

function moduleData(formData: FormData) {
  const rawOrder = text(formData, 'order');
  const order = Number.parseInt(rawOrder || '0', 10);
  if (!Number.isInteger(order) || order < 0) {
    throw new Error('Module order must be a non-negative integer.');
  }
  return {
    title: required(formData, 'title'),
    description: text(formData, 'description') || null,
    order,
  };
}

function lessonData(formData: FormData) {
  const rawOrder = text(formData, 'order');
  const order = Number.parseInt(rawOrder || '0', 10);
  if (!Number.isInteger(order) || order < 0) {
    throw new Error('Lesson order must be a non-negative integer.');
  }
  const content = text(formData, 'content');
  const videoUrl = optionalVideoUrl(formData);
  if (!content && !videoUrl) throw new Error('A lesson needs text or a video URL.');

  return {
    title: required(formData, 'title'),
    content: content || null,
    videoUrl,
    order,
  };
}

/* ────── Course CRUD ────── */

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

/* ────── Module CRUD ────── */

export async function createModuleAction(
  courseDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch('/api/modules', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({
      data: { ...moduleData(formData), course: courseDocumentId },
    }),
  });
  revalidatePath(returnPath);
}

export async function updateModuleAction(
  moduleDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/modules/${encodeURIComponent(moduleDocumentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: moduleData(formData) }),
  });
  revalidatePath(returnPath);
}

export async function deleteModuleAction(
  moduleDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(`/api/modules/${encodeURIComponent(moduleDocumentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidatePath(returnPath);
}

/* ────── Lesson CRUD ────── */

export async function createLessonAction(
  moduleDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch('/api/lessons', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({
      data: { ...lessonData(formData), module: moduleDocumentId },
    }),
  });
  revalidatePath(returnPath);
  revalidatePath('/student/my-courses');
}

export async function updateLessonAction(
  lessonDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/lessons/${encodeURIComponent(lessonDocumentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: lessonData(formData) }),
  });
  revalidatePath(returnPath);
  revalidatePath('/student/my-courses');
}

export async function deleteLessonAction(
  lessonDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(`/api/lessons/${encodeURIComponent(lessonDocumentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidatePath(returnPath);
  revalidatePath('/student/my-courses');
}

/* Many-to-many assignments */

function revalidateAssignments(returnPath: string): void {
  revalidatePath(returnPath);
  revalidatePath('/student/my-courses');
}

export async function attachModuleToCourseAction(
  courseDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const moduleDocumentId = required(formData, 'moduleDocumentId');
  await strapiFetch(
    `/api/courses/${encodeURIComponent(courseDocumentId)}/modules/${encodeURIComponent(moduleDocumentId)}`,
    { auth: true, method: 'POST' },
  );
  revalidateAssignments(returnPath);
}

export async function detachModuleFromCourseAction(
  courseDocumentId: string,
  moduleDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(
    `/api/courses/${encodeURIComponent(courseDocumentId)}/modules/${encodeURIComponent(moduleDocumentId)}`,
    { auth: true, method: 'DELETE' },
  );
  revalidateAssignments(returnPath);
}

export async function attachLessonToModuleAction(
  moduleDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const lessonDocumentId = required(formData, 'lessonDocumentId');
  await strapiFetch(
    `/api/modules/${encodeURIComponent(moduleDocumentId)}/lessons/${encodeURIComponent(lessonDocumentId)}`,
    { auth: true, method: 'POST' },
  );
  revalidateAssignments(returnPath);
}

export async function detachLessonFromModuleAction(
  moduleDocumentId: string,
  lessonDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(
    `/api/modules/${encodeURIComponent(moduleDocumentId)}/lessons/${encodeURIComponent(lessonDocumentId)}`,
    { auth: true, method: 'DELETE' },
  );
  revalidateAssignments(returnPath);
}

export async function attachQuizToModuleAction(
  moduleDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const quizDocumentId = required(formData, 'quizDocumentId');
  await strapiFetch(
    `/api/modules/${encodeURIComponent(moduleDocumentId)}/quizzes/${encodeURIComponent(quizDocumentId)}`,
    { auth: true, method: 'POST' },
  );
  revalidateAssignments(returnPath);
}

export async function detachQuizFromModuleAction(
  moduleDocumentId: string,
  quizDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(
    `/api/modules/${encodeURIComponent(moduleDocumentId)}/quizzes/${encodeURIComponent(quizDocumentId)}`,
    { auth: true, method: 'DELETE' },
  );
  revalidateAssignments(returnPath);
}

/* ────── Comment CRUD ────── */

export async function createCommentAction(
  lessonDocumentId: string,
  courseDocumentId: string,
  formData: FormData,
): Promise<void> {
  const body = text(formData, 'body');
  if (!body) throw new Error('Comment body is required.');

  await strapiFetch('/api/comments', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({
      data: { body, lesson: lessonDocumentId },
    }),
  });
  revalidatePath(`/student/courses/${courseDocumentId}`);
}

export async function deleteCommentAction(
  commentDocumentId: string,
  returnPathOrCourseDocumentId: string,
): Promise<void> {
  await strapiFetch(`/api/comments/${encodeURIComponent(commentDocumentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  const targetPath = returnPathOrCourseDocumentId.startsWith('/')
    ? returnPathOrCourseDocumentId
    : `/student/courses/${returnPathOrCourseDocumentId}`;
  revalidatePath(targetPath);
}

/* ────── Enrollment ────── */

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
