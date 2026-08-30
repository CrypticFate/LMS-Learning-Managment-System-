import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type { StrapiListResponse, StrapiSingleResponse } from '@/types/strapi';
import type { Comment, Course, Enrollment, Lesson, Module } from './types';

export async function getCourses(): Promise<Course[]> {
  const response = await strapiFetch<StrapiListResponse<Course>>(
    '/api/courses?sort=createdAt:desc&pagination[pageSize]=100',
  );
  return response.data;
}

export async function getCourse(documentId: string): Promise<Course> {
  const response = await strapiFetch<StrapiSingleResponse<Course>>(
    `/api/courses/${encodeURIComponent(documentId)}`,
  );
  return response.data;
}

export async function getManageableCourses(): Promise<Course[]> {
  const response = await strapiFetch<{ data: Course[] }>('/api/courses/mine', {
    auth: true,
  });
  return response.data;
}

export async function getCourseModules(courseDocumentId: string): Promise<Module[]> {
  const response = await strapiFetch<{ data: Module[] }>(
    `/api/courses/${encodeURIComponent(courseDocumentId)}/modules`,
    { auth: true },
  );
  return response.data;
}

export async function getModuleLessons(moduleDocumentId: string): Promise<Lesson[]> {
  const response = await strapiFetch<{ data: Lesson[] }>(
    `/api/modules/${encodeURIComponent(moduleDocumentId)}/lessons`,
    { auth: true },
  );
  return response.data;
}

export async function getLessonComments(lessonDocumentId: string): Promise<Comment[]> {
  const response = await strapiFetch<{ data: Comment[] }>(
    `/api/lessons/${encodeURIComponent(lessonDocumentId)}/comments`,
    { auth: true },
  );
  return response.data;
}

export async function getMyEnrollments(): Promise<Enrollment[]> {
  const response = await strapiFetch<{ data: Enrollment[] }>('/api/enrollments/me', {
    auth: true,
  });
  return response.data;
}
