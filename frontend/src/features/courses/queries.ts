import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type { StrapiListResponse, StrapiSingleResponse } from '@/types/strapi';
import type { Course, Enrollment, Lesson } from './types';

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

export async function getCourseLessons(documentId: string): Promise<Lesson[]> {
  const response = await strapiFetch<{ data: Lesson[] }>(
    `/api/courses/${encodeURIComponent(documentId)}/lessons`,
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
